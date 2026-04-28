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
    frappe.local.response.filename = f"Sales_Order_Dashboard_{frappe.utils.nowdate()}.pdf"
    frappe.local.response.filecontent = pdf_content
    frappe.local.response.type = "download"


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
        so_fields = ["name", "status", "customer", "per_billed", "base_net_total", "base_grand_total"]
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

    item_codes = list(set([d.get("item_code") for d in processed_raw_data if d.get("item_code")]))
    item_group_map = {}
    if item_codes:
        items = frappe.get_all("Item", filters={"name": ("in", item_codes)}, fields=["name", "item_group"])
        item_group_map = {i.name: i.item_group for i in items}

    for row in processed_raw_data:
        keep = True
        so_id = row.get("so_no")
        s_info = so_info_map.get(so_id, {})
        row["status"] = s_info.get("status")
        row["customer"] = s_info.get("customer")
        row["per_billed"] = s_info.get("per_billed", 0)
        row["invoice_type"] = row.get("invoice_type") or s_info.get("invoice_type")
        
        # Capture Net vs Gross ratio from original document
        # If returns exist, net_amt reflects the actual line revenue
        # Gross amt reflects the line's share of the original Grand Total
        si_net = flt(s_info.get("base_net_total") or 1)
        si_grand = flt(s_info.get("base_grand_total") or si_net)
        row["si_net_total"] = si_net
        row["si_grand_total"] = si_grand

        # Handle Status Filtering
        stat_filter = filters.get("status")
        if not stat_filter:
            if row["status"] in ("Cancelled", "Draft"):
                keep = False
        else:
            if isinstance(stat_filter, str):
                stat_filter = [s.strip() for s in stat_filter.split(",")]
            if row["status"] not in stat_filter:
                keep = False

        # Calculate Net Line Amount (after returns)
        item_code = row.get("item_code")
        base_line_amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
        returned_val = 0
        if so_id and item_code and (so_id, item_code) in so_item_map:
            matched_items = so_item_map[(so_id, item_code)]
            if matched_items:
                mi = matched_items.pop(0)
                returned_val = flt(mi.get("returned_qty", 0)) * flt(mi.get("base_rate", 0))
        
        net_amt = max(0, base_line_amt - returned_val)
        row["po_total"] = net_amt
        row["total_net_amount_(inr)"] = net_amt
        
        # Calculate Gross equivalent (matching si_grand_total proportions)
        # Gross = Line Net * (Grand Total / Net Total)
        row["gross_total"] = net_amt * (si_grand / si_net) if si_net else net_amt
        
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

        # 4. Product Group
        ig_filter = filters.get("item_group")
        if keep and ig_filter:
            row_item_group = item_group_map.get(row.get("item_code"))
            if str(row_item_group) != str(ig_filter):
                keep = False

        # 5. Customer Group
        cg_filter = filters.get("customer_group")
        if keep and cg_filter:
            cust_info = customer_map.get(row.get("customer"))
            if not cust_info or str(cust_info.customer_group) != str(cg_filter):
                keep = False

        # 6. Territory
        terr_filter = filters.get("territory")
        if keep and terr_filter:
            cust_info = customer_map.get(row.get("customer"))
            if not cust_info or str(cust_info.territory) != str(terr_filter):
                keep = False

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
    total_gross = 0
    dom_rev = 0
    exp_rev = 0
    cp_rev = 0
    
    total_pending = 0
    dom_pending = 0
    exp_pending = 0
    cp_pending = 0

    for row in data:
        amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
        g_amt = flt(row.get("gross_total") or amt)
        per_billed = flt(row.get("per_billed", 0))
        unbilled_amt = amt * (1.0 - (per_billed / 100.0))
        
        total_rev += amt
        total_gross += g_amt
        total_pending += unbilled_amt
        
        if row.get("dom_exp") == "Domestic":
            dom_rev += amt
            dom_pending += unbilled_amt
        elif row.get("dom_exp") == "Export":
            exp_rev += amt
            exp_pending += unbilled_amt
            
        cust_id = row.get("customer")
        cust_info = customer_map.get(cust_id)
        if cust_info and cust_info.customer_group:
            cg = cust_info.customer_group.lower()
            if any(x in cg for x in ["system integrator", "distributor", "distributer"]):
                cp_rev += amt
                cp_pending += unbilled_amt

    report_summary = [
        {"label": _("Total Net Booking"), "value": total_rev, "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Total Gross Booking"), "value": total_gross, "indicator": "purple", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Domestic Booking"), "value": dom_rev, "indicator": "green", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Export Booking"), "value": exp_rev, "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Channel Partner"), "value": cp_rev, "indicator": "cyan", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Total Pending"), "value": total_pending, "indicator": "red", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Domestic Pending"), "value": dom_pending, "indicator": "red", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Export Pending"), "value": exp_pending, "indicator": "red", "fieldtype": "Currency", "currency": "INR"}
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
            "colors": ['#4338ca', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#06b6d4', '#d946ef', '#f97316', '#64748b']
        }

    return {
        "summary": report_summary,
        "charts": {
            "top_10_salesperson": get_chart_def("Top 10 Salesperson by Booking", sp_rev_dict),
            "top_10_customers": get_chart_def("Top 10 Customers by Booking", cust_rev_dict),
            "top_10_products": get_chart_def("Top 10 Products by Booking", prod_rev_dict)
        },
        "results": data,
        "columns": columns
    }

@frappe.whitelist()
def export_to_excel(filters=None, export_type="all"):
    filters = prepare_filters(filters)
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
        ws_months = wb.create_sheet("Month-Wise Booking")
        ws_list = wb.create_sheet("Sales Orders List")
    elif export_type == "summary":
        ws_months = wb.active
        ws_months.title = "Month-Wise Booking"
        ws_overview = wb.create_sheet("Dummy1")
        ws_list = wb.create_sheet("Dummy2")
    elif export_type == "detail":
        ws_list = wb.active
        ws_list.title = "Sales Orders List"
        ws_overview = wb.create_sheet("Dummy1")
        ws_months = wb.create_sheet("Dummy2")
    
    # Premium Styling
    header_fill = PatternFill(start_color="2c3e50", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    title_font = Font(bold=True, size=14)
    section_font = Font(bold=True, size=12)
    footer_font = Font(bold=True, color="000000")
    thin_side = Side(style='thin')
    table_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    zebra_fill = PatternFill(start_color="f8f9fa", fill_type="solid")

    # 1. Overview Sheet Styling
    if export_type == "all":
        ws_overview.cell(row=1, column=1, value="Sales Order Booking Dashboard").font = title_font
        ws_overview.cell(row=1, column=5, value="Report Generated: " + frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M"))
        
        # Summary Cards on Overview
        ws_overview.cell(row=3, column=1, value="Booking Metrics Summary (Million INR)").font = section_font
        
        colors = {"blue": "3b82f6", "green": "10b981", "orange": "f59e0b", "purple": "8b5cf6", "red": "ef4444", "cyan": "06b6d4"}
        
        for i, s in enumerate(summary):
            r = 5 + (i // 4) * 3
            c = 1 + (i % 4) * 2
            bg_color = colors.get(s.get('indicator', 'blue').lower(), "3b82f6")
            
            cell_l = ws_overview.cell(row=r, column=c, value=s.get('label'))
            cell_l.font = Font(bold=True, color="FFFFFF")
            cell_l.fill = PatternFill(start_color=bg_color, fill_type="solid")
            cell_l.alignment = Alignment(horizontal="center")
            ws_overview.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c+1)
            
            val = flt(s.get('value')) / 1000000
            cell_v = ws_overview.cell(row=r+1, column=c, value=val)
            cell_v.font = Font(bold=True, size=11)
            cell_v.number_format = '"₹ "#,##0.00" M"'
            cell_v.alignment = Alignment(horizontal="center")
            cell_v.border = Border(bottom=Side(style='medium', color=bg_color))
            ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)
    
        # Chart Tables on Overview
        row_idx = 14
        for chart_id in ["top_10_salesperson", "top_10_customers", "top_10_products"]:
            c_data = charts.get(chart_id, {})
            if not c_data.get("data", {}).get("labels"): continue
            
            ws_overview.cell(row=row_idx, column=1, value=c_data.get("title") + " (M)").font = section_font
            row_idx += 1
            
            for idx, h in enumerate(["Category", "Net Value", "Share %"], start=1):
                cell = ws_overview.cell(row=row_idx, column=idx, value=h)
                cell.font = Font(bold=True, color="FFFFFF")
                cell.fill = PatternFill(start_color="475569", fill_type="solid")
                cell.alignment = Alignment(horizontal="center")
                cell.border = table_border
            row_idx += 1
            
            labels = c_data["data"]["labels"]
            values = c_data["data"]["datasets"][0]["values"]
            total_v = sum(values) or 1
            for i in range(len(labels)):
                ws_overview.cell(row=row_idx, column=1, value=labels[i]).border = table_border
                v_cell = ws_overview.cell(row=row_idx, column=2, value=flt(values[i])/1000000)
                v_cell.number_format = '"₹ "#,##0.00" M"'
                v_cell.border = table_border
                s_cell = ws_overview.cell(row=row_idx, column=3, value=values[i]/total_v)
                s_cell.number_format = "0.0%"
                s_cell.border = table_border
                row_idx += 1
            row_idx += 2

    if export_type in ["all", "summary"]:
        # 2. Month-Wise Booking Sheet
        row_idx = 1
        ws_months.cell(row=row_idx, column=1, value="Month-Wise Booking Breakdown (Million INR)").font = section_font
        row_idx += 2
        
        merged_data = {}
        months_set = set()
        for row in data:
            sp, cust, prod = row.get("sales_person") or "-", row.get("customer_name") or "-", row.get("item_name") or row.get("item_code") or "-"
            amt, g_amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total")), flt(row.get("gross_total") or 0)
            try:
                d = frappe.utils.getdate(row.get("so_date"))
                m_key, m_sort = d.strftime("%b %Y"), d.strftime("%Y%m")
            except: m_key, m_sort = "Unknown", "000000"
            months_set.add((m_sort, m_key))
            key = f"{sp}|{cust}|{prod}"
            if key not in merged_data: merged_data[key] = {"sp": sp, "cust": cust, "prod": prod, "months": {}, "total": 0, "total_gross": 0}
            merged_data[key]["months"][m_key] = merged_data[key]["months"].get(m_key, 0) + amt
            merged_data[key]["total"] += amt
            merged_data[key]["total_gross"] += g_amt
            
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
            fill = zebra_fill if r_idx % 2 == 0 else None
            ws_months.cell(row=row_idx, column=1, value=r_idx + 1).border = table_border
            ws_months.cell(row=row_idx, column=2, value=row["cust"]).border = table_border
            ws_months.cell(row=row_idx, column=3, value=row["sp"]).border = table_border
            ws_months.cell(row=row_idx, column=4, value=row["prod"]).border = table_border
            col_idx = 5
            for m_key in sorted_months:
                c = ws_months.cell(row=row_idx, column=col_idx, value=flt(row["months"].get(m_key, 0))/1000000)
                c.number_format, c.border = '"₹ "#,##0.00" M"', table_border
                col_idx += 1
            c_n = ws_months.cell(row=row_idx, column=col_idx, value=flt(row["total"])/1000000)
            c_n.number_format = '"₹ "#,##0.00" M"'
            c_n.font = Font(bold=True)
            c_n.fill = PatternFill(start_color="ecf0f1", fill_type="solid")
            c_n.border = table_border
            col_idx += 1
            c_g = ws_months.cell(row=row_idx, column=col_idx, value=flt(row["total_gross"])/1000000)
            c_g.number_format = '"₹ "#,##0.00" M"'
            c_g.font = Font(bold=True)
            c_g.fill = PatternFill(start_color="f1f5f9", fill_type="solid")
            c_g.border = table_border
            row_idx += 1
    
        # Add Footer Rows in Excel
        ws_months.cell(row=row_idx, column=1, value="Grand Total (Net)").font = header_font
        ws_months.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=4)
        for c in range(1, 5):
            ws_months.cell(row=row_idx, column=c).fill = header_fill
            ws_months.cell(row=row_idx, column=c).border = table_border
        m_totals_net, m_totals_gross, g_total_net, g_total_gross = {}, {}, sum(r["total"] for r in merged_data.values()), sum(r["total_gross"] for r in merged_data.values())
        
        # Monthly totals calculation
        for r in merged_data.values():
            for mk, mv in r["months"].items(): m_totals_net[mk] = m_totals_net.get(mk, 0) + mv
        for row_r in data:
            try:
                m_key = frappe.utils.getdate(row_r.get("so_date")).strftime("%b %Y")
                m_totals_gross[m_key] = m_totals_gross.get(m_key, 0) + flt(row_r.get("gross_total") or row_r.get("po_total"))
            except: pass
    
        col_idx = 5
        for m_key in sorted_months:
            c = ws_months.cell(row=row_idx, column=col_idx, value=flt(m_totals_net.get(m_key, 0))/1000000)
            c.number_format = '"₹ "#,##0.00" M"'
            c.font = header_font
            c.fill = header_fill
            c.border = table_border
            col_idx += 1
        c_gn = ws_months.cell(row=row_idx, column=col_idx, value=g_total_net / 1000000)
        c_gn.number_format = '"₹ "#,##0.00" M"'
        c_gn.font = header_font
        c_gn.fill = header_fill
        c_gn.border = table_border
        col_idx += 1
        c_sep = ws_months.cell(row=row_idx, column=col_idx, value="-")
        c_sep.font = header_font
        c_sep.fill = header_fill
        c_sep.border = table_border
        row_idx += 1
        
        ws_months.cell(row=row_idx, column=1, value="Grand Total (Gross)").font = header_font
        ws_months.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=4)
        for c in range(1, 5):
            ws_months.cell(row=row_idx, column=c).fill = header_fill
            ws_months.cell(row=row_idx, column=c).border = table_border
        col_idx = 5
        for m_key in sorted_months:
            c = ws_months.cell(row=row_idx, column=col_idx, value=flt(m_totals_gross.get(m_key, 0))/1000000)
            c.number_format = '"₹ "#,##0.00" M"'
            c.font = header_font
            c.fill = header_fill
            c.border = table_border
            col_idx += 1
        c_sep2 = ws_months.cell(row=row_idx, column=col_idx, value="-")
        c_sep2.font = header_font
        c_sep2.fill = header_fill
        c_sep2.border = table_border
        col_idx += 1
        c_gg = ws_months.cell(row=row_idx, column=col_idx, value=g_total_gross / 1000000)
        c_gg.number_format = '"₹ "#,##0.00" M"'
        c_gg.font = header_font
        c_gg.fill = header_fill
        c_gg.border = table_border
    
    if export_type in ["all", "detail"]:
        # 3. Sales Orders List Sheet
        row_idx = 1
        ws_list.cell(row=row_idx, column=1, value="Detailed Sales Orders List (Million INR)").font = section_font
        row_idx += 2
        ui_columns = [
            {"label": "S.No.", "fieldname": "sr_no_idx", "width": 8},
            {"label": "Order ID", "fieldname": "so_no", "width": 18},
            {"label": "Date", "fieldname": "so_date", "width": 14},
            {"label": "Status", "fieldname": "status", "width": 14},
            {"label": "Customer", "fieldname": "customer_name", "width": 25},
            {"label": "Item", "fieldname": "item_code", "width": 20},
            {"label": "Sales Person", "fieldname": "sales_person", "width": 20},
            {"label": "Qty", "fieldname": "order_quantity", "width": 10},
            {"label": "Amount (M)", "fieldname": "total_net_amount_(inr)", "width": 18}
        ]
        for idx, col in enumerate(ui_columns, start=1):
            cell = ws_list.cell(row=row_idx, column=idx, value=col["label"])
            cell.font, cell.fill, cell.alignment, cell.border = header_font, header_fill, Alignment(horizontal="center"), table_border
            ws_list.column_dimensions[get_column_letter(idx)].width = col["width"]
        row_idx += 1
        total_list_amt = 0
        for r_idx, row in enumerate(data):
            for idx, col in enumerate(ui_columns, start=1):
                fname = col["fieldname"]
                val = row.get(fname) if fname != "sr_no_idx" else r_idx + 1
                if val is None:
                    if fname == "order_quantity": val = row.get("po_qty")
                    if fname == "total_net_amount_(inr)": val = row.get("po_total")
                cell = ws_list.cell(row=row_idx, column=idx)
                cell.border = table_border
                if isinstance(val, (int, float)):
                    if fname == "total_net_amount_(inr)":
                        val /= 1000000
                        cell.number_format = '"₹ "#,##0.00" M"'
                        total_list_amt += flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
                    cell.value, cell.alignment = val, Alignment(horizontal="right")
                else:
                    cell.value, cell.alignment = str(val) if val else "", Alignment(horizontal="left")
            row_idx += 1
        
        ws_list.cell(row=row_idx, column=1, value="Grand Total").font = header_font
        ws_list.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=8)
        for c in range(1, 9): 
            ws_list.cell(row=row_idx, column=c).fill = header_fill
            ws_list.cell(row=row_idx, column=c).border = table_border
        c_tot = ws_list.cell(row=row_idx, column=9, value=total_list_amt / 1000000)
        c_tot.font = header_font
        c_tot.fill = header_fill
        c_tot.number_format = '"₹ "#,##0.00" M"'
        c_tot.alignment = Alignment(horizontal="right")
        c_tot.border = table_border

    # Remove dummy sheets if created
    for dummy_name in ["Dummy1", "Dummy2"]:
        if dummy_name in wb.sheetnames:
            wb.remove(wb[dummy_name])

    if "Dashboard Overview" in wb.sheetnames:
        for i in range(1, 10):
            wb["Dashboard Overview"].column_dimensions[get_column_letter(i)].width = 22
    if "Month-Wise Booking" in wb.sheetnames:
        for i in range(1, 10):
            wb["Month-Wise Booking"].column_dimensions[get_column_letter(i)].width = 22

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"Sales_Order_Dashboard_{frappe.utils.nowdate()}.xlsx"
    if export_type == "summary":
        filename = f"Month_Wise_Consolidated_Booking_{frappe.utils.nowdate()}.xlsx"
    elif export_type == "detail":
        filename = f"Sales_Orders_List_{frappe.utils.nowdate()}.xlsx"

    return {
        "filename": filename,
        "filecontent": base64.b64encode(output.read()).decode()
    }
