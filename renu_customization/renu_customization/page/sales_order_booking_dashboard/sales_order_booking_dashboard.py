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
        "to_date": filters.to_date,
        "company": filters.company
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
        sos = frappe.get_all("Sales Order", filters={"name": ("in", so_names)}, fields=so_fields, limit_page_length=None)
        so_info_map = {s.name: s for s in sos}

    so_item_map = {}
    if so_names:
        so_items = frappe.get_all("Sales Order Item", 
            filters={"parent": ("in", so_names)}, 
            fields=["parent", "item_code", "returned_qty", "base_rate"],
            limit_page_length=None
        )
        for item in so_items:
            key = (item.parent, item.item_code)
            if key not in so_item_map:
                so_item_map[key] = []
            so_item_map[key].append(item)

    # Fetch Pick List Item info for "Picked" metric
    pick_item_map = {}
    if so_names:
        pick_items = frappe.db.sql("""
            SELECT sales_order_item, SUM(picked_qty) as picked_qty
            FROM `tabPick List Item`
            WHERE sales_order IN %(so_names)s
            AND docstatus = 1
            GROUP BY sales_order_item
        """, {"so_names": so_names}, as_dict=1)
        pick_item_map = {d.sales_order_item: flt(d.picked_qty) for d in pick_items}

    cust_list = frappe.get_all("Customer", fields=["name", "customer_group", "territory"], limit_page_length=None)
    customer_map = {c.name: c for c in cust_list}

    item_codes = list(set([d.get("item_code") for d in processed_raw_data if d.get("item_code")]))
    item_group_map = {}
    if item_codes:
        items = frappe.get_all("Item", filters={"name": ("in", item_codes)}, fields=["name", "item_group"], limit_page_length=None)
        item_group_map = {i.name: i.item_group for i in items}

    # Group and collapse duplicates from report (e.g. due to Sales Team joins)
    unique_data_map = {}
    for row in processed_raw_data:
        so_id = row.get("so_no")
        # Use a combination of keys to uniquely identify a Sales Order Item line
        sr_no = row.get("sr_no") or row.get("idx") or ""
        item_code = row.get("item_code") or ""
        qty = flt(row.get("order_quantity") or row.get("po_qty"))
        
        # Unique key for the item line
        item_key = (so_id, str(sr_no), item_code, qty)
        
        if item_key in unique_data_map:
            existing = unique_data_map[item_key]
            # If we see the same item again, it's likely a duplicate row for a different Sales Person
            new_sp = str(row.get("sales_person") or "").strip()
            if new_sp and new_sp not in str(existing.get("sales_person") or ""):
                existing["sales_person"] = (str(existing.get("sales_person") or "") + ", " + new_sp).strip(", ")
            continue

        # Enrichment logic (only run once per unique item)
        s_info = so_info_map.get(so_id, {})
        row["status"] = s_info.get("status")
        row["customer"] = s_info.get("customer")
        row["per_billed"] = s_info.get("per_billed", 0)
        row["invoice_type"] = row.get("invoice_type") or s_info.get("invoice_type")
        
        si_net = flt(s_info.get("base_net_total") or 1)
        si_grand = flt(s_info.get("base_grand_total") or si_net)
        row["si_net_total"] = si_net
        row["si_grand_total"] = si_grand

        # Handle Returns
        base_line_amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
        returned_val = 0
        if so_id and item_code and (so_id, item_code) in so_item_map:
            matched_items = so_item_map[(so_id, item_code)]
            if matched_items:
                mi = matched_items.pop(0)
                returned_val = flt(mi.get("returned_qty", 0)) * flt(mi.get("base_rate", 0))

        # Booked amount should be the full order value to match target 375,461,138.54
        net_amt = base_line_amt
        row["po_total"] = net_amt
        row["total_net_amount_(inr)"] = net_amt
        row["gross_total"] = net_amt * (si_grand / si_net) if si_net else net_amt
        row["dom_exp"] = row.get("domestic/export") or row.get("domestic_export")
        
        # Picked and Delivered Metrics
        soi_name = row.get("name") # This assumes the report returns the soi name
        row["picked_qty_val"] = pick_item_map.get(soi_name, 0)
        row["picked_net_total_inr"] = flt(row["picked_qty_val"]) * flt(row.get("base_rate", 0))
        # Note: returned_val is still tracked but not subtracted from the "Booked" KPI
        row["returned_val"] = returned_val
        row["cancelled_val"] = net_amt if row.get("status") == "Cancelled" else 0

        # Filtering logic
        keep = True
        
        # Status Filter
        stat_filter = filters.get("status")
        if stat_filter:
            if isinstance(stat_filter, str):
                stat_filter = [s.strip() for s in stat_filter.split(",")]
            if row.get("status") not in stat_filter:
                keep = False

        # Sales Person Filter
        sp_filter = filters.get("sales_person")
        if keep and sp_filter:
            row_sp = str(row.get("sales_person") or "").strip().lower()
            if str(sp_filter).strip().lower() not in row_sp:
                keep = False
            
        # Customer Filter
        cust_filter = filters.get("customer") or filters.get("customer_name")
        if keep and cust_filter:
            f_cust = str(cust_filter).strip().lower()
            row_cust_id = str(row.get("customer") or row.get("customer_code") or "").strip().lower()
            row_cust_name = str(row.get("customer_name") or "").strip().lower()
            if f_cust != row_cust_id and f_cust != row_cust_name and f_cust not in row_cust_name:
                keep = False
            
        # Product Filter
        prod_filter = filters.get("item") or filters.get("item_code") or filters.get("product")
        if keep and prod_filter:
            f_prod = str(prod_filter).strip().lower()
            row_prod_code = str(row.get("item_code") or "").strip().lower()
            row_prod_name = str(row.get("item_name") or "").strip().lower()
            if f_prod != row_prod_code and f_prod != row_prod_name and f_prod not in row_prod_name:
                keep = False

        # Item Group Filter
        ig_filter = filters.get("item_group")
        if keep and ig_filter:
            row_item_group = item_group_map.get(row.get("item_code"))
            if str(row_item_group) != str(ig_filter):
                keep = False

        # Customer Group Filter
        cg_filter = filters.get("customer_group")
        if keep and cg_filter:
            cust_info = customer_map.get(row.get("customer"))
            if not cust_info or str(cust_info.customer_group) != str(cg_filter):
                keep = False

        # Territory Filter
        terr_filter = filters.get("territory")
        if keep and terr_filter:
            cust_info = customer_map.get(row.get("customer"))
            if not cust_info or str(cust_info.territory) != str(terr_filter):
                keep = False

        # Type Filter
        dom_exp_f = filters.get("dom_exp")
        if keep and dom_exp_f:
            if str(dom_exp_f) != str(row.get("dom_exp")):
                keep = False
                
        # Invoice Type Filter
        inv_type_f = filters.get("invoice_type")
        if keep and inv_type_f:
            if str(inv_type_f) != str(row.get("invoice_type")):
                keep = False

        if keep:
            unique_data_map[item_key] = row

    data = list(unique_data_map.values())


    if not data:
        return { "summary": [], "charts": {}, "results": [], "columns": columns }

    # Lifecycle Metrics: Global
    booked_rev = 0
    cancelled_rev = 0
    short_close_rev = 0
    delivered_rev = 0
    
    # Lifecycle Metrics: Domestic
    dom_booked = 0
    dom_cancelled = 0
    dom_short_close = 0
    dom_delivered = 0
    
    # Lifecycle Metrics: Export
    exp_booked = 0
    exp_cancelled = 0
    exp_short_close = 0
    exp_delivered = 0
    
    # Lifecycle Metrics: Channel Partner
    cp_booked = 0
    cp_cancelled = 0
    cp_short_close = 0
    cp_delivered = 0
    
    # Chart-related totals
    total_rev = 0
    total_gross = 0
    cp_active_rev = 0
    picked_rev = 0
    dom_picked = 0
    exp_picked = 0
    cp_picked = 0
    
    overdue_rev = 0
    dom_overdue = 0
    exp_overdue = 0
    cp_overdue = 0
    today = frappe.utils.getdate()
    
    for row in data:

        status = row.get("status")
        amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
        deliv_amt = flt(row.get("delivered_net_total_inr") or (amt * (flt(row.get("per_billed", 0)) / 100.0)))
        
        # Identification
        d_e = row.get("dom_exp")
        is_cp = False
        cust_id = row.get("customer")
        cust_info = customer_map.get(cust_id)
        if cust_info and cust_info.customer_group:
            cg = (cust_info.customer_group or "").lower()
            if any(x in cg for x in ["system integrator", "distributor", "distributer"]):
                is_cp = True

        # Global Metrics
        sc_amt = flt(row.get("short_close_qty", 0)) * flt(row.get("base_rate") or (flt(row.get("item_rate", 0)) * flt(row.get("exchange_rate", 1))))
        
        if status not in ("Cancelled", "Draft"):
            booked_rev += amt
            if d_e == "Domestic": dom_booked += amt
            elif d_e == "Export": exp_booked += amt
            if is_cp: cp_booked += amt
            
        if status == "Cancelled":
            cancelled_rev += amt
            if d_e == "Domestic": dom_cancelled += amt
            elif d_e == "Export": exp_cancelled += amt
            if is_cp: cp_cancelled += amt
        
        if sc_amt > 0 and status not in ("Cancelled", "Draft"):
            short_close_rev += sc_amt
            if d_e == "Domestic": dom_short_close += sc_amt
            elif d_e == "Export": exp_short_close += sc_amt
            if is_cp: cp_short_close += sc_amt
        
        if status not in ("Cancelled", "Draft"):
            delivered_rev += deliv_amt
            if d_e == "Domestic": dom_delivered += deliv_amt
            elif d_e == "Export": exp_delivered += deliv_amt
            if is_cp: cp_delivered += deliv_amt
            
            p_amt = flt(row.get("picked_net_total_inr", 0))
            picked_rev += p_amt
            if d_e == "Domestic": dom_picked += p_amt
            elif d_e == "Export": exp_picked += p_amt
            if is_cp: cp_picked += p_amt

        # Chart Totals (Excludes Cancelled/Draft)
        if status not in ("Cancelled", "Draft"):
            g_amt = flt(row.get("gross_total") or amt)
            total_rev += amt
            total_gross += g_amt
            if is_cp:
                cp_active_rev += amt

        # Overdue Calculation
        if status not in ("Cancelled", "Closed", "Completed", "Draft"):
            d_date = row.get("delivery_date")
            if d_date:
                if frappe.utils.getdate(d_date) < today:
                    bal = amt - deliv_amt
                    overdue_rev += bal
                    if d_e == "Domestic": dom_overdue += bal
                    elif d_e == "Export": exp_overdue += bal
                    if is_cp: cp_overdue += bal

        # Store calculated metrics for detailed list and exports
        row["sc_value"] = sc_amt
        row["delivered_net_total_inr"] = deliv_amt
        if status == "Cancelled":
            row["balance_net_total_inr"] = 0
        else:
            row["balance_net_total_inr"] = flt(row.get("balance_net_total_inr") or (amt - deliv_amt))


    actual_book = booked_rev - short_close_rev
    final_pending = actual_book - delivered_rev
    
    dom_actual = dom_booked - dom_short_close
    dom_pending = dom_actual - dom_delivered
    
    exp_actual = exp_booked - exp_short_close
    exp_pending = exp_actual - exp_delivered
    
    cp_actual = cp_booked - cp_short_close
    cp_pending = cp_actual - cp_delivered

    report_summary = [
        # Global
        {"label": _("Global Booked"), "value": booked_rev, "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Global Cancelled"), "value": cancelled_rev, "indicator": "red", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Global Short Close"), "value": short_close_rev, "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Global Actual"), "value": actual_book, "indicator": "green", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Global Picked"), "value": picked_rev, "indicator": "yellow", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Global Delivered"), "value": delivered_rev, "indicator": "cyan", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Global Overdue"), "value": overdue_rev, "indicator": "purple", "fieldtype": "Currency", "currency": "INR"},
        
        # Domestic
        {"label": _("Dom. Booked"), "value": dom_booked, "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Dom. Cancelled"), "value": dom_cancelled, "indicator": "red", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Dom. Short Close"), "value": dom_short_close, "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Dom. Actual"), "value": dom_actual, "indicator": "green", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Dom. Picked"), "value": dom_picked, "indicator": "yellow", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Dom. Delivered"), "value": dom_delivered, "indicator": "cyan", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Dom. Overdue"), "value": dom_overdue, "indicator": "purple", "fieldtype": "Currency", "currency": "INR"},

        # Export
        {"label": _("Exp. Booked"), "value": exp_booked, "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Exp. Cancelled"), "value": exp_cancelled, "indicator": "red", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Exp. Short Close"), "value": exp_short_close, "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Exp. Actual"), "value": exp_actual, "indicator": "green", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Exp. Picked"), "value": exp_picked, "indicator": "yellow", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Exp. Delivered"), "value": exp_delivered, "indicator": "cyan", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Exp. Overdue"), "value": exp_overdue, "indicator": "purple", "fieldtype": "Currency", "currency": "INR"},

        
        # Channel Partner
        {"label": _("CP Booked"), "value": cp_booked, "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("CP Cancelled"), "value": cp_cancelled, "indicator": "red", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("CP Short Close"), "value": cp_short_close, "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("CP Actual"), "value": cp_actual, "indicator": "green", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("CP Picked"), "value": cp_picked, "indicator": "yellow", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("CP Delivered"), "value": cp_delivered, "indicator": "cyan", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("CP Overdue"), "value": cp_overdue, "indicator": "purple", "fieldtype": "Currency", "currency": "INR"}
    ]
    


    sp_rev_dict = {}
    cust_rev_dict = {}
    prod_rev_dict = {}
    
    for row in data:
        # For Chart aggregation, if multiple sales persons exist, we split the credit proportionally
        # to ensure the chart total matches the global booked total.
        amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
        
        # Sales Person split
        sp_raw = str(row.get("sales_person") or "Unassigned")
        sp_list = [s.strip() for s in sp_raw.split(",") if s.strip()]
        if not sp_list: sp_list = ["Unassigned"]
        split_amt = amt / len(sp_list)
        
        for sp in sp_list:
            sp_rev_dict[sp] = sp_rev_dict.get(sp, 0) + split_amt
        
        cust = row.get("customer_name") or "Unknown"
        cust_rev_dict[cust] = cust_rev_dict.get(cust, 0) + amt
        
        prod = row.get("item_name") or row.get("item_code") or "Unknown"
        prod_rev_dict[prod] = prod_rev_dict.get(prod, 0) + amt


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
        ws_lifecycle = wb.create_sheet("Monthly Lifecycle Summary")
        ws_list = wb.create_sheet("Sales Orders List")
    elif export_type == "summary":
        ws_months = wb.active
        ws_months.title = "Month-Wise Booking"
        ws_lifecycle = wb.create_sheet("Monthly Lifecycle Summary")
        ws_overview = wb.create_sheet("Dummy1")
        ws_list = wb.create_sheet("Dummy2")
    elif export_type == "detail":
        ws_list = wb.active
        ws_list.title = "Sales Orders List"
        ws_overview = wb.create_sheet("Dummy1")
        ws_months = wb.create_sheet("Dummy2")
        ws_lifecycle = wb.create_sheet("Dummy3")
    
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
            cell_v.number_format = '"₹ "#,##0.0000" M"'
            cell_v.alignment = Alignment(horizontal="center")
            cell_v.border = Border(bottom=Side(style='medium', color=bg_color))
            ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)
    
        # Chart Tables on Overview
        # Calculate row_idx dynamically based on summary cards (4 per row, each taking 3 rows)
        row_idx = 5 + ((len(summary) - 1) // 4 + 1) * 3 + 2
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
                v_cell.number_format = '"₹ "#,##0.0000" M"'
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
            if key not in merged_data: merged_data[key] = {"sp": sp, "cust": cust, "prod": prod, "months": {}, "total": 0, "total_cancelled": 0, "total_gross": 0}
            if row.get("status") != "Cancelled":
                merged_data[key]["months"][m_key] = merged_data[key]["months"].get(m_key, 0) + amt
                merged_data[key]["total"] += amt
                merged_data[key]["total_gross"] += g_amt
            merged_data[key]["total_cancelled"] += flt(row.get("cancelled_val") or 0)
            
        sorted_months = [x[1] for x in sorted(list(months_set), key=lambda x: x[0])]
        headers = ["S.No.", "Customer", "Sales Person", "Product"] + sorted_months + ["Total (Net)", "Cancelled (M)", "Grand Total (Gross)"]
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
                c.number_format, c.border = '"₹ "#,##0.0000" M"', table_border
                col_idx += 1
            c_n = ws_months.cell(row=row_idx, column=col_idx, value=flt(row["total"])/1000000)
            c_n.number_format = '"₹ "#,##0.0000" M"'
            c_n.font = Font(bold=True)
            c_n.fill = PatternFill(start_color="ecf0f1", fill_type="solid")
            c_n.border = table_border
            col_idx += 1
            c_c = ws_months.cell(row=row_idx, column=col_idx, value=flt(row["total_cancelled"])/1000000)
            c_c.number_format = '"₹ "#,##0.0000" M"'
            c_c.border = table_border
            col_idx += 1
            c_g = ws_months.cell(row=row_idx, column=col_idx, value=flt(row["total_gross"])/1000000)
            c_g.number_format = '"₹ "#,##0.0000" M"'
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
        m_totals_net, m_totals_gross, g_total_net, g_total_cancelled, g_total_gross = {}, {}, sum(r["total"] for r in merged_data.values()), sum(r["total_cancelled"] for r in merged_data.values()), sum(r["total_gross"] for r in merged_data.values())
        
        # Monthly totals calculation
        for r in merged_data.values():
            for mk, mv in r["months"].items(): m_totals_net[mk] = m_totals_net.get(mk, 0) + mv
        for row_r in data:
            try:
                m_key = frappe.utils.getdate(row_r.get("so_date")).strftime("%b %Y")
                if row_r.get("status") != "Cancelled":
                    m_totals_gross[m_key] = m_totals_gross.get(m_key, 0) + flt(row_r.get("gross_total") or row_r.get("po_total"))
            except: pass
    
        col_idx = 5
        for m_key in sorted_months:
            c = ws_months.cell(row=row_idx, column=col_idx, value=flt(m_totals_net.get(m_key, 0))/1000000)
            c.number_format = '"₹ "#,##0.0000" M"'
            c.font, c.fill, c.border = header_font, header_fill, table_border
            c.alignment = Alignment(horizontal="right")
            col_idx += 1
            
        c_gn = ws_months.cell(row=row_idx, column=col_idx, value=g_total_net / 1000000)
        c_gn.number_format = '"₹ "#,##0.0000" M"'
        c_gn.font, c_gn.fill, c_gn.border = header_font, header_fill, table_border
        c_gn.alignment = Alignment(horizontal="right")
        col_idx += 1
        
        c_gc = ws_months.cell(row=row_idx, column=col_idx, value=g_total_cancelled / 1000000)
        c_gc.number_format = '"₹ "#,##0.0000" M"'
        c_gc.font, c_gc.fill, c_gc.border = header_font, header_fill, table_border
        c_gc.alignment = Alignment(horizontal="right")
        col_idx += 1
        
        c_sep = ws_months.cell(row=row_idx, column=col_idx, value="-")
        c_sep.font, c_sep.fill, c_sep.border = header_font, header_fill, table_border
        c_sep.alignment = Alignment(horizontal="center")
        row_idx += 1
        
        ws_months.cell(row=row_idx, column=1, value="Grand Total (Gross)").font = header_font
        ws_months.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=4)
        for c in range(1, 5):
            ws_months.cell(row=row_idx, column=c).fill = header_fill
            ws_months.cell(row=row_idx, column=c).border = table_border
            
        col_idx = 5
        for m_key in sorted_months:
            c = ws_months.cell(row=row_idx, column=col_idx, value=flt(m_totals_gross.get(m_key, 0))/1000000)
            c.number_format = '"₹ "#,##0.0000" M"'
            c.font, c.fill, c.border = header_font, header_fill, table_border
            c.alignment = Alignment(horizontal="right")
            col_idx += 1
            
        c_sep2 = ws_months.cell(row=row_idx, column=col_idx, value="-")
        c_sep2.font, c_sep2.fill, c_sep2.border = header_font, header_fill, table_border
        c_sep2.alignment = Alignment(horizontal="center")
        col_idx += 1
        
        c_sep3 = ws_months.cell(row=row_idx, column=col_idx, value="-")
        c_sep3.font, c_sep3.fill, c_sep3.border = header_font, header_fill, table_border
        c_sep3.alignment = Alignment(horizontal="center")
        col_idx += 1
        
        c_gg = ws_months.cell(row=row_idx, column=col_idx, value=g_total_gross / 1000000)
        c_gg.number_format = '"₹ "#,##0.0000" M"'
        c_gg.font, c_gg.fill, c_gg.border = header_font, header_fill, table_border
        c_gg.alignment = Alignment(horizontal="right")
        row_idx += 3

    if export_type in ["all", "summary"]:
        # 2.1 Monthly Lifecycle Summary (Excel - Separate Sheet)
        row_idx_l = 1
        ws_lifecycle.cell(
            row=row_idx_l, column=1, value="Monthly Lifecycle Summary (Million INR)"
        ).font = section_font
        row_idx_l += 2

        lifecycle_summary_data = {
            "Booked": {m: 0 for m in sorted_months},
            "Cancelled": {m: 0 for m in sorted_months},
            "Short Close": {m: 0 for m in sorted_months},
            "Actual": {m: 0 for m in sorted_months},
            "Delivered": {m: 0 for m in sorted_months},
            "Overdue": {m: 0 for m in sorted_months},
        }

        today = frappe.utils.getdate()
        for row in data:
            try:
                m_key = frappe.utils.getdate(row.get("so_date")).strftime("%b %Y")
            except:
                continue
            if m_key not in sorted_months:
                continue

            amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
            status = row.get("status")

            if status != "Cancelled":
                lifecycle_summary_data["Booked"][m_key] += amt
            
            if status == "Cancelled":
                lifecycle_summary_data["Cancelled"][m_key] += amt

            sc_amt = flt(row.get("short_close_qty", 0)) * flt(
                row.get("base_rate") or row.get("item_rate", 0)
            )
            if sc_amt > 0:
                lifecycle_summary_data["Short Close"][m_key] += sc_amt

            deliv_amt = flt(row.get("delivered_net_total_inr") or 0)
            if not deliv_amt:
                deliv_amt = amt * (flt(row.get("per_billed", 0)) / 100.0)

            if status != "Cancelled":
                lifecycle_summary_data["Delivered"][m_key] += deliv_amt

            if status not in ("Cancelled", "Closed", "Completed"):
                delivery_date = row.get("delivery_date")
                if delivery_date:
                    delivery_date = frappe.utils.getdate(delivery_date)
                    if delivery_date < today:
                        balance = flt(row.get("balance_net_total_inr") or 0)
                        if not balance:
                            balance = amt - deliv_amt
                        lifecycle_summary_data["Overdue"][m_key] += balance

        for m_key in sorted_months:
            lifecycle_summary_data["Actual"][m_key] = (
                lifecycle_summary_data["Booked"][m_key]
                - lifecycle_summary_data["Short Close"][m_key]
            )

        headers_l = ["Category"] + sorted_months + ["Total"]
        for idx, h in enumerate(headers_l, start=1):
            cell = ws_lifecycle.cell(row=row_idx_l, column=idx, value=h)
            cell.font, cell.fill, cell.alignment, cell.border = (
                header_font,
                header_fill,
                Alignment(horizontal="center"),
                table_border,
            )
            ws_lifecycle.column_dimensions[get_column_letter(idx)].width = 20
        row_idx_l += 1

        categories = ["Booked", "Cancelled", "Short Close", "Actual", "Delivered", "Overdue"]
        for cat in categories:
            ws_lifecycle.cell(row=row_idx_l, column=1, value=cat).border = table_border
            ws_lifecycle.cell(row=row_idx_l, column=1, value=cat).font = Font(bold=True)
            col_idx = 2
            total_cat = 0
            for m_key in sorted_months:
                val = lifecycle_summary_data[cat][m_key]
                total_cat += val
                c = ws_lifecycle.cell(
                    row=row_idx_l, column=col_idx, value=flt(val) / 1000000
                )
                c.number_format, c.border = '"₹ "#,##0.0000" M"', table_border
                col_idx += 1
            c_tot = ws_lifecycle.cell(row=row_idx_l, column=col_idx, value=flt(total_cat) / 1000000)
            c_tot.number_format, c_tot.border = '"₹ "#,##0.0000" M"', table_border
            c_tot.font = Font(bold=True)
            row_idx_l += 1
    
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
            {"label": "Cust. PO No.", "fieldname": "po_no", "width": 18},
            {"label": "Item", "fieldname": "item_code", "width": 20},
            {"label": "Deliv. Date", "fieldname": "delivery_date", "width": 14},
            {"label": "Sales Person", "fieldname": "sales_person", "width": 20},
            {"label": "Order (M)", "fieldname": "total_net_amount_(inr)", "width": 16},
            {"label": "Cancelled (M)", "fieldname": "cancelled_val", "width": 16},
            {"label": "Picked (M)", "fieldname": "picked_net_total_inr", "width": 16},
            {"label": "Delivery (M)", "fieldname": "delivered_net_total_inr", "width": 16},
            {"label": "Short Close (M)", "fieldname": "sc_value", "width": 16},
            {"label": "Open (M)", "fieldname": "balance_net_total_inr", "width": 16}
        ]
        for idx, col in enumerate(ui_columns, start=1):
            cell = ws_list.cell(row=row_idx, column=idx, value=col["label"])
            cell.font, cell.fill, cell.alignment, cell.border = header_font, header_fill, Alignment(horizontal="center"), table_border
            ws_list.column_dimensions[get_column_letter(idx)].width = col["width"]
        row_idx += 1
        total_list_amt = 0
        total_list_cancelled = 0
        total_list_picked = 0
        total_list_delivered = 0
        total_list_sc = 0
        total_list_balance = 0
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
                    if fname in ["total_net_amount_(inr)", "cancelled_val", "picked_net_total_inr", "delivered_net_total_inr", "sc_value", "balance_net_total_inr"]:
                        val /= 1000000
                        cell.number_format = '"₹ "#,##0.0000" M"'
                        if fname == "total_net_amount_(inr)":
                            if row.get("status") != "Cancelled":
                                total_list_amt += flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
                        elif fname == "cancelled_val": total_list_cancelled += flt(row.get("cancelled_val") or 0)
                        elif fname == "picked_net_total_inr": total_list_picked += flt(row.get("picked_net_total_inr") or 0)
                        elif fname == "delivered_net_total_inr": total_list_delivered += flt(row.get("delivered_net_total_inr") or 0)
                        elif fname == "sc_value": total_list_sc += flt(row.get("sc_value") or 0)
                        elif fname == "balance_net_total_inr": total_list_balance += flt(row.get("balance_net_total_inr") or 0)
                    cell.value, cell.alignment = val, Alignment(horizontal="right")
                else:
                    cell.value, cell.alignment = str(val) if val else "", Alignment(horizontal="left")
            row_idx += 1
        
        ws_list.cell(row=row_idx, column=1, value="Grand Total").font = header_font
        ws_list.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=9)
        for c in range(1, 10): 
            ws_list.cell(row=row_idx, column=c).fill = header_fill
            ws_list.cell(row=row_idx, column=c).border = table_border
        # Fill the rest of the columns in the footer
        total_list_values = [
            total_list_amt, 
            total_list_cancelled, 
            total_list_picked, 
            total_list_delivered, 
            total_list_sc, 
            total_list_balance
        ]
        
        for i, val in enumerate(total_list_values):
            col = 10 + i
            c_f = ws_list.cell(row=row_idx, column=col, value=val / 1000000)
            c_f.font = header_font
            c_f.fill = header_fill
            c_f.number_format = '"₹ "#,##0.0000" M"'
            c_f.alignment = Alignment(horizontal="right")
            c_f.border = table_border

    # Remove dummy sheets if created
    for dummy_name in ["Dummy1", "Dummy2", "Dummy3"]:
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
