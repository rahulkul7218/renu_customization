import frappe
from frappe import _
from frappe.utils import flt
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
	frappe.response.type = "binary"
	frappe.response.filecontent = frappe.utils.pdf.get_pdf(html, {"orientation": "Landscape"})


def prepare_filters(filters):
    if not filters:
        filters = {}
    elif isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    # Handle DateRange from JS
    if filters.get("date_range"):
        date_range = filters.get("date_range")
        if isinstance(date_range, list) and len(date_range) == 2:
            filters["from_date"] = date_range[0]
            filters["to_date"] = date_range[1]
    
    return frappe._dict(filters)

@frappe.whitelist()
def get_dashboard_data(filters=None):
    filters = prepare_filters(filters)
    
    # Handle Fiscal Year
    if filters.get("fiscal_year"):
        fy = frappe.get_doc("Fiscal Year", filters.fiscal_year)
        if fy:
            filters["from_date"] = fy.year_start_date
            filters["to_date"] = fy.year_end_date

    # Pass only date filters to report execution to get the full dataset for the period.
    # We apply all other filters manually below to avoid inconsistencies in the report script.
    base_filters = frappe._dict({
        "from_date": filters.from_date,
        "to_date": filters.to_date
    })
    
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

    # Always fetch invoice info (customer, status, type, flags) to ensure filtered matching works correctly
    if inv_names:
        invoices = frappe.get_all("Sales Invoice", filters={"name": ("in", inv_names)}, fields=["name", "customer", "status", "invoice_type", "is_domestic", "is_export"])
        invoice_map = {i.name: i.customer for i in invoices}
        status_map = {i.name: i.status for i in invoices}
        type_map = {i.name: i.invoice_type for i in invoices}
        
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
    cust_list = frappe.get_all("Customer", fields=["name", "customer_group", "territory"])
    customer_map = {c.name: c for c in cust_list}
        
    if filters.get("item_group"):
        item_list = frappe.get_all("Item", fields=["name", "item_group"])
        item_map = {i.name: i for i in item_list}

    for row in raw_data:
        # Check Filters
        keep = True
        inv_id = row.get("invoice_id") or row.get("name") or row.get("parent")
        inv_cust_id = invoice_map.get(inv_id)
        
        # 1. Sales Person
        sp_filter = filters.get("sales_person")
        if keep and sp_filter:
            # Check all likely row field names for sales person
            row_sp = str(row.get("sales_person") or row.get("sales_team") or row.get("sales_team_member") or row.get("sales_team_member_name") or "").strip().lower()
            f_sp = str(sp_filter).strip().lower()
            if f_sp not in row_sp:
                keep = False
            
        # 2. Customer
        cust_filter = filters.get("customer") or filters.get("customer_name")
        if keep and cust_filter:
            f_cust = str(cust_filter).strip().lower()
            # Check row fields and invoice mapping
            row_cust_id = str(inv_cust_id or "").strip().lower()
            row_cust_name = str(row.get("customer") or row.get("customer_name") or row.get("customer_id") or "").strip().lower()
            
            if f_cust != row_cust_id and f_cust != row_cust_name and f_cust not in row_cust_name:
                keep = False
            
        # 3. Product (Check Item Code, Item Name, etc.)
        prod_filter = filters.get("item") or filters.get("item_code") or filters.get("product")
        if keep and prod_filter:
            f_prod = str(prod_filter).strip().lower()
            row_prod_code = str(row.get("item_code") or row.get("item") or "").strip().lower()
            row_prod_name = str(row.get("item_name") or row.get("product_name") or "").strip().lower()
            
            if f_prod != row_prod_code and f_prod != row_prod_name and f_prod not in row_prod_name:
                keep = False
            
        # 4. Product Group
        ig_filter = filters.get("item_group")
        if keep and ig_filter:
            item_info = item_map.get(row.get("item_code"))
            if not item_info or str(item_info.item_group) != str(ig_filter):
                keep = False

        # 5. Customer Group
        cg_filter = filters.get("customer_group")
        if keep and cg_filter:
            cust_info = customer_map.get(inv_cust_id)
            if not cust_info or str(cust_info.customer_group) != str(cg_filter):
                keep = False
                
        # 6. Territory
        t_filter = filters.get("territory")
        if keep and t_filter:
            cust_info = customer_map.get(inv_cust_id)
            if not cust_info or str(cust_info.territory) != str(t_filter):
                keep = False
                
        # 7. Status (MultiSelect)
        stat_filter = filters.get("status")
        if keep and stat_filter:
            current_status = status_map.get(inv_id)
            allowed_statuses = stat_filter
            if isinstance(allowed_statuses, str): 
                allowed_statuses = [s.strip() for s in allowed_statuses.split(",")]
            if current_status not in allowed_statuses:
                keep = False

        # Attach status, invoice_type and classification for filtering and display
        row["status"] = status_map.get(inv_id)
        row["invoice_type"] = type_map.get(inv_id)
        row["dom_exp"] = dom_exp_map.get(inv_id, "")
        
        # ... (1. to 7. existing filters stay same) ...
        # (Status filter 7. already uses status_map.get(inv_id) so it's fine)

        # Globally exclude Cancelled invoices
        if keep and row["status"] == "Cancelled":
            keep = False

        # 8. Type (Domestic/Export)
        dom_exp_f = filters.get("dom_exp")
        if keep and dom_exp_f:
            if str(dom_exp_f) != str(row.get("dom_exp")):
                keep = False

        # 9. Invoice Type
        inv_type_f = filters.get("invoice_type")
        if keep and inv_type_f:
            if str(inv_type_f) != str(row.get("invoice_type")):
                keep = False



        if keep:
            data.append(row)

    if not data:
        return { "summary": [], "charts": {}, "results": [], "columns": columns }


    # Calculate Summaries (KPIs)
    total_rev = 0
    dom_rev = 0
    exp_rev = 0
    cp_rev = 0
    unique_invoices = set()

    for row in data:
        amt = flt(row.get("base_amount"))
        total_rev += amt
        inv_id = row.get("invoice_id") or row.get("name") or row.get("parent")
        unique_invoices.add(inv_id)

        if row.get("dom_exp") == "Domestic":
            dom_rev += amt
        elif row.get("dom_exp") == "Export":
            exp_rev += amt
            
        # Channel Partner (System Integrator, Distributor) - Robust matching
        cust_id = invoice_map.get(inv_id)
        cust_info = customer_map.get(cust_id)
        if cust_info and cust_info.customer_group:
            cg = cust_info.customer_group.lower()
            if "system integrator" in cg or "distributor" in cg or "distributer" in cg:
                cp_rev += amt

    report_summary = [
        {"label": _("Total Revenue"), "value": total_rev, "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Domestic Revenue"), "value": dom_rev, "indicator": "green", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Export Revenue"), "value": exp_rev, "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Channel Partner"), "value": cp_rev, "indicator": "purple", "fieldtype": "Currency", "currency": "INR"}
    ]

    sp_revenue = {}
    cust_revenue = {}
    prod_revenue = {}
    prod_names = {}
    
    for row in data:
        sp = row.get("sales_person") or ""
        amt = flt(row.get("base_amount"))
        sp_revenue[sp] = sp_revenue.get(sp, 0) + amt
        
        cust = row.get("customer") or row.get("customer_name") or ""
        cust_revenue[cust] = cust_revenue.get(cust, 0) + amt
        
        prod_name = row.get("item_name") or row.get("item_code") or ""
        prod_revenue[prod_name] = prod_revenue.get(prod_name, 0) + amt
        prod_names[prod_name] = row.get("item_name") or ""

    def get_chart_def(title, data_dict, label_key, limit=10):
        sorted_items = sorted(data_dict.items(), key=lambda x: x[1], reverse=True)
        top_items = sorted_items[:limit]
        return {
            "title": title,
            "data": {
                "labels": [x[0] for x in top_items],
                "datasets": [{"name": title, "values": [flt(x[1], 2) for x in top_items]}]
            },
            "type": "donut",
            "height": 300,
            "colors": ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e', '#ecf0f1', '#1abc9c', '#d35400', '#7f8c8d']
        }

    return {
        "summary": report_summary,
        "charts": {
            "top_10_salesperson": get_chart_def("Top 10 Salesperson by Revenue", sp_revenue, "sales_person", limit=10),
            "top_10_customers": get_chart_def("Top 10 Customers by Revenue", cust_revenue, "customer", limit=10),
            "top_10_products": get_chart_def("Top 10 Products by Revenue", prod_revenue, "item_code", limit=10)
        },
        "results": data,
        "columns": columns
    }

@frappe.whitelist()
def export_to_excel(filters=None, invoice_id=None):
    filters = prepare_filters(filters)
    if invoice_id:
        filters["invoice_id"] = invoice_id

    # Use the dashboard's data fetching logic to ensure filters are applied
    # instead of calling the report directly, to keep consistency.
    dashboard_data = get_dashboard_data(filters)
    data = dashboard_data.get("results")
    columns = dashboard_data.get("columns")
    
    # Add Invoice Type to columns after Type (dom_exp)
    for i, col in enumerate(columns):
        if col.get("fieldname") == "dom_exp":
            columns.insert(i + 1, {"label": _("Invoice Type"), "fieldname": "invoice_type", "fieldtype": "Data"})
            break

    # Reorder columns for Excel to match UI: Sales Person after Item
    ordered_columns = []
    sp_col = None
    
    # Locate Sales Person column
    for col in columns:
        if col.get("fieldname") == "sales_person":
            sp_col = col
            break
            
    # Rebuild column list
    for col in columns:
        if col.get("fieldname") == "sales_person":
            continue
        ordered_columns.append(col)
        if col.get("fieldname") == "item_code":
            if sp_col:
                ordered_columns.append(sp_col)
    
    columns = ordered_columns

    if not data:
        return None

    # Create Workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sales Invoice Data"

    # Header Info
    ws["A1"].value = "Sales Revenue Dashboard Export"
    ws["A1"].font = Font(bold=True)
    ws["B1"].value = "Generated On: " + frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")

    # Column Headers
    row_idx = 3
    for idx, col in enumerate(columns, start=1):
        cell = ws.cell(row=row_idx, column=idx, value=col.get("label"))
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="D3D3D3", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")

    # Data Rows
    row_idx += 1
    numeric_fields = ["qty", "item_rate", "amount", "base_amount", "exchange_rate", "item_purchase_rate"]
    
    for row in data:
        for idx, col in enumerate(columns, start=1):
            fieldname = col.get("fieldname")
            value = row.get(fieldname)
            cell = ws.cell(row=row_idx, column=idx)

            if fieldname in numeric_fields:
                cell.value = flt(value or 0)
                cell.number_format = "#,##0.00"
                cell.alignment = Alignment(horizontal="right")
            else:
                cell.value = str(value) if value is not None else ""
                cell.alignment = Alignment(horizontal="left")
        row_idx += 1

    # Adjust Column Widths
    for idx in range(1, len(columns) + 1):
        ws.column_dimensions[get_column_letter(idx)].width = 20

    # Save to buffer
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    # Return base64 for JS to download
    return {
        "filename": f"Sales_Revenue_Dashboard_{frappe.utils.nowdate()}.xlsx",
        "filecontent": base64.b64encode(output.read()).decode()
    }
