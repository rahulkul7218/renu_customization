import frappe
from frappe import _
from frappe.utils import flt, getdate
from renu_customization.renu_customization.report.sales_invoice_report.sales_invoice_report import execute
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from io import BytesIO
import base64
import json

@frappe.whitelist()
def export_to_pdf(html):
	frappe.response.filename = "sales_revenue_dashboard.pdf"
	frappe.response.type = "download"
	frappe.response.filecontent = frappe.utils.pdf.get_pdf(html, {"orientation": "Landscape"})


def prepare_filters(filters):
    if not filters:
        filters = {}
    elif isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    filters = frappe._dict(filters)

    # Handle DateRange from JS (Legacy/Compatibility)
    if filters.get("date_range"):
        dr = filters.get("date_range")
        if isinstance(dr, list) and len(dr) == 2:
            filters["from_date"] = dr[0]
            filters["to_date"] = dr[1]

    # Handle Company Default
    if not filters.get("company"):
        filters["company"] = frappe.defaults.get_user_default("company") or \
                           frappe.db.get_single_value('Global Defaults', 'default_company')

    # Handle Fiscal Year Interaction
    if filters.get("fiscal_year"):
        fy = frappe.get_doc("Fiscal Year", filters.get("fiscal_year"))
        if fy:
            # 1. If NO dates provided, use FY defaults
            if not filters.get("from_date"):
                filters["from_date"] = fy.year_start_date
            if not filters.get("to_date"):
                filters["to_date"] = fy.year_end_date
            
            # 2. If dates ARE provided, constrain them to the FY bounds
            if filters.get("from_date") and getdate(filters.from_date) < getdate(fy.year_start_date):
                filters["from_date"] = fy.year_start_date
            
            if filters.get("to_date") and getdate(filters.to_date) > getdate(fy.year_end_date):
                filters["to_date"] = fy.year_end_date
    
    return filters

@frappe.whitelist()
def get_dashboard_data(filters=None):
    filters = prepare_filters(filters)
    
    # Pass filters to report execution. Only include dates if they are explicitly set.
    base_filters = frappe._dict({
        "company": filters.company
    })
    if filters.get("from_date"):
        base_filters["from_date"] = filters.from_date
    if filters.get("to_date"):
        base_filters["to_date"] = filters.to_date
    
    report_result = execute(base_filters)
    columns = report_result[0]
    raw_data = report_result[1]
    
    if not raw_data:
        return {
            "summary": [], "charts": {}, "results": [], "columns": columns
        }

    # MANUALLY FILTER DATA (Since we cannot change the report script)
    data = []
    
    # Pre-fetch filter mappings for performance if needed
    customer_map = {}
    item_map = {}
    invoice_map = {}
    status_map = {}

    inv_names = list(set([d.get("invoice_id") or d.get("name") or d.get("parent") for d in raw_data if d.get("invoice_id") or d.get("name") or d.get("parent")])) if raw_data else []

    if inv_names:
        # 3. Fetch Income-related Charges from Taxes table (Freight, Services, etc.) using precise Account Types
        # Also fetch Global Discounts to subtract them from item revenue
        account_list = frappe.get_all("Account", fields=["name", "root_type"], limit_page_length=None)
        income_accounts = {a.name for a in account_list if a.root_type == "Income"}
        
        tax_rows = frappe.get_all("Sales Taxes and Charges", 
                                  filters={"parent": ("in", inv_names)},
                                  fields=["parent", "account_head", "base_tax_amount"],
                                  limit_page_length=None)
        
        invoice_income_charges = {}
        for tr in tax_rows:
            if tr.account_head in income_accounts:
                invoice_income_charges[tr.parent] = invoice_income_charges.get(tr.parent, 0) + flt(tr.base_tax_amount)
        
        # 4. Fetch Invoice level info for classification and discounts
        invoices = frappe.get_all("Sales Invoice", filters={"name": ("in", inv_names)}, 
                                  fields=["name", "customer", "status", "invoice_type", "is_domestic", "is_export", 
                                          "base_discount_amount", "base_total", "base_net_total", "base_grand_total"],
                                  limit_page_length=None)
        
        invoice_map = {i.name: i.customer for i in invoices}
        status_map = {i.name: i.status for i in invoices}
        type_map = {i.name: i.invoice_type for i in invoices}
        invoice_discount_map = {i.name: flt(i.base_discount_amount) for i in invoices}
        invoice_total_map = {i.name: flt(i.base_total) for i in invoices}
        invoice_grand_total_map = {i.name: flt(i.base_grand_total) for i in invoices}
        invoice_net_total_map = {i.name: i.base_net_total for i in invoices}
        
    # 5. FETCH MASTER REVENUE FROM GL ENTRIES (Exactly as P&L does)
    # This ensures 100% match with Profit & Loss "Total Income"
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    company = filters.get("company")
    
    master_gl_income = 0
    if company:
        # Find all accounts where root_type is Income for this company
        gl_query = """
            SELECT SUM(gl.credit - gl.debit) as total_income
            FROM `tabGL Entry` gl
            JOIN `tabAccount` acc ON gl.account = acc.name
            WHERE gl.company = %(company)s 
            AND gl.is_cancelled = 0
            AND acc.root_type = 'Income'
        """
        query_params = {"company": company}
        
        if filters.get("from_date"):
            gl_query += " AND gl.posting_date >= %(from_date)s "
            query_params["from_date"] = filters.from_date
        if filters.get("to_date"):
            gl_query += " AND gl.posting_date <= %(to_date)s "
            query_params["to_date"] = filters.to_date
            
        gl_data = frappe.db.sql(gl_query, query_params, as_dict=1)
        master_gl_income = flt(gl_data[0].total_income) if gl_data else 0
    
    # 6. CALCULATE GLOBAL ALIGNMENT FACTOR (Before User Filtering)
    # We must calculate this based on EVERYTHING returned by execute() 
    # to avoid wild fluctuations when user filters for a specific salesperson/customer.
    global_total_invoice_rev = 0
    unique_items_global = set()
    
    for row in raw_data:
        inv_id = row.get("invoice_id") or row.get("name") or row.get("parent")
        sr_no = row.get("sr_no")
        item_key = (inv_id, sr_no)
        
        if item_key not in unique_items_global:
            is_return = flt(row.get("is_return") or 0)
            base_amt_raw = flt(row.get("base_amount_raw") or row.get("base_amount") or 0)
            if is_return: base_amt_raw = -abs(base_amt_raw)
            
            si_total = flt(invoice_total_map.get(inv_id, 0))
            inv_charges = flt(invoice_income_charges.get(inv_id, 0))
            inv_discount = flt(invoice_discount_map.get(inv_id, 0))
            
            if si_total > 0:
                share_factor = base_amt_raw / si_total
                item_charge_share = share_factor * inv_charges
                item_discount_share = share_factor * inv_discount
            else:
                item_charge_share = 0
                item_discount_share = 0
                
            # For "Sales Invoice Data" revenue, we only use base amount and item-level discounts
            # This ensures we match the sum of base_net_total exactly (Target: 162,061,181.73)
            rev_item = base_amt_raw - item_discount_share
            global_total_invoice_rev += rev_item
            unique_items_global.add(item_key)

    # ALIGNMENT FACTOR: Disabled to match "Sales Invoice Data" exactly as requested.
    # The previous GL alignment included non-invoice income accounts (Duty Drawback etc.)
    alignment_factor = 1.0
    # if global_total_invoice_rev > 0 and master_gl_income > 0:
    #    alignment_factor = master_gl_income / global_total_invoice_rev

    if inv_names:
        # Build domestic/export classification map
        dom_exp_map = {}
        for i in invoices:
            if i.is_domestic: 
                dom_exp_map[i.name] = "Domestic"
            elif i.is_export: 
                dom_exp_map[i.name] = "Export"
            elif i.invoice_type and "Domestic" in i.invoice_type:
                dom_exp_map[i.name] = "Domestic"
            elif i.invoice_type and "Export" in i.invoice_type:
                dom_exp_map[i.name] = "Export"
            else: 
                dom_exp_map[i.name] = ""

    # Fetch customer info for classification and filtering
    cust_list = frappe.get_all("Customer", fields=["name", "customer_group", "territory"], limit_page_length=None)
    customer_map = {c.name: c for c in cust_list}
        
    # Fetch item metadata (Always needed for freight exclusion and item group filtering)
    item_list = frappe.get_all("Item", fields=["name", "item_group", "is_stock_item", "custom_is_freight_item"], limit_page_length=None)
    item_map = {i.name: i for i in item_list}

    # 7. APPLY USER FILTERS
    data = []
    for row in raw_data:
        keep = True
        inv_id = row.get("invoice_id") or row.get("name") or row.get("parent")
        inv_cust_id = invoice_map.get(inv_id)
        
        # Sales Person
        sp_filter = filters.get("sales_person")
        if keep and sp_filter:
            row_sp = str(row.get("sales_person") or row.get("sales_team") or row.get("sales_team_member") or "").strip().lower()
            f_sp = str(sp_filter).strip().lower()
            if f_sp not in row_sp: keep = False
            
        # Customer
        cust_filter = filters.get("customer") or filters.get("customer_name")
        if keep and cust_filter:
            f_cust = str(cust_filter).strip().lower()
            row_cust_id = str(inv_cust_id or "").strip().lower()
            row_cust_name = str(row.get("customer_name") or row.get("customer") or "").strip().lower()
            if f_cust != row_cust_id and f_cust != row_cust_name and f_cust not in row_cust_name: keep = False
            
        # Product
        prod_filter = filters.get("item") or filters.get("item_code")
        if keep and prod_filter:
            f_prod = str(prod_filter).strip().lower()
            row_prod_code = str(row.get("item_code") or "").strip().lower()
            row_prod_name = str(row.get("item_name") or "").strip().lower()
            if f_prod != row_prod_code and f_prod != row_prod_name: keep = False
            
        # Product Group
        ig_filter = filters.get("item_group")
        if keep and ig_filter:
            item_info = item_map.get(row.get("item_code"))
            if not item_info or str(item_info.item_group) != str(ig_filter): keep = False

        # Customer Group
        cg_filter = filters.get("customer_group")
        if keep and cg_filter:
            cust_info = customer_map.get(inv_cust_id)
            if not cust_info or str(cust_info.customer_group) != str(cg_filter): keep = False
                
        # Territory
        t_filter = filters.get("territory")
        if keep and t_filter:
            cust_info = customer_map.get(inv_cust_id)
            if not cust_info or str(cust_info.territory) != str(t_filter): keep = False
                
        # Status
        stat_filter = filters.get("status")
        if keep and stat_filter:
            current_status = status_map.get(inv_id)
            if isinstance(stat_filter, str): stat_filter = [s.strip() for s in stat_filter.split(",")]
            if current_status not in stat_filter: keep = False

        row["status"] = status_map.get(inv_id)
        row["invoice_type"] = type_map.get(inv_id)
        row["dom_exp"] = dom_exp_map.get(inv_id, "")
        
        if keep and row["status"] in ["Cancelled", "Draft"]: keep = False

        # Type (Domestic/Export)
        dom_exp_f = filters.get("dom_exp")
        if keep and dom_exp_f:
            if str(dom_exp_f) != str(row.get("dom_exp")): keep = False

        # Invoice Type
        inv_type_f = filters.get("invoice_type")
        if keep and inv_type_f:
            if str(inv_type_f) != str(row.get("invoice_type")): keep = False

        if keep:
            cust_id = row.get("customer") or invoice_map.get(inv_id)
            c_info = customer_map.get(cust_id)
            row["customer_group"] = c_info.customer_group if c_info else ""
            is_cp = False
            if row["customer_group"]:
                cg = row["customer_group"].lower()
                if any(term in cg for term in ["system integrator", "distributor", "partner", "reseller"]):
                    is_cp = True
            row["is_channel_partner"] = is_cp
            data.append(row)

    if not data:
        return { "summary": [], "charts": {}, "results": [], "columns": columns }

    # 8. PASS 2: CALCULATE ATTRIBUTED TOTALS (RESPECTING FILTERS)
    # Strategy: 
    # - Apply global alignment factor to filtered items
    # - Sum for KPIs using allocated amounts (respects salesperson shares)
    
    total_net_rev = 0
    total_grand_rev = 0
    total_returned_rev = 0
    dom_rev = 0
    exp_rev = 0
    cp_rev = 0
    dom_returned = 0
    exp_returned = 0
    cp_returned = 0
    
    for row in data:
        inv_id = row.get("invoice_id") or row.get("name") or row.get("parent")
        is_return = flt(row.get("is_return") or 0)
        base_amt_raw = flt(row.get("base_amount_raw") or row.get("base_amount") or 0)
        if is_return: base_amt_raw = -abs(base_amt_raw)
        
        si_total = flt(invoice_total_map.get(inv_id, 0))
        inv_charges = flt(invoice_income_charges.get(inv_id, 0))
        inv_discount = flt(invoice_discount_map.get(inv_id, 0))
        
        if si_total > 0:
            share_factor = base_amt_raw / si_total
            item_charge_share = share_factor * inv_charges
            item_discount_share = share_factor * inv_discount
        else:
            item_charge_share = 0
            item_discount_share = 0
            
        # Match the "Sales Invoice Data" calculation (Base - Discount)
        rev_with_adjustments = (base_amt_raw - item_discount_share) * alignment_factor
        
        # Attribution for Charts (Handles multiple sales persons per row)
        alloc_p = flt(row.get("allocated_percentage") or 100)
        amt_allocated = rev_with_adjustments * (alloc_p / 100)
        
        si_net = flt(invoice_net_total_map.get(inv_id, 0))
        si_grand = flt(invoice_grand_total_map.get(inv_id, 0))
        gross_factor = (si_grand / si_net) if si_net else 1.0
        gross_amt_allocated = amt_allocated * gross_factor
        
        # Store for frontend/export (in Million INR)
        row["gross_amount"] = gross_amt_allocated / 1000000
        row["amt_allocated"] = amt_allocated / 1000000
        row["base_amount"] = (base_amt_raw * alignment_factor * (alloc_p / 100)) / 1000000

        # Sum for KPIs (Allocated amounts ensure correctness even with shared items)
        total_net_rev += amt_allocated
        total_grand_rev += gross_amt_allocated
        
        if is_return:
            total_returned_rev += abs(amt_allocated)
        
        d_e = row.get("dom_exp")
        if d_e == "Domestic":
            dom_rev += amt_allocated
            if is_return: dom_returned += abs(amt_allocated)
        elif d_e == "Export":
            exp_rev += amt_allocated
            if is_return: exp_returned += abs(amt_allocated)
        
        if row.get("is_channel_partner"):
            cp_rev += amt_allocated
            if is_return: cp_returned += abs(amt_allocated)

    report_summary = [
        {"label": _("Net Revenue"), "value": total_net_rev / 1000000, "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Gross Revenue (Grand)"), "value": total_grand_rev / 1000000, "indicator": "cyan", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Domestic Net Revenue"), "value": dom_rev / 1000000, "indicator": "green", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Export Net Revenue"), "value": exp_rev / 1000000, "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("CP Net Revenue"), "value": cp_rev / 1000000, "indicator": "purple", "fieldtype": "Currency", "currency": "INR"}
    ]

    sp_revenue = {}
    cust_revenue = {}
    prod_revenue = {}
    
    for row in data:
        sp = row.get("sales_person") or "No Sales Person"
        amt = row.get("amt_allocated") or 0
        sp_revenue[sp] = sp_revenue.get(sp, 0) + amt
        
        cust = row.get("customer_name") or row.get("customer") or "Unknown Customer"
        cust_revenue[cust] = cust_revenue.get(cust, 0) + amt
        
        prod_name = row.get("item_name") or row.get("item_code") or "Unknown Product"
        prod_revenue[prod_name] = prod_revenue.get(prod_name, 0) + amt

    def get_chart_def(title, data_dict, limit=10):
        sorted_items = sorted(data_dict.items(), key=lambda x: x[1], reverse=True)
        top_items = sorted_items[:limit]
        return {
            "title": title,
            "data": {
                "labels": [x[0] for x in top_items],
                "datasets": [{"name": title, "values": [flt(x[1], 4) for x in top_items]}]
            },
            "type": "donut",
            "height": 300,
            "colors": ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e', '#ecf0f1', '#1abc9c', '#d35400', '#7f8c8d']
        }

    return {
        "summary": report_summary,
        "charts": {
            "top_10_salesperson": get_chart_def("Top 10 Salesperson by Revenue", sp_revenue, limit=10),
            "top_10_customers": get_chart_def("Top 10 Customers by Revenue", cust_revenue, limit=10),
            "top_10_products": get_chart_def("Top 10 Products by Revenue", prod_revenue, limit=10)
        },
        "results": data,
        "columns": columns
    }

from openpyxl.styles import Alignment, Font, PatternFill, Border, Side

@frappe.whitelist()
def export_to_excel(filters=None, export_type="all"):
    filters = prepare_filters(filters)
    
    # Use the dashboard's data fetching logic to ensure filters are applied
    dashboard_data = get_dashboard_data(filters)
    data = dashboard_data.get("results")
    summary = dashboard_data.get("summary")
    charts = dashboard_data.get("charts")
    
    if not data:
        return None

    wb = openpyxl.Workbook()
    
    # Conditionally create sheets based on export_type
    if export_type == "all":
        ws_overview = wb.active
        ws_overview.title = "Dashboard Overview"
        ws_months = wb.create_sheet("Month-Wise Revenue")
        ws_list = wb.create_sheet("Sales Invoices List")
    elif export_type == "summary":
        ws_months = wb.active
        ws_months.title = "Month-Wise Revenue"
        # We might need dummy sheets for the logic below if we don't wrap it carefully
        ws_overview = wb.create_sheet("Dummy1")
        ws_list = wb.create_sheet("Dummy2")
    elif export_type == "detail":
        ws_list = wb.active
        ws_list.title = "Sales Invoices List"
        ws_overview = wb.create_sheet("Dummy1")
        ws_months = wb.create_sheet("Dummy2")
    
    # Styling Helpers
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2c3e50", fill_type="solid")
    title_font = Font(bold=True, size=14)
    section_font = Font(bold=True, size=12)
    footer_font = Font(bold=True, color="000000")
    thin_side = Side(style='thin')
    table_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    zebra_fill = PatternFill(start_color="f8f9fa", fill_type="solid")

    row_idx = 1
    
    # -------------------------------------------------------------------------
    # Sheet 1: Dashboard Overview (KPIs & Top 10 Tables)
    # -------------------------------------------------------------------------
    if export_type == "all":
        ws_overview.cell(row=row_idx, column=1, value="Sales Revenue Dashboard Overview").font = title_font
        ws_overview.cell(row=row_idx, column=5, value="Generated On: " + frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S"))
        row_idx += 2
     
        # 1. Summary Section (KPI Grid)
        ws_overview.cell(row=row_idx, column=1, value="1. Revenue Summary (Million INR)").font = section_font
        row_idx += 1
        
        summary_start_row = row_idx
        colors = {
            "blue": "3498db", "green": "2ecc71", "orange": "e67e22", "purple": "9b59b6", "red": "e74c3c"
        }
     
        for i, s in enumerate(summary):
            r = summary_start_row + (i // 4) * 3
            c = 1 + (i % 4) * 2
            
            # Label
            cell_l = ws_overview.cell(row=r, column=c, value=s.get('label'))
            cell_l.font = Font(bold=True, color="FFFFFF")
            indicator = s.get('indicator', 'blue').lower()
            bg_color = colors.get(indicator, "3498db")
            cell_l.fill = PatternFill(start_color=bg_color, fill_type="solid")
            cell_l.alignment = Alignment(horizontal="center")
            
            # Value (Converted to Million)
            val = flt(s.get('value'))
            cell_v = ws_overview.cell(row=r+1, column=c, value=val)
            cell_v.font = Font(bold=True, size=12)
            cell_v.number_format = '"₹ "#,##0.0000" M"'
            cell_v.alignment = Alignment(horizontal="center")
            cell_v.border = Border(left=Side(style='medium', color=bg_color), 
                                   right=Side(style='medium', color=bg_color), 
                                   bottom=Side(style='medium', color=bg_color))
            
            ws_overview.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c+1)
            ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)
     
        row_idx = summary_start_row + 6
        row_idx += 1
     
        def write_chart_section(title, chart_data):
            nonlocal row_idx
            ws_overview.cell(row=row_idx, column=1, value=title).font = section_font
            row_idx += 1
            
            headers = ["Category", "Amount (M)", "Share %"]
            for idx, h in enumerate(headers, start=1):
                cell = ws_overview.cell(row=row_idx, column=idx, value=h)
                cell.font = header_font
                cell.fill = PatternFill(start_color="34495e", fill_type="solid")
                cell.border = table_border
                cell.alignment = Alignment(horizontal="center")
            row_idx += 1
                
            labels = chart_data.get("data", {}).get("labels", [])
            values = chart_data.get("data", {}).get("datasets", [{}])[0].get("values", [])
            total_val = sum(values) if values else 1
            
            for i in range(len(labels)):
                row_fill = zebra_fill if i % 2 == 0 else None
                c1 = ws_overview.cell(row=row_idx, column=1, value=labels[i])
                c1.border = table_border
                if row_fill: c1.fill = row_fill
                
                val_m = flt(values[i])
                c2 = ws_overview.cell(row=row_idx, column=2, value=val_m)
                c2.number_format = '"₹ "#,##0.0000" M"'
                c2.border = table_border
                c2.alignment = Alignment(horizontal="right")
                if row_fill: c2.fill = row_fill
                
                share = (values[i] / total_val) if total_val else 0
                c3 = ws_overview.cell(row=row_idx, column=3, value=share)
                c3.number_format = "0.00%"
                c3.border = table_border
                c3.alignment = Alignment(horizontal="center")
                if row_fill: c3.fill = row_fill
                row_idx += 1
            row_idx += 2
            
        if charts.get("top_10_salesperson", {}).get("data", {}).get("labels"):
            write_chart_section("2. Top 10 Salesperson", charts["top_10_salesperson"])
        if charts.get("top_10_customers", {}).get("data", {}).get("labels"):
            write_chart_section("3. Top 10 Customers", charts["top_10_customers"])
        if charts.get("top_10_products", {}).get("data", {}).get("labels"):
            write_chart_section("4. Top 10 Products", charts["top_10_products"])

    if export_type in ["all", "summary"]:
        # -------------------------------------------------------------------------
        # Sheet 2: Month-Wise Revenue
        # -------------------------------------------------------------------------
        row_idx = 1
        ws_months.cell(row=row_idx, column=1, value="Month-Wise Consolidated Revenue (Million INR)").font = section_font
        row_idx += 1
        
        merged_data = {}
        months_set = set()
        for row in data:
            sp = row.get("sales_person") or "-"
            cust = row.get("customer_name") or row.get("customer") or "-"
            prod = row.get("item_name") or row.get("item_code") or "-"
            amt = row.get("amt_allocated") or 0
            gross_amt = row.get("gross_amount") or amt
    
            date_str = str(row.get("delivery_date") or row.get("invoice_date") or row.get("posting_date") or "")
            try:
                d = frappe.utils.getdate(date_str)
                m_key = d.strftime("%b %Y")
                m_sort = d.strftime("%Y%m")
            except:
                m_key = "Unknown"
                m_sort = "000000"
                
            months_set.add((m_sort, m_key))
            key = f"{cust}|{sp}|{prod}"
            if key not in merged_data:
                merged_data[key] = {"cust": cust, "sp": sp, "prod": prod, "months": {}, "total": 0, "total_gross": 0}
            merged_data[key]["months"][m_key] = merged_data[key]["months"].get(m_key, 0) + amt
            merged_data[key]["total"] += amt
            merged_data[key]["total_gross"] += gross_amt
            
        sorted_months = [x[1] for x in sorted(list(months_set), key=lambda x: x[0])]
        headers = ["S.No.", "Customer", "Sales Person", "Product"] + sorted_months + ["Total (Net)", "Grand Total (Gross)"]
        
        for idx, h in enumerate(headers, start=1):
            cell = ws_months.cell(row=row_idx, column=idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
            cell.border = table_border
        row_idx += 1
            
        for r_idx, row in enumerate(sorted(merged_data.values(), key=lambda x: x["total"], reverse=True)):
            row_fill = zebra_fill if r_idx % 2 != 0 else None
            
            c_no = ws_months.cell(row=row_idx, column=1, value=r_idx + 1)
            c1 = ws_months.cell(row=row_idx, column=2, value=row["cust"])
            c2 = ws_months.cell(row=row_idx, column=3, value=row["sp"])
            c3 = ws_months.cell(row=row_idx, column=4, value=row["prod"])
            for c in [c_no, c1, c2, c3]:
                c.border = table_border
                if row_fill: c.fill = row_fill
                
            col_idx = 5
            for m_key in sorted_months:
                v_m = flt(row["months"].get(m_key, 0))
                c = ws_months.cell(row=row_idx, column=col_idx, value=v_m)
                c.number_format = '"₹ "#,##0.0000" M"'
                c.border = table_border
                c.alignment = Alignment(horizontal="right")
                if row_fill: c.fill = row_fill
                col_idx += 1
                
            tot_m = flt(row["total"])
            c_tot = ws_months.cell(row=row_idx, column=col_idx, value=tot_m)
            c_tot.number_format = '"₹ "#,##0.0000" M"'
            c_tot.font = Font(bold=True)
            c_tot.fill = PatternFill(start_color="ecf0f1", fill_type="solid")
            c_tot.border = table_border
            c_tot.alignment = Alignment(horizontal="right")
            col_idx += 1
            
            tot_g = flt(row["total_gross"])
            c_g = ws_months.cell(row=row_idx, column=col_idx, value=tot_g)
            c_g.number_format = '"₹ "#,##0.0000" M"'
            c_g.font = Font(bold=True)
            c_g.fill = PatternFill(start_color="f1f5f9", fill_type="solid") # Slightly different for gross
            c_g.border = table_border
            c_g.alignment = Alignment(horizontal="right")
            
            row_idx += 1
    
        # Add Footer Rows in Excel
        ws_months.cell(row=row_idx, column=1, value="Grand Total (Net)").font = header_font
        ws_months.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=4)
        for c in range(1, 5):
            ws_months.cell(row=row_idx, column=c).fill = header_fill
            ws_months.cell(row=row_idx, column=c).border = table_border
        
        col_idx = 5
        m_totals_net = {}
        m_totals_gross = {}
        m_totals_returned = {}
        g_total_net = 0
        g_total_gross = 0
        g_total_returned = 0
        
        # Pre-calculate totals for footer
        for r in merged_data.values():
            g_total_net += r["total"]
            g_total_gross += r["total_gross"]
            for mk, mv in r["months"].items():
                m_totals_net[mk] = m_totals_net.get(mk, 0) + mv
                
        # We need to calculate monthly gross totals properly too
        for row in data:
            date_str = str(row.get("delivery_date") or row.get("invoice_date") or row.get("posting_date") or "")
            try:
                d = frappe.utils.getdate(date_str)
                m_key = d.strftime("%b %Y")
            except: m_key = "Unknown"
            
            gross_amt = flt(row.get("gross_amount") or 0)
            m_totals_gross[m_key] = m_totals_gross.get(m_key, 0) + gross_amt
            
            if row.get("is_return"):
                ret_val = abs(flt(row.get("amt_allocated") or 0))
                m_totals_returned[m_key] = m_totals_returned.get(m_key, 0) + ret_val
                g_total_returned += ret_val
    
        for m_key in sorted_months:
            v_net = flt(m_totals_net.get(m_key, 0))
            c = ws_months.cell(row=row_idx, column=col_idx, value=v_net)
            c.number_format = '"₹ "#,##0.0000" M"'
            c.font = header_font
            c.fill = header_fill
            c.border = table_border
            c.alignment = Alignment(horizontal="right")
            col_idx += 1
            
        c_gn = ws_months.cell(row=row_idx, column=col_idx, value=g_total_net)
        c_gn.number_format = '"₹ "#,##0.0000" M"'
        c_gn.font = header_font
        c_gn.fill = header_fill
        c_gn.border = table_border
        c_gn.alignment = Alignment(horizontal="right")
        col_idx += 1
        
        c_sep = ws_months.cell(row=row_idx, column=col_idx, value="-")
        c_sep.font = header_font
        c_sep.fill = header_fill
        c_sep.border = table_border
        c_sep.alignment = Alignment(horizontal="center")
        
        row_idx += 1
        
        # 3. Grand Total (Gross)
        ws_months.cell(row=row_idx, column=1, value="Grand Total (Gross)").font = header_font
        ws_months.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=4)
        for c in range(1, 5):
            ws_months.cell(row=row_idx, column=c).fill = header_fill
            ws_months.cell(row=row_idx, column=c).border = table_border
            
        col_idx = 5
        for m_key in sorted_months:
            v_gross = flt(m_totals_gross.get(m_key, 0))
            c = ws_months.cell(row=row_idx, column=col_idx, value=v_gross)
            c.number_format = '"₹ "#,##0.0000" M"'
            c.font = header_font
            c.fill = header_fill
            c.border = table_border
            c.alignment = Alignment(horizontal="right")
            col_idx += 1
    
        c_sep2 = ws_months.cell(row=row_idx, column=col_idx, value="-")
        c_sep2.font = header_font
        c_sep2.fill = header_fill
        c_sep2.border = table_border
        c_sep2.alignment = Alignment(horizontal="center")
        col_idx += 1
        
        c_gg = ws_months.cell(row=row_idx, column=col_idx, value=g_total_gross)
        c_gg.number_format = '"₹ "#,##0.0000" M"'
        c_gg.font = header_font
        c_gg.fill = header_fill
        c_gg.border = table_border
        c_gg.alignment = Alignment(horizontal="right")
        
        row_idx += 2

    if export_type in ["all", "detail"]:
        # -------------------------------------------------------------------------
        # Sheet 3: Sales Invoices List
        # -------------------------------------------------------------------------
        row_idx = 1
        ws_list.cell(row=row_idx, column=1, value="Detailed Sales Invoices List (Million INR)").font = section_font
        row_idx += 1
        
        ui_columns = [
            {"label": "S.No.", "fieldname": "sr_no_idx", "width": 8},
            {"label": "Invoice ID", "fieldname": "invoice_id", "width": 18},
            {"label": "Date", "fieldname": "invoice_date", "width": 14},
            {"label": "Type", "fieldname": "dom_exp", "width": 14},
            {"label": "Invoice Type", "fieldname": "invoice_type", "width": 20},
            {"label": "Status", "fieldname": "status", "width": 14},
            {"label": "Customer", "fieldname": "customer_name", "width": 25},
            {"label": "Item", "fieldname": "item_code", "width": 20},
            {"label": "Sales Person", "fieldname": "sales_person", "width": 20},
            {"label": "Qty", "fieldname": "qty", "width": 10},
            {"label": "Amount (M)", "fieldname": "base_amount", "width": 18},
        ]
        
        for idx, col in enumerate(ui_columns, start=1):
            cell = ws_list.cell(row=row_idx, column=idx, value=col["label"])
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
            cell.border = table_border
            ws_list.column_dimensions[get_column_letter(idx)].width = col["width"]
        row_idx += 1
        
        for r_idx, row in enumerate(data):
            row_fill = zebra_fill if r_idx % 2 != 0 else None
            for idx, col in enumerate(ui_columns, start=1):
                fname = col["fieldname"]
                val = row.get(fname)
                
                if fname == "sr_no_idx":
                    val = r_idx + 1
                elif fname == "invoice_date":
                    val = row.get("delivery_date") or row.get("invoice_date") or row.get("posting_date")
                
                cell = ws_list.cell(row=row_idx, column=idx)
                cell.border = table_border
                if row_fill: cell.fill = row_fill
                
                if fname in ["qty", "base_amount"]:
                    num_val = flt(val or 0)
                    if fname == "base_amount":
                        num_val = flt(row.get("amt_allocated") or 0)
                        cell.number_format = '"₹ "#,##0.0000" M"'
                    else:
                        cell.number_format = "#,##0.00"
                    cell.value = num_val
                    cell.alignment = Alignment(horizontal="right")
                else:
                    cell.value = str(val) if val is not None else ""
                    cell.alignment = Alignment(horizontal="left")
            row_idx += 1
        
        # -------------------------------------------------------------------------
        # Add Total Row for Detailed Invoice List
        # -------------------------------------------------------------------------
        ws_list.cell(row=row_idx, column=1, value="Grand Total").font = header_font
        ws_list.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=10)
        for c in range(1, 11):
            ws_list.cell(row=row_idx, column=c).fill = header_fill
            ws_list.cell(row=row_idx, column=c).border = table_border
    
        # Calculate Total Amount for the list
        total_list_amt = 0
        for row in data:
            total_list_amt += (row.get("amt_allocated") or 0)
    
        cell_total = ws_list.cell(row=row_idx, column=11, value=total_list_amt)
        cell_total.font = header_font
        cell_total.fill = header_fill
        cell_total.number_format = '"₹ "#,##0.0000" M"'
        cell_total.alignment = Alignment(horizontal="right")
        cell_total.border = table_border

    # Remove dummy sheets if created
    for dummy_name in ["Dummy1", "Dummy2"]:
        if dummy_name in wb.sheetnames:
            wb.remove(wb[dummy_name])

    # Final Column Widths Adjustments
    if "Dashboard Overview" in wb.sheetnames:
        for i in range(1, 10):
            wb["Dashboard Overview"].column_dimensions[get_column_letter(i)].width = 20
    if "Month-Wise Revenue" in wb.sheetnames:
        for i in range(1, 10):
            wb["Month-Wise Revenue"].column_dimensions[get_column_letter(i)].width = 20

    # Save
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"Sales_Revenue_Dashboard_{frappe.utils.nowdate()}.xlsx"
    if export_type == "summary":
        filename = f"Month_Wise_Consolidated_Revenue_{frappe.utils.nowdate()}.xlsx"
    elif export_type == "detail":
        filename = f"Sales_Invoices_List_{frappe.utils.nowdate()}.xlsx"

    return {
        "filename": filename,
        "filecontent": base64.b64encode(output.read()).decode()
    }

