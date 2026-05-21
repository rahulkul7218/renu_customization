import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate, add_days, formatdate
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from io import BytesIO
import base64

@frappe.whitelist()
def export_to_pdf(html=None, orientation="Landscape"):
    if not html:
        return
    
    frappe.set_user("Administrator")
    
    options = {
        "page-size": "A4",
        "orientation": orientation,
        "margin-top": "10mm",
        "margin-right": "10mm",
        "margin-bottom": "10mm",
        "margin-left": "10mm",
        "encoding": "UTF-8",
        "no-outline": None
    }
    
    pdf_content = frappe.utils.pdf.get_pdf(html, options)
    
    frappe.local.response.filename = "Customer_Performance_Dashboard.pdf"
    frappe.local.response.filecontent = pdf_content
    frappe.local.response.type = "download"

def _parse_group_concat_dates(dates_str):
    if not dates_str:
        return []
    return [getdate(d.strip()) for d in str(dates_str).split(",") if d and str(d).strip()]


def get_actual_delivery_dates(row):
    dates = row.get("actual_delivery_dates") or []
    if isinstance(dates, str):
        dates = _parse_group_concat_dates(dates)
    elif dates:
        dates = [getdate(d) for d in dates if d]
    if not dates and row.get("actual_delivery_time"):
        dates = [getdate(row["actual_delivery_time"])]
    return sorted(dates)


def format_actual_delivery_display(row):
    dates = get_actual_delivery_dates(row)
    if not dates:
        return None
    return ", ".join(formatdate(d) for d in dates)


def _fetch_delivery_note_dates(so_names):
    if not so_names:
        return {}
    dn_details = frappe.db.sql(
        """
        SELECT
            dni.against_sales_order AS sales_order,
            GROUP_CONCAT(DISTINCT dn.posting_date ORDER BY dn.posting_date SEPARATOR ',') AS actual_delivery_dates
        FROM
            `tabDelivery Note` dn
        INNER JOIN
            `tabDelivery Note Item` dni ON dni.parent = dn.name
        WHERE
            dni.against_sales_order IN %s
            AND dn.docstatus = 1
        GROUP BY
            dni.against_sales_order
        """,
        (tuple(so_names),),
        as_dict=True,
    )
    return {
        r.sales_order: _parse_group_concat_dates(r.actual_delivery_dates)
        for r in dn_details
    }


def prepare_filters(filters):
    if not filters:
        filters = {}
    elif isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    if filters.get("fiscal_year") and (not filters.get("from_date") or not filters.get("to_date")):
        fy = frappe.get_doc("Fiscal Year", filters.get("fiscal_year"))
        if fy:
            filters["from_date"] = filters.get("from_date") or fy.year_start_date
            filters["to_date"] = filters.get("to_date") or fy.year_end_date

    return frappe._dict(filters)

@frappe.whitelist()
def get_dashboard_data(filters=None):
    filters = prepare_filters(filters)
    
    conditions = " docstatus = 1 "
    if filters.get("company"):
        conditions += f" AND company = {frappe.db.escape(filters.get('company'))}"
    if filters.get("from_date"):
        conditions += f" AND transaction_date >= {frappe.db.escape(filters.get('from_date'))}"
    if filters.get("to_date"):
        conditions += f" AND transaction_date <= {frappe.db.escape(filters.get('to_date'))}"
    if filters.get("customer"):
        conditions += f" AND customer = {frappe.db.escape(filters.get('customer'))}"
    if filters.get("customer_group"):
        conditions += f" AND customer_group = {frappe.db.escape(filters.get('customer_group'))}"
    if filters.get("sales_order"):
        conditions += f" AND name = {frappe.db.escape(filters.get('sales_order'))}"

    results = frappe.db.sql(f"""
        SELECT 
            name, customer, customer_group, transaction_date, delivery_date as schedule_date, 
            status, net_total, base_net_total, territory, per_delivered, 
            per_billed, po_no
        FROM `tabSales Order`
        WHERE {conditions}
        ORDER BY transaction_date DESC
    """, as_dict=True)

    if not results:
        return {"summary": [], "results": []}

    # All actual delivery dates from Delivery Note (comma-separated per Sales Order)
    so_names = [d.name for d in results]
    dn_delivery_map = _fetch_delivery_note_dates(so_names)

    total_orders = 0
    total_amount = 0
    total_overdue = 0
    total_due_next_15_days = 0
    today = getdate(nowdate())
    next_15_days = add_days(today, 15)
    
    processed_results = []
    for row in results:
        delivery_dates = dn_delivery_map.get(row.name, [])
        row["actual_delivery_dates"] = [str(d) for d in delivery_dates]
        row["actual_delivery_time"] = str(delivery_dates[-1]) if delivery_dates else None
        
        is_overdue = False
        due_next_15_days_flag = False
        
        if row.get("schedule_date") and row.get("status") not in ["Completed", "Closed", "Cancelled"]:
            delivery_date = getdate(row.get("schedule_date"))
            if delivery_date < today:
                is_overdue = True
            elif today <= delivery_date <= next_15_days:
                due_next_15_days_flag = True
                
        row["is_overdue"] = is_overdue
        
        if filters.get("is_overdue") and not is_overdue:
            continue
        if filters.get("due_next_15_days") and not due_next_15_days_flag:
            continue
            
        total_orders += 1
        total_amount += flt(row.get("net_total"))
        if is_overdue:
            total_overdue += flt(row.get("net_total"))
        if due_next_15_days_flag:
            total_due_next_15_days += flt(row.get("net_total"))
            
        processed_results.append(row)

    summary = [
        {"label": _("Total Orders"), "value": total_orders, "indicator": "blue", "fieldtype": "Int"},
        {"label": _("Total Net Amount"), "value": total_amount, "indicator": "green", "fieldtype": "Currency"},
        {"label": _("Overdue Amount"), "value": total_overdue, "indicator": "red", "fieldtype": "Currency"},
        {"label": _("Due Next 15 days"), "value": total_due_next_15_days, "indicator": "orange", "fieldtype": "Currency"}
    ]

    customer_totals = {}
    status_counts = {}
    
    for row in processed_results:
        cust = row.get("customer") or "Unknown"
        stat = row.get("status") or "Unknown"
        customer_totals[cust] = customer_totals.get(cust, 0) + flt(row.get("net_total"))
        status_counts[stat] = status_counts.get(stat, 0) + flt(row.get("net_total"))

    top_10_customers = sorted(customer_totals.items(), key=lambda x: x[1], reverse=True)[:10]
    
    charts = {
        "top_10_customers": {
            "data": {
                "labels": [x[0] for x in top_10_customers],
                "datasets": [{"name": "Amount", "values": [x[1] for x in top_10_customers]}]
            },
            "type": "donut",
            "colors": ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#06b6d4", "#ef4444", "#6366f1", "#ec4899", "#84cc16", "#f97316"],
            "is_currency": True
        },
        "order_status": {
            "data": {
                "labels": list(status_counts.keys()),
                "datasets": [{"name": "Amount", "values": list(status_counts.values())}]
            },
            "type": "donut",
            "colors": ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#6366f1", "#ec4899", "#84cc16"],
            "is_currency": True
        }
    }

    # Monthly Calculations
    months_set = set()
    monthly_lifecycle = {
        "Booked": {},
        "Delivered": {},
        "Pending": {},
        "Overdue": {}
    }
    month_wise_customer = {}

    for row in processed_results:
        try:
            d = getdate(row.get("transaction_date"))
            m_key = d.strftime("%b %Y")
            m_sort = d.strftime("%Y%m")
            months_set.add((m_sort, m_key))
        except:
            m_key = "Unknown"
        
        amt = flt(row.get("net_total"))
        cust = row.get("customer") or "Unknown"

        # Lifecycle
        monthly_lifecycle["Booked"][m_key] = monthly_lifecycle["Booked"].get(m_key, 0) + amt
        if row.get("status") == "Completed":
            monthly_lifecycle["Delivered"][m_key] = monthly_lifecycle["Delivered"].get(m_key, 0) + amt
        
        # We'll calculate Pending and Overdue after processing all rows if needed, 
        # or just use the current status for simplified dashboard view
        if row.get("status") not in ["Completed", "Closed", "Cancelled"]:
            monthly_lifecycle["Pending"][m_key] = monthly_lifecycle["Pending"].get(m_key, 0) + amt
            if row.get("is_overdue"):
                monthly_lifecycle["Overdue"][m_key] = monthly_lifecycle["Overdue"].get(m_key, 0) + amt

        # Month-wise Customer Breakdown
        if cust not in month_wise_customer:
            month_wise_customer[cust] = {"customer": cust, "months": {}, "total": 0}
        month_wise_customer[cust]["months"][m_key] = month_wise_customer[cust]["months"].get(m_key, 0) + amt
        month_wise_customer[cust]["total"] += amt

    # Due in Next 15 Days
    due_next_15_days = []
    today = getdate(nowdate())
    next_15 = add_days(today, 15)
    
    for row in processed_results:
        if row.get("status") not in ["Completed", "Closed", "Cancelled"]:
            delivery_date = getdate(row.get("schedule_date"))
            if delivery_date and today <= delivery_date <= next_15:
                row["due_days"] = (delivery_date - today).days
                due_next_15_days.append(row)

    sorted_months = [{"key": x[1], "sort": x[0]} for x in sorted(list(months_set), key=lambda x: x[0])]

    return {
        "summary": summary,
        "results": processed_results,
        "charts": charts,
        "months": sorted_months,
        "monthly_lifecycle": monthly_lifecycle,
        "month_wise_customer": sorted(month_wise_customer.values(), key=lambda x: x["total"], reverse=True),
        "due_next_15_days": sorted(due_next_15_days, key=lambda x: x.get("schedule_date"))
    }

@frappe.whitelist()
def export_to_excel(filters=None, export_type="all"):
    filters = prepare_filters(filters)
    dashboard_data = get_dashboard_data(filters)
    data = dashboard_data.get("results")
    summary = dashboard_data.get("summary")
    
    if not data:
        return None

    wb = openpyxl.Workbook()
    
    # Styling Helpers
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2c3e50", fill_type="solid")
    title_font = Font(bold=True, size=14)
    section_font = Font(bold=True, size=12)
    thin_side = Side(style='thin')
    table_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    zebra_fill = PatternFill(start_color="f8f9fa", fill_type="solid")

    # 1. Overview Sheet (KPIs)
    ws_overview = wb.active
    ws_overview.title = "Dashboard Overview"
    
    ws_overview.cell(row=1, column=1, value="Customer Performance Dashboard Overview").font = title_font
    ws_overview.cell(row=1, column=4, value="Generated On: " + nowdate())
    
    row_idx = 3
    ws_overview.cell(row=row_idx, column=1, value="Operational Summary (Million INR)").font = section_font
    row_idx += 1
    
    summary_start_row = row_idx
    colors = {"blue": "3498db", "green": "2ecc71", "red": "e74c3c", "orange": "e67e22"}
    
    for i, s in enumerate(summary):
        r = summary_start_row + (i // 4) * 3
        c = 1 + (i % 4) * 2
        
        # Label
        cell_l = ws_overview.cell(row=r, column=c, value=s.get('label'))
        cell_l.font = Font(bold=True, color="FFFFFF")
        bg_color = colors.get(s.get('indicator', 'blue').lower(), "3498db")
        cell_l.fill = PatternFill(start_color=bg_color, fill_type="solid")
        cell_l.alignment = Alignment(horizontal="center")
        
        # Value
        val = flt(s.get('value'))
        if s.get('fieldtype') == "Currency":
            val = val / 1000000
        
        cell_v = ws_overview.cell(row=r+1, column=c, value=val)
        cell_v.font = Font(bold=True, size=12)
        if s.get('fieldtype') == "Currency":
            cell_v.number_format = '"₹ "#,##0.00" M"'
        cell_v.alignment = Alignment(horizontal="center")
        cell_v.border = Border(left=Side(style='medium', color=bg_color), 
                               right=Side(style='medium', color=bg_color), 
                               bottom=Side(style='medium', color=bg_color))
        
        ws_overview.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c+1)
        ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)

    # 2. Month-Wise Booking Sheet
    ws_months = wb.create_sheet("Month-Wise Booking")
    months = dashboard_data.get("months", [])
    headers = ["S.No.", "Customer"] + [m["key"] for m in months] + ["Total (M)"]
    
    for idx, h in enumerate(headers, start=1):
        cell = ws_months.cell(row=1, column=idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = table_border
        
    for r_idx, row in enumerate(dashboard_data.get("month_wise_customer", []), start=2):
        row_fill = zebra_fill if r_idx % 2 == 0 else None
        ws_months.cell(row=r_idx, column=1, value=r_idx-1).border = table_border
        ws_months.cell(row=r_idx, column=2, value=row["customer"]).border = table_border
        
        col_idx = 3
        for m in months:
            val = flt(row["months"].get(m["key"], 0)) / 1000000
            c = ws_months.cell(row=r_idx, column=col_idx, value=val)
            c.number_format = '#,##0.00'
            c.border = table_border
            if row_fill: c.fill = row_fill
            col_idx += 1
            
        c_tot = ws_months.cell(row=r_idx, column=col_idx, value=flt(row["total"]) / 1000000)
        c_tot.number_format = '#,##0.00'
        c_tot.font = Font(bold=True)
        c_tot.border = table_border
        if row_fill: c_tot.fill = row_fill

    # 3. Customer Orders List Sheet
    ws_list = wb.create_sheet("Detailed Orders List")
    list_headers = ["S.No.", "SO No", "Customer", "Order Date", "Expected Del.", "Actual Del.", "Status", "% Del.", "% Bill.", "Net Total (M)"]
    for idx, h in enumerate(list_headers, start=1):
        cell = ws_list.cell(row=1, column=idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = table_border
        
    for r_idx, row in enumerate(data, start=2):
        row_fill = zebra_fill if r_idx % 2 == 0 else None
        vals = [
            r_idx-1, row.get("name"), row.get("customer"),
            row.get("transaction_date"), row.get("schedule_date"),
            format_actual_delivery_display(row),
            row.get("status"), f"{int(row.per_delivered or 0)}%",
            f"{int(row.per_billed or 0)}%", flt(row.get("net_total")) / 1000000
        ]
        for c_idx, val in enumerate(vals, start=1):
            cell = ws_list.cell(row=r_idx, column=c_idx, value=val)
            cell.border = table_border
            if row_fill: cell.fill = row_fill
            if c_idx == 10:
                cell.number_format = '#,##0.00'
                cell.alignment = Alignment(horizontal="right")

    # Auto-adjust column widths
    for ws in [ws_months, ws_list]:
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except: pass
            ws.column_dimensions[column].width = max_length + 5

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    frappe.response['filename'] = f"Customer_Performance_{nowdate()}.xlsx"
    frappe.response['filecontent'] = output.getvalue()
    frappe.response['type'] = 'binary'
