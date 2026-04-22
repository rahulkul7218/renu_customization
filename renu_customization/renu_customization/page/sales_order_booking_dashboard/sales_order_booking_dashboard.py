import frappe
from frappe import _
from frappe.utils import flt
from renu_customization.renu_customization.report.sales_order_report.sales_order_report import execute
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from io import BytesIO
import base64
import json

@frappe.whitelist()
def export_to_pdf(html):
    pdf_content = frappe.utils.pdf.get_pdf(html, {"orientation": "Landscape"})
    return {
        "filename": f"Sales_Order_Dashboard_{frappe.utils.nowdate()}.pdf",
        "filecontent": base64.b64encode(pdf_content).decode()
    }


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

    # Use the sales_order_report execute function
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

    # Conver raw_data (list of lists) to list of dicts for easier handling if needed
    # (Checking if execute returns objects or lists)
    # The sales_order_report returns lists because of as_list=True in frappe.db.sql
    
    data = []
    # Map raw list to dict using columns fieldnames
    col_fieldnames = []
    for col in columns:
        if isinstance(col, dict):
            col_fieldnames.append(col.get("fieldname"))
        else:
            col_fieldnames.append(col.split(":")[0].lower().replace(" ", "_").replace(".", ""))

    processed_raw_data = []
    for row in raw_data:
        row_dict = {}
        for i, val in enumerate(row):
            if i < len(col_fieldnames):
                row_dict[col_fieldnames[i]] = val
        processed_raw_data.append(row_dict)

    # Pre-fetch status, customer, and per_billed info
    so_names = list(set([d.get("so_no") for d in processed_raw_data if d.get("so_no")]))
    so_info_map = {}
    if so_names:
        so_fields = ["name", "status", "customer", "per_billed"]
        if frappe.get_meta("Sales Order").has_field("invoice_type"):
            so_fields.append("invoice_type")
        sos = frappe.get_all("Sales Order", filters={"name": ("in", so_names)}, fields=so_fields)
        so_info_map = {s.name: s for s in sos}

    so_item_map = {}
    if so_names:
        so_items = frappe.get_all("Sales Order Item", 
            filters={"parent": ("in", so_names)}, 
            fields=["parent", "item_code", "returned_qty", "base_rate"]
        )
        for item in so_items:
            key = (item.parent, item.item_code)
            if key not in so_item_map:
                so_item_map[key] = []
            so_item_map[key].append(item)

    cust_list = frappe.get_all("Customer", fields=["name", "customer_group", "territory"])
    customer_map = {c.name: c for c in cust_list}

    for row in processed_raw_data:
        keep = True
        so_id = row.get("so_no")
        s_info = so_info_map.get(so_id, {})
        row["status"] = s_info.get("status")
        row["customer"] = s_info.get("customer")
        row["per_billed"] = s_info.get("per_billed", 0)
        row["invoice_type"] = row.get("invoice_type") or s_info.get("invoice_type")

        # Handle Status Filtering
        stat_filter = filters.get("status")
        if not stat_filter:
            # Default: Exclude Cancelled and Draft for accurate "Booking" data
            if row["status"] in ("Cancelled", "Draft"):
                keep = False
        else:
            # If user explicitly filtered for status, respect that
            # stat_filter from JS can be a string or list
            if isinstance(stat_filter, str):
                stat_filter = [s.strip() for s in stat_filter.split(",")]
            
            if row["status"] not in stat_filter:
                keep = False

        # Calculate Returns
        item_code = row.get("item_code")
        base_amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
        returned_val = 0
        
        if so_id and item_code and (so_id, item_code) in so_item_map:
            matched_items = so_item_map[(so_id, item_code)]
            if matched_items:
                mi = matched_items.pop(0)
                returned_val = flt(mi.get("returned_qty", 0)) * flt(mi.get("base_rate", 0))
        
        net_amt = max(0, base_amt - returned_val)
        row["po_total"] = net_amt
        row["total_net_amount_(inr)"] = net_amt
        
        # Classification for Domestic/Export (In Sales Order report it is 'domestic/export')
        row["dom_exp"] = row.get("domestic/export") or row.get("domestic_export")

        # 1. Sales Person
        sp_filter = filters.get("sales_person")
        if keep and sp_filter:
            row_sp = str(row.get("sales_person") or "").strip().lower()
            if str(sp_filter).strip().lower() not in row_sp:
                keep = False
            
        # 2. Customer
        cust_filter = filters.get("customer") or filters.get("customer_name")
        if keep and cust_filter:
            f_cust = str(cust_filter).strip().lower()
            row_cust_id = str(row.get("customer") or row.get("customer_code") or "").strip().lower()
            row_cust_name = str(row.get("customer_name") or "").strip().lower()
            if f_cust != row_cust_id and f_cust != row_cust_name and f_cust not in row_cust_name:
                keep = False
            
        # 3. Product
        prod_filter = filters.get("item") or filters.get("item_code") or filters.get("product")
        if keep and prod_filter:
            f_prod = str(prod_filter).strip().lower()
            row_prod_code = str(row.get("item_code") or "").strip().lower()
            row_prod_name = str(row.get("item_name") or "").strip().lower()
            if f_prod != row_prod_code and f_prod != row_prod_name and f_prod not in row_prod_name:
                keep = False

        # Status filtering handled above
        pass

        # Type (Domestic/Export)
        dom_exp_f = filters.get("dom_exp")
        if keep and dom_exp_f:
            if str(dom_exp_f) != str(row.get("dom_exp")):
                keep = False
                
        # Invoice Type
        inv_type_f = filters.get("invoice_type")
        if keep and inv_type_f:
            if str(inv_type_f) != str(row.get("invoice_type")):
                keep = False

        if keep:
            data.append(row)

    if not data:
        return { "summary": [], "charts": {}, "results": [], "columns": columns }

    # Calculate Summaries
    total_rev = 0
    dom_rev = 0
    exp_rev = 0
    cp_rev = 0
    
    total_pending = 0
    dom_pending = 0
    exp_pending = 0
    cp_pending = 0

    for row in data:
        amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
        per_billed = flt(row.get("per_billed", 0))
        unbilled_amt = amt * (1.0 - (per_billed / 100.0))
        
        total_rev += amt
        total_pending += unbilled_amt
        
        if row.get("dom_exp") == "Domestic":
            dom_rev += amt
            dom_pending += unbilled_amt
        elif row.get("dom_exp") == "Export":
            exp_rev += amt
            exp_pending += unbilled_amt
            
        # Use the actual customer link for group mapping
        cust_id = row.get("customer")
        cust_info = customer_map.get(cust_id)
        if cust_info and cust_info.customer_group:
            cg = cust_info.customer_group.lower()
            if "system integrator" in cg or "distributor" in cg or "distributer" in cg:
                cp_rev += amt
                cp_pending += unbilled_amt

    report_summary = [
        {"label": _("Total Order Value"), "value": total_rev, "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Domestic Orders"), "value": dom_rev, "indicator": "green", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Export Orders"), "value": exp_rev, "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Channel Partner"), "value": cp_rev, "indicator": "purple", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Total Pending Bill"), "value": total_pending, "indicator": "red", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Domestic Pending"), "value": dom_pending, "indicator": "red", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Export Pending"), "value": exp_pending, "indicator": "red", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Channel P. Pending"), "value": cp_pending, "indicator": "red", "fieldtype": "Currency", "currency": "INR"}
    ]

    sp_rev_dict = {}
    cust_rev_dict = {}
    prod_rev_dict = {}
    
    for row in data:
        amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
        sp = row.get("sales_person") or "Unassigned"
        sp_rev_dict[sp] = sp_rev_dict.get(sp, 0) + amt
        
        cust = row.get("customer_name") or ""
        cust_rev_dict[cust] = cust_rev_dict.get(cust, 0) + amt
        
        prod = row.get("item_name") or row.get("item_code") or ""
        prod_rev_dict[prod] = prod_rev_dict.get(prod, 0) + amt

    def get_chart_def(title, data_dict, limit=10):
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
            "top_10_salesperson": get_chart_def("Top 10 Salesperson by Order Value", sp_rev_dict),
            "top_10_customers": get_chart_def("Top 10 Customers by Order Value", cust_rev_dict),
            "top_10_products": get_chart_def("Top 10 Products by Order Value", prod_rev_dict)
        },
        "results": data,
        "columns": columns
    }

@frappe.whitelist()
def export_to_excel(filters=None):
    filters = prepare_filters(filters)
    dashboard_data = get_dashboard_data(filters)
    data = dashboard_data.get("results")
    columns = dashboard_data.get("columns")
    summary = dashboard_data.get("summary")
    charts = dashboard_data.get("charts")
    
    if not data:
        return None

    wb = openpyxl.Workbook()
    
    # Sheet 1: Dashboard Overview
    ws_overview = wb.active
    ws_overview.title = "Dashboard Overview"
    
    # Sheet 2: Month-Wise Orders
    ws_months = wb.create_sheet("Month-Wise Orders")
    
    # Sheet 3: Sales Orders List
    ws_list = wb.create_sheet("Sales Orders List")
    
    # Helper for formatting
    header_font = Font(bold=True)
    header_fill = PatternFill(start_color="D3D3D3", fill_type="solid")
    title_font = Font(bold=True, size=14)
    section_font = Font(bold=True, size=12)
    thin_side = Side(style='thin')
    table_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    row_idx = 1
    
    # Main Title on Overview
    ws_overview.cell(row=row_idx, column=1, value="Sales Order Booking Dashboard").font = title_font
    ws_overview.cell(row=row_idx, column=5, value="Generated On: " + frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S"))
    row_idx += 2
 
    # 1. Summary Section (Grid Layout 4x2) on Overview
    ws_overview.cell(row=row_idx, column=1, value="1. Dashboard Summary Overview (M)").font = section_font
    row_idx += 1
    
    summary_start_row = row_idx
    col_offsets = [0, 2, 4, 6] # 4 columns of cards
    
    colors = {
        "blue": "3498db", "green": "2ecc71", "orange": "e67e22", "purple": "9b59b6", "red": "e74c3c"
    }
 
    for i, s in enumerate(summary):
        r = summary_start_row + (i // 4) * 3 # 3 rows per card height
        c = 1 + (i % 4) * 2
        
        # Label
        cell_l = ws_overview.cell(row=r, column=c, value=s.get('label'))
        cell_l.font = Font(bold=True, color="FFFFFF")
        
        indicator = s.get('indicator', 'blue').lower()
        bg_color = colors.get(indicator, "3498db")
        cell_l.fill = PatternFill(start_color=bg_color, fill_type="solid")
        cell_l.alignment = Alignment(horizontal="center")
        
        # Value
        val = flt(s.get('value')) / 1000000
        cell_v = ws_overview.cell(row=r+1, column=c, value=val)
        cell_v.font = Font(bold=True, size=12)
        cell_v.number_format = '"₹ "#,##0.00" M"'
        cell_v.alignment = Alignment(horizontal="center")
        cell_v.border = Border(left=Side(style='medium', color=bg_color), 
                               right=Side(style='medium', color=bg_color), 
                               bottom=Side(style='medium', color=bg_color))
        
        # Merge if needed for better look
        ws_overview.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c+1)
        ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)
 
    row_idx = summary_start_row + 6
    row_idx += 1
 
    # Helper for Chart Sections on Overview
    def write_chart_section(title, chart_data):
        nonlocal row_idx
        ws_overview.cell(row=row_idx, column=1, value=title).font = section_font
        row_idx += 1
        
        headers = ["Category", "Amount (M)", "Share %"]
        for idx, h in enumerate(headers, start=1):
            cell = ws_overview.cell(row=row_idx, column=idx, value=h)
            cell.font = header_font
            cell.fill = PatternFill(start_color="34495e", fill_type="solid")
            cell.font = Font(bold=True, color="FFFFFF")
            cell.border = table_border
            cell.alignment = Alignment(horizontal="center")
        row_idx += 1
            
        labels = chart_data.get("data", {}).get("labels", [])
        values = chart_data.get("data", {}).get("datasets", [{}])[0].get("values", [])
        total_val = sum(values)
        
        for i in range(len(labels)):
            c1 = ws_overview.cell(row=row_idx, column=1, value=labels[i])
            c1.border = table_border
            # Convert to Million
            val = flt(values[i]) / 1000000
            c2 = ws_overview.cell(row=row_idx, column=2, value=val)
            c2.number_format = '"₹ "#,##0.00" M"'
            c2.border = table_border
            c2.alignment = Alignment(horizontal="right")
            share = (values[i] / total_val) if total_val else 0
            c3 = ws_overview.cell(row=row_idx, column=3, value=share)
            c3.number_format = "0.00%"
            c3.border = table_border
            c3.alignment = Alignment(horizontal="center")
            row_idx += 1
        row_idx += 2
        
    # 2-4. Charts on Overview
    if charts.get("top_10_salesperson", {}).get("data", {}).get("labels"):
        write_chart_section("2. Top Salesperson", charts["top_10_salesperson"])
    if charts.get("top_10_customers", {}).get("data", {}).get("labels"):
        write_chart_section("3. Top Customers", charts["top_10_customers"])
    if charts.get("top_10_products", {}).get("data", {}).get("labels"):
        write_chart_section("4. Top Products", charts["top_10_products"])
        
    # 5. Month-Wise Orders on Sheet 2
    row_idx = 1
    ws_months.cell(row=row_idx, column=1, value="Month-Wise Order Value (M)").font = section_font
    row_idx += 1
    
    merged_data = {}
    months_set = set()
    for row in data:
        sp = row.get("sales_person") or "-"
        cust = row.get("customer_name") or "-"
        prod = row.get("item_name") or row.get("item_code") or "-"
        amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
        date_str = str(row.get("so_date", ""))
        try:
            d = frappe.utils.getdate(date_str)
            m_key = d.strftime("%b %Y")
            m_sort = d.strftime("%Y%m")
        except:
            m_key = "Unknown"
            m_sort = "000000"
            
        months_set.add((m_sort, m_key))
        key = f"{sp}|{cust}|{prod}"
        if key not in merged_data:
            merged_data[key] = {"sp": sp, "cust": cust, "prod": prod, "months": {}, "total": 0}
        merged_data[key]["months"][m_key] = merged_data[key]["months"].get(m_key, 0) + amt
        merged_data[key]["total"] += amt
        
    sorted_months = [x[1] for x in sorted(list(months_set), key=lambda x: x[0])]
    headers = ["S.No.", "Customer", "Sales Person", "Product"] + sorted_months + ["Total (M)"]
    for idx, h in enumerate(headers, start=1):
        cell = ws_months.cell(row=row_idx, column=idx, value=h)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="2c3e50", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")
        cell.border = table_border
    row_idx += 1
        
    for r_idx, row in enumerate(sorted(merged_data.values(), key=lambda x: x["total"], reverse=True)):
        fill = PatternFill(start_color="f8f9fa", fill_type="solid") if r_idx % 2 == 0 else None
        
        c_idx = ws_months.cell(row=row_idx, column=1, value=r_idx + 1)
        c1 = ws_months.cell(row=row_idx, column=2, value=row["cust"])
        c2 = ws_months.cell(row=row_idx, column=3, value=row["sp"])
        c3 = ws_months.cell(row=row_idx, column=4, value=row["prod"])
        for c in [c_idx, c1, c2, c3]:
            c.border = table_border
            if fill: c.fill = fill
            
        col_idx = 5
        for m_key in sorted_months:
            # Convert to Million
            val = flt(row["months"].get(m_key, 0)) / 1000000
            c = ws_months.cell(row=row_idx, column=col_idx, value=val)
            c.number_format = '"₹ "#,##0.00" M"'
            c.border = table_border
            c.alignment = Alignment(horizontal="right")
            if fill: c.fill = fill
            col_idx += 1
            
        # Convert to Million
        total_val_m = flt(row["total"]) / 1000000
        c_tot = ws_months.cell(row=row_idx, column=col_idx, value=total_val_m)
        c_tot.number_format = '"₹ "#,##0.00" M"'
        c_tot.font = Font(bold=True)
        c_tot.fill = PatternFill(start_color="ecf0f1", fill_type="solid")
        c_tot.border = table_border
        c_tot.alignment = Alignment(horizontal="right")
        row_idx += 1
 
    # 6. Sales Orders List on Sheet 3
    row_idx = 1
    ws_list.cell(row=row_idx, column=1, value="Sales Orders List (M)").font = section_font
    row_idx += 1
    
    # Define columns to match Dashboard UI exactly
    ui_columns = [
        {"label": "S.No.", "fieldname": "sr_no_idx", "width": 8},
        {"label": "Order ID", "fieldname": "so_no", "width": 18},
        {"label": "Date", "fieldname": "so_date", "width": 14},
        {"label": "Status", "fieldname": "status", "width": 14},
        {"label": "Customer", "fieldname": "customer_name", "width": 25},
        {"label": "Item", "fieldname": "item_code", "width": 20},
        {"label": "Sales Person", "fieldname": "sales_person", "width": 20},
        {"label": "Qty", "fieldname": "order_quantity", "fieldtype": "Float", "width": 10},
        {"label": "Amount (M)", "fieldname": "total_net_amount_(inr)", "fieldtype": "Currency", "width": 18}
    ]
    
    # Column Headers
    for idx, col in enumerate(ui_columns, start=1):
        cell = ws_list.cell(row=row_idx, column=idx, value=col["label"])
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="2c3e50", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")
        cell.border = table_border
        ws_list.column_dimensions[get_column_letter(idx)].width = col["width"]
    row_idx += 1
 
    # Data
    for r_idx, row in enumerate(data):
        fill = PatternFill(start_color="f8f9fa", fill_type="solid") if r_idx % 2 == 0 else None
        for idx, col in enumerate(ui_columns, start=1):
            fname = col["fieldname"]
            val = row.get(fname)
            
            if fname == "sr_no_idx":
                val = r_idx + 1
            
            # Fallback for qty/amt fields if original report names differ
            if val is None:
                if fname == "order_quantity": val = row.get("po_qty")
                if fname == "total_net_amount_(inr)": val = row.get("po_total")
            
            cell = ws_list.cell(row=row_idx, column=idx)
            cell.border = table_border
            if fill: cell.fill = fill
            
            ftype = col.get("fieldtype", "")
            
            if isinstance(val, (int, float)):
                num_val = flt(val)
                is_currency = ftype == "Currency" or "amount" in fname or "total" in fname
                
                if is_currency:
                    num_val = num_val / 1000000
                    cell.number_format = '"₹ "#,##0.00" M"'
                else:
                    cell.number_format = "#,##0.00"
                
                cell.value = num_val
                cell.alignment = Alignment(horizontal="right")
            else:
                if fname == "so_date" and val:
                    try:
                        cell.value = frappe.utils.getdate(val).strftime("%Y-%m-%d")
                    except:
                        cell.value = str(val)
                else:
                    cell.value = str(val) if val is not None else ""
                cell.alignment = Alignment(horizontal="left")
        row_idx += 1
 
    # Set Column Widths for earlier sections
    for i in range(1, 9):
        ws_overview.column_dimensions[get_column_letter(i)].width = 20
        ws_months.column_dimensions[get_column_letter(i)].width = 20

    # Save
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return {
        "filename": f"Sales_Order_Dashboard_{frappe.utils.nowdate()}.xlsx",
        "filecontent": base64.b64encode(output.read()).decode()
    }
