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
    if filters.get("fiscal_year") and (not filters.get("from_date") or not filters.get("to_date")):
        fy = frappe.get_doc("Fiscal Year", filters.get("fiscal_year"))
        if fy:
            filters["from_date"] = filters.get("from_date") or fy.year_start_date
            filters["to_date"] = filters.get("to_date") or fy.year_end_date
    
    return frappe._dict(filters)

@frappe.whitelist()
def get_dashboard_data(filters=None):
    filters = prepare_filters(filters)

    conditions = [
        "pe.docstatus = 1",
        "pe.payment_type = 'Receive'",
        "pe.party_type = 'Customer'",
        "per.reference_doctype = 'Sales Invoice'"
    ]
    
    if filters.get("customer"):
        conditions.append(f"si.customer = {frappe.db.escape(str(filters.get('customer')))}")
    
    if filters.get("from_date"):
        conditions.append(f"pe.posting_date >= {frappe.db.escape(str(filters.get('from_date')))}")
    
    if filters.get("to_date"):
        conditions.append(f"pe.posting_date <= {frappe.db.escape(str(filters.get('to_date')))}")
 
    if filters.get("dom_exp"):
        if filters.get("dom_exp") == "Domestic":
            conditions.append("si.is_domestic = 1")
        elif filters.get("dom_exp") == "Export":
            conditions.append("si.is_export = 1")

    if filters.get("sales_person"):
        conditions.append(f"""EXISTS (
            SELECT 1 FROM `tabSales Team` st 
            WHERE st.parent = si.name 
              AND st.parenttype = 'Sales Invoice' 
              AND st.sales_person = {frappe.db.escape(str(filters.get('sales_person')))}
        )""")

    if filters.get("customer_group"):
        conditions.append(f"si.customer_group = {frappe.db.escape(str(filters.get('customer_group')))}")
    
    if filters.get("item_group"):
        conditions.append(f"sii.item_group = {frappe.db.escape(str(filters.get('item_group')))}")
    
    if filters.get("item_code"):
        conditions.append(f"sii.item_code = {frappe.db.escape(str(filters.get('item_code')))}")

    where_clause = " AND ".join(conditions)
    
    # Calculate On Account Total (Unallocated amounts)
    pe_conditions = [
        "pe.docstatus = 1",
        "pe.payment_type = 'Receive'",
        "pe.party_type = 'Customer'"
    ]
    if filters.get("customer"):
        pe_conditions.append(f"pe.party = {frappe.db.escape(str(filters.get('customer')))}")
    if filters.get("from_date"):
        pe_conditions.append(f"pe.posting_date >= {frappe.db.escape(str(filters.get('from_date')))}")
    if filters.get("to_date"):
        pe_conditions.append(f"pe.posting_date <= {frappe.db.escape(str(filters.get('to_date')))}")
    
    if filters.get("customer_group"):
        pe_conditions.append(f"EXISTS (SELECT 1 FROM `tabCustomer` cust WHERE cust.name = pe.party AND cust.customer_group = {frappe.db.escape(str(filters.get('customer_group')))})")
    
    pe_where = " AND ".join(pe_conditions)
    
    # Calculate On Account Total (Sum of paid_amount where NO Sales Invoice reference exists)
    on_account_query = f"""
        SELECT SUM(pe.paid_amount) 
        FROM `tabPayment Entry` pe 
        WHERE {pe_where}
          AND NOT EXISTS (
              SELECT 1 
              FROM `tabPayment Entry Reference` per 
              WHERE per.parent = pe.name 
                AND per.reference_doctype = 'Sales Invoice'
          )
    """
    on_account_total = flt(frappe.db.sql(on_account_query)[0][0])

    # 1. Fetch KPI totals accurately (Use pro-rata item allocation to support item-level filtering without double-counting)
    kpi_query = f"""
        SELECT 
            SUM(
                (sii.base_amount / CASE WHEN si.base_net_total = 0 THEN 1 ELSE si.base_net_total END) * per.allocated_amount
            ) as allocated_total,
            SUM(
                CASE WHEN si.is_export = 1 THEN 
                    (sii.base_amount / CASE WHEN si.base_net_total = 0 THEN 1 ELSE si.base_net_total END) * per.allocated_amount 
                ELSE 0 END
            ) as export_total,
            SUM(
                CASE WHEN si.is_domestic = 1 THEN 
                    (sii.base_amount / CASE WHEN si.base_net_total = 0 THEN 1 ELSE si.base_net_total END) * per.allocated_amount 
                ELSE 0 END
            ) as domestic_total
        FROM `tabPayment Entry` pe
        JOIN `tabPayment Entry Reference` per ON per.parent = pe.name
        JOIN `tabSales Invoice` si ON si.name = per.reference_name
        JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
        WHERE {where_clause}
    """
    kpi_res = frappe.db.sql(kpi_query, as_dict=True)[0]
    allocated_total = flt(kpi_res.allocated_total)
    export_collection = flt(kpi_res.export_total)
    domestic_collection = flt(kpi_res.domestic_total)

    # 2. Fetch Detailed List (with items for breakdown)
    query = f"""
        SELECT 
            pe.name as payment_entry,
            pe.posting_date,
            pe.party as customer,
            per.reference_name as name,
            per.allocated_amount,
            si.is_export, 
            si.is_domestic,
            si.status,
            sii.item_code,
            sii.item_name,
            sii.base_amount as item_amount,
            si.base_net_total,
            si.due_date,
            DATEDIFF(pe.posting_date, si.due_date) as due_days
        FROM `tabPayment Entry` pe
        JOIN `tabPayment Entry Reference` per ON per.parent = pe.name
        JOIN `tabSales Invoice` si ON si.name = per.reference_name
        JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
        WHERE {where_clause}
        ORDER BY pe.posting_date DESC, pe.name DESC
    """
    data = frappe.db.sql(query, as_dict=True)
    
    # Fetch Sales Person mapping
    inv_names = list(set([d.name for d in data]))
    sales_map = {}
    if inv_names:
        sales_team = frappe.get_all("Sales Team", 
            filters={"parent": ("in", inv_names), "parenttype": "Sales Invoice"},
            fields=["parent", "sales_person"]
        )
        for st in sales_team:
            if st.parent not in sales_map: sales_map[st.parent] = []
            sales_map[st.parent].append(st.sales_person)
    
    # Process data
    final_data = []
    for d in data:
        d.sales_person = ", ".join(sales_map.get(d.name, []))
        d.item = f"{d.item_code} {d.item_name}" if d.item_code else (d.item_name or "")
        
        # Pro-rata allocation for items
        if flt(d.base_net_total) > 0:
            d.allocated_amount = (flt(d.item_amount) / flt(d.base_net_total)) * flt(d.allocated_amount)
        else:
            d.allocated_amount = flt(d.item_amount) if flt(d.item_amount) > 0 else 0
        final_data.append(d)

    # 3. Add "On Account" payments to the detailed list for reconciliation
    # Hide unallocated payments if filtering by Sales Person or Item (since they can't be linked)
    if on_account_total > 0 and not any([filters.get("dom_exp"), filters.get("sales_person"), filters.get("item_group"), filters.get("item_code")]):
        oa_query = f"""
            SELECT 
                pe.name as payment_entry,
                pe.posting_date,
                pe.party as customer,
                'On Account' as name,
                pe.paid_amount as allocated_amount,
                0 as is_export,
                1 as is_domestic,
                'Unallocated' as status,
                '' as item_code,
                'Unallocated Payment' as item_name,
                pe.paid_amount as item_amount,
                NULL as due_date,
                0 as due_days
            FROM `tabPayment Entry` pe 
            WHERE {pe_where}
              AND NOT EXISTS (
                  SELECT 1 FROM `tabPayment Entry Reference` per 
                  WHERE per.parent = pe.name AND per.reference_doctype = 'Sales Invoice'
              )
        """
        oa_data = frappe.db.sql(oa_query, as_dict=True)
        for oa in oa_data:
            oa.item = oa.item_name
            oa.sales_person = "-"
            final_data.append(oa)

    # Calculate Total Paid Amount (including On Account and partially unallocated)
    # This serves as our "Source of Truth" for Total Collection
    total_paid_query = f"""
        SELECT SUM(pe.paid_amount) 
        FROM `tabPayment Entry` pe 
        WHERE {pe_where}
    """
    total_collection = flt(frappe.db.sql(total_paid_query)[0][0])

    # Final KPI Consolidations based on filters
    if filters.get("sales_person") or filters.get("item_code") or filters.get("item_group"):
        # Item or Sales Person filter: Everything must be allocated to an invoice matching the filter
        total_collection = allocated_total
        export_collection = flt(kpi_res.export_total)
        domestic_collection = flt(kpi_res.domestic_total)
    elif filters.get("dom_exp") == "Export":
        # Export filter: Only specifically allocated export amounts, no on-account
        total_collection = export_collection
        domestic_collection = 0
    elif filters.get("dom_exp") == "Domestic":
        # Domestic filter: Domestic allocated + all on-account payments
        domestic_collection = flt(kpi_res.domestic_total) + on_account_total
        total_collection = domestic_collection
        export_collection = 0
    else:
        # "All" view: Source of Truth is total_collection from all payments
        # Export is specific, Domestic is the remainder (including all unallocated/on-account)
        export_collection = flt(kpi_res.export_total)
        domestic_collection = total_collection - export_collection

    # --- Due in next 15 days Logic (Upcoming from today) ---
    due_conditions = [
        "si.docstatus = 1",
        "si.status NOT IN ('Paid', 'Cancelled', 'Draft')",
        "si.due_date >= CURDATE()",
        "si.due_date <= DATE_ADD(CURDATE(), INTERVAL 15 DAY)",
        "si.outstanding_amount > 0.01"
    ]
    if filters.get("customer"): due_conditions.append(f"si.customer = {frappe.db.escape(str(filters.get('customer')))}")
    if filters.get("dom_exp"):
        if filters.get("dom_exp") == "Domestic":
            due_conditions.append("si.is_domestic = 1")
        elif filters.get("dom_exp") == "Export":
            due_conditions.append("si.is_export = 1")
    if filters.get("sales_person"):
        due_conditions.append(f"""EXISTS (
            SELECT 1 FROM `tabSales Team` st 
            WHERE st.parent = si.name 
              AND st.parenttype = 'Sales Invoice' 
              AND st.sales_person = {frappe.db.escape(str(filters.get('sales_person')))}
        )""")
    
    if filters.get("item_group") or filters.get("item_code"):
        item_cond = []
        if filters.get("item_group"): item_cond.append(f"sii.item_group = {frappe.db.escape(str(filters.get('item_group')))}")
        if filters.get("item_code"): item_cond.append(f"sii.item_code = {frappe.db.escape(str(filters.get('item_code')))}")
        due_conditions.append(f"""EXISTS (
            SELECT 1 FROM `tabSales Invoice Item` sii 
            WHERE sii.parent = si.name 
              AND {" AND ".join(item_cond)}
        )""")
        
    if filters.get("customer_group"):
        due_conditions.append(f"si.customer_group = {frappe.db.escape(str(filters.get('customer_group')))}")
    
    due_where = " AND ".join(due_conditions)
    
    due_summary_query = f"SELECT SUM(si.outstanding_amount) FROM `tabSales Invoice` si WHERE {due_where}"
    due_amount = flt(frappe.db.sql(due_summary_query)[0][0])
    
    due_list_query = f"""
        SELECT 
            si.name, 
            si.customer, 
            si.posting_date, 
            si.due_date, 
            si.outstanding_amount, 
            si.base_net_total,
            DATEDIFF(si.due_date, CURDATE()) as due_days
        FROM `tabSales Invoice` si 
        WHERE {due_where} 
        ORDER BY si.due_date ASC
    """
    due_results = frappe.db.sql(due_list_query, as_dict=True)

    summary = [
        {"label": _("TOTAL Collection"), "value": total_collection, "indicator": "Blue", "on_account": on_account_total},
        {"label": _("Export Collection"), "value": export_collection, "indicator": "Green"},
        {"label": _("Domestic Collection"), "value": domestic_collection, "indicator": "Orange"},
        {"label": _("Due in 15 Days"), "value": due_amount, "indicator": "Red"}
    ]
    
    # Pie Chart Data
    chart = {
        "title": _("Collection Breakdown (Export vs Domestic)"),
        "data": {
            "labels": [_("Export"), _("Domestic")],
            "datasets": [
                {
                    "name": _("Collection"),
                    "values": [export_collection, domestic_collection]
                }
            ]
        },
        "type": "donut",
        "colors": ["#10b981", "#f59e0b"]
    }
    
    return {
        "summary": summary,
        "chart": chart,
        "results": final_data,
        "due_results": due_results
    }

@frappe.whitelist()
def export_to_excel(filters=None, export_type="all"):
    dashboard_data = get_dashboard_data(filters)
    results = dashboard_data.get("results")
    due_results = dashboard_data.get("due_results")
    summary = dashboard_data.get("summary")
    
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
        
        colors = {"blue": "3b82f6", "green": "10b981", "orange": "f59e0b", "red": "ef4444"}
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
        
        headers = ["S.No.", "Payment ID", "Invoice ID", "Date", "Due Date", "Due Days", "Customer", "Item", "Sales Person", "Amount (M)", "Type", "Status"]
        for idx, h in enumerate(headers, start=1):
            cell = ws_list.cell(row=row_idx, column=idx, value=h)
            cell.font, cell.fill, cell.alignment, cell.border = header_font, header_fill, Alignment(horizontal="center"), table_border
        row_idx += 1
        
        for r_idx, row in enumerate(results):
            row_f = zebra_fill if r_idx % 2 != 0 else None
            
            cells = [
                ws_list.cell(row=row_idx, column=1, value=r_idx + 1),
                ws_list.cell(row=row_idx, column=2, value=row['payment_entry']),
                ws_list.cell(row=row_idx, column=3, value=row['name']),
                ws_list.cell(row=row_idx, column=4, value=row['posting_date']),
                ws_list.cell(row=row_idx, column=5, value=row['due_date']),
                ws_list.cell(row=row_idx, column=6, value=row['due_days']),
                ws_list.cell(row=row_idx, column=7, value=row['customer']),
                ws_list.cell(row=row_idx, column=8, value=row['item']),
                ws_list.cell(row=row_idx, column=9, value=row['sales_person']),
                ws_list.cell(row=row_idx, column=10, value=flt(row['allocated_amount']) / 1000000),
                ws_list.cell(row=row_idx, column=11, value="Export" if row['is_export'] else "Domestic"),
                ws_list.cell(row=row_idx, column=12, value=row['status'])
            ]
            
            for c_idx, c in enumerate(cells, start=1):
                c.border = table_border
                if row_f: c.fill = row_f
                if c_idx == 10: # Amount
                    c.number_format = num_format
                    c.alignment = Alignment(horizontal="right")
                elif c_idx in [4, 5]: # Date Columns
                    c.number_format = 'yyyy-mm-dd'
                elif c_idx == 6: # Due Days
                    c.alignment = Alignment(horizontal="center")
            row_idx += 1
    
        total_amt = sum(flt(r['allocated_amount']) for r in results) / 1000000
        ws_list.cell(row=row_idx, column=1, value="Grand Total").font = header_font
        ws_list.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=9)
        for c in range(1, 13):
            ws_list.cell(row=row_idx, column=c).fill = header_fill
            ws_list.cell(row=row_idx, column=c).border = table_border
        total_cell = ws_list.cell(row=row_idx, column=10, value=total_amt)
        total_cell.font, total_cell.number_format, total_cell.alignment = header_font, num_format, Alignment(horizontal="right")

    if export_type in ["all", "due"]:
        ws_due = wb.active if export_type == "due" else wb.create_sheet("Upcoming Payments")
        ws_due.title = "Upcoming Payments Due"
        row_idx = 1
        ws_due.cell(row=row_idx, column=1, value="Payment Due in Next 15 Days (Million INR)").font = section_font
        row_idx += 2
        
        headers = ["S.No.", "Invoice ID", "Customer", "Posting Date", "Due Date", "Due Days", "Net Total (M)", "Outstanding (M)"]
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
                ws_due.cell(row=row_idx, column=4, value=row['posting_date']),
                ws_due.cell(row=row_idx, column=5, value=row['due_date']),
                ws_due.cell(row=row_idx, column=6, value=row['due_days']),
                ws_due.cell(row=row_idx, column=7, value=flt(row['base_net_total']) / 1000000),
                ws_due.cell(row=row_idx, column=8, value=flt(row['outstanding_amount']) / 1000000)
            ]
            for c_idx, c in enumerate(cells, start=1):
                c.border = table_border
                if row_f: c.fill = row_f
                if c_idx in [7, 8]:
                    c.number_format = num_format
                    c.alignment = Alignment(horizontal="right")
            row_idx += 1
        
        # Add Total Row for Due
        total_due_net = sum(flt(r['base_net_total']) for r in due_results) / 1000000
        total_due_out = sum(flt(r['outstanding_amount']) for r in due_results) / 1000000
        ws_due.cell(row=row_idx, column=1, value="Grand Total").font = header_font
        ws_due.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=6)
        for c in range(1, 9):
            ws_due.cell(row=row_idx, column=c).fill = header_fill
            ws_due.cell(row=row_idx, column=c).border = table_border
        
        ws_due.cell(row=row_idx, column=7, value=total_due_net).font = header_font
        ws_due.cell(row=row_idx, column=7).number_format = num_format
        ws_due.cell(row=row_idx, column=7).alignment = Alignment(horizontal="right")
        ws_due.cell(row=row_idx, column=8, value=total_due_out).font = header_font
        ws_due.cell(row=row_idx, column=8).number_format = num_format
        ws_due.cell(row=row_idx, column=8).alignment = Alignment(horizontal="right")

    # Column Widths
    for ws in wb.worksheets:
        max_col = 12 if ws.title == "Detailed Collection List" else 8
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
