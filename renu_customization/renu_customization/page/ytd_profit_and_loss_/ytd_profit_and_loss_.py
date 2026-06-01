import frappe
from frappe import _
from frappe.utils.pdf import get_pdf
from frappe.utils import getdate, add_days, date_diff
from datetime import datetime, timedelta

@frappe.whitelist()
def export_to_pdf(html):
	pdf_content = get_pdf(html, {"orientation": "Landscape"})
	frappe.response.filename = f"YTD_Profit_and_Loss_{frappe.utils.nowdate()}.pdf"
	frappe.response.filecontent = pdf_content
	frappe.response.type = "download"

def get_fiscal_year_dates(company, fiscal_year):
	"""Get the start and end dates of a fiscal year"""
	fy = frappe.get_doc('Fiscal Year', fiscal_year)
	return fy.year_start_date, fy.year_end_date

def get_current_and_previous_fiscal_years(company, selected_fy=None):
	"""Get current and previous fiscal year"""
	today = getdate()
	
	if selected_fy:
		current_fy = selected_fy
	else:
		# Get current fiscal year (without company filter since Fiscal Year is global)
		current_fy = frappe.db.get_value(
			'Fiscal Year',
			{
				'year_start_date': ['<=', today],
				'year_end_date': ['>=', today]
			},
			'name'
		)
	
	if not current_fy:
		# Fallback to the latest fiscal year if none found for today
		current_fy = frappe.db.get_value(
			'Fiscal Year',
			{},
			'name',
			order_by='year_start_date desc'
		)
	
	if not current_fy:
		frappe.throw(_("No Fiscal Year found"))
	
	# Get previous fiscal year
	current_fy_doc = frappe.get_doc('Fiscal Year', current_fy)
	prev_fy_end = add_days(current_fy_doc.year_start_date, -1)
	
	previous_fy = frappe.db.get_value(
		'Fiscal Year',
		{
			'year_end_date': prev_fy_end
		},
		'name'
	)
	
	if not previous_fy:
		# Fallback if no exact year_end_date match
		previous_fy = frappe.db.get_value(
			'Fiscal Year',
			{
				'year_start_date': ['<', current_fy_doc.year_start_date]
			},
			'name',
			order_by='year_start_date desc'
		)
	
	return current_fy, previous_fy

def get_account_balance_ytd(company, account, fiscal_year, to_date=None):
	"""Get the balance for an account for the fiscal year to date"""
	fy_start, fy_end = get_fiscal_year_dates(company, fiscal_year)
	
	if not to_date:
		today = getdate()
		to_date = min(today, fy_end)
	
	acc_details = frappe.db.get_value("Account", account, ["lft", "rgt", "root_type"])
	if not acc_details:
		return 0
	
	lft, rgt, root_type = acc_details
	
	# Get GL Entry balance for the account (considering child accounts if it's a group)
	gl_entries = frappe.db.sql("""
		SELECT COALESCE(SUM(debit - credit), 0) as balance
		FROM `tabGL Entry`
		WHERE 
			company = %s
			AND account IN (SELECT name FROM `tabAccount` WHERE lft >= %s AND rgt <= %s)
			AND posting_date >= %s
			AND posting_date <= %s
			AND docstatus = 1
	""", (company, lft, rgt, fy_start, to_date), as_dict=True)
	
	if gl_entries and len(gl_entries) > 0:
		balance = gl_entries[0]['balance']
		if root_type == 'Income':
			balance = -balance
		return balance
	
	return 0

def get_cost_centers_balance_ytd(company, cost_centers, fiscal_year, to_date=None):
	"""Get the balance for specific cost centers for the fiscal year to date"""
	fy_start, fy_end = get_fiscal_year_dates(company, fiscal_year)
	
	if not to_date:
		today = getdate()
		to_date = min(today, fy_end)
	
	if not cost_centers:
		return 0
		
	format_strings = ', '.join(['%s'] * len(cost_centers))
	
	gl_entries = frappe.db.sql(f"""
		SELECT COALESCE(SUM(debit - credit), 0) as balance
		FROM `tabGL Entry`
		WHERE 
			company = %s
			AND cost_center IN ({format_strings})
			AND posting_date >= %s
			AND posting_date <= %s
			AND docstatus = 1
			AND account IN (SELECT name FROM `tabAccount` WHERE root_type IN ('Expense', 'Income'))
	""", tuple([company] + cost_centers + [fy_start, to_date]), as_dict=True)
	
	if gl_entries and len(gl_entries) > 0:
		return gl_entries[0]['balance']
	
	return 0

def get_pnl_account_balance(company, account_name, fiscal_year, to_date=None):
	"""Get balance for a specific account name from Profit and Loss statement"""
	try:
		from erpnext.accounts.report.profit_and_loss_statement.profit_and_loss_statement import execute as execute_pnl
		
		# Get fiscal year dates
		fy_start, fy_end = get_fiscal_year_dates(company, fiscal_year)
		if not to_date:
			today = getdate()
			to_date = min(today, fy_end)
		
		filters = frappe._dict({
			"company": company,
			"filter_based_on": "Date Range",
			"period_start_date": fy_start,
			"period_end_date": to_date,
			"periodicity": "Yearly"
		})
		
		result = execute_pnl(filters)
		data = result[1] if result and len(result) > 1 else []
		
		for row in data:
			if isinstance(row, dict) and row.get("account_name") == account_name:
				return float(row.get("total", 0.0) or 0.0)
				
		# Fallback to case-insensitive and partial match
		for row in data:
			if isinstance(row, dict) and row.get("account_name") and account_name.lower() in str(row.get("account_name")).lower():
				return float(row.get("total", 0.0) or 0.0)
				
		return 0.0
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), f"Error in get_pnl_account_balance for {account_name}")
		return 0.0

def get_outstanding_receivables(company, as_of_date):
	"""Get total outstanding receivables (Accounts Receivable report - Outstanding Amount total) as of a date"""
	try:
		from erpnext.accounts.report.accounts_receivable.accounts_receivable import execute
		filters = frappe._dict({
			"company": company,
			"report_date": as_of_date,
			"ageing_based_on": "Due Date"
		})
		result = execute(filters)
		data = result[1] if result and len(result) > 1 else []
		total = 0.0
		if data:
			for row in data:
				# Sum all rows except total/subtotal rows
				if isinstance(row, dict) and not row.get("is_total_row") and "'" not in str(row.get('party', '')) and "Total" not in str(row.get('party', '')):
					total += float(row.get("outstanding", 0.0) or 0.0)
		return total
	except Exception as e:
		frappe.log_error(f"Error in get_outstanding_receivables: {str(e)}", "YTD Dashboard")
		return 0.0

def get_outstanding_payables(company, as_of_date):
	"""Get total outstanding payables (Accounts Payable report - Outstanding Amount total) as of a date"""
	try:
		from erpnext.accounts.report.accounts_payable.accounts_payable import execute
		filters = frappe._dict({
			"company": company,
			"report_date": as_of_date,
			"ageing_based_on": "Due Date"
		})
		result = execute(filters)
		data = result[1] if result and len(result) > 1 else []
		total = 0.0
		if data:
			for row in data:
				# Sum all rows except total/subtotal rows
				if isinstance(row, dict) and not row.get("is_total_row") and "'" not in str(row.get('party', '')) and "Total" not in str(row.get('party', '')):
					total += float(row.get("outstanding", 0.0) or 0.0)
		return total
	except Exception as e:
		frappe.log_error(f"Error in get_outstanding_payables: {str(e)}", "YTD Dashboard")
		return 0.0

def convert_to_millions(value):
	"""Convert value to millions with 2 decimal places"""
	if not value:
		return 0.0
	return round(value / 1000000, 2)

def calculate_variance_percentage(ytd, pyd):
	"""Calculate variance percentage: (YTD-PYD)/PYD*100"""
	if pyd == 0:
		return 0
	return round(((ytd - pyd) / abs(pyd)) * 100, 2)

@frappe.whitelist()
def get_dashboard_data(company, filters=None):
	if not company:
		frappe.throw(_("Company is required"))
	
	# Parse filters if it's a string
	if filters and isinstance(filters, str):
		try:
			import json
			filters = json.loads(filters)
		except Exception:
			pass
			
	selected_fy = None
	if isinstance(filters, dict):
		selected_fy = filters.get("fiscal_year")
	
	try:
		# Get current and previous fiscal years
		current_fy, previous_fy = get_current_and_previous_fiscal_years(company, selected_fy)
		
		# Compute YTD to_date limit based on selected/current fiscal year
		today = getdate()
		current_fy_start, current_fy_end = get_fiscal_year_dates(company, current_fy)
		
		if current_fy_start <= today <= current_fy_end:
			# The selected fiscal year is the active/current one
			ytd_to_date = today
		else:
			# A past or future fiscal year is selected, run for the full range of those years
			ytd_to_date = current_fy_end
			
		# Compute PYD to_date limit if previous fiscal year exists
		pyd_to_date = None
		if previous_fy:
			prev_fy_start, prev_fy_end = get_fiscal_year_dates(company, previous_fy)
			if current_fy_start <= today <= current_fy_end:
				days_elapsed = (today - current_fy_start).days
				pyd_to_date = min(getdate(prev_fy_start) + timedelta(days=days_elapsed), prev_fy_end)
			else:
				pyd_to_date = prev_fy_end
		
		# Get YTD and PYD values for Sales from specific accounts
		sales_accounts = [
			'41 - REVENUE FROM OPERATIONS - RFAPL',
			'42 - BRANCH SALES CONTROL ACCOUNT - RFAPL',
			'43 - FREIGHT OUTWARD - RFAPL',
			'Direct Income - RFAPL'
		]
		ytd_total = sum(get_account_balance_ytd(company, acc, current_fy, to_date=ytd_to_date) for acc in sales_accounts)
		pyd_total = sum(get_account_balance_ytd(company, acc, previous_fy, to_date=pyd_to_date) for acc in sales_accounts) if previous_fy else 0.0
		
		# Convert to millions
		ytd_millions = convert_to_millions(ytd_total)
		pyd_millions = convert_to_millions(pyd_total)
		
		# Calculate variance
		variance_pct = calculate_variance_percentage(ytd_millions, pyd_millions)
		
		# SGM calculations (30% of Sales)
		sgm_ytd = ytd_millions * 0.3
		sgm_pyd = pyd_millions * 0.3
		sgm_var_val = (sgm_ytd - sgm_pyd) * 1000000
		sgm_var_pct = calculate_variance_percentage(sgm_ytd, sgm_pyd)
		
		# COGS calculations
		cogs_accounts = [
			'31 - PURCHASES - RFAPL',
			'32 - DIRECT EXPENSES - RFAPL'
		]
		cogs_ytd_total = 0
		cogs_pyd_total = 0
		for acc in cogs_accounts:
			cogs_ytd_total += get_account_balance_ytd(company, acc, current_fy, to_date=ytd_to_date)
			if previous_fy:
				cogs_pyd_total += get_account_balance_ytd(company, acc, previous_fy, to_date=pyd_to_date)
		
		cogs_ytd_millions = convert_to_millions(cogs_ytd_total)
		cogs_pyd_millions = convert_to_millions(cogs_pyd_total)
		cogs_var_val = (cogs_ytd_millions - cogs_pyd_millions) * 1000000
		cogs_var_pct = calculate_variance_percentage(cogs_ytd_millions, cogs_pyd_millions)
		cogs_ytd_pct = round((cogs_ytd_millions / ytd_millions) * 100, 2) if ytd_millions else 0.0
		cogs_pyd_pct = round((cogs_pyd_millions / pyd_millions) * 100, 2) if pyd_millions else 0.0
		
		# AGM calculations (Actual GM)
		agm_ytd_millions = ytd_millions - cogs_ytd_millions
		agm_pyd_millions = pyd_millions - cogs_pyd_millions
		agm_var_val = (agm_ytd_millions - agm_pyd_millions) * 1000000
		agm_var_pct = calculate_variance_percentage(agm_ytd_millions, agm_pyd_millions)
		agm_ytd_pct = round((agm_ytd_millions / ytd_millions) * 100, 2) if ytd_millions else 0.0
		agm_pyd_pct = round((agm_pyd_millions / pyd_millions) * 100, 2) if pyd_millions else 0.0
		
		# Cost of Sales from specific Cost Centers
		cos_cost_centers = [
			'10002 - FABU-Common - RFAPL',
			'10003 - Marketing and Communication - RFAPL',
			'10004 - Customer Support - RFAPL',
			'10007 - Sales - RFAPL',
			'10005 - Product Management - RFAPL'
		]
		cos_ytd_total = get_cost_centers_balance_ytd(company, cos_cost_centers, current_fy, to_date=ytd_to_date)
		cos_pyd_total = get_cost_centers_balance_ytd(company, cos_cost_centers, previous_fy, to_date=pyd_to_date) if previous_fy else 0.0
		
		cos_ytd_millions = convert_to_millions(cos_ytd_total)
		cos_pyd_millions = convert_to_millions(cos_pyd_total)
		cos_var_val = (cos_ytd_millions - cos_pyd_millions) * 1000000
		cos_var_pct = calculate_variance_percentage(cos_ytd_millions, cos_pyd_millions)
		cos_ytd_pct = round((cos_ytd_millions / ytd_millions) * 100, 2) if ytd_millions else 0.0
		cos_pyd_pct = round((cos_pyd_millions / pyd_millions) * 100, 2) if pyd_millions else 0.0
		
		# Cost of Engineering from specific Cost Centers
		coe_cost_centers = [
			'100001 - Engineering Cost - RFAPL',
			'10006 - Research and Development - R&D - RFAPL'
		]
		coe_ytd_total = get_cost_centers_balance_ytd(company, coe_cost_centers, current_fy, to_date=ytd_to_date)
		coe_pyd_total = get_cost_centers_balance_ytd(company, coe_cost_centers, previous_fy, to_date=pyd_to_date) if previous_fy else 0.0
		
		coe_ytd_millions = convert_to_millions(coe_ytd_total)
		coe_pyd_millions = convert_to_millions(coe_pyd_total)
		coe_var_val = (coe_ytd_millions - coe_pyd_millions) * 1000000
		coe_var_pct = calculate_variance_percentage(coe_ytd_millions, coe_pyd_millions)
		coe_ytd_pct = round((coe_ytd_millions / ytd_millions) * 100, 2) if ytd_millions else 0.0
		coe_pyd_pct = round((coe_pyd_millions / pyd_millions) * 100, 2) if pyd_millions else 0.0
		
		# Cost of G&A from specific Cost Centers
		coga_cost_centers = [
			'Main - RFAPL',
			'10009 - Administration Cost - RFAPL'
		]
		coga_ytd_total = get_cost_centers_balance_ytd(company, coga_cost_centers, current_fy, to_date=ytd_to_date)
		coga_pyd_total = get_cost_centers_balance_ytd(company, coga_cost_centers, previous_fy, to_date=pyd_to_date) if previous_fy else 0.0
		
		coga_ytd_millions = convert_to_millions(coga_ytd_total)
		coga_pyd_millions = convert_to_millions(coga_pyd_total)
		coga_var_val = (coga_ytd_millions - coga_pyd_millions) * 1000000
		coga_var_pct = calculate_variance_percentage(coga_ytd_millions, coga_pyd_millions)
		coga_ytd_pct = round((coga_ytd_millions / ytd_millions) * 100, 2) if ytd_millions else 0.0
		coga_pyd_pct = round((coga_pyd_millions / pyd_millions) * 100, 2) if pyd_millions else 0.0
		
		# Total SG&A = Sum of Cost of Sales + Cost of Engineering + Cost of G&A
		sga_ytd_millions = cos_ytd_millions + coe_ytd_millions + coga_ytd_millions
		sga_pyd_millions = cos_pyd_millions + coe_pyd_millions + coga_pyd_millions
		sga_var_val = (sga_ytd_millions - sga_pyd_millions) * 1000000
		sga_var_pct = calculate_variance_percentage(sga_ytd_millions, sga_pyd_millions)
		sga_ytd_pct = round((sga_ytd_millions / ytd_millions) * 100, 2) if ytd_millions else 0.0
		sga_pyd_pct = round((sga_pyd_millions / pyd_millions) * 100, 2) if pyd_millions else 0.0
		
		# OM (Operating Margin) = AGM - Total SG&A
		om_ytd_millions = agm_ytd_millions - sga_ytd_millions
		om_pyd_millions = agm_pyd_millions - sga_pyd_millions
		om_var_val = (om_ytd_millions - om_pyd_millions) * 1000000
		om_var_pct = calculate_variance_percentage(om_ytd_millions, om_pyd_millions)
		om_ytd_pct = round((om_ytd_millions / ytd_millions) * 100, 2) if ytd_millions else 0.0
		om_pyd_pct = round((om_pyd_millions / pyd_millions) * 100, 2) if pyd_millions else 0.0
		
		# Receivables - Outstanding Amount
		rec_ytd = get_outstanding_receivables(company, ytd_to_date)
		rec_pyd = get_outstanding_receivables(company, pyd_to_date) if pyd_to_date else 0.0
		rec_ytd_millions = convert_to_millions(rec_ytd)
		rec_pyd_millions = convert_to_millions(rec_pyd)
		rec_var_val = (rec_ytd_millions - rec_pyd_millions) * 1000000
		rec_var_pct = calculate_variance_percentage(rec_ytd_millions, rec_pyd_millions)
		
		# Payables - Outstanding Amount
		pay_ytd = get_outstanding_payables(company, ytd_to_date)
		pay_pyd = get_outstanding_payables(company, pyd_to_date) if pyd_to_date else 0.0
		# Purchase total from Direct Expenses account
		purchase_accounts = ['32 - DIRECT EXPENSES - RFAPL']
		purchase_ytd = sum(get_account_balance_ytd(company, acc, current_fy, to_date=ytd_to_date) for acc in purchase_accounts)
		purchase_pyd = sum(get_account_balance_ytd(company, acc, previous_fy, to_date=pyd_to_date) for acc in purchase_accounts) if previous_fy else 0.0
		pay_ytd_millions = convert_to_millions(pay_ytd)
		pay_pyd_millions = convert_to_millions(pay_pyd)
		pay_var_val = (pay_ytd_millions - pay_pyd_millions) * 1000000
		pay_var_pct = calculate_variance_percentage(pay_ytd_millions, pay_pyd_millions)
		
		# Working Capital = Receivables - Payables
		wc_ytd_millions = rec_ytd_millions - pay_ytd_millions
		wc_pyd_millions = rec_pyd_millions - pay_pyd_millions
		wc_var_val = (wc_ytd_millions - wc_pyd_millions) * 1000000
		wc_var_pct = calculate_variance_percentage(wc_ytd_millions, wc_pyd_millions)
		
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "YTD P&L Dashboard Data Error")
		# Return default values if there's an error
		ytd_millions = 0.0
		pyd_millions = 0.0
		variance_pct = 0.0
		sgm_ytd = 0.0
		sgm_pyd = 0.0
		sgm_var_val = 0.0
		sgm_var_pct = 0.0
		cogs_ytd_millions = 0.0
		cogs_pyd_millions = 0.0
		cogs_var_val = 0.0
		cogs_var_pct = 0.0
		cogs_ytd_pct = 0.0
		cogs_pyd_pct = 0.0
		agm_ytd_millions = 0.0
		agm_pyd_millions = 0.0
		agm_var_val = 0.0
		agm_var_pct = 0.0
		agm_ytd_pct = 0.0
		agm_pyd_pct = 0.0
		cos_ytd_millions = 0.0
		cos_pyd_millions = 0.0
		cos_var_val = 0.0
		cos_var_pct = 0.0
		cos_ytd_pct = None
		cos_pyd_pct = None
		coe_ytd_millions = 0.0
		coe_pyd_millions = 0.0
		coe_var_val = 0.0
		coe_var_pct = 0.0
		coe_ytd_pct = None
		coe_pyd_pct = None
		coga_ytd_millions = 0.0
		coga_pyd_millions = 0.0
		coga_var_val = 0.0
		coga_var_pct = 0.0
		coga_ytd_pct = None
		coga_pyd_pct = None
		sga_ytd_millions = 0.0
		sga_pyd_millions = 0.0
		sga_var_val = 0.0
		sga_var_pct = 0.0
		sga_ytd_pct = None
		sga_pyd_pct = None
		om_ytd_millions = 0.0
		om_pyd_millions = 0.0
		om_var_val = 0.0
		om_var_pct = 0.0
		om_ytd_pct = None
		om_pyd_pct = None
		rec_ytd_millions = 0.0
		rec_pyd_millions = 0.0
		rec_var_val = 0.0
		rec_var_pct = 0.0
		pay_ytd_millions = 0.0
		pay_pyd_millions = 0.0
		pay_var_val = 0.0
		pay_var_pct = 0.0
		wc_ytd_millions = 0.0
		wc_pyd_millions = 0.0
		wc_var_val = 0.0
		wc_var_pct = 0.0
	
	return {
		"summary_cards": {
			"sales_growth": {
				"ytd": ytd_millions * 1000000,
				"pyd": pyd_millions * 1000000,
				"variance": variance_pct
			},
			"gross_margin": {
				"ytd": agm_ytd_millions * 1000000,
				"pyd": agm_pyd_millions * 1000000,
				"variance": agm_var_pct
			},
			"operating_margin": {
				"ytd": om_ytd_millions * 1000000,
				"pyd": om_pyd_millions * 1000000,
				"variance": om_var_pct
			},
			"working_capital": {
				"ytd": wc_ytd_millions * 1000000,
				"pyd": wc_pyd_millions * 1000000,
				"variance": wc_var_pct
			},
			# "dso" card removed - not displayed
            # "dpo" card removed - not displayed

			"overall_pnl": {
				"ytd": 0,
				"pyd": 0,
				"variance": 0
			}
		},
		"table_data": [
			{
				"bucket": "1. SALES GROWTH",
				"sources": [
					{
						"name": "Sales",
						"ytd_val": ytd_millions * 1000000,
						"ytd_pct": 100.00,
						"pyd_val": pyd_millions * 1000000,
						"pyd_pct": 100.00,
						"var_val": (ytd_millions - pyd_millions) * 1000000,
						"var_pct": variance_pct
					}
				]
			},
			{
				"bucket": "2. GROSS MARGIN",
				"sources": [
					{"name": "SGM (Standard GM)", "ytd_val": sgm_ytd * 1000000, "ytd_pct": 30.00, "pyd_val": sgm_pyd * 1000000, "pyd_pct": 30.00, "var_val": sgm_var_val, "var_pct": sgm_var_pct},
					{"name": "%", "ytd_val": 30.00, "ytd_pct": None, "pyd_val": 30.00, "pyd_pct": None, "var_val": None, "var_pct": None},
					{"name": "COST OF GOODS (Add Freight)", "ytd_val": cogs_ytd_millions * 1000000, "ytd_pct": cogs_ytd_pct, "pyd_val": cogs_pyd_millions * 1000000, "pyd_pct": cogs_pyd_pct, "var_val": cogs_var_val, "var_pct": cogs_var_pct},
					{"name": "%", "ytd_val": 70.00, "ytd_pct": None, "pyd_val": 70.00, "pyd_pct": None, "var_val": None, "var_pct": None},
					{"name": "AGM (Actual GM)", "ytd_val": agm_ytd_millions * 1000000, "ytd_pct": agm_ytd_pct, "pyd_val": agm_pyd_millions * 1000000, "pyd_pct": agm_pyd_pct, "var_val": agm_var_val, "var_pct": agm_var_pct},
					{"name": "%", "ytd_val": agm_ytd_pct, "ytd_pct": None, "pyd_val": agm_pyd_pct, "pyd_pct": None, "var_val": round(agm_ytd_pct - agm_pyd_pct, 2), "var_pct": round(agm_ytd_pct - agm_pyd_pct, 2)}
				]
			},
			{
				"bucket": "3. OPERATING MARGIN",
				"sources": [
					{"name": "Cost of Sales", "ytd_val": cos_ytd_millions * 1000000, "ytd_pct": cos_ytd_pct, "pyd_val": cos_pyd_millions * 1000000, "pyd_pct": cos_pyd_pct, "var_val": cos_var_val, "var_pct": cos_var_pct, "is_indented": True},
					{"name": "Cost of Engineering", "ytd_val": coe_ytd_millions * 1000000, "ytd_pct": coe_ytd_pct, "pyd_val": coe_pyd_millions * 1000000, "pyd_pct": coe_pyd_pct, "var_val": coe_var_val, "var_pct": coe_var_pct, "is_indented": True},
					{"name": "Cost of G&A", "ytd_val": coga_ytd_millions * 1000000, "ytd_pct": coga_ytd_pct, "pyd_val": coga_pyd_millions * 1000000, "pyd_pct": coga_pyd_pct, "var_val": coga_var_val, "var_pct": coga_var_pct, "is_indented": True},
					{"name": "Total SG&A (Total of 3)", "ytd_val": sga_ytd_millions * 1000000, "ytd_pct": sga_ytd_pct, "pyd_val": sga_pyd_millions * 1000000, "pyd_pct": sga_pyd_pct, "var_val": sga_var_val, "var_pct": sga_var_pct, "is_indented": True},
					{"name": "OM (Operating Margin)", "ytd_val": om_ytd_millions * 1000000, "ytd_pct": om_ytd_pct, "pyd_val": om_pyd_millions * 1000000, "pyd_pct": om_pyd_pct, "var_val": om_var_val, "var_pct": om_var_pct, "is_indented": True}
				]
			},
			{
				"bucket": "4. WORKING CAPITAL",
				"sources": [
					{"name": "Receivables", "ytd_val": rec_ytd_millions * 1000000, "ytd_pct": None, "pyd_val": rec_pyd_millions * 1000000, "pyd_pct": None, "var_val": rec_var_val, "var_pct": rec_var_pct, "is_indented": True},
					{"name": "DSO (Days Sales Outstanding)", "ytd_val": 0, "ytd_pct": None, "pyd_val": 0, "pyd_pct": None, "var_val": 0, "var_pct": 0, "is_indented": True},
					{"name": "Payables", "ytd_val": pay_ytd_millions * 1000000, "ytd_pct": None, "pyd_val": pay_pyd_millions * 1000000, "pyd_pct": None, "var_val": pay_var_val, "var_pct": pay_var_pct, "is_indented": True},
					{"name": "DPO (Days Payables Outstanding)", "ytd_val": 0, "ytd_pct": None, "pyd_val": 0, "pyd_pct": None, "var_val": 0, "var_pct": 0, "is_indented": True},
					{"name": "Working Capital", "ytd_val": wc_ytd_millions * 1000000, "ytd_pct": None, "pyd_val": wc_pyd_millions * 1000000, "pyd_pct": None, "var_val": wc_var_val, "var_pct": wc_var_pct, "is_indented": True},
					{"name": "WCTs (Working Capital Turns)", "ytd_val": 0, "ytd_pct": None, "pyd_val": 0, "pyd_pct": None, "var_val": 0, "var_pct": 0, "is_indented": True}
				]
			},
		],
		"charts": {
			"revenue_trend": {
				"labels": ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
				"ytd": [40 * 1000000, 38 * 1000000, 42 * 1000000, 45 * 1000000, 48 * 1000000, 50 * 1000000, 47 * 1000000, 45 * 1000000, 46 * 1000000, 43 * 1000000, 44 * 1000000, 46 * 1000000],
				"pyd": [45 * 1000000, 42 * 1000000, 48 * 1000000, 50 * 1000000, 52 * 1000000, 55 * 1000000, 50 * 1000000, 48 * 1000000, 49 * 1000000, 45 * 1000000, 47 * 1000000, 48 * 1000000]
			},
			"gross_margin_trend": {
				"labels": ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
				"ytd_gm": [30, 28, 31, 32, 34, 35, 33, 31, 32, 30, 31, 32],
				"pyd_gm": [45, 40, 42, 48, 46, 47, 42, 41, 40, 39, 40, 38]
			},
			"waterfall": {
				"labels": ["PYD Sales", "Δ Sales", "Δ COGS", "Δ Opex", "YTD Sales"],
				"values": [47.11 * 1000000, -5.65 * 1000000, -3.96 * 1000000, 0, 41.46 * 1000000]
			},
			"working_capital": {
				"labels": ["Receivables", "Payables", "Working Capital"],
				"ytd": [30 * 1000000, -15 * 1000000, -30 * 1000000],
				"pyd": [15 * 1000000, 15 * 1000000, -20 * 1000000]
			}
		}
	}
