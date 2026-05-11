import frappe
from frappe import _
from frappe.utils import flt, getdate
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
    
    filters = frappe._dict(filters)

    # Handle DateRange from JS (Legacy/Compatibility)
    if filters.get("date_range"):
        dr = filters.get("date_range")
        if isinstance(dr, list) and len(dr) == 2:
            filters["from_date"] = dr[0]
            filters["to_date"] = dr[1]

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
            # This ensures "Fiscal Year" acts as a hard filter boundary
            if filters.get("from_date") and getdate(filters.from_date) < getdate(fy.year_start_date):
                filters["from_date"] = fy.year_start_date
            
            if filters.get("to_date") and getdate(filters.to_date) > getdate(fy.year_end_date):
                filters["to_date"] = fy.year_end_date

    # Remove "All" values from filters so they don't affect backend queries
    keys_to_remove = [k for k, v in filters.items() if v == "All"]
    for k in keys_to_remove:
        del filters[k]

    return filters

@frappe.whitelist()
def get_dashboard_data(filters=None):
    filters = prepare_filters(filters)
    
    # Base SQL conditions
    conditions = "WHERE so.docstatus = 1"
    
    # Build dynamic filters for SQL performance
    if filters.get("from_date"):
        conditions += " AND so.transaction_date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND so.transaction_date <= %(to_date)s"
    if filters.get("company"):
        conditions += " AND so.company = %(company)s"
    if filters.get("customer"):
        conditions += " AND so.customer = %(customer)s"
    if filters.get("customer_group"):
        conditions += " AND c.customer_group = %(customer_group)s"
    if filters.get("item_group"):
        conditions += " AND i.item_group = %(item_group)s"
    if filters.get("item_code"):
        conditions += " AND soi.item_code = %(item_code)s"
    if filters.get("sales_person"):
        conditions += " AND EXISTS (SELECT 1 FROM `tabSales Team` WHERE parent = so.name AND sales_person = %(sales_person)s)"
    if filters.get("business_region_name"):
        conditions += " AND c.business_region_name = %(business_region_name)s"
    if filters.get("dom_exp"):
        if filters.dom_exp == "Domestic":
            conditions += " AND IFNULL(a.country, '') = 'India'"
        elif filters.dom_exp == "Export":
            conditions += " AND IFNULL(a.country, '') != 'India'"
    
    has_inv_type = frappe.get_meta("Sales Order").has_field("invoice_type")
    if has_inv_type and filters.get("invoice_type"):
        conditions += " AND so.invoice_type = %(invoice_type)s"

    # Status filter (multi-select)
    if filters.get("status"):
        if isinstance(filters.status, str):
            status_list = [s.strip() for s in filters.status.split(",") if s.strip()]
        else:
            status_list = filters.status
        if status_list:
            filters["status_list"] = tuple(status_list)
            conditions += " AND so.status IN %(status_list)s"

    # The Core Query - optimized for transaction data
    sql = f"""
        SELECT
            soi.name AS name,
            so.name AS so_no,
            so.transaction_date AS so_date,
            soi.idx AS sr_no,
            so.po_no AS customer_po_no,
            so.po_date AS customer_po_date,
            so.status AS status,
            so.customer AS customer,
            so.customer_name AS customer_name,
            soi.item_code AS item_code,
            soi.item_name AS item_name,
            REGEXP_REPLACE(soi.description, '<[^>]*>', '') AS description,
            soi.qty AS order_quantity,
            soi.delivered_qty AS delivered_qty,
            soi.total_short_close_qty AS short_close_qty,
            soi.rate AS item_rate,
            soi.base_rate AS base_rate,
            so.currency AS currency,
            so.conversion_rate AS exchange_rate,
            so.base_net_total AS si_net_total,
            so.base_grand_total AS si_grand_total,
            so.per_billed AS per_billed,
            soi.delivery_date AS delivery_date,
            
            -- Picked Qty from Pick List
            (SELECT IFNULL(SUM(pli.picked_qty), 0) 
             FROM `tabPick List Item` pli 
             WHERE pli.sales_order_item = soi.name AND pli.docstatus = 1) AS picked_qty_val,
            
            -- Calculated values to match report logic
            ((soi.qty - IFNULL(soi.total_short_close_qty, 0)) * soi.base_rate) AS `total_net_amount_(inr)`,
            ((soi.delivered_qty - IFNULL(soi.returned_qty, 0)) * soi.base_rate) AS net_delivered_net_total,
            (((soi.qty - IFNULL(soi.total_short_close_qty, 0)) * soi.base_rate) - ((soi.delivered_qty - IFNULL(soi.returned_qty, 0)) * soi.base_rate)) AS balance_net_total,
            
            -- Enrichment fields
            c.customer_group,
            c.business_region_name,
            i.item_group,
            CASE WHEN IFNULL(a.country, '') = 'India' THEN 'Domestic' ELSE 'Export' END AS `dom_exp`,
            (SELECT GROUP_CONCAT(DISTINCT sales_person SEPARATOR ', ') FROM `tabSales Team` WHERE parent = so.name) AS sales_person
            {", so.invoice_type" if has_inv_type else ""}

        FROM `tabSales Order` so
        INNER JOIN `tabSales Order Item` soi ON soi.parent = so.name
        LEFT JOIN `tabCustomer` c ON so.customer = c.name
        LEFT JOIN `tabItem` i ON i.name = soi.item_code
        LEFT JOIN `tabAddress` a ON a.name = so.customer_address
        {conditions}
        AND IFNULL(i.custom_is_freight_item, 0) = 0
        AND soi.item_name != 'Freight'
        ORDER BY so.transaction_date ASC, so.name ASC, soi.idx ASC
    """
    
    data = frappe.db.sql(sql, filters, as_dict=1)
    
    if not data:
        return { "summary": [], "charts": {}, "results": [], "columns": [] }

    # Define columns for compatibility (formerly from report)
    columns = [
        {"label": "name", "fieldname": "name", "fieldtype": "Data", "hidden": 1},
        {"label": "SO No", "fieldname": "so_no", "fieldtype": "Link", "options": "Sales Order", "width": 150},
        {"label": "SO Date", "fieldname": "so_date", "fieldtype": "Date", "width": 120},
        {"label": "Sr.No.", "fieldname": "sr_no", "fieldtype": "Int", "width": 70},
        {"label": "Customer PO No.", "fieldname": "customer_po_no", "fieldtype": "Data", "width": 170},
        {"label": "Customer PO Date", "fieldname": "customer_po_date", "fieldtype": "Date", "width": 170},
        {"label": "Customer Name", "fieldname": "customer_name", "fieldtype": "Data", "width": 180},
        {"label": "Item Code", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 120},
        {"label": "Item Name", "fieldname": "item_name", "fieldtype": "Data", "width": 180},
        {"label": "Order Quantity", "fieldname": "order_quantity", "fieldtype": "Float", "width": 130},
        {"label": "Delivered Qty", "fieldname": "delivered_qty", "fieldtype": "Float", "width": 120},
        {"label": "Total Net Amount (INR)", "fieldname": "total_net_amount_(inr)", "fieldtype": "Float", "width": 180},
        {"label": "Net Delivered Net Total", "fieldname": "net_delivered_net_total", "fieldtype": "Float", "width": 180},
        {"label": "Balance Net Total", "fieldname": "balance_net_total", "fieldtype": "Float", "width": 170},
        {"label": "Delivery Date", "fieldname": "delivery_date", "fieldtype": "Date", "width": 120},
        {"label": "Sales Person", "fieldname": "sales_person", "fieldtype": "Data", "width": 150},
        {"label": "Domestic/Export", "fieldname": "dom_exp", "fieldtype": "Data", "width": 150},
    ]

    # Post-processing (Formatting for Dashboard logic)
    for row in data:
        row["dashboard_sc_value"] = flt(row.get("short_close_qty", 0)) * flt(row.get("base_rate", 0))
        row["dashboard_booked_gross"] = flt(row.get("total_net_amount_(inr)", 0)) + row["dashboard_sc_value"]
        row["dashboard_net_delivered"] = flt(row.get("net_delivered_net_total", 0))
        row["dashboard_returned"] = flt(row.get("returned_qty", 0)) * flt(row.get("base_rate", 0))
        
        si_net = flt(row.get("si_net_total") or 1)
        si_grand = flt(row.get("si_grand_total") or si_net)
        row["gross_total"] = row["dashboard_booked_gross"] * (si_grand / si_net) if si_net else row["dashboard_booked_gross"]
        
        row["picked_net_total_inr"] = flt(row.get("picked_qty_val", 0)) * flt(row.get("base_rate", 0))
        row["returned_val"] = row["dashboard_returned"]
        row["sc_value"] = row["dashboard_sc_value"]
        row["cancelled_val"] = row["dashboard_booked_gross"] if row.get("status") == "Cancelled" else 0



    if not data:
        return { "summary": [], "charts": {}, "results": [], "columns": columns }

    # Lifecycle Metrics: Global
    booked_rev = 0
    cancelled_rev = 0
    short_close_rev = 0
    delivered_rev = 0
    
    # Lifecycle Metrics: Regional & CP
    dom_booked = dom_cancelled = dom_short_close = dom_delivered = 0
    exp_booked = exp_cancelled = exp_short_close = exp_delivered = 0
    cp_booked = cp_cancelled = cp_short_close = cp_delivered = 0
    
    # Chart-related totals
    total_rev = total_gross = cp_active_rev = picked_rev = returned_rev = overdue_rev = balance_rev = 0
    dom_picked = dom_returned = dom_overdue = 0
    exp_picked = exp_returned = exp_overdue = 0
    cp_picked = cp_returned = cp_overdue = 0
    
    today = frappe.utils.getdate()
    
    for row in data:
        status = row.get("status")
        # original_amt is the full order value (Gross Booked)
        original_amt = row.get("dashboard_booked_gross", 0)
        # amt is Net of Short Close (from report SQL total_net_amount_(inr))
        amt = flt(row.get("total_net_amount_(inr)") or original_amt)
        # deliv_amt is Net Delivered (Delivered - Returned)
        deliv_amt = row.get("dashboard_net_delivered", 0)
        ret_amt = row.get("dashboard_returned", 0)
        
        # Identification
        d_e = row.get("dom_exp")
        is_cp = False
        cg = (row.get("customer_group") or "").lower()
        if any(x in cg for x in ["system integrator", "distributor", "distributer"]):
            is_cp = True

        # Global Metrics
        sc_amt = row.get("sc_value", 0)
        
        if status not in ("Cancelled", "Draft"):
            booked_rev += original_amt
            if d_e == "Domestic": dom_booked += original_amt
            elif d_e == "Export": exp_booked += original_amt
            if is_cp: cp_booked += original_amt
            
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

            returned_rev += ret_amt
            if d_e == "Domestic": dom_returned += ret_amt
            elif d_e == "Export": exp_returned += ret_amt
            if is_cp: cp_returned += ret_amt

        # Chart Totals (Excludes Cancelled/Draft)
        if status not in ("Cancelled", "Draft"):
            g_amt = flt(row.get("gross_total") or amt)
            total_rev += amt
            total_gross += g_amt
            if is_cp:
                cp_active_rev += amt

        # Pending calculation: Match report's balance_net_total
        pending = flt(row.get("balance_net_total") or 0)
        
        # Overdue Calculation
        overdue = 0
        if status not in ("Cancelled", "Closed", "Completed", "Draft"):
            d_date = row.get("delivery_date")
            if d_date:
                if frappe.utils.getdate(d_date) < today:
                    overdue = pending
                    overdue_rev += overdue
                    if d_e == "Domestic": dom_overdue += overdue
                    elif d_e == "Export": exp_overdue += overdue
                    if is_cp: cp_overdue += overdue

        # Summary values
        row["total_booked_value"] = amt if status != "Cancelled" else 0
        row["pending_value"] = pending
        row["overdue_value"] = overdue
        row["sc_value"] = sc_amt
        row["returned_val"] = ret_amt
        row["delivered_net_total_inr"] = deliv_amt
        row["balance_net_total_inr"] = pending

        if status not in ("Cancelled", "Draft"):
            balance_rev += pending



    # Tracking unique order IDs for counts
    booked_so_ids = set()
    pending_so_ids = set()
    delivered_so_ids = set()
    overdue_so_ids = set()

    for row in data:
        status = row.get("status")
        so_id = row.get("so_no")
        
        if status not in ("Cancelled", "Draft") and so_id:
            booked_so_ids.add(so_id)
            
            # Pending check
            balance = row.get("pending_value", 0)
            if balance > 1: # Greater than 1 INR to avoid rounding noise
                pending_so_ids.add(so_id)
            
            deliv_amt = row.get("delivered_net_total_inr", 0)
            if deliv_amt > 1:
                delivered_so_ids.add(so_id)

            if status not in ("Closed", "Completed"):
                if row.get("overdue_value", 0) > 1:
                    overdue_so_ids.add(so_id)

    actual_book = booked_rev - returned_rev - balance_rev
    final_pending = balance_rev

    # New primary KPI: Total Booked Value = Booked - Short Close
    # Based on user instruction: Remove old Gross card, Rename Actual to Total Booked
    total_booked_net = booked_rev - short_close_rev

    report_summary = [
        {"label": _("Total Booked Value"), "value": total_booked_net, "count": len(booked_so_ids), "indicator": "blue", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Total Delivered"), "value": delivered_rev, "count": len(delivered_so_ids), "indicator": "cyan", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Total Pending"), "value": balance_rev, "count": len(pending_so_ids), "indicator": "orange", "fieldtype": "Currency", "currency": "INR"},
        {"label": _("Total Overdue"), "value": overdue_rev, "count": len(overdue_so_ids), "indicator": "purple", "fieldtype": "Currency", "currency": "INR"},
    ]
    


    sp_rev_dict = {}
    cust_rev_dict = {}
    prod_rev_dict = {}
    
    for row in data:
        status = row.get("status")
        if status in ("Cancelled", "Draft"):
            continue
            
        amt = flt(row.get("total_net_amount_(inr)") or row.get("po_total") or 0)
        sc_amt = flt(row.get("short_close_qty", 0)) * flt(row.get("base_rate") or (flt(row.get("item_rate", 0)) * flt(row.get("exchange_rate", 1))))
        ret_amt = flt(row.get("returned_val") or 0)
        
        # Use the new Total Booked Value (Net of SC) for charts
        actual_val = row.get("total_booked_value", 0)
        
        # Sales Person split
        sp_raw = str(row.get("sales_person") or "Unassigned")
        sp_list = [s.strip() for s in sp_raw.split(",") if s.strip()]
        if not sp_list: sp_list = ["Unassigned"]
        split_amt = actual_val / len(sp_list)
        
        for sp in sp_list:
            sp_rev_dict[sp] = sp_rev_dict.get(sp, 0) + split_amt
        
        cust = row.get("customer_name") or "Unknown"
        cust_rev_dict[cust] = cust_rev_dict.get(cust, 0) + actual_val
        
        prod = row.get("item_name") or row.get("item_code") or "Unknown"
        prod_rev_dict[prod] = prod_rev_dict.get(prod, 0) + actual_val


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
            
            # Clean label (remove 'Global ')
            clean_label = s.get('label', '').replace('Global ', '').strip()
            label_text = clean_label
            
            cell_l = ws_overview.cell(row=r, column=c, value=label_text)
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
            if row.get("status") != "Cancelled":
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
                if row_r.get("status") != "Cancelled":
                    m_totals_gross[m_key] = m_totals_gross.get(m_key, 0) + flt(row_r.get("gross_total") or row_r.get("po_total"))
            except: pass
    
        col_idx = 5
        for m_key in sorted_months:
            c = ws_months.cell(row=row_idx, column=col_idx, value=flt(m_totals_net.get(m_key, 0))/1000000)
            c.number_format = '"₹ "#,##0.00" M"'
            c.font, c.fill, c.border = header_font, header_fill, table_border
            c.alignment = Alignment(horizontal="right")
            col_idx += 1
            
        c_gn = ws_months.cell(row=row_idx, column=col_idx, value=g_total_net / 1000000)
        c_gn.number_format = '"₹ "#,##0.00" M"'
        c_gn.font, c_gn.fill, c_gn.border = header_font, header_fill, table_border
        c_gn.alignment = Alignment(horizontal="right")
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
            c.number_format = '"₹ "#,##0.00" M"'
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
        c_gg.number_format = '"₹ "#,##0.00" M"'
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
            "Total Order Value": {m: 0 for m in sorted_months},
            "Delivered": {m: 0 for m in sorted_months},
            "Returned": {m: 0 for m in sorted_months},
            "Pending": {m: 0 for m in sorted_months},
            "Overdue": {m: 0 for m in sorted_months},
        }

        booked_raw = {m: 0 for m in sorted_months}
        sc_raw = {m: 0 for m in sorted_months}

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

            if status not in ("Cancelled", "Draft"):
                booked_raw[m_key] += amt
            
            sc_amt = flt(row.get("sc_value") or 0)
            if sc_amt > 0 and status not in ("Cancelled", "Draft"):
                sc_raw[m_key] += sc_amt

            # Use the calculated delivered amount from the main loop logic
            deliv_amt = flt(row.get("delivered_net_total_inr") or 0)
            original_amt = flt(row.get("booked_net_total") or amt)
            ret_amt = flt(row.get("returned_net_total") or 0)

            if status not in ("Cancelled", "Draft"):
                lifecycle_summary_data["Delivered"][m_key] += deliv_amt
                lifecycle_summary_data["Returned"][m_key] += ret_amt

            if status not in ("Cancelled", "Closed", "Completed", "Draft"):
                delivery_date = row.get("delivery_date")
                if delivery_date:
                    delivery_date = frappe.utils.getdate(delivery_date)
                    if delivery_date < today:
                        # Use the same pending logic as main loop
                        pending_row = flt(row.get("pending_value") or 0)
                        lifecycle_summary_data["Overdue"][m_key] += pending_row

        for m_key in sorted_months:
            # Total Booked Value = Booked - Short Close
            tbv = booked_raw[m_key] - sc_raw[m_key]
            # Balance = Total Booked - Delivered
            balance = tbv - lifecycle_summary_data["Delivered"][m_key]
            
            lifecycle_summary_data["Total Booked Value"] = lifecycle_summary_data.get("Total Booked Value", {})
            lifecycle_summary_data["Total Booked Value"][m_key] = tbv
            lifecycle_summary_data["Pending"][m_key] = balance
            lifecycle_summary_data["Booked"] = booked_raw
            lifecycle_summary_data["Short Close"] = sc_raw

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

        categories = ["Total Booked Value", "Delivered", "Pending", "Overdue"]
        for cat in categories:
            display_name = cat
            if cat == "Delivered": display_name = "Total Delivered"
            if cat == "Pending": display_name = "Total Pending"
            if cat == "Overdue": display_name = "Total Overdue"

            ws_lifecycle.cell(row=row_idx_l, column=1, value=display_name).border = table_border
            ws_lifecycle.cell(row=row_idx_l, column=1, value=display_name).font = Font(bold=True)
            col_idx = 2
            total_cat = 0
            for m_key in sorted_months:
                val = lifecycle_summary_data.get(cat, {}).get(m_key, 0)
                total_cat += val
                c = ws_lifecycle.cell(
                    row=row_idx_l, column=col_idx, value=flt(val) / 1000000
                )
                c.number_format, c.border = '"₹ "#,##0.00" M"', table_border
                col_idx += 1
            c_tot = ws_lifecycle.cell(row=row_idx_l, column=col_idx, value=flt(total_cat) / 1000000)
            c_tot.number_format, c_tot.border = '"₹ "#,##0.00" M"', table_border
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
            {"label": "Booked (M)", "fieldname": "total_net_amount_(inr)", "width": 16},
            {"label": "Total Booked Value (M)", "fieldname": "total_booked_value", "width": 16},
            {"label": "Returned (M)", "fieldname": "returned_val", "width": 16},
            {"label": "Short Close (M)", "fieldname": "sc_value", "width": 16},
            {"label": "Picked (M)", "fieldname": "picked_net_total_inr", "width": 16},
            {"label": "Delivered (M)", "fieldname": "delivered_net_total_inr", "width": 16},
            {"label": "Pending (M)", "fieldname": "pending_value", "width": 16},
            {"label": "Overdue (M)", "fieldname": "overdue_value", "width": 16}
        ]
        for idx, col in enumerate(ui_columns, start=1):
            cell = ws_list.cell(row=row_idx, column=idx, value=col["label"])
            cell.font, cell.fill, cell.alignment, cell.border = header_font, header_fill, Alignment(horizontal="center"), table_border
            ws_list.column_dimensions[get_column_letter(idx)].width = col["width"]
        row_idx += 1
        total_list_amt = 0
        total_list_actual = 0
        total_list_returned = 0
        total_list_sc = 0
        total_list_picked = 0
        total_list_delivered = 0
        total_list_pending = 0
        total_list_overdue = 0
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
                    if fname in ["total_net_amount_(inr)", "total_booked_value", "returned_val", "sc_value", "picked_net_total_inr", "delivered_net_total_inr", "pending_value", "overdue_value"]:
                        val /= 1000000
                        cell.number_format = '"₹ "#,##0.00" M"'
                        if fname == "total_net_amount_(inr)":
                            if row.get("status") != "Cancelled":
                                total_list_amt += flt(row.get("total_net_amount_(inr)") or row.get("po_total"))
                        elif fname == "total_booked_value": total_list_actual += flt(row.get("total_booked_value") or 0)
                        elif fname == "returned_val": total_list_returned += flt(row.get("returned_val") or 0)
                        elif fname == "sc_value": total_list_sc += flt(row.get("sc_value") or 0)
                        elif fname == "picked_net_total_inr": total_list_picked += flt(row.get("picked_net_total_inr") or 0)
                        elif fname == "delivered_net_total_inr": total_list_delivered += flt(row.get("delivered_net_total_inr") or 0)
                        elif fname == "pending_value": total_list_pending += flt(row.get("pending_value") or 0)
                        elif fname == "overdue_value": total_list_overdue += flt(row.get("overdue_value") or 0)
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
            total_list_actual, 
            total_list_returned, 
            total_list_sc, 
            total_list_picked, 
            total_list_delivered, 
            total_list_pending, 
            total_list_overdue
        ]
        
        for i, val in enumerate(total_list_values):
            col = 10 + i
            c_f = ws_list.cell(row=row_idx, column=col, value=val / 1000000)
            c_f.font = header_font
            c_f.fill = header_fill
            c_f.number_format = '"₹ "#,##0.00" M"'
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
