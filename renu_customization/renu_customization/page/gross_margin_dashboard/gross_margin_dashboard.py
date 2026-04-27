import frappe
from frappe import _
from frappe.utils import flt
from renu_customization.renu_customization.report.sales_invoice_report.sales_invoice_report import execute
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from io import BytesIO
import base64
import json

@frappe.whitelist()
def export_to_pdf(html):
	frappe.response.filename = "gross_margin_dashboard.pdf"
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

    # MANUALLY FILTER DATA
    data = []
    
    inv_names = list(set([d.get("invoice_id") or d.get("name") or d.get("parent") for d in raw_data if d.get("invoice_id") or d.get("name") or d.get("parent")])) if raw_data else []

    invoice_map = {}
    status_map = {}
    type_map = {}
    dom_exp_map = {}
    
    if inv_names:
        invoices = frappe.get_all("Sales Invoice", filters={"name": ("in", inv_names)}, fields=["name", "customer", "status", "invoice_type", "is_domestic", "is_export"])
        invoice_map = {i.name: i.customer for i in invoices}
        status_map = {i.name: i.status for i in invoices}
        type_map = {i.name: i.invoice_type for i in invoices}
        
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

    cust_list = frappe.get_all("Customer", fields=["name", "customer_group", "territory"])
    customer_map = {c.name: c for c in cust_list}
        
    item_map = {}
    if filters.get("item_group"):
        item_list = frappe.get_all("Item", fields=["name", "item_group"])
        item_map = {i.name: i for i in item_list}

    for row in raw_data:
        keep = True
        inv_id = row.get("invoice_id") or row.get("name") or row.get("parent")
        inv_cust_id = invoice_map.get(inv_id)
        
        # 1. Sales Person
        sp_filter = filters.get("sales_person")
        if keep and sp_filter:
            row_sp = str(row.get("sales_person") or row.get("sales_team") or row.get("sales_team_member") or row.get("sales_team_member_name") or "").strip().lower()
            f_sp = str(sp_filter).strip().lower()
            if f_sp not in row_sp:
                keep = False
            
        # 2. Customer
        cust_filter = filters.get("customer") or filters.get("customer_name")
        if keep and cust_filter:
            f_cust = str(cust_filter).strip().lower()
            row_cust_id = str(inv_cust_id or "").strip().lower()
            row_cust_name = str(row.get("customer") or row.get("customer_name") or "").strip().lower()
            if f_cust != row_cust_id and f_cust != row_cust_name and f_cust not in row_cust_name:
                keep = False
            
        # 3. Product
        prod_filter = filters.get("item") or filters.get("item_code") or filters.get("product")
        if keep and prod_filter:
            f_prod = str(prod_filter).strip().lower()
            row_prod_code = str(row.get("item_code") or row.get("item") or "").strip().lower()
            row_prod_name = str(row.get("item_name") or row.get("product_name") or "").strip().lower()
            if f_prod != row_prod_code and f_prod != row_prod_name and f_prod not in row_prod_name:
                keep = False

        # ... (rest of filtering logic)
        row["status"] = status_map.get(inv_id)
        row["invoice_type"] = type_map.get(inv_id)
        row["dom_exp"] = dom_exp_map.get(inv_id, "")

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
            
        # 4. Product Group
        ig_filter = filters.get("item_group")
        if keep and ig_filter:
            if not item_map:
                item_list = frappe.get_all("Item", fields=["name", "item_group"])
                item_map = {i.name: i for i in item_list}
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
                
        # 7. Status
        stat_filter = filters.get("status")
        if keep and stat_filter:
            current_status = status_map.get(inv_id)
            if isinstance(stat_filter, str): 
                stat_filter = [s.strip() for s in stat_filter.split(",")]
            if current_status not in stat_filter:
                keep = False

        # Globally exclude Cancelled invoices
        if keep and status_map.get(inv_id) == "Cancelled":
            keep = False

        if keep:
            # Calculate Margin
            revenue = flt(row.get("base_amount"))
            qty = flt(row.get("qty"))
            purchase_rate = flt(row.get("item_purchase_rate"))
            cogs = qty * purchase_rate
            margin = revenue - cogs
            margin_pct = (margin / revenue * 100) if revenue else 0
            
            row["cogs"] = cogs
            row["margin"] = margin
            row["margin_pct"] = margin_pct
            row["status"] = status_map.get(inv_id)
            row["invoice_type"] = type_map.get(inv_id)
            row["dom_exp"] = dom_exp_map.get(inv_id, "")
            
            data.append(row)

    if not data:
        return { "summary": [], "charts": {}, "results": [], "columns": columns }


    # Calculate Summaries (KPIs)
    total_rev = 0
    total_cogs = 0
    total_margin = 0
    
    for row in data:
        total_rev += flt(row.get("base_amount"))
        total_cogs += flt(row.get("cogs"))
        total_margin += flt(row.get("margin"))

    overall_margin_pct = (total_margin / total_rev * 100) if total_rev else 0

    report_summary = [
        {"label": _("Total Revenue"), "value": total_rev, "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Total COGS"), "value": total_cogs, "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Gross Margin"), "value": total_margin, "indicator": "green", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Margin %"), "value": overall_margin_pct, "indicator": "purple", "fieldtype": "Percent"}
    ]

    sp_margin = {}
    cust_margin = {}
    prod_margin = {}
    monthly_stats = {}
    
    for row in data:
        sp = row.get("sales_person") or "Unknown"
        margin = flt(row.get("margin"))
        sp_margin[sp] = sp_margin.get(sp, 0) + margin
        
        cust = row.get("customer_name") or row.get("customer") or "Unknown"
        cust_margin[cust] = cust_margin.get(cust, 0) + margin
        
        prod_name = row.get("item_name") or row.get("item_code") or "Unknown"
        prod_margin[prod_name] = prod_margin.get(prod_name, 0) + margin

        # Monthly Trend Data
        date_str = str(row.get("invoice_date") or row.get("posting_date") or "")
        try:
            d = frappe.utils.getdate(date_str)
            m_key = d.strftime("%b %Y")
            m_sort = d.strftime("%Y%m")
        except:
            m_key = "Unknown"; m_sort = "000000"
        
        if m_sort not in monthly_stats:
            monthly_stats[m_sort] = {"label": m_key, "rev": 0, "cogs": 0, "margin": 0}
        
        monthly_stats[m_sort]["rev"] += flt(row.get("base_amount"))
        monthly_stats[m_sort]["cogs"] += flt(row.get("cogs"))
        monthly_stats[m_sort]["margin"] += flt(row.get("margin"))

    sorted_months = sorted(monthly_stats.keys())
    trend_labels = [monthly_stats[m]["label"] for m in sorted_months]
    trend_rev = [flt(monthly_stats[m]["rev"] / 1000000.0, 2) for m in sorted_months]
    trend_cogs = [flt(monthly_stats[m]["cogs"] / 1000000.0, 2) for m in sorted_months]
    trend_margin = [flt(monthly_stats[m]["margin"] / 1000000.0, 2) for m in sorted_months]

    def get_chart_def(title, data_dict, label_key, limit=10):
        sorted_items = sorted(data_dict.items(), key=lambda x: x[1], reverse=True)
        top_items = sorted_items[:limit]
        return {
            "title": title,
            "data": {
                "labels": [x[0] for x in top_items],
                "datasets": [{"name": title, "values": [flt(x[1] / 1000000.0, 2) for x in top_items]}]
            },
            "type": "donut",
            "height": 300,
            "colors": ['#2ecc71', '#3498db', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#7f8c8d', '#d35400']
        }

    return {
        "summary": report_summary,
        "charts": {
            "margin_trend": {
                "title": "Monthly Revenue vs Margin (M)",
                "data": {
                    "labels": trend_labels,
                    "datasets": [
                        {"name": "Revenue (M)", "values": trend_rev},
                        {"name": "COGS (M)", "values": trend_cogs},
                        {"name": "Margin (M)", "values": trend_margin}
                    ]
                },
                "type": "bar",
                "height": 350,
                "colors": ["#3498db", "#e67e22", "#2ecc71"]
            },
            "top_10_salesperson": get_chart_def("Top 10 Salesperson by Margin", sp_margin, "sales_person", limit=10),
            "top_10_customers": get_chart_def("Top 10 Customers by Margin", cust_margin, "customer", limit=10),
            "top_10_products": get_chart_def("Top 10 Products by Margin", prod_margin, "item_code", limit=10)
        },
        "results": data,
        "columns": columns
    }

@frappe.whitelist()
def export_to_excel(filters=None):
    filters = prepare_filters(filters)
    dashboard_data = get_dashboard_data(filters)
    data = dashboard_data.get("results")
    summary = dashboard_data.get("summary")
    charts = dashboard_data.get("charts")
    
    if not data:
        return None

    wb = openpyxl.Workbook()
    
    # Sheet 1: Dashboard Overview
    ws_overview = wb.active
    ws_overview.title = "Dashboard Overview"
    
    ws2 = wb.create_sheet("Month-Wise Margin")
    ws3 = wb.create_sheet("Detailed List")

    # Styling Helpers
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2c3e50", fill_type="solid")
    title_font = Font(bold=True, size=14)
    section_font = Font(bold=True, size=12)
    thin_side = Side(style='thin')
    table_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    zebra_fill = PatternFill(start_color="f8f9fa", fill_type="solid")

    row_idx = 1
    ws_overview.cell(row=row_idx, column=1, value="Gross Margin Dashboard Overview").font = title_font
    ws_overview.cell(row=row_idx, column=5, value="Generated On: " + frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S"))
    row_idx += 2
 
    ws_overview.cell(row=row_idx, column=1, value="1. Margin Summary (Million INR)").font = section_font
    row_idx += 1
    
    summary_start_row = row_idx
    colors = {"blue": "3498db", "green": "2ecc71", "orange": "e67e22", "purple": "9b59b6", "red": "e74c3c"}
 
    for i, s in enumerate(summary):
        r = summary_start_row + (i // 4) * 3
        c = 1 + (i % 4) * 2
        
        cell_l = ws_overview.cell(row=r, column=c, value=s.get('label'))
        cell_l.font = Font(bold=True, color="FFFFFF")
        indicator = s.get('indicator', 'blue').lower()
        bg_color = colors.get(indicator, "3498db")
        cell_l.fill = PatternFill(start_color=bg_color, fill_type="solid")
        cell_l.alignment = Alignment(horizontal="center")
        
        val = flt(s.get('value'))
        if s.get('fieldtype') == 'Currency':
            val = val / 1000000
            fmt = '"₹ "#,##0.00" M"'
        else:
            fmt = '0.00"%"'
            
        cell_v = ws_overview.cell(row=r+1, column=c, value=val)
        cell_v.font = Font(bold=True, size=12)
        cell_v.number_format = fmt
        cell_v.alignment = Alignment(horizontal="center")
        cell_v.border = Border(left=Side(style='medium', color=bg_color), right=Side(style='medium', color=bg_color), bottom=Side(style='medium', color=bg_color))
        
        ws_overview.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c+1)
        ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)
 
    row_idx = summary_start_row + 6
    row_idx += 1
 
    def write_chart_section(title, chart_data):
        nonlocal row_idx
        ws_overview.cell(row=row_idx, column=1, value=title).font = section_font
        row_idx += 1
        
        headers = ["Category", "Margin (M)", "Share %"]
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
            
            val_m = flt(values[i]) / 1000000
            c2 = ws_overview.cell(row=row_idx, column=2, value=val_m)
            c2.number_format = '"₹ "#,##0.00" M"'
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
        write_chart_section("2. Top 10 Salesperson by Margin", charts["top_10_salesperson"])
    if charts.get("top_10_customers", {}).get("data", {}).get("labels"):
        write_chart_section("3. Top 10 Customers by Margin", charts["top_10_customers"])
    if charts.get("top_10_products", {}).get("data", {}).get("labels"):
        write_chart_section("4. Top 10 Products by Margin", charts["top_10_products"])

    # Sheet 2: Month-Wise Margin
    row_idx = 1
    ws2.cell(row=row_idx, column=1, value="Month-Wise Consolidated Margin (Million INR)").font = section_font
    row_idx += 1
    
    merged_data = {}
    months_set = set()
    for row in data:
        sp = row.get("sales_person") or "-"
        cust = row.get("customer_name") or row.get("customer") or "-"
        prod = row.get("item_name") or row.get("item_code") or "-"
        margin = flt(row.get("margin") or 0)
        date_str = str(row.get("invoice_date") or row.get("posting_date") or "")
        try:
            d = frappe.utils.getdate(date_str)
            m_key = d.strftime("%b %Y")
            m_sort = d.strftime("%Y%m")
        except:
            m_key = "Unknown"; m_sort = "000000"
            
        months_set.add((m_sort, m_key))
        key = f"{cust}|{sp}|{prod}"
        if key not in merged_data:
            merged_data[key] = {"cust": cust, "sp": sp, "prod": prod, "months": {}, "total": 0}
        merged_data[key]["months"][m_key] = merged_data[key]["months"].get(m_key, 0) + margin
        merged_data[key]["total"] += margin
        
    sorted_months = [x[1] for x in sorted(list(months_set), key=lambda x: x[0])]
    headers = ["S.No.", "Customer", "Sales Person", "Product"] + sorted_months + ["Total Margin (M)"]
    
    for idx, h in enumerate(headers, start=1):
        cell = ws2.cell(row=row_idx, column=idx, value=h)
        cell.font = header_font; cell.fill = header_fill; cell.alignment = Alignment(horizontal="center"); cell.border = table_border
    row_idx += 1
        
    for r_idx, row in enumerate(sorted(merged_data.values(), key=lambda x: x["total"], reverse=True)):
        row_fill = zebra_fill if r_idx % 2 != 0 else None
        c_no = ws2.cell(row=row_idx, column=1, value=r_idx + 1)
        c1 = ws2.cell(row=row_idx, column=2, value=row["cust"])
        c2 = ws2.cell(row=row_idx, column=3, value=row["sp"])
        c3 = ws2.cell(row=row_idx, column=4, value=row["prod"])
        for c in [c_no, c1, c2, c3]:
            c.border = table_border
            if row_fill: c.fill = row_fill
            
        col_idx = 5
        for m_key in sorted_months:
            v_m = flt(row["months"].get(m_key, 0)) / 1000000
            c = ws2.cell(row=row_idx, column=col_idx, value=v_m)
            c.number_format = '"₹ "#,##0.00" M"'; c.border = table_border; c.alignment = Alignment(horizontal="right")
            if row_fill: c.fill = row_fill
            col_idx += 1
            
        tot_m = flt(row["total"]) / 1000000
        c_tot = ws2.cell(row=row_idx, column=col_idx, value=tot_m)
        c_tot.number_format = '"₹ "#,##0.00" M"'
        c_tot.font = Font(bold=True)
        c_tot.fill = PatternFill(start_color="ecf0f1", fill_type="solid")
        c_tot.border = table_border
        c_tot.alignment = Alignment(horizontal="right")
        row_idx += 1

    # Add Total Row for Month-Wise Margin
    c_tot_label = ws2.cell(row=row_idx, column=1, value="Total")
    c_tot_label.font = Font(bold=True)
    ws2.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=4)
    for c in range(1, 5):
        ws2.cell(row=row_idx, column=c).fill = header_fill
        ws2.cell(row=row_idx, column=c).font = header_font
        ws2.cell(row=row_idx, column=c).border = table_border
        if c == 1:
            ws2.cell(row=row_idx, column=c).alignment = Alignment(horizontal="right")
            
    col_idx = 5
    for m_key in sorted_months:
        total_m = sum(flt(row["months"].get(m_key, 0)) for row in merged_data.values()) / 1000000
        c = ws2.cell(row=row_idx, column=col_idx, value=total_m)
        c.number_format = '"₹ "#,##0.00" M"'
        c.font = Font(bold=True)
        c.fill = header_fill
        c.font = header_font
        c.border = table_border
        c.alignment = Alignment(horizontal="right")
        col_idx += 1
        
    grand_total = sum(flt(row["total"]) for row in merged_data.values()) / 1000000
    c_tot = ws2.cell(row=row_idx, column=col_idx, value=grand_total)
    c_tot.number_format = '"₹ "#,##0.00" M"'
    c_tot.font = Font(bold=True, color="FFFFFF")
    c_tot.fill = header_fill
    c_tot.border = table_border
    c_tot.alignment = Alignment(horizontal="right")
    row_idx += 1

    # Sheet 3: Detailed List
    row_idx = 1
    ws3.cell(row=row_idx, column=1, value="Detailed Gross Margin List (Million INR)").font = section_font
    row_idx += 1
    
    ui_columns = [
        {"label": "S.No.", "fieldname": "sr_no_idx", "width": 8},
        {"label": "Invoice ID", "fieldname": "invoice_id", "width": 18},
        {"label": "Date", "fieldname": "invoice_date", "width": 14},
        {"label": "Customer", "fieldname": "customer_name", "width": 25},
        {"label": "Item", "fieldname": "item_code", "width": 20},
        {"label": "Qty", "fieldname": "qty", "width": 10},
        {"label": "Revenue (M)", "fieldname": "base_amount", "width": 18},
        {"label": "COGS (M)", "fieldname": "cogs", "width": 18},
        {"label": "Margin (M)", "fieldname": "margin", "width": 18},
        {"label": "Margin %", "fieldname": "margin_pct", "width": 12},
    ]
    
    for idx, col in enumerate(ui_columns, start=1):
        cell = ws3.cell(row=row_idx, column=idx, value=col["label"])
        cell.font = header_font; cell.fill = header_fill; cell.alignment = Alignment(horizontal="center"); cell.border = table_border
        ws3.column_dimensions[get_column_letter(idx)].width = col["width"]
    row_idx += 1
    
    for r_idx, row in enumerate(data):
        row_fill = zebra_fill if r_idx % 2 != 0 else None
        for idx, col in enumerate(ui_columns, start=1):
            fname = col["fieldname"]
            val = row.get(fname)
            if fname == "sr_no_idx": val = r_idx + 1
            cell = ws3.cell(row=row_idx, column=idx)
            cell.border = table_border
            if row_fill: cell.fill = row_fill
            
            if fname in ["base_amount", "cogs", "margin"]:
                num_val = flt(val or 0) / 1000000
                cell.number_format = '"₹ "#,##0.00" M"'
                cell.value = num_val; cell.alignment = Alignment(horizontal="right")
            elif fname == "margin_pct":
                cell.value = flt(val or 0)
                cell.number_format = '0.00"%"'; cell.alignment = Alignment(horizontal="right")
            elif fname == "qty":
                cell.value = flt(val or 0); cell.number_format = "#,##0.00"; cell.alignment = Alignment(horizontal="right")
            else:
                cell.value = str(val) if val is not None else ""; cell.alignment = Alignment(horizontal="left")
        row_idx += 1

    # Add Total Row for Detailed List
    c_tot_label = ws3.cell(row=row_idx, column=1, value="Total")
    c_tot_label.font = Font(bold=True)
    ws3.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=5)
    for c in range(1, 6):
        ws3.cell(row=row_idx, column=c).fill = header_fill
        ws3.cell(row=row_idx, column=c).font = header_font
        ws3.cell(row=row_idx, column=c).border = table_border
        if c == 1:
            ws3.cell(row=row_idx, column=c).alignment = Alignment(horizontal="right", vertical="center")

    total_qty = sum(flt(row.get("qty") or 0) for row in data)
    c_qty = ws3.cell(row=row_idx, column=6, value=total_qty)
    c_qty.font = header_font; c_qty.fill = header_fill; c_qty.border = table_border; c_qty.alignment = Alignment(horizontal="right")
    c_qty.number_format = "#,##0.00"

    total_rev = sum(flt(row.get("base_amount") or 0) for row in data) / 1000000
    c_rev = ws3.cell(row=row_idx, column=7, value=total_rev)
    c_rev.font = header_font; c_rev.fill = header_fill; c_rev.border = table_border; c_rev.alignment = Alignment(horizontal="right")
    c_rev.number_format = '"₹ "#,##0.00" M"'
    
    total_cogs = sum(flt(row.get("cogs") or 0) for row in data) / 1000000
    c_cogs = ws3.cell(row=row_idx, column=8, value=total_cogs)
    c_cogs.font = header_font; c_cogs.fill = header_fill; c_cogs.border = table_border; c_cogs.alignment = Alignment(horizontal="right")
    c_cogs.number_format = '"₹ "#,##0.00" M"'

    total_margin = sum(flt(row.get("margin") or 0) for row in data) / 1000000
    c_margin = ws3.cell(row=row_idx, column=9, value=total_margin)
    c_margin.font = header_font; c_margin.fill = header_fill; c_margin.border = table_border; c_margin.alignment = Alignment(horizontal="right")
    c_margin.number_format = '"₹ "#,##0.00" M"'

    avg_margin_pct = (total_margin / total_rev * 100) if total_rev else 0
    c_margin_pct = ws3.cell(row=row_idx, column=10, value=avg_margin_pct)
    c_margin_pct.font = header_font; c_margin_pct.fill = header_fill; c_margin_pct.border = table_border; c_margin_pct.alignment = Alignment(horizontal="right")
    c_margin_pct.number_format = '0.00"%"'
    row_idx += 1

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return {
        "filename": f"Gross_Margin_Dashboard_{frappe.utils.nowdate()}.xlsx",
        "filecontent": base64.b64encode(output.read()).decode()
    }
