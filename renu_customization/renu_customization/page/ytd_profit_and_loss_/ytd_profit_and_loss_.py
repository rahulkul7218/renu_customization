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

def get_account_balance(company, account, start_date, end_date):
	"""Get the balance for an account for a specific date range"""
	acc_details = frappe.db.get_value("Account", account, ["lft", "rgt", "root_type"])
	if not acc_details:
		return 0.0
	
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
	""", (company, lft, rgt, start_date, end_date), as_dict=True)
	
	if gl_entries and len(gl_entries) > 0:
		balance = gl_entries[0]['balance']
		if root_type == 'Income':
			balance = -balance
		return float(balance)
	
	return 0.0

def get_cost_centers_balance(company, cost_centers, start_date, end_date):
	"""Get the balance for specific cost centers for a specific date range"""
	if not cost_centers:
		return 0.0
		
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
			AND account IN (SELECT name FROM `tabAccount` WHERE root_type = 'Expense')
	""", tuple([company] + cost_centers + [start_date, end_date]), as_dict=True)
	
	if gl_entries and len(gl_entries) > 0:
		return float(gl_entries[0]['balance'])
	
	return 0.0

def get_period_dates(company, fiscal_year, filters=None, is_previous=False):
	"""Calculate start and end dates based on filters"""
	fy_start, fy_end = get_fiscal_year_dates(company, fiscal_year)
	
	start_date = fy_start
	end_date = fy_end
	
	if not filters:
		filters = {}

	if filters.get("from_date") and filters.get("to_date"):
		if is_previous:
			# Offset by 1 year for previous period comparison
			start_date = add_days(getdate(filters.get("from_date")), -365)
			end_date = add_days(getdate(filters.get("to_date")), -365)
		else:
			start_date = getdate(filters.get("from_date"))
			end_date = getdate(filters.get("to_date"))
	elif filters.get("month"):
		# Find month dates within fiscal year
		current_date = getdate(fy_start)
		target_month = filters.get("month")
		for i in range(12):
			if current_date.strftime("%B") == target_month:
				start_date = current_date.replace(day=1)
				import calendar
				last_day = calendar.monthrange(start_date.year, start_date.month)[1]
				end_date = start_date.replace(day=last_day)
				break
			# Move to next month
			if current_date.month == 12:
				current_date = current_date.replace(year=current_date.year + 1, month=1)
			else:
				current_date = current_date.replace(month=current_date.month + 1)
	elif filters.get("quarter"):
		# Find quarter dates within fiscal year
		q_idx = int(filters.get("quarter")[-1]) # Qtr1 -> 1
		current_date = getdate(fy_start)
		for q in range(1, 5):
			q_start = current_date
			# Add 2 months to get to quarter end month
			temp_date = current_date
			for _ in range(2):
				if temp_date.month == 12:
					temp_date = temp_date.replace(year=temp_date.year + 1, month=1)
				else:
					temp_date = temp_date.replace(month=temp_date.month + 1)
			import calendar
			last_day = calendar.monthrange(temp_date.year, temp_date.month)[1]
			q_end = temp_date.replace(day=last_day)
			
			if q == q_idx:
				start_date = q_start
				end_date = q_end
				break
			
			# Next quarter start
			if temp_date.month == 12:
				current_date = temp_date.replace(year=temp_date.year + 1, month=1)
			else:
				current_date = temp_date.replace(month=temp_date.month + 1)

	# Ensure end_date is not in future for current fiscal year
	if not is_previous:
		today = getdate()
		if start_date <= today <= end_date:
			end_date = today
		
	return start_date, end_date

def get_monthly_balances(company, accounts, fiscal_year):
	"""
	Returns a list of 12 values, one for each month of the fiscal year.
	And a list of 12 labels (month abbreviations).
	"""
	fy_start, fy_end = get_fiscal_year_dates(company, fiscal_year)
	fy_start = getdate(fy_start)
	
	import calendar
	months = []
	current_date = fy_start
	for i in range(12):
		month_days = calendar.monthrange(current_date.year, current_date.month)[1]
		month_start = current_date.replace(day=1)
		month_end = current_date.replace(day=month_days)
		months.append((month_start, month_end, month_start.strftime("%b")))
		
		# Move to next month
		if current_date.month == 12:
			current_date = current_date.replace(year=current_date.year + 1, month=1)
		else:
			current_date = current_date.replace(month=current_date.month + 1)

	# Find all child accounts for the given parent accounts
	account_names = []
	for account in accounts:
		acc_details = frappe.db.get_value("Account", account, ["lft", "rgt"])
		if not acc_details:
			continue
		lft, rgt = acc_details
		children = frappe.db.get_all("Account", filters={"lft": (">=", lft), "rgt": ("<=", rgt)}, pluck="name")
		account_names.extend(children)
		
	if not account_names:
		return [0.0] * 12, [m[2] for m in months]

	# Build a single query to get the balance grouped by month
	balances = []
	labels = []
	for month_start, month_end, label in months:
		gl_entries = frappe.db.sql("""
			SELECT 
				SUM(CASE WHEN a.root_type = 'Income' THEN (credit - debit) ELSE (debit - credit) END) as balance
			FROM `tabGL Entry` gle
			JOIN `tabAccount` a ON gle.account = a.name
			WHERE 
				gle.company = %s
				AND gle.account IN %s
				AND gle.posting_date >= %s
				AND gle.posting_date <= %s
				AND gle.docstatus = 1
		""", (company, tuple(account_names), month_start, month_end), as_dict=True)
		
		bal = 0.0
		if gl_entries and gl_entries[0]['balance'] is not None:
			bal = float(gl_entries[0]['balance'])
		balances.append(bal)
		labels.append(label)
		
	return balances, labels

def get_outstanding_receivables(company, as_of_date):
	"""Get total outstanding receivables as of a date"""
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
	"""Get total outstanding payables as of a date"""
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
		return 0.0
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
		
		# Current Period Dates
		start_date, end_date = get_period_dates(company, current_fy, filters)
		
		# Previous Period Dates
		prev_start_date = None
		prev_end_date = None
		if previous_fy:
			prev_start_date, prev_end_date = get_period_dates(company, previous_fy, filters, is_previous=True)
		
		# Determine number of days for DSO/DPO calculations
		number_of_days = date_diff(end_date, start_date) + 1

		# Get values for Sales from specific accounts
		sales_accounts = [
			'41 - REVENUE FROM OPERATIONS - RFAPL',
			'42 - BRANCH SALES CONTROL ACCOUNT - RFAPL',
			'43 - FREIGHT OUTWARD - RFAPL',
			'Direct Income - RFAPL'
		]
		ytd_total = sum(get_account_balance(company, acc, start_date, end_date) for acc in sales_accounts)
		pyd_total = sum(get_account_balance(company, acc, prev_start_date, prev_end_date) for acc in sales_accounts) if prev_start_date else 0.0
		
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
			cogs_ytd_total += get_account_balance(company, acc, start_date, end_date)
			if prev_start_date:
				cogs_pyd_total += get_account_balance(company, acc, prev_start_date, prev_end_date)
		
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
		cos_ytd_total = get_cost_centers_balance(company, cos_cost_centers, start_date, end_date)
		cos_pyd_total = get_cost_centers_balance(company, cos_cost_centers, prev_start_date, prev_end_date) if prev_start_date else 0.0
		
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
		coe_ytd_total = get_cost_centers_balance(company, coe_cost_centers, start_date, end_date)
		coe_pyd_total = get_cost_centers_balance(company, coe_cost_centers, prev_start_date, prev_end_date) if prev_start_date else 0.0
		
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
		coga_ytd_total = get_cost_centers_balance(company, coga_cost_centers, start_date, end_date)
		coga_pyd_total = get_cost_centers_balance(company, coga_cost_centers, prev_start_date, prev_end_date) if prev_start_date else 0.0
		
		coga_ytd_millions = round(convert_to_millions(coga_ytd_total), 2)
		coga_pyd_millions = round(convert_to_millions(coga_pyd_total), 2)
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
		rec_ytd = get_outstanding_receivables(company, end_date)
		rec_pyd = get_outstanding_receivables(company, prev_end_date) if prev_end_date else 0.0
		rec_ytd_millions = convert_to_millions(rec_ytd)
		rec_pyd_millions = convert_to_millions(rec_pyd)
		rec_var_val = (rec_ytd_millions - rec_pyd_millions) * 1000000
		rec_var_pct = calculate_variance_percentage(rec_ytd_millions, rec_pyd_millions)
		
		# Payables - Outstanding Amount
		pay_ytd = get_outstanding_payables(company, end_date)
		pay_pyd = get_outstanding_payables(company, prev_end_date) if prev_end_date else 0.0
		
		# Purchase total for DPO
		purchase_accounts = ['32 - DIRECT EXPENSES - RFAPL']
		purchase_ytd = sum(get_account_balance(company, acc, start_date, end_date) for acc in purchase_accounts)
		purchase_pyd = sum(get_account_balance(company, acc, prev_start_date, prev_end_date) for acc in purchase_accounts) if prev_start_date else 0.0
		pay_ytd_millions = convert_to_millions(pay_ytd)
		pay_pyd_millions = convert_to_millions(pay_pyd)
		pay_var_val = (pay_ytd_millions - pay_pyd_millions) * 1000000
		pay_var_pct = calculate_variance_percentage(pay_ytd_millions, pay_pyd_millions)
		
		# Working Capital = Receivables - Payables
		wc_ytd_millions = rec_ytd_millions - pay_ytd_millions
		wc_pyd_millions = rec_pyd_millions - pay_pyd_millions
		wc_var_val = (wc_ytd_millions - wc_pyd_millions) * 1000000
		wc_var_pct = calculate_variance_percentage(wc_ytd_millions, wc_pyd_millions)
		
		# Calculate monthly trends for Revenue & GM
		sales_ytd_monthly, month_labels = get_monthly_balances(company, sales_accounts, current_fy)
		cogs_ytd_monthly, _ = get_monthly_balances(company, cogs_accounts, current_fy)
		
		# Previous FY Monthly Values
		if previous_fy:
			sales_pyd_monthly, _ = get_monthly_balances(company, sales_accounts, previous_fy)
			cogs_pyd_monthly, _ = get_monthly_balances(company, cogs_accounts, previous_fy)
		else:
			sales_pyd_monthly = [0.0] * 12
			cogs_pyd_monthly = [0.0] * 12
			
		# Compute Gross Margin % trends
		ytd_gm_trend = []
		pyd_gm_trend = []
		for s_ytd, c_ytd in zip(sales_ytd_monthly, cogs_ytd_monthly):
			gm_pct = ((s_ytd - c_ytd) / s_ytd * 100) if s_ytd else 0.0
			ytd_gm_trend.append(round(gm_pct, 2))
			
		for s_pyd, c_pyd in zip(sales_pyd_monthly, cogs_pyd_monthly):
			gm_pct = ((s_pyd - c_pyd) / s_pyd * 100) if s_pyd else 0.0
			pyd_gm_trend.append(round(gm_pct, 2))

		# Generate Key Insights dynamically
		insights = []
		if prev_start_date and pyd_millions:
			sales_diff_pct = variance_pct
			if sales_diff_pct > 0:
				insights.append(f"Sales increased by {sales_diff_pct}% compared to PY.")
			elif sales_diff_pct < 0:
				insights.append(f"Sales decreased by {abs(sales_diff_pct)}% compared to PY.")
			else:
				insights.append("Sales remained unchanged compared to PY.")
		else:
			insights.append("Sales trend comparison not available.")

		if prev_start_date:
			if agm_var_pct > 0:
				insights.append(f"Gross Margin increased by {agm_var_pct}% compared to PY.")
			elif agm_var_pct < 0:
				insights.append(f"Gross Margin decreased by {abs(agm_var_pct)}% compared to PY.")
			else:
				insights.append("Gross Margin remained unchanged compared to PY.")
		else:
			insights.append("Gross Margin trend comparison not available.")

		if prev_start_date:
			om_part = f"Operating Margin increased by {om_var_pct}%" if om_var_pct > 0 else (f"Operating Margin decreased by {abs(om_var_pct)}%" if om_var_pct < 0 else "Operating Margin remained unchanged")
			wc_part = f"Working Capital increased by {wc_var_pct}%" if wc_var_pct > 0 else (f"Working Capital decreased by {abs(wc_var_pct)}%" if wc_var_pct < 0 else "Working Capital remained unchanged")
			insights.append(f"{om_part} and {wc_part} compared to PY.")
		else:
			insights.append("Operating Margin and Working Capital metrics to be reviewed.")

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
		month_labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
		sales_ytd_monthly = [0.0] * 12
		sales_pyd_monthly = [0.0] * 12
		ytd_gm_trend = [0.0] * 12
		pyd_gm_trend = [0.0] * 12
		insights = ["Error loading data."]
	
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
            "wcts": {
                "ytd": (ytd_millions / wc_ytd_millions) if wc_ytd_millions else 0,
                "pyd": (pyd_millions / wc_pyd_millions) if wc_pyd_millions else 0,
                "variance": 0
            },
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
					{"name": "Cost of Goods (Add Freight)", "ytd_val": cogs_ytd_millions * 1000000, "ytd_pct": cogs_ytd_pct, "pyd_val": cogs_pyd_millions * 1000000, "pyd_pct": cogs_pyd_pct, "var_val": cogs_var_val, "var_pct": cogs_var_pct},
					{"name": "%", "ytd_val": (cogs_ytd_millions / ytd_millions) * 100 if ytd_millions else 0, "ytd_pct": None, "pyd_val": (cogs_pyd_millions / pyd_millions) * 100 if pyd_millions else 0, "pyd_pct": None, "var_val": None, "var_pct": None},
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
					{"name": "Total SG&A", "ytd_val": sga_ytd_millions * 1000000, "ytd_pct": sga_ytd_pct, "pyd_val": sga_pyd_millions * 1000000, "pyd_pct": sga_pyd_pct, "var_val": sga_var_val, "var_pct": sga_var_pct, "is_indented": True},
					{"name": "OM (Operating Margin)", "ytd_val": om_ytd_millions * 1000000, "ytd_pct": om_ytd_pct, "pyd_val": om_pyd_millions * 1000000, "pyd_pct": om_pyd_pct, "var_val": om_var_val, "var_pct": om_var_pct, "is_indented": True}
				]
			},
			{
				"bucket": "4. WORKING CAPITAL",
				"sources": [
					{"name": "Receivables", "ytd_val": rec_ytd_millions * 1000000, "ytd_pct": None, "pyd_val": rec_pyd_millions * 1000000, "pyd_pct": None, "var_val": rec_var_val, "var_pct": rec_var_pct, "is_indented": True},
					{"name": "DSO (Days Sales Outstanding)", "ytd_val": ((rec_ytd_millions / ytd_millions) * number_of_days * 1000000) if ytd_millions else 0, "ytd_pct": None, "pyd_val": ((rec_pyd_millions / pyd_millions) * number_of_days * 1000000) if pyd_millions else 0, "pyd_pct": None, "var_val": (((rec_ytd_millions / ytd_millions * number_of_days) - (rec_pyd_millions / pyd_millions * number_of_days)) * 1000000) if ytd_millions and pyd_millions else 0, "var_pct": 0, "is_indented": True},
					{"name": "Payables", "ytd_val": pay_ytd_millions * 1000000, "ytd_pct": None, "pyd_val": pay_pyd_millions * 1000000, "pyd_pct": None, "var_val": pay_var_val, "var_pct": pay_var_pct, "is_indented": True},
					{"name": "DPO (Days Payables Outstanding)", "ytd_val": ((pay_ytd_millions / cogs_ytd_millions) * number_of_days * 1000000) if cogs_ytd_millions else 0, "ytd_pct": None, "pyd_val": ((pay_pyd_millions / cogs_pyd_millions) * number_of_days * 1000000) if cogs_pyd_millions else 0, "pyd_pct": None, "var_val": (((pay_ytd_millions / cogs_ytd_millions * number_of_days) - (pay_pyd_millions / cogs_pyd_millions * number_of_days)) * 1000000) if cogs_ytd_millions and cogs_pyd_millions else 0, "var_pct": 0, "is_indented": True},
					{"name": "Working Capital", "ytd_val": wc_ytd_millions * 1000000, "ytd_pct": None, "pyd_val": wc_pyd_millions * 1000000, "pyd_pct": None, "var_val": wc_var_val, "var_pct": wc_var_pct, "is_indented": True},
					{"name": "WCTs (Working Capital Turns)", "ytd_val": ((ytd_millions / wc_ytd_millions) * 1000000) if wc_ytd_millions else 0, "ytd_pct": None, "pyd_val": ((pyd_millions / wc_pyd_millions) * 1000000) if wc_pyd_millions else 0, "pyd_pct": None, "var_val": (((ytd_millions / wc_ytd_millions) - (pyd_millions / wc_pyd_millions)) * 1000000) if wc_ytd_millions and wc_pyd_millions else 0, "var_pct": 0, "is_indented": True}
				]
			},
		],
		"charts": {
			"revenue_trend": {
				"labels": month_labels,
				"ytd": sales_ytd_monthly,
				"pyd": sales_pyd_monthly
			},
			"gross_margin_trend": {
				"labels": month_labels,
				"ytd_gm": ytd_gm_trend,
				"pyd_gm": pyd_gm_trend
			},
			"waterfall": {
				"labels": ["PYD Sales", "Δ Sales", "Δ COGS", "Δ Opex", "YTD Sales"],
				"values": [pyd_millions * 1000000, (ytd_millions - pyd_millions) * 1000000, -cogs_var_val, -sga_var_val, ytd_millions * 1000000]
			},
			"working_capital": {
				"labels": ["Receivables", "Payables", "Working Capital"],
				"ytd": [rec_ytd_millions * 1000000, -pay_ytd_millions * 1000000, wc_ytd_millions * 1000000],
				"pyd": [rec_pyd_millions * 1000000, -pay_pyd_millions * 1000000, wc_pyd_millions * 1000000]
			}
		},
		"insights": insights
	}
