import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate, add_days
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
    
    frappe.local.response.filename = "Supplier_Performance_Dashboard.pdf"
    frappe.local.response.filecontent = pdf_content
    frappe.local.response.type = "download"

@frappe.whitelist()
def get_po_items(purchase_order):
    if not purchase_order:
        return []
    
    if not frappe.has_permission("Purchase Order", "read"):
        frappe.throw(_("Not permitted to read Purchase Order"), frappe.PermissionError)
        
    items = frappe.get_all(
        "Purchase Order Item",
        filters={"parent": purchase_order},
        fields=["item_code", "item_name", "qty", "rate", "amount", "received_qty", "billed_amt", "description"],
        order_by="idx"
    )
    for item in items:
        item["billed_qty"] = flt(item.get("billed_amt")) / flt(item.get("rate")) if flt(item.get("rate")) else 0.0
    return items

def is_delivery_completed(row):
    qty = flt(row.get("qty"))
    received = flt(row.get("received_qty"))
    return (
        (qty > 0 and received >= qty)
        or flt(row.get("per_delivered")) >= 100
        or row.get("status") in ["Completed", "Closed"]
    )


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
    return ", ".join(frappe.format_date(d) for d in dates)


def _fetch_actual_delivery_map(po_item_field):
    """Return {po_item_name: [date, ...]} from all submitted purchase receipts."""
    actual_delivery_map = {}
    pr_data = frappe.db.sql(
        f"""
        SELECT
            pri.{po_item_field} as po_item_name,
            GROUP_CONCAT(DISTINCT pr.posting_date ORDER BY pr.posting_date SEPARATOR ',') as actual_delivery_dates
        FROM
            `tabPurchase Receipt` pr
        INNER JOIN
            `tabPurchase Receipt Item` pri ON pri.parent = pr.name
        WHERE
            pr.docstatus = 1
            AND pri.{po_item_field} IS NOT NULL
            AND pri.{po_item_field} != ''
        GROUP BY
            pri.{po_item_field}
        """,
        as_dict=True,
    )
    for r in pr_data:
        actual_delivery_map[r.po_item_name] = _parse_group_concat_dates(r.actual_delivery_dates)
    return actual_delivery_map


def prepare_filters(filters):
    if not filters:
        filters = {}
    elif isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    if filters.get("date_range"):
        dr = filters.get("date_range")
        if isinstance(dr, list) and len(dr) == 2:
            filters["from_date"] = dr[0]
            filters["to_date"] = dr[1]

    if filters.get("fiscal_year") and (not filters.get("from_date") or not filters.get("to_date")):
        fy = frappe.get_doc("Fiscal Year", filters.get("fiscal_year"))
        if fy:
            filters["from_date"] = filters.get("from_date") or fy.year_start_date
            filters["to_date"] = filters.get("to_date") or fy.year_end_date

    return frappe._dict(filters)

@frappe.whitelist()
def get_dashboard_data(filters=None):
    if not frappe.has_permission("Purchase Order", "read"):
        frappe.throw(_("Not permitted to read Purchase Order"), frappe.PermissionError)

    filters = prepare_filters(filters)

    # Build Purchase Order filters using Frappe ORM
    po_filters = {"docstatus": 1}

    if filters.get("company"):
        po_filters["company"] = filters.get("company")

    if filters.get("from_date"):
        po_filters["transaction_date"] = [">=", filters.get("from_date")]

    if filters.get("to_date"):
        if "transaction_date" in po_filters:
            po_filters["transaction_date"] = ["between", [filters.get("from_date"), filters.get("to_date")]]
        else:
            po_filters["transaction_date"] = ["<=", filters.get("to_date")]

    if filters.get("purchase_order"):
        po_filters["name"] = filters.get("purchase_order")

    if filters.get("supplier"):
        po_filters["supplier"] = filters.get("supplier")
    elif filters.get("supplier_group"):
        suppliers = frappe.get_all("Supplier", filters={"supplier_group": filters.get("supplier_group")}, pluck="name")
        if suppliers:
            po_filters["supplier"] = ["in", suppliers]
        else:
            po_filters["supplier"] = ["in", [""]]

    if filters.get("open_po_details"):
        po_filters["status"] = ["in", ["To Receive and Bill", "To Receive", "To Bill"]]
    elif filters.get("status"):
        po_filters["status"] = filters.get("status")

    # Fetch Purchase Orders
    purchase_orders = frappe.get_all(
        "Purchase Order",
        filters=po_filters,
        fields=["name", "supplier", "transaction_date", "status", "company"],
        order_by="transaction_date desc",
        limit_page_length=0
    )

    if not purchase_orders:
        return {"summary": [], "results": []}

    po_names = [po.name for po in purchase_orders]
    po_map = {po.name: po for po in purchase_orders}

    # Fetch Purchase Order Items
    poi_filters = {"parent": ["in", po_names], "docstatus": 1}

    if filters.get("expected_delivery_date"):
        poi_filters["schedule_date"] = filters.get("expected_delivery_date")

    po_items = frappe.get_all(
        "Purchase Order Item",
        filters=poi_filters,
        fields=["name", "parent", "item_code", "item_name", "qty", "rate", "amount",
                "received_qty", "billed_amt", "schedule_date"],
        order_by="parent, idx",
        limit_page_length=0
    )

    if not po_items:
        return {"summary": [], "results": []}

    # All actual delivery dates from Purchase Receipt (comma-separated per PO item)
    actual_delivery_map = {}
    try:
        actual_delivery_map = _fetch_actual_delivery_map("purchase_order_item")
    except Exception:
        try:
            actual_delivery_map = _fetch_actual_delivery_map("po_detail")
        except Exception:
            pass

    # Build combined results
    report_data = []
    for item in po_items:
        po = po_map.get(item.parent)
        if not po:
            continue
        
        rate = flt(item.rate)
        qty = flt(item.qty)
        received_qty = flt(item.received_qty)
        billed_amt = flt(item.billed_amt)
        billed_qty = billed_amt / rate if rate > 0 else 0.0
        
        per_delivered = (received_qty / qty) * 100 if qty > 0 else 0.0
        per_billed = (billed_qty / qty) * 100 if qty > 0 else 0.0
        
        delivery_dates = actual_delivery_map.get(item.name, [])
        report_data.append({
            "name": po.name,
            "supplier": po.supplier,
            "transaction_date": po.transaction_date,
            "status": po.status,
            "po_item_name": item.name,
            "item_code": item.item_code,
            "item_name": item.item_name,
            "qty": qty,
            "rate": rate,
            "net_total": item.amount,
            "received_qty": received_qty,
            "billed_qty": billed_qty,
            "per_delivered": per_delivered,
            "per_billed": per_billed,
            "schedule_date": item.schedule_date,
            "actual_delivery_dates": [str(d) for d in delivery_dates],
            "actual_delivery_time": str(delivery_dates[-1]) if delivery_dates else None,
        })

    # Filter by actual_delivery_time if specified
    if filters.get("actual_delivery_time"):
        adt = getdate(filters.get("actual_delivery_time"))
        report_data = [r for r in report_data if adt in get_actual_delivery_dates(r)]

    if not report_data:
        return {"summary": [], "results": []}

    results = []
    total_amount = 0
    total_overdue = 0
    total_due_next_15_days = 0
    unique_pos = set()

    today = getdate(nowdate())
    next_15_days = add_days(today, 15)

    for row in report_data:
        is_overdue = False
        due_next_15_days_flag = False

        row["due_days"] = 0
        if row.get("schedule_date") and row.get("status") not in ["Completed", "Closed", "Cancelled"] and flt(row.get("received_qty")) < flt(row.get("qty")):
            po_date = getdate(row.get("schedule_date"))
            row["due_days"] = (po_date - today).days
            if po_date < today:
                is_overdue = True
                row["due_days"] = (today - po_date).days
            elif today <= po_date <= next_15_days:
                due_next_15_days_flag = True
        else:
            row["due_days"] = "-"

        row["is_overdue"] = is_overdue
        row["is_due_next_15_days"] = due_next_15_days_flag

        if filters.get("is_overdue") and not is_overdue:
            continue

        if filters.get("due_next_15_days") and not due_next_15_days_flag:
            continue

        unique_pos.add(row.get("name"))
        total_amount += flt(row.get("net_total"))
        if is_overdue:
            total_overdue += flt(row.get("net_total"))
        if due_next_15_days_flag:
            total_due_next_15_days += flt(row.get("net_total"))

        results.append(row)

    results.sort(key=lambda x: getdate(x.get("schedule_date")) if x.get("schedule_date") else today, reverse=True)

    summary = [
        {"label": _("Total Orders"), "value": len(unique_pos), "indicator": "blue", "fieldtype": "Int"},
        {"label": _("Total Net Amount"), "value": total_amount, "indicator": "green", "fieldtype": "Currency"},
        {"label": _("Overdue Amount"), "value": total_overdue, "indicator": "red", "fieldtype": "Currency"},
        {"label": _("Due Next 15 Days"), "value": total_due_next_15_days, "indicator": "orange", "fieldtype": "Currency"}
    ]

    supplier_totals = {}
    status_counts = {}

    for row in results:
        supp = row.get("supplier") or "Unknown"
        stat = row.get("status") or "Unknown"

        supplier_totals[supp] = supplier_totals.get(supp, 0) + flt(row.get("net_total"))
        status_counts[stat] = status_counts.get(stat, 0) + flt(row.get("net_total"))

    top_10_suppliers = sorted(supplier_totals.items(), key=lambda x: x[1], reverse=True)[:10]

    charts = {
        "top_10_suppliers": {
            "data": {
                "labels": [x[0] for x in top_10_suppliers],
                "datasets": [{"name": "Amount", "values": [x[1] for x in top_10_suppliers]}]
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
    month_wise_supplier = {}

    for row in results:
        try:
            d = getdate(row.get("transaction_date"))
            m_key = d.strftime("%b %Y")
            m_sort = d.strftime("%Y%m")
            months_set.add((m_sort, m_key))
        except:
            m_key = "Unknown"
        
        amt = flt(row.get("net_total"))
        supp = row.get("supplier") or "Unknown"

        monthly_lifecycle["Booked"][m_key] = monthly_lifecycle["Booked"].get(m_key, 0) + amt
        if row.get("status") in ["Completed", "Closed"]:
            monthly_lifecycle["Delivered"][m_key] = monthly_lifecycle["Delivered"].get(m_key, 0) + amt
        
        if row.get("status") not in ["Completed", "Closed", "Cancelled"]:
            monthly_lifecycle["Pending"][m_key] = monthly_lifecycle["Pending"].get(m_key, 0) + amt
            if row.get("is_overdue"):
                monthly_lifecycle["Overdue"][m_key] = monthly_lifecycle["Overdue"].get(m_key, 0) + amt

        if supp not in month_wise_supplier:
            month_wise_supplier[supp] = {"supplier": supp, "months": {}, "total": 0}
        month_wise_supplier[supp]["months"][m_key] = month_wise_supplier[supp]["months"].get(m_key, 0) + amt
        month_wise_supplier[supp]["total"] += amt

    # Due in Next 15 Days list
    due_next_15_days = []
    for row in results:
        if row.get("status") not in ["Completed", "Closed", "Cancelled"]:
            delivery_date = getdate(row.get("schedule_date"))
            if delivery_date and today <= delivery_date <= next_15_days:
                row["due_days"] = (delivery_date - today).days
                due_next_15_days.append(row)

    sorted_months = [{"key": x[1], "sort": x[0]} for x in sorted(list(months_set), key=lambda x: x[0])]

    return {
        "summary": summary,
        "results": results,
        "charts": charts,
        "months": sorted_months,
        "monthly_lifecycle": monthly_lifecycle,
        "month_wise_supplier": sorted(month_wise_supplier.values(), key=lambda x: x["total"], reverse=True),
        "due_next_15_days": sorted(due_next_15_days, key=lambda x: x.get("schedule_date") if x.get("schedule_date") else today)
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
    
    ws_overview.cell(row=1, column=1, value="Supplier Performance Dashboard Overview").font = title_font
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
    headers = ["S.No.", "Supplier"] + [m["key"] for m in months] + ["Total (M)"]
    
    for idx, h in enumerate(headers, start=1):
        cell = ws_months.cell(row=1, column=idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = table_border
        
    for r_idx, row in enumerate(dashboard_data.get("month_wise_supplier", []), start=2):
        row_fill = zebra_fill if r_idx % 2 == 0 else None
        ws_months.cell(row=r_idx, column=1, value=r_idx-1).border = table_border
        ws_months.cell(row=r_idx, column=2, value=row["supplier"]).border = table_border
        
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

    # 3. Supplier Orders List Sheet
    ws_list = wb.create_sheet("Detailed Orders List")
    list_headers = ["S.No.", "PO No", "Supplier", "Order Date", "Expected Del.", "Actual Del.", "Status", "% Received", "% Bill.", "Net Total (M)"]
    for idx, h in enumerate(list_headers, start=1):
        cell = ws_list.cell(row=1, column=idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = table_border
        
    for r_idx, row in enumerate(data, start=2):
        row_fill = zebra_fill if r_idx % 2 == 0 else None
        actual_del = format_actual_delivery_display(row)
        vals = [
            r_idx-1, row.get("name"), row.get("supplier"), 
            row.get("transaction_date"), row.get("schedule_date"), actual_del,
            row.get("status"), f"{int(row.get('per_delivered') or 0)}%", 
            f"{int(row.get('per_billed') or 0)}%", flt(row.get("net_total")) / 1000000
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
    
    frappe.response['filename'] = f"Supplier_Performance_{nowdate()}.xlsx"
    frappe.response['filecontent'] = output.getvalue()
    frappe.response['type'] = 'binary'
