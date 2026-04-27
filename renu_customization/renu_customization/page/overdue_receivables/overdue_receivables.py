import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate, date_diff, now_datetime
import json
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from io import BytesIO
import base64

@frappe.whitelist()
def export_to_pdf(html):
    pdf_content = frappe.utils.pdf.get_pdf(html, {"orientation": "Landscape"})
    frappe.response.filename = f"Overdue_Receivables_{nowdate()}.pdf"
    frappe.response.filecontent = pdf_content
    frappe.response.type = "download"

@frappe.whitelist()
def get_dashboard_data(filters=None):
    if isinstance(filters, str):
        filters = json.loads(filters)
    if not filters:
        filters = {}

    # Base query for overdue sales invoices
    query_filters = {
        "docstatus": 1,
        "outstanding_amount": [">", 0],
        "is_return": 0,
        "due_date": ["<", nowdate()]
    }

    # Apply Filters from JS
    if filters.get("customer"):
        query_filters["customer"] = filters.get("customer")
    
    invoices = frappe.get_all("Sales Invoice", 
        filters=query_filters, 
        fields=["name", "customer", "customer_name", "posting_date", "due_date", 
                "outstanding_amount", "is_domestic", "is_export", "status"]
    )

    # Fetch Sales Team info
    inv_names = [d.name for d in invoices]
    sales_person_map = {}
    if inv_names:
        sales_team = frappe.get_all("Sales Team", 
            filters={"parent": ["in", inv_names], "parenttype": "Sales Invoice"},
            fields=["parent", "sales_person"]
        )
        for st in sales_team:
            if st.parent not in sales_person_map:
                sales_person_map[st.parent] = []
            sales_person_map[st.parent].append(st.sales_person)

    data = []
    today = getdate(nowdate())

    for inv in invoices:
        inv_sales_persons = sales_person_map.get(inv.name, [])
        inv["sales_person"] = ", ".join(inv_sales_persons) if inv_sales_persons else ""
        
        # Calculate Days Overdue
        inv["days_overdue"] = date_diff(today, inv.due_date)
        
        # Determine classification
        if inv.is_domestic:
            inv["type"] = "Domestic"
        elif inv.is_export:
            inv["type"] = "Export"
        else:
            inv["type"] = "Other"

        # Apply Sales Person Filter
        if filters.get("sales_person") and filters.get("sales_person") not in inv_sales_persons:
            continue
            
        # Apply Amount Filter
        if filters.get("min_amount") and flt(inv.outstanding_amount) < flt(filters.get("min_amount")):
            continue
            
        # Apply Days Filter
        if filters.get("min_days") and int(inv["days_overdue"]) < int(filters.get("min_days")):
            continue
            
        # Apply Type Filter
        if filters.get("type") and inv["type"] != filters.get("type"):
            continue

        data.append(inv)

    # Calculate KPIs
    total_overdue = 0
    export_overdue = 0
    domestic_overdue = 0

    for d in data:
        amt = flt(d.outstanding_amount)
        total_overdue += amt
        if d.type == "Export":
            export_overdue += amt
        elif d.type == "Domestic":
            domestic_overdue += amt

    summary = [
        {"label": _("Total Overdue"), "value": total_overdue, "indicator": "red", "fieldtype": "Currency"},
        {"label": _("Export Overdue"), "value": export_overdue, "indicator": "orange", "fieldtype": "Currency"},
        {"label": _("Domestic Overdue"), "value": domestic_overdue, "indicator": "blue", "fieldtype": "Currency"},
        {"label": _("Total Count"), "value": len(data), "indicator": "green", "fieldtype": "Int"}
    ]

    # Charts: Export vs Domestic Breakdown
    charts = {
        "overdue_breakdown": {
            "title": _("Overdue Breakdown (Export vs Domestic)"),
            "data": {
                "labels": [_("Export Overdue"), _("Domestic Overdue")],
                "datasets": [{"name": _("Overdue"), "values": [export_overdue, domestic_overdue]}]
            },
            "type": "donut",
            "colors": ["#10b981", "#f59e0b"]
        }
    }

    return {
        "summary": summary,
        "charts": charts,
        "results": data
    }

@frappe.whitelist()
def export_to_excel(filters=None):
    dashboard_data = get_dashboard_data(filters)
    data = dashboard_data.get("results")
    summary = dashboard_data.get("summary")
    
    if not data:
        return None

    wb = openpyxl.Workbook()
    
    # Sheet 1: Dashboard Overview
    ws_overview = wb.active
    ws_overview.title = "Dashboard Overview"
    
    # Sheet 2: Overdue List
    ws_list = wb.create_sheet("Overdue List")
    
    # Styling
    header_fill = PatternFill(start_color="2c3e50", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    title_font = Font(bold=True, size=14)
    section_font = Font(bold=True, size=12)
    thin_side = Side(style='thin')
    table_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    
    # 1. Overview Sheet
    ws_overview.cell(row=1, column=1, value="Overdue Receivables Dashboard (Million INR)").font = title_font
    ws_overview.cell(row=1, column=4, value="Generated On: " + now_datetime().strftime("%Y-%m-%d %H:%M"))
    
    ws_overview.cell(row=3, column=1, value="Overdue Metrics Summary").font = section_font
    
    colors = {"red": "ef4444", "orange": "f59e0b", "blue": "3b82f6", "green": "10b981"}
    
    for i, s in enumerate(summary):
        r = 5 + (i // 2) * 3
        c = 1 + (i % 2) * 2
        bg_color = colors.get(s.get('indicator', 'blue').lower(), "3b82f6")
        
        cell_l = ws_overview.cell(row=r, column=c, value=s.get('label'))
        cell_l.font = Font(bold=True, color="FFFFFF")
        cell_l.fill = PatternFill(start_color=bg_color, fill_type="solid")
        cell_l.alignment = Alignment(horizontal="center")
        ws_overview.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c+1)
        
        val = s.get('value')
        if s.get('fieldtype') == 'Currency':
            cell_v = ws_overview.cell(row=r+1, column=c, value=flt(val) / 1000000)
            cell_v.number_format = '"₹ "#,##0.00" M"'
        else:
            cell_v = ws_overview.cell(row=r+1, column=c, value=val)
        cell_v.font = Font(bold=True, size=11)
        cell_v.alignment = Alignment(horizontal="center")
        cell_v.border = Border(bottom=Side(style='medium', color=bg_color))
        ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)

    # 2. Overdue List Sheet
    row_idx = 1
    ws_list.cell(row=row_idx, column=1, value="Detailed Overdue List").font = section_font
    row_idx += 2
    
    headers = ["S.No.", "Invoice ID", "Date", "Customer", "Sales Person", "Type", "Outstanding (M)", "Due Date", "Days Overdue"]
    for idx, h in enumerate(headers, start=1):
        cell = ws_list.cell(row=row_idx, column=idx, value=h)
        cell.font, cell.fill, cell.alignment, cell.border = header_font, header_fill, Alignment(horizontal="center"), table_border
    row_idx += 1
    
    for r_idx, row in enumerate(data):
        ws_list.cell(row=row_idx, column=1, value=r_idx + 1).border = table_border
        ws_list.cell(row=row_idx, column=2, value=row['name']).border = table_border
        ws_list.cell(row=row_idx, column=3, value=row['posting_date']).border = table_border
        ws_list.cell(row=row_idx, column=4, value=row['customer_name'] or row['customer']).border = table_border
        ws_list.cell(row=row_idx, column=5, value=row['sales_person']).border = table_border
        ws_list.cell(row=row_idx, column=6, value=row['type']).border = table_border
        
        amt_cell = ws_list.cell(row=row_idx, column=7, value=flt(row['outstanding_amount']) / 1000000)
        amt_cell.number_format, amt_cell.border = '"₹ "#,##0.00" M"', table_border
        
        ws_list.cell(row=row_idx, column=8, value=row['due_date']).border = table_border
        ws_list.cell(row=row_idx, column=9, value=row['days_overdue']).border = table_border
        row_idx += 1

    # Column Widths
    for i in range(1, 10):
        ws_overview.column_dimensions[get_column_letter(i)].width = 25
        ws_list.column_dimensions[get_column_letter(i)].width = 20

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    content = output.read()
    return {
        "filename": f"Overdue_Receivables_{nowdate()}.xlsx",
        "filecontent": base64.b64encode(content).decode()
    }
