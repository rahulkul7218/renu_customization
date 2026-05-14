# import frappe
# from frappe import _
# from frappe.utils import flt, getdate, nowdate, date_diff, now_datetime
# import json
# import openpyxl
# from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
# from openpyxl.utils import get_column_letter
# from io import BytesIO
# import base64

# @frappe.whitelist()
# def export_to_pdf(html):
#     pdf_content = frappe.utils.pdf.get_pdf(html, {"orientation": "Landscape"})
#     frappe.response.filename = f"Overdue_Receivables_{nowdate()}.pdf"
#     frappe.response.filecontent = pdf_content
#     frappe.response.type = "download"

# def prepare_filters(filters):
#     if not filters:
#         filters = {}
#     elif isinstance(filters, str):
#         filters = frappe.parse_json(filters)
    
#     # Handle DateRange from JS
#     if filters.get("date_range"):
#         dr = filters.get("date_range")
#         if isinstance(dr, list) and len(dr) == 2:
#             filters["from_date"] = dr[0]
#             filters["to_date"] = dr[1]

#     # Handle Fiscal Year
#     if filters.get("fiscal_year") and (not filters.get("from_date") or not filters.get("to_date")):
#         fy = frappe.get_doc("Fiscal Year", filters.get("fiscal_year"))
#         if fy:
#             filters["from_date"] = filters.get("from_date") or fy.year_start_date
#             filters["to_date"] = filters.get("to_date") or fy.year_end_date
    
#     return frappe._dict(filters)

# @frappe.whitelist()
# def get_dashboard_data(filters=None):
#     filters = prepare_filters(filters)

#     # Standard Accounts Receivable report filters
#     ar_filters = frappe._dict({
#         "company": filters.get("company"),
#         "report_date": filters.get("to_date") or nowdate(),
#         "customer": filters.get("customer"),
#         "sales_person": filters.get("sales_person"),
#         "group_by_party": 0,
#         "based_on_payment_terms": 1,
#         "show_future_payments": 0,
#         "range_1": 30,
#         "range_2": 60,
#         "range_3": 90,
#         "range_4": 120
#     })

#     from erpnext.accounts.report.accounts_receivable.accounts_receivable import execute
#     columns, report_data, *rest = execute(ar_filters)

#     if not report_data:
#         report_data = []

#     # Fetch Sales Invoice details for classification (is_export, is_domestic)
#     voucher_nos = [d.get("voucher_no") for d in report_data if d.get("voucher_type") == "Sales Invoice"]
#     invoice_details = {}
#     if voucher_nos:
#         inv_data = frappe.get_all("Sales Invoice", 
#             filters={"name": ["in", voucher_nos]},
#             fields=["name", "is_domestic", "is_export", "customer_group"]
#         )
#         for d in inv_data:
#             invoice_details[d.name] = d
    
#     # Also fetch classification for Payment Entries if they have it (custom field) or fallback to Customer Group
#     payment_nos = [d.get("voucher_no") for d in report_data if d.get("voucher_type") in ["Payment Entry", "Journal Entry"]]
#     # In this specific system, let's check if there are other classification methods needed

#     data = []
#     report_date = getdate(ar_filters.report_date)
    
#     # KPIs for Ageing
#     ageing_data = {
#         "0-30": 0,
#         "31-60": 0,
#         "61-90": 0,
#         "91-120": 0,
#         "121+": 0
#     }

#     for row in report_data:
#         # Get outstanding amount - check both possible field names
#         outstanding = flt(row.get("outstanding_amount") or row.get("outstanding") or 0)
        
#         # Skip if effectively zero (avoid tiny balances)
#         if abs(outstanding) < 0.01:
#             continue

#         # Determine Classification and existence check
#         v_no = row.get("voucher_no")
#         v_type = row.get("voucher_type")
        
#         is_export = False
#         if v_type == "Sales Invoice":
#             if v_no not in invoice_details:
#                 # If the invoice doesn't exist in Sales Invoice table, it's likely deleted/cancelled
#                 continue
#             is_export = invoice_details[v_no].get("is_export")
#         else:
#             # For other types, use customer group fallback
#             cust_group = row.get("customer_group")
#             if cust_group and "Export" in cust_group:
#                 is_export = True

#         # Overdue Check
#         # 1. Any item with a negative outstanding (Advance/Credit) is included to show net balance
#         # 2. Any item with a positive outstanding is included if it is overdue (due_date <= report_date)
#         is_advance = outstanding < 0
#         due_date = getdate(row.get("due_date"))
#         is_overdue = due_date and due_date <= report_date
        
#         # Skip if it's a future invoice (not overdue and not an advance)
#         if not is_advance and not is_overdue:
#             continue
            
#         type_label = "Export" if is_export else "Domestic"

#         # Apply Type Filter
#         if filters.get("type") and type_label != filters.get("type"):
#             continue

#         # Days Overdue
#         days_overdue = date_diff(report_date, due_date) if due_date else 0
        
#         # Apply Min Days Filter (only for positive overdue amounts)
#         if outstanding > 0 and filters.get("min_days") and int(days_overdue) < int(filters.get("min_days")):
#             continue

#         inv = {
#             "name": v_no or _("On Account"),
#             "voucher_type": v_type,
#             "customer": row.get("party"),
#             "customer_name": row.get("customer_name") or row.get("party_name"),
#             "posting_date": row.get("posting_date"),
#             "due_date": row.get("due_date"),
#             "outstanding_amount": outstanding,
#             "days_overdue": days_overdue if outstanding > 0 else 0,
#             "type": type_label,
#             "sales_person": row.get("sales_person") or ""
#         }
#         data.append(inv)
        
#         # Ageing stats
#         if days_overdue <= 30: ageing_data["0-30"] += outstanding
#         elif days_overdue <= 60: ageing_data["31-60"] += outstanding
#         elif days_overdue <= 90: ageing_data["61-90"] += outstanding
#         elif days_overdue <= 120: ageing_data["91-120"] += outstanding
#         else: ageing_data["121+"] += outstanding

#     # Calculate KPIs
#     # Total Outstanding: Sum of all items in report_data that are not deleted/cancelled
#     total_outstanding_cumulative = 0
#     for row in report_data:
#         out_val = flt(row.get("outstanding_amount") or row.get("outstanding") or 0)
#         if abs(out_val) < 0.01:
#             continue
#         v_no = row.get("voucher_no")
#         if row.get("voucher_type") == "Sales Invoice" and v_no not in invoice_details:
#             continue
#         total_outstanding_cumulative += out_val

#     # Total Overdue: Sum of all ageing ranges (as requested)
#     total_overdue = sum(ageing_data.values())
    
#     export_overdue = sum(flt(d["outstanding_amount"]) for d in data if d["type"] == "Export")
#     domestic_overdue = sum(flt(d["outstanding_amount"]) for d in data if d["type"] == "Domestic")

#     summary = [
#         {"label": _("Total Outstanding"), "value": total_outstanding_cumulative, "indicator": "cyan", "fieldtype": "Currency"},
#         {"label": _("Total Overdue"), "value": total_overdue, "indicator": "red", "fieldtype": "Currency"},
#         {"label": _("Export Overdue"), "value": export_overdue, "indicator": "orange", "fieldtype": "Currency"},
#         {"label": _("Domestic Overdue"), "value": domestic_overdue, "indicator": "blue", "fieldtype": "Currency"},
#     ]

#     # Charts
#     charts = {
#         "overdue_breakdown": {
#             "title": _("Overdue Breakdown (Export vs Domestic)"),
#             "data": {
#                 "labels": [_("Export Overdue"), _("Domestic Overdue")],
#                 "datasets": [{"name": _("Overdue"), "values": [export_overdue, domestic_overdue]}]
#             },
#             "type": "donut",
#             "colors": ["#10b981", "#f59e0b"]
#         },
#         "ageing_breakdown": {
#             "title": _("Ageing Breakdown"),
#             "data": {
#                 "labels": ["0-30", "31-60", "61-90", "91-120", "121+"],
#                 "datasets": [{"name": _("Amount"), "values": [
#                     ageing_data["0-30"], ageing_data["31-60"], ageing_data["61-90"], ageing_data["91-120"], ageing_data["121+"]
#                 ]}]
#             },
#             "type": "bar",
#             "colors": ["#3b82f6", "#06b6d4", "#f59e0b", "#ef4444", "#991b1b"]
#         }
#     }

#     return {
#         "summary": summary,
#         "charts": charts,
#         "results": data
#     }


# @frappe.whitelist()
# def export_to_excel(filters=None, export_type="all"):
#     dashboard_data = get_dashboard_data(filters)
#     data = dashboard_data.get("results")
#     summary = dashboard_data.get("summary")
    
#     if not data:
#         return None

#     wb = openpyxl.Workbook()
    
#     # Based on export_type, we decide which sheets to keep
#     if export_type == "all":
#         ws_overview = wb.active
#         ws_overview.title = "Dashboard Overview"
#         ws_list = wb.create_sheet("Overdue List")
#     elif export_type == "detail":
#         ws_list = wb.active
#         ws_list.title = "Overdue List"
#         ws_overview = wb.create_sheet("Dummy") # Will be removed
    
#     # Styling
#     header_fill = PatternFill(start_color="2c3e50", fill_type="solid")
#     header_font = Font(bold=True, color="FFFFFF")
#     title_font = Font(bold=True, size=14)
#     section_font = Font(bold=True, size=12)
#     thin_side = Side(style='thin')
#     table_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    
#     if export_type == "all":
#         # 1. Overview Sheet
#         ws_overview.cell(row=1, column=1, value="Overdue Receivables Dashboard (Million INR)").font = title_font
#         ws_overview.cell(row=1, column=4, value="Generated On: " + now_datetime().strftime("%Y-%m-%d %H:%M"))
        
#         ws_overview.cell(row=3, column=1, value="Overdue Metrics Summary").font = section_font
        
#         colors = {"red": "ef4444", "orange": "f59e0b", "blue": "3b82f6", "green": "10b981"}
        
#         for i, s in enumerate(summary):
#             r = 5 + (i // 2) * 3
#             c = 1 + (i % 2) * 2
#             bg_color = colors.get(s.get('indicator', 'blue').lower(), "3b82f6")
            
#             cell_l = ws_overview.cell(row=r, column=c, value=s.get('label'))
#             cell_l.font = Font(bold=True, color="FFFFFF")
#             cell_l.fill = PatternFill(start_color=bg_color, fill_type="solid")
#             cell_l.alignment = Alignment(horizontal="center")
#             ws_overview.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c+1)
            
#             val = s.get('value')
#             if s.get('fieldtype') == 'Currency':
#                 cell_v = ws_overview.cell(row=r+1, column=c, value=flt(val) / 1000000)
#                 cell_v.number_format = '"₹ "#,##0.0000" M"'
#             else:
#                 cell_v = ws_overview.cell(row=r+1, column=c, value=val)
#             cell_v.font = Font(bold=True, size=11)
#             cell_v.alignment = Alignment(horizontal="center")
#             cell_v.border = Border(bottom=Side(style='medium', color=bg_color))
#             ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)

#     if export_type in ["all", "detail"]:
#         # 2. Overdue List Sheet
#         row_idx = 1
#         ws_list.cell(row=row_idx, column=1, value="Detailed Overdue List").font = section_font
#         row_idx += 2
        
#         headers = ["S.No.", "Invoice ID", "Date", "Customer", "Sales Person", "Type", "Outstanding (M)", "Due Date", "Days Overdue"]
#         for idx, h in enumerate(headers, start=1):
#             cell = ws_list.cell(row=row_idx, column=idx, value=h)
#             cell.font, cell.fill, cell.alignment, cell.border = header_font, header_fill, Alignment(horizontal="center"), table_border
#         row_idx += 1
        
#         for r_idx, row in enumerate(data):
#             ws_list.cell(row=row_idx, column=1, value=r_idx + 1).border = table_border
#             ws_list.cell(row=row_idx, column=2, value=row['name']).border = table_border
#             ws_list.cell(row=row_idx, column=3, value=row['posting_date']).border = table_border
#             ws_list.cell(row=row_idx, column=4, value=row['customer_name'] or row['customer']).border = table_border
#             ws_list.cell(row=row_idx, column=5, value=row['sales_person']).border = table_border
#             ws_list.cell(row=row_idx, column=6, value=row['type']).border = table_border
            
#             amt_cell = ws_list.cell(row=row_idx, column=7, value=flt(row['outstanding_amount']) / 1000000)
#             amt_cell.number_format, amt_cell.border = '"₹ "#,##0.0000" M"', table_border
            
#             ws_list.cell(row=row_idx, column=8, value=row['due_date']).border = table_border
#             ws_list.cell(row=row_idx, column=9, value=row['days_overdue']).border = table_border
#             row_idx += 1
    
#         # Add Total Row
#         ws_list.cell(row=row_idx, column=1, value="Total").font = header_font
#         ws_list.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=6)
#         for c in range(1, 7):
#             ws_list.cell(row=row_idx, column=c).fill = header_fill
#             ws_list.cell(row=row_idx, column=c).border = table_border
#             if c == 1:
#                 ws_list.cell(row=row_idx, column=c).alignment = Alignment(horizontal="right")
                
#         total_amt = sum(flt(r['outstanding_amount']) for r in data) / 1000000
#         total_cell = ws_list.cell(row=row_idx, column=7, value=total_amt)
#         total_cell.font = header_font
#         total_cell.fill = header_fill
#         total_cell.number_format, total_cell.border = '"₹ "#,##0.0000" M"', table_border
        
#         ws_list.cell(row=row_idx, column=8, value="").fill = header_fill
#         ws_list.cell(row=row_idx, column=8, value="").border = table_border
#         ws_list.cell(row=row_idx, column=9, value="").fill = header_fill
#         ws_list.cell(row=row_idx, column=9, value="").border = table_border
#         row_idx += 1

#     # Remove dummy if detail only
#     if export_type == "detail" and "Dummy" in wb.sheetnames:
#         wb.remove(wb["Dummy"])

#     # Column Widths
#     for ws in wb.worksheets:
#         for i in range(1, 10):
#             ws.column_dimensions[get_column_letter(i)].width = 25

#     output = BytesIO()
#     wb.save(output)
#     output.seek(0)
    
#     filename = f"Overdue_Receivables_{nowdate()}.xlsx"
#     if export_type == "detail":
#         filename = f"Detailed_Overdue_List_{nowdate()}.xlsx"
    
#     return {
#         "filename": filename,
#         "filecontent": base64.b64encode(output.read()).decode()
#     }

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

def prepare_filters(filters):
    if not filters:
        filters = {}
    elif isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    # Handle DateRange from JS
    if filters.get("date_range"):
        dr = filters.get("date_range")
        if isinstance(dr, list) and len(dr) == 2:
            filters["from_date"] = dr[0]
            filters["to_date"] = dr[1]

    # Handle Fiscal Year
    if filters.get("fiscal_year") and (not filters.get("from_date") or not filters.get("to_date")):
        fy = frappe.get_doc("Fiscal Year", filters.get("fiscal_year"))
        if fy:
            filters["from_date"] = filters.get("from_date") or fy.year_start_date
            filters["to_date"] = filters.get("to_date") or fy.year_end_date
    
    return frappe._dict(filters)

@frappe.whitelist()
def get_dashboard_data(filters=None):
    filters = prepare_filters(filters)

    # Standard Accounts Receivable report filters
    ar_filters = frappe._dict({
        "company": filters.get("company"),
        "report_date": filters.get("to_date") or nowdate(),
        "customer": filters.get("customer"),
        "sales_person": filters.get("sales_person"),
        "group_by_party": 0,
        "based_on_payment_terms": 1,
        "show_future_payments": 0,
        "range_1": 30,
        "range_2": 60,
        "range_3": 90,
        "range_4": 120
    })

    from erpnext.accounts.report.accounts_receivable.accounts_receivable import execute
    columns, report_data, *rest = execute(ar_filters)

    if not report_data:
        report_data = []

    # Fetch Sales Invoice details for classification (is_export, is_domestic)
    voucher_nos = [d.get("voucher_no") for d in report_data if d.get("voucher_type") == "Sales Invoice"]
    invoice_details = {}
    if voucher_nos:
        inv_data = frappe.get_all("Sales Invoice", 
            filters={"name": ["in", voucher_nos]},
            fields=["name", "is_domestic", "is_export", "customer_group"]
        )
        for d in inv_data:
            invoice_details[d.name] = d

    data = []
    report_date = getdate(ar_filters.report_date)
    
    # KPIs for Ageing
    ageing_data = {
        "0-30": 0,
        "31-60": 0,
        "61-90": 0,
        "91-120": 0,
        "121+": 0
    }

    # Cumulative totals for matching report
    total_outstanding_cumulative = 0

    for row in report_data:
        # Get outstanding amount - check both possible field names
        outstanding = flt(row.get("outstanding_amount") or row.get("outstanding") or 0)
        
        # Skip if effectively zero (avoid tiny balances)
        if abs(outstanding) < 0.01:
            continue

        # Determine existence check (avoid deleted/cancelled)
        v_no = row.get("voucher_no")
        v_type = row.get("voucher_type")
        
        if v_type == "Sales Invoice" and v_no not in invoice_details:
            continue

        total_outstanding_cumulative += outstanding

        # Classification
        is_export = False
        if v_type == "Sales Invoice":
            is_export = invoice_details[v_no].get("is_export")
        else:
            # For other types, use customer group fallback
            cust_group = row.get("customer_group")
            if cust_group and "Export" in cust_group:
                is_export = True

        # Overdue Check (Include invoices due today or before)
        due_date = getdate(row.get("due_date"))
        is_overdue = due_date and due_date <= report_date
        
        # Consider all overdue items AND all unallocated payments (advances)
        if not is_overdue and outstanding >= 0:
            continue
            
        type_label = "Export" if is_export else "Domestic"
        
        # Apply Type Filter
        if filters.get("type") and type_label != filters.get("type"):
            continue

        # Days Overdue
        days_overdue = date_diff(report_date, due_date) if due_date else 0
        
        # Apply Min Days Filter (only for positive overdue amounts)
        if outstanding > 0 and filters.get("min_days") and int(days_overdue) < int(filters.get("min_days")):
            continue

        # Add to table data
        inv = {
            "name": v_no or _("On Account"),
            "voucher_type": v_type,
            "customer": row.get("party"),
            "customer_name": row.get("customer_name") or row.get("party_name"),
            "posting_date": row.get("posting_date"),
            "due_date": row.get("due_date"),
            "outstanding_amount": outstanding,
            "days_overdue": days_overdue if outstanding > 0 else 0,
            "type": type_label,
            "sales_person": row.get("sales_person") or ""
        }
        data.append(inv)
        
        # Ageing stats (calculated for items that pass the filters)
        if days_overdue <= 30: ageing_data["0-30"] += outstanding
        elif days_overdue <= 60: ageing_data["31-60"] += outstanding
        elif days_overdue <= 90: ageing_data["61-90"] += outstanding
        elif days_overdue <= 120: ageing_data["91-120"] += outstanding
        else: ageing_data["121+"] += outstanding

    # Calculate KPIs - Total Overdue is sum of all ageing ranges
    total_overdue = sum(ageing_data.values())
    export_overdue = sum(flt(d["outstanding_amount"]) for d in data if d["type"] == "Export")
    domestic_overdue = sum(flt(d["outstanding_amount"]) for d in data if d["type"] == "Domestic")

    summary = [
        {"label": _("Total Outstanding"), "value": total_outstanding_cumulative, "indicator": "cyan", "fieldtype": "Currency"},
        {"label": _("Total Overdue"), "value": total_overdue, "indicator": "red", "fieldtype": "Currency"},
        {"label": _("Export Overdue"), "value": export_overdue, "indicator": "orange", "fieldtype": "Currency"},
        {"label": _("Domestic Overdue"), "value": domestic_overdue, "indicator": "blue", "fieldtype": "Currency"},
    ]

    # Charts
    charts = {
        "overdue_breakdown": {
            "title": _("Overdue Breakdown (Export vs Domestic)"),
            "data": {
                "labels": [_("Export Overdue"), _("Domestic Overdue")],
                "datasets": [{"name": _("Overdue"), "values": [export_overdue, domestic_overdue]}]
            },
            "type": "donut",
            "colors": ["#10b981", "#f59e0b"]
        },
        "ageing_breakdown": {
            "title": _("Ageing Breakdown"),
            "data": {
                "labels": ["0-30", "31-60", "61-90", "91-120", "121+"],
                "datasets": [{"name": _("Amount"), "values": [
                    ageing_data["0-30"], ageing_data["31-60"], ageing_data["61-90"], ageing_data["91-120"], ageing_data["121+"]
                ]}]
            },
            "type": "bar",
            "colors": ["#3b82f6", "#06b6d4", "#f59e0b", "#ef4444", "#991b1b"]
        }
    }

    return {
        "summary": summary,
        "charts": charts,
        "results": data
    }


@frappe.whitelist()
def export_to_excel(filters=None, export_type="all"):
    dashboard_data = get_dashboard_data(filters)
    data = dashboard_data.get("results")
    summary = dashboard_data.get("summary")
    
    if not data:
        return None

    wb = openpyxl.Workbook()
    
    # Based on export_type, we decide which sheets to keep
    if export_type == "all":
        ws_overview = wb.active
        ws_overview.title = "Dashboard Overview"
        ws_list = wb.create_sheet("Overdue List")
    elif export_type == "detail":
        ws_list = wb.active
        ws_list.title = "Overdue List"
        ws_overview = wb.create_sheet("Dummy") # Will be removed
    
    # Styling
    header_fill = PatternFill(start_color="2c3e50", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    title_font = Font(bold=True, size=14)
    section_font = Font(bold=True, size=12)
    thin_side = Side(style='thin')
    table_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    
    if export_type == "all":
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
                cell_v.number_format = '"₹ "#,##0.0000" M"'
            else:
                cell_v = ws_overview.cell(row=r+1, column=c, value=val)
            cell_v.font = Font(bold=True, size=11)
            cell_v.alignment = Alignment(horizontal="center")
            cell_v.border = Border(bottom=Side(style='medium', color=bg_color))
            ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)

    if export_type in ["all", "detail"]:
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
            amt_cell.number_format, amt_cell.border = '"₹ "#,##0.0000" M"', table_border
            
            ws_list.cell(row=row_idx, column=8, value=row['due_date']).border = table_border
            ws_list.cell(row=row_idx, column=9, value=row['days_overdue']).border = table_border
            row_idx += 1
    
        # Add Total Row
        ws_list.cell(row=row_idx, column=1, value="Total").font = header_font
        ws_list.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=6)
        for c in range(1, 7):
            ws_list.cell(row=row_idx, column=c).fill = header_fill
            ws_list.cell(row=row_idx, column=c).border = table_border
            if c == 1:
                ws_list.cell(row=row_idx, column=c).alignment = Alignment(horizontal="right")
                
        total_amt = sum(flt(r['outstanding_amount']) for r in data) / 1000000
        total_cell = ws_list.cell(row=row_idx, column=7, value=total_amt)
        total_cell.font = header_font
        total_cell.fill = header_fill
        total_cell.number_format, total_cell.border = '"₹ "#,##0.0000" M"', table_border
        
        ws_list.cell(row=row_idx, column=8, value="").fill = header_fill
        ws_list.cell(row=row_idx, column=8, value="").border = table_border
        ws_list.cell(row=row_idx, column=9, value="").fill = header_fill
        ws_list.cell(row=row_idx, column=9, value="").border = table_border
        row_idx += 1

    # Remove dummy if detail only
    if export_type == "detail" and "Dummy" in wb.sheetnames:
        wb.remove(wb["Dummy"])

    # Column Widths
    for ws in wb.worksheets:
        for i in range(1, 10):
            ws.column_dimensions[get_column_letter(i)].width = 25

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"Overdue_Receivables_{nowdate()}.xlsx"
    if export_type == "detail":
        filename = f"Detailed_Overdue_List_{nowdate()}.xlsx"
    
    return {
        "filename": filename,
        "filecontent": base64.b64encode(output.read()).decode()
    }