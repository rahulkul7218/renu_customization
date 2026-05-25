import frappe
from frappe import _
from frappe.utils import flt, nowdate, now_datetime
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from io import BytesIO
import base64

@frappe.whitelist()
def export_to_pdf(html):
    pdf_content = frappe.utils.pdf.get_pdf(html, {"orientation": "Landscape"})
    frappe.response.filename = f"Collection_Dashboard_{nowdate()}.pdf"
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
    if filters.get("fiscal_year"):
        fy = frappe.get_doc("Fiscal Year", filters.get("fiscal_year"))
        if fy:
            filters["from_date"] = filters.get("from_date") or fy.year_start_date
            filters["to_date"] = filters.get("to_date") or fy.year_end_date

    return frappe._dict(filters)

@frappe.whitelist()
def get_dashboard_data(filters=None):
    filters = prepare_filters(filters)
    company = filters.get("company") or frappe.db.get_default("Company")

    # 1. Base conditions for GL Entry
    gle_conditions = [
        "gle.docstatus = 1",
        "gle.party_type = 'Customer'",
        "gle.is_cancelled = 0",
        "gle.company = {0}".format(frappe.db.escape(company))
    ]

    if filters.get("customer"):
        gle_conditions.append("gle.party = {0}".format(frappe.db.escape(filters.get("customer"))))

    if filters.get("customer_group"):
        gle_conditions.append(f"EXISTS (SELECT 1 FROM `tabCustomer` cust WHERE cust.name = gle.party AND cust.customer_group = {frappe.db.escape(str(filters.get('customer_group')))})")

    if filters.get("sales_person"):
        gle_conditions.append(f"""(
            EXISTS (SELECT 1 FROM `tabSales Team` st WHERE st.parent = gle.against_voucher AND st.sales_person = {frappe.db.escape(str(filters.get('sales_person')))})
            OR EXISTS (SELECT 1 FROM `tabSales Team` st JOIN `tabSales Invoice` si ON si.name = st.parent WHERE si.name = gle.voucher_no AND st.sales_person = {frappe.db.escape(str(filters.get('sales_person')))})
        )""")

    if filters.get("dom_exp"):
        if filters.get("dom_exp") == "Domestic":
            gle_conditions.append("""EXISTS (
                SELECT 1 FROM `tabSales Invoice` si
                WHERE (si.name = gle.against_voucher OR si.name = gle.voucher_no)
                AND si.is_domestic = 1
            )""")
        elif filters.get("dom_exp") == "Export":
            gle_conditions.append("""EXISTS (
                SELECT 1 FROM `tabSales Invoice` si
                WHERE (si.name = gle.against_voucher OR si.name = gle.voucher_no)
                AND si.is_export = 1
            )""")

    # 2. Opening Balance
    # Include all entries before from_date OR entries marked as 'is_opening'
    opening_conditions = gle_conditions[:]
    if filters.get("from_date"):
        opening_conditions.append("(gle.posting_date < {0} OR gle.is_opening = 1)".format(frappe.db.escape(filters.get("from_date"))))

        opening_query = f"SELECT SUM(gle.debit) - SUM(gle.credit) FROM `tabGL Entry` gle WHERE {' AND '.join(opening_conditions)}"
        opening_bal = flt(frappe.db.sql(opening_query)[0][0])
    else:
        # If no from_date, opening balance is only the 'is_opening' entries
        opening_query = f"SELECT SUM(gle.debit) - SUM(gle.credit) FROM `tabGL Entry` gle WHERE {' AND '.join(gle_conditions)} AND gle.is_opening = 1"
        opening_bal = flt(frappe.db.sql(opening_query)[0][0])

    # 3. Period Totals & Main Results (Ledger Based)
    # Exclude 'is_opening' entries from period totals
    period_conditions = gle_conditions[:] + ["gle.is_opening = 0"]
    if filters.get("from_date"):
        period_conditions.append("gle.posting_date >= {0}".format(frappe.db.escape(filters.get("from_date"))))
    if filters.get("to_date"):
        period_conditions.append("gle.posting_date <= {0}".format(frappe.db.escape(filters.get("to_date"))))

    # Calculate Period Debit/Credit
    totals_query = f"SELECT SUM(gle.debit) as total_debit, SUM(gle.credit) as total_credit FROM `tabGL Entry` gle WHERE {' AND '.join(period_conditions)}"
    totals_res = frappe.db.sql(totals_query, as_dict=True)
    totals_res = totals_res[0] if totals_res else {"total_debit": 0, "total_credit": 0}

    ledger_collection = flt(totals_res.get("total_credit"))
    ledger_invoiced = flt(totals_res.get("total_debit"))
    closing_bal = opening_bal + ledger_invoiced - ledger_collection

    # Detailed Results (Every Credit Entry)
    results_query = f"""
        SELECT
            gle.name as gle_id, gle.voucher_no as payment_entry, gle.voucher_type, gle.posting_date, gle.party as customer,
            cust.customer_group,
            gle.credit as allocated_amount, gle.against_voucher as name,
            COALESCE(si.is_export, 0) as is_export,
            COALESCE(si.is_domestic, 1) as is_domestic,
            COALESCE(si.status, 'Settled') as status,
            si.due_date as due_date,
            DATEDIFF(gle.posting_date, si.due_date) as due_days
        FROM `tabGL Entry` gle
        LEFT JOIN `tabSales Invoice` si ON si.name = gle.against_voucher
        LEFT JOIN `tabCustomer` cust ON cust.name = gle.party
        WHERE {" AND ".join(period_conditions)} AND gle.credit > 0.01
    """

    if filters.get("sales_person"):
        results_query += f""" AND (
            EXISTS (SELECT 1 FROM `tabSales Team` st WHERE st.parent = gle.against_voucher AND st.sales_person = {frappe.db.escape(str(filters.get('sales_person')))})
            OR EXISTS (SELECT 1 FROM `tabSales Team` st WHERE st.parent = gle.voucher_no AND st.sales_person = {frappe.db.escape(str(filters.get('sales_person')))})
        )"""

    if filters.get("dom_exp"):
        if filters.get("dom_exp") == "Domestic": results_query += " AND COALESCE(si.is_domestic, 1) = 1"
        elif filters.get("dom_exp") == "Export": results_query += " AND COALESCE(si.is_export, 0) = 1"

    results_query += " ORDER BY gle.posting_date DESC, gle.name DESC"
    data = frappe.db.sql(results_query, as_dict=True)

    # Enrichment
    all_vouchers = list(set([d.payment_entry for d in data] + [d.name for d in data if d.name]))
    sales_map = {}
    if all_vouchers:
        st = frappe.get_all("Sales Team", filters={"parent": ("in", all_vouchers)}, fields=["parent", "sales_person"])
        for s in st: sales_map.setdefault(s.parent, []).append(s.sales_person)

    for d in data:
        sp = sales_map.get(d.payment_entry, []) + sales_map.get(d.name, [])
        d.sales_person = ", ".join(list(set(sp))) if sp else "-"

    # Ensure binary classification for KPI cards
    for d in data:
        if flt(d.get("is_export")):
            d.is_export = 1
            d.is_domestic = 0
        else:
            d.is_export = 0
            d.is_domestic = 1

    export_collection = sum(flt(d.allocated_amount) for d in data if d.is_export)
    domestic_collection = sum(flt(d.allocated_amount) for d in data if d.is_domestic)
    total_collection = sum(flt(d.allocated_amount) for d in data)

    # 4. Due in 15 Days (Invoices with Balance)
    # Sales Invoices
    due_si_cond = ["si.docstatus = 1", "si.status NOT IN ('Paid', 'Cancelled', 'Draft')", "si.due_date >= CURDATE()", "si.due_date <= DATE_ADD(CURDATE(), INTERVAL 15 DAY)", "si.outstanding_amount > 0.01"]
    if filters.get("customer"):
        due_si_cond.append(f"si.customer = {frappe.db.escape(str(filters.get('customer')))}")
    if filters.get("sales_person"):
        due_si_cond.append(f"EXISTS (SELECT 1 FROM `tabSales Team` st WHERE st.parent = si.name AND st.sales_person = {frappe.db.escape(str(filters.get('sales_person')))})")
    if filters.get("dom_exp"):
        if filters.get("dom_exp") == "Domestic": due_si_cond.append("si.is_domestic = 1")
        elif filters.get("dom_exp") == "Export": due_si_cond.append("si.is_export = 1")

    due_si = frappe.db.sql(f"SELECT 'Sales Invoice' as doctype, si.name, si.customer, si.customer_group, si.posting_date, si.due_date, si.outstanding_amount, si.base_grand_total as base_net_total, DATEDIFF(si.due_date, CURDATE()) as due_days FROM `tabSales Invoice` si WHERE {' AND '.join(due_si_cond)}", as_dict=True)

    due_results = due_si
    due_results.sort(key=lambda x: x['due_date'])
    due_amount = sum(flt(d.outstanding_amount) for d in due_results)

    # Enrichment for Due
    due_names = [d.name for d in due_results]
    if due_names:
        dst = frappe.get_all("Sales Team", filters={"parent": ("in", due_names)}, fields=["parent", "sales_person"])
        dsm = {}
        for s in dst: dsm.setdefault(s.parent, []).append(s.sales_person)
        for d in due_results: d.sales_person = ", ".join(dsm.get(d.name, []))

    # 5. Customer-wise Summary (Removed as requested)
    customer_summary = []

    summary = [
        {"label": _("TOTAL Collection"), "value": total_collection, "indicator": "Blue"},
        {"label": _("Export Collection"), "value": export_collection, "indicator": "Green"},
        {"label": _("Domestic Collection"), "value": domestic_collection, "indicator": "Orange"},
        {"label": _("Due in 15 Days"), "value": due_amount, "indicator": "Red"}
    ]

    chart = {
        "title": _("Collection Breakdown (Export vs Domestic)"),
        "data": {
            "labels": [_("Export"), _("Domestic")],
            "datasets": [{"name": _("Collection"), "values": [export_collection, domestic_collection]}]
        },
        "type": "donut", "colors": ["#10b981", "#f59e0b"]
    }

    return {
        "summary": summary,
        "chart": chart,
        "results": data,
        "due_results": due_results,
        "customer_summary": customer_summary,
        "opening_bal": opening_bal
    }

@frappe.whitelist()
def export_to_excel(filters=None, export_type="all"):
    dashboard_data = get_dashboard_data(filters)
    results = dashboard_data.get("results")
    due_results = dashboard_data.get("due_results")
    summary = dashboard_data.get("summary")
    customer_summary = dashboard_data.get("customer_summary") or []

    wb = openpyxl.Workbook()

    # Styling Helpers
    header_fill = PatternFill(start_color="2c3e50", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    title_font = Font(bold=True, size=14)
    section_font = Font(bold=True, size=12)
    thin_side = Side(style='thin')
    table_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    num_format = '"₹ "#,##0.00" M"'
    zebra_fill = PatternFill(start_color="f8f9fa", fill_type="solid")

    if export_type == "all":
        ws_overview = wb.active
        ws_overview.title = "Dashboard Overview"

        ws_overview.cell(row=1, column=1, value="Collection Dashboard Overview (Million INR)").font = title_font
        ws_overview.cell(row=1, column=4, value="Generated On: " + now_datetime().strftime("%Y-%m-%d %H:%M"))
        ws_overview.cell(row=3, column=1, value="1. Collection Metrics Summary").font = section_font

        colors = {"blue": "3b82f6", "green": "10b981", "orange": "f59e0b", "red": "ef4444", "purple": "8b5cf6", "grey": "94a3b8", "cyan": "06b6d4"}
        for i, s in enumerate(summary):
            r = 5 + (i // 2) * 3
            c = 1 + (i % 2) * 3
            bg_color = colors.get(s.get('indicator', 'blue').lower(), "3b82f6")

            cell_l = ws_overview.cell(row=r, column=c, value=s.get('label'))
            cell_l.font, cell_l.fill, cell_l.alignment = Font(bold=True, color="FFFFFF"), PatternFill(start_color=bg_color, fill_type="solid"), Alignment(horizontal="center")
            ws_overview.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c+1)

            cell_v = ws_overview.cell(row=r+1, column=c, value=flt(s.get('value')) / 1000000)
            cell_v.font, cell_v.number_format, cell_v.alignment = Font(bold=True, size=11), num_format, Alignment(horizontal="center")
            cell_v.border = Border(bottom=Side(style='medium', color=bg_color))
            ws_overview.merge_cells(start_row=r+1, start_column=c, end_row=r+1, end_column=c+1)


    if export_type in ["all", "detail"]:
        ws_list = wb.active if export_type == "detail" else wb.create_sheet("Collection List")
        ws_list.title = "Detailed Collection List"
        row_idx = 1
        ws_list.cell(row=row_idx, column=1, value="Detailed Collection List (Million INR)").font = section_font
        row_idx += 2

        headers = ["S.No.", "Voucher No", "Voucher Type", "Reference", "Date", "Due Date", "Days Diff", "Customer", "Customer Group", "Sales Person", "Amount (M)", "Status"]
        for idx, h in enumerate(headers, start=1):
            cell = ws_list.cell(row=row_idx, column=idx, value=h)
            cell.font, cell.fill, cell.alignment, cell.border = header_font, header_fill, Alignment(horizontal="center"), table_border
        row_idx += 1

        for r_idx, row in enumerate(results):
            row_f = zebra_fill if r_idx % 2 != 0 else None
            cells = [
                ws_list.cell(row=row_idx, column=1, value=r_idx + 1),
                ws_list.cell(row=row_idx, column=2, value=row.get('payment_entry')),
                ws_list.cell(row=row_idx, column=3, value=row.get('voucher_type')),
                ws_list.cell(row=row_idx, column=4, value=row.get('name') or "-"),
                ws_list.cell(row=row_idx, column=5, value=row.get('posting_date')),
                ws_list.cell(row=row_idx, column=6, value=row.get('due_date')),
                ws_list.cell(row=row_idx, column=7, value=row.get('due_days')),
                ws_list.cell(row=row_idx, column=8, value=row.get('customer')),
                ws_list.cell(row=row_idx, column=9, value=row.get('customer_group')),
                ws_list.cell(row=row_idx, column=10, value=row.get('sales_person')),
                ws_list.cell(row=row_idx, column=11, value=flt(row.get('allocated_amount')) / 1000000),
                ws_list.cell(row=row_idx, column=12, value=row.get('status'))
            ]

            for c_idx, c in enumerate(cells, start=1):
                c.border = table_border
                if row_f: c.fill = row_f
                if c_idx == 10: # Amount
                    c.number_format = num_format
                    c.alignment = Alignment(horizontal="right")
                elif c_idx in [5, 6]: # Date Columns
                    c.number_format = 'yyyy-mm-dd'
                elif c_idx == 7: # Due Days
                    c.alignment = Alignment(horizontal="center")
            row_idx += 1

        total_amt = sum(flt(r['allocated_amount']) for r in results) / 1000000
        ws_list.cell(row=row_idx, column=1, value="Grand Total").font = header_font
        ws_list.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=10)
        for c in range(1, 13):
            ws_list.cell(row=row_idx, column=c).fill = header_fill
            ws_list.cell(row=row_idx, column=c).border = table_border
        total_cell = ws_list.cell(row=row_idx, column=11, value=total_amt)
        total_cell.font, total_cell.number_format, total_cell.alignment = header_font, num_format, Alignment(horizontal="right")

    if export_type in ["all", "due"]:
        ws_due = wb.active if export_type == "due" else wb.create_sheet("Upcoming Payments")
        ws_due.title = "Upcoming Payments Due"
        row_idx = 1
        ws_due.cell(row=row_idx, column=1, value="Payment Due in Next 15 Days (Million INR)").font = section_font
        row_idx += 2

        headers = ["S.No.", "Invoice ID", "Customer", "Customer Group", "Sales Person", "Posting Date", "Due Date", "Due Days", "Net Total (M)", "Outstanding (M)"]
        for idx, h in enumerate(headers, start=1):
            cell = ws_due.cell(row=row_idx, column=idx, value=h)
            cell.font, cell.fill, cell.alignment, cell.border = header_font, header_fill, Alignment(horizontal="center"), table_border
        row_idx += 1

        for r_idx, row in enumerate(due_results):
            row_f = zebra_fill if r_idx % 2 != 0 else None
            cells = [
                ws_due.cell(row=row_idx, column=1, value=r_idx + 1),
                ws_due.cell(row=row_idx, column=2, value=row['name']),
                ws_due.cell(row=row_idx, column=3, value=row['customer']),
                ws_due.cell(row=row_idx, column=4, value=row['customer_group']),
                ws_due.cell(row=row_idx, column=5, value=row['sales_person']),
                ws_due.cell(row=row_idx, column=6, value=row['posting_date']),
                ws_due.cell(row=row_idx, column=7, value=row['due_date']),
                ws_due.cell(row=row_idx, column=8, value=row['due_days']),
                ws_due.cell(row=row_idx, column=9, value=flt(row['base_net_total']) / 1000000),
                ws_due.cell(row=row_idx, column=10, value=flt(row['outstanding_amount']) / 1000000)
            ]
            for c_idx, c in enumerate(cells, start=1):
                c.border = table_border
                if row_f: c.fill = row_f
                if c_idx in [8, 9]:
                    c.number_format = num_format
                    c.alignment = Alignment(horizontal="right")
            row_idx += 1

        # Add Total Row for Due
        total_due_net = sum(flt(r['base_net_total']) for r in due_results) / 1000000
        total_due_out = sum(flt(r['outstanding_amount']) for r in due_results) / 1000000
        ws_due.cell(row=row_idx, column=1, value="Grand Total").font = header_font
        ws_due.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=8)
        for c in range(1, 11):
            ws_due.cell(row=row_idx, column=c).fill = header_fill
            ws_due.cell(row=row_idx, column=c).border = table_border

        ws_due.cell(row=row_idx, column=9, value=total_due_net).font = header_font
        ws_due.cell(row=row_idx, column=9).number_format = num_format
        ws_due.cell(row=row_idx, column=9).alignment = Alignment(horizontal="right")
        ws_due.cell(row=row_idx, column=10, value=total_due_out).font = header_font
        ws_due.cell(row=row_idx, column=10).number_format = num_format
        ws_due.cell(row=row_idx, column=10).alignment = Alignment(horizontal="right")

    # Column Widths
    for ws in wb.worksheets:
        max_col = 12 if ws.title == "Detailed Collection List" else 9
        for i in range(1, max_col + 1):
            ws.column_dimensions[get_column_letter(i)].width = 22

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filenames = {
        "all": f"Collection_Dashboard_{nowdate()}.xlsx",
        "detail": f"Detailed_Collection_List_{nowdate()}.xlsx",
        "due": f"Upcoming_Payments_Due_{nowdate()}.xlsx"
    }

    return {
        "filename": filenames.get(export_type, f"Collection_Dashboard_{nowdate()}.xlsx"),
        "filecontent": base64.b64encode(output.read()).decode()
    }
