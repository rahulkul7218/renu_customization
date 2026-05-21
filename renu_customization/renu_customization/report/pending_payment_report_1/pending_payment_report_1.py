import frappe
from frappe.utils import flt, getdate, nowdate, date_diff
 
def execute(filters=None):
    if not filters:
        filters = {}
 
    from erpnext.accounts.report.accounts_receivable.accounts_receivable import execute as execute_ar
 
    ar_filters = frappe._dict({
        "company": filters.get("company") or frappe.db.get_single_value("Global Defaults", "default_company"),
        "report_date": filters.get("to_date") or nowdate(),
        "party_type": "Customer",
        "group_by_party": 0,
        "based_on_payment_terms": 1,
        "ageing_based_on": "Due Date",
        "show_future_payments": 0,
        "range_1": 30,
        "range_2": 60,
        "range_3": 90,
        "range_4": 120
    })
 
    ar_columns, ar_data, *rest = execute_ar(ar_filters)
 
    if not ar_data:
        ar_data = []
 
    # Filter out total/summary rows and zero outstanding
    filtered_ar_data = []
    for row in ar_data:
        if not row.get("party") or row.get("party") in ["Total", "total"]:
            continue
        outstanding = flt(row.get("outstanding_amount") or row.get("outstanding") or 0)
        if abs(outstanding) < 0.01:
            continue
        filtered_ar_data.append(row)
    ar_data = filtered_ar_data
 
    # Apply manual filters from pending_payment_report
 
    if filters.get("invoice_id"):
        ar_data = [row for row in ar_data if row.get("voucher_no") == filters.get("invoice_id")]

    if filters.get("customer_name"):
        ar_data = [row for row in ar_data if row.get("party") == filters.get("customer_name")]
 
    if filters.get("from_date"):
        from_date = getdate(filters.get("from_date"))
        ar_data = [row for row in ar_data if row.get("posting_date") and getdate(row.get("posting_date")) >= from_date]
 
    if filters.get("to_date"):
        to_date = getdate(filters.get("to_date"))
        ar_data = [row for row in ar_data if row.get("posting_date") and getdate(row.get("posting_date")) <= to_date]
 
    # Gather batch details
    parties = list(set(row.get("party") for row in ar_data if row.get("party")))
 
    customer_details = {}
    if parties:
        cust_list = frappe.get_all("Customer",
            filters={"name": ["in", parties]},
            fields=["name", "customer_code", "customer_name", "business_region_name"]
        )
        for c in cust_list:
            customer_details[c.name] = c
 
    invoice_nos = []
    journal_entries = []
    payment_entries = []
 
    for row in ar_data:
        v_type = row.get("voucher_type")
        v_no = row.get("voucher_no")
        if not v_no:
            continue
        if v_type == "Sales Invoice":
            invoice_nos.append(v_no)
        elif v_type == "Journal Entry":
            journal_entries.append(v_no)
        elif v_type == "Payment Entry":
            payment_entries.append(v_no)
 
    sales_invoice_details = {}
    sales_persons = {}
    if invoice_nos:
        inv_list = frappe.db.sql("""
            SELECT
                si.name,
                si.conversion_rate,
                si.rounded_total,
                si.grand_total,
                si.base_grand_total,
                si.po_no,
                si.currency,
                CASE
                    WHEN IFNULL(a.country, '') = 'India' THEN 'Domestic'
                    ELSE 'Export'
                END AS domestic_export
            FROM `tabSales Invoice` si
            LEFT JOIN `tabAddress` a ON a.name = si.customer_address
            WHERE si.name IN %(invoice_nos)s
        """, {"invoice_nos": invoice_nos}, as_dict=True)
        for inv in inv_list:
            sales_invoice_details[inv.name] = inv
 
        sp_list = frappe.get_all("Sales Team",
            filters={"parent": ["in", invoice_nos], "parenttype": "Sales Invoice"},
            fields=["parent", "sales_person"]
        )
        for sp in sp_list:
            if sp.parent not in sales_persons:
                sales_persons[sp.parent] = []
            sales_persons[sp.parent].append(sp.sales_person)
 
    journal_entry_details = {}
    if journal_entries and parties:
        je_list = frappe.db.sql("""
            SELECT
                parent AS name,
                exchange_rate,
                account_currency AS currency,
                (debit_in_account_currency + credit_in_account_currency) AS invoice_value,
                (debit + credit) AS inr_value_of_foreign,
                bill_no AS po_no
            FROM `tabJournal Entry Account`
            WHERE parent IN %(journal_entries)s AND party IN %(parties)s
        """, {"journal_entries": journal_entries, "parties": parties}, as_dict=True)
        for je in je_list:
            journal_entry_details[je.name] = je
 
    payment_entry_details = {}
    if payment_entries:
        pe_list = frappe.db.sql("""
            SELECT
                name,
                payment_type,
                source_exchange_rate,
                target_exchange_rate,
                paid_from_account_currency,
                paid_to_account_currency,
                received_amount,
                paid_amount,
                base_received_amount,
                base_paid_amount
            FROM `tabPayment Entry`
            WHERE name IN %(payment_entries)s
        """, {"payment_entries": payment_entries}, as_dict=True)
        for pe in pe_list:
            payment_entry_details[pe.name] = pe
 
    customer_countries = {}
    if parties:
        address_links = frappe.get_all("Dynamic Link",
            filters={"link_doctype": "Customer", "link_name": ["in", parties], "parenttype": "Address"},
            fields=["link_name", "parent"]
        )
        address_names = [d.parent for d in address_links]
        if address_names:
            addresses = frappe.get_all("Address",
                filters={"name": ["in", address_names]},
                fields=["name", "country"]
            )
            address_country_map = {addr.name: addr.country for addr in addresses}
            for link in address_links:
                country = address_country_map.get(link.parent)
                if country:
                    customer_countries[link.link_name] = country
 
    data = []
    company_currency = frappe.get_cached_value("Company", ar_filters.company, "default_currency") or "INR"
 
    for row in ar_data:
        party = row.get("party")
        v_type = row.get("voucher_type")
        v_no = row.get("voucher_no")
 
        cust_info = customer_details.get(party) or frappe._dict()
 
        customer_code = cust_info.get("customer_code") or ""
        customer_name = cust_info.get("customer_name") or row.get("customer_name") or row.get("party_name") or party
        business_region_name = cust_info.get("business_region_name") or ""
 
        invoice_id = v_no
        invoice_date = row.get("posting_date")
        payment_due_date = row.get("due_date")
 
        invoice_age = 0
        if payment_due_date:
            invoice_age = date_diff(nowdate(), payment_due_date)
 
        outstanding = flt(row.get("outstanding") or row.get("outstanding_amount") or 0)
 
        currency = row.get("currency") or company_currency
        exchange_rate = 1.0
        invoice_value = flt(row.get("invoiced_amount_in_account_currency") or row.get("invoiced_in_account_currency") or row.get("invoiced"))
        inr_value_of_foreign = flt(row.get("invoiced"))
        po_no = row.get("po_no") or ""
        sales_person = row.get("sales_person") or ""
        domestic_export = "Domestic" if customer_countries.get(party) == "India" else "Export"
 
        if v_type == "Sales Invoice" and v_no in sales_invoice_details:
            details = sales_invoice_details[v_no]
            exchange_rate = flt(details.get("conversion_rate") or 1.0)
            invoice_value = flt(details.get("rounded_total") or details.get("grand_total") or 0)
            inr_value_of_foreign = flt(details.get("base_grand_total") or 0)
            po_no = details.get("po_no") or ""
            domestic_export = details.get("domestic_export") or "Domestic"
            currency = details.get("currency") or currency
 
            sp_list = sales_persons.get(v_no, [])
            if sp_list:
                sales_person = ", ".join(sp_list)
 
        elif v_type == "Journal Entry" and v_no in journal_entry_details:
            details = journal_entry_details[v_no]
            exchange_rate = flt(details.get("exchange_rate") or 1.0)
            currency = details.get("currency") or currency
            invoice_value = flt(details.get("invoice_value") or 0)
            inr_value_of_foreign = flt(details.get("inr_value_of_foreign") or 0)
            po_no = details.get("po_no") or ""
 
        elif v_type == "Payment Entry" and v_no in payment_entry_details:
            details = payment_entry_details[v_no]
            if details.get("payment_type") == "Receive":
                currency = details.get("paid_from_account_currency") or currency
                exchange_rate = flt(details.get("source_exchange_rate") or 1.0)
                invoice_value = 0  # Receive payments show 0 in Invoice Value
                inr_value_of_foreign = outstanding  # Show outstanding amount in INR Value of Foreign
            else:
                # Pay type: show actual amount in Invoice Value and positive value in INR Value of Foreign
                currency = details.get("paid_to_account_currency") or currency
                exchange_rate = flt(details.get("target_exchange_rate") or 1.0)
                invoice_value = flt(details.get("base_paid_amount") or details.get("received_amount") or 0)
                inr_value_of_foreign = flt(details.get("base_received_amount") or details.get("base_paid_amount") or 0)
 
        # Apply currency filter if set
        if filters.get("currency") and currency != filters.get("currency"):
            continue
 
        # The Outstanding Amount is fetched directly from the Accounts Receivable report
 
        data.append({
            "customer_code": customer_code,
            "customer_name": customer_name,
            "voucher_type": v_type,
            "invoice_id": invoice_id,
            "invoice_date": invoice_date,
            "invoice_value": invoice_value,
            "advance_payment": 0 if v_type == "Sales Invoice" else flt(flt(row.get("paid") or row.get("paid_amount") or 0) / exchange_rate if exchange_rate else 0),
            "outstanding": outstanding,
            "currency": currency,
            "exchange_rate": exchange_rate,
            "inr_value_of_foreign": inr_value_of_foreign,
            "payment_due_date": payment_due_date,
            "invoice_age": invoice_age,
            "po_no": po_no,
            "business_region_name": business_region_name,
            "sales_person": sales_person,
            "domestic_export": domestic_export
        })
 
    # Sort data by customer_name and then invoice_date ascending
    data = sorted(data, key=lambda x: (x.get("customer_name") or "", getdate(x["invoice_date"]) if x["invoice_date"] else getdate("1970-01-01")))
 
    columns = [
        {"label": "Customer Code", "fieldname": "customer_code", "fieldtype": "Data", "width": 140},
        {"label": "Customer Name", "fieldname": "customer_name", "fieldtype": "Data", "width": 200},
        {"label": "Voucher Type", "fieldname": "voucher_type", "fieldtype": "Data", "width": 120},
        {"label": "Invoice ID", "fieldname": "invoice_id", "fieldtype": "Dynamic Link", "options": "voucher_type", "width": 150},
        {"label": "Invoice Date", "fieldname": "invoice_date", "fieldtype": "Date", "width": 140},
        {"label": "Invoice Value", "fieldname": "invoice_value", "fieldtype": "Float", "width": 150},
        {"label": "Advance Payment", "fieldname": "advance_payment", "fieldtype": "Float", "width": 150},
        {"label": "Outstanding Amount (INR)", "fieldname": "outstanding", "fieldtype": "Float", "width": 170},
        {"label": "Currency", "fieldname": "currency", "fieldtype": "Data", "width": 140},
        {"label": "Exchange Rate", "fieldname": "exchange_rate", "fieldtype": "Data", "width": 140, "disable_total": 1},
        {"label": "INR Value Of Foreign", "fieldname": "inr_value_of_foreign", "fieldtype": "Float", "width": 170},
        {"label": "Payment Due Date", "fieldname": "payment_due_date", "fieldtype": "Date", "width": 160},
        {"label": "Invoice Age", "fieldname": "invoice_age", "fieldtype": "Int", "width": 120, "disable_total": 1},
        {"label": "Customer's PO No.", "fieldname": "po_no", "fieldtype": "Data", "width": 160},
        {"label": "Business Region Name", "fieldname": "business_region_name", "fieldtype": "Data", "width": 140},
        {"label": "Sales Person", "fieldname": "sales_person", "fieldtype": "Data", "width": 200},
        {"label": "Domestic/Export", "fieldname": "domestic_export", "fieldtype": "Data", "width": 150}
    ]
 
    return columns, data
 
 
# ---------------------------------------------------------------
#     EXCEL DOWNLOAD — UPDATED WITH include_filters SUPPORT
# ---------------------------------------------------------------
 
@frappe.whitelist()
def download_xlsx(filters=None):   # CHANGE #2 (added include_filters)
    import base64
    from io import BytesIO
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
    from frappe.utils import flt
 
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)
 
    columns, data = execute(filters)
 
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Pending Payment Report-New"
 
    # ---------- HEADER ----------
    ws["A1"].value = "Report Name"
    ws["A1"].font = Font(bold=True)
    ws["B1"].value = "Pending Payment Report-New"
 
    ws["A2"].value = "Generated On"
    ws["A2"].font = Font(bold=True)
    ws["B2"].value = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")
 
    ws["A3"].value = "Generated By"
    ws["A3"].font = Font(bold=True)
    full_name = frappe.db.get_value("User", frappe.session.user, "full_name")
    ws["B3"].value = full_name or frappe.session.user
 
    ws.append([])
    row_idx = 5
 
    # -----------------------------------------
    # COLUMN HEADERS
    # -----------------------------------------
 
    for idx, col in enumerate(columns, start=1):
        c = ws.cell(row=row_idx, column=idx, value=col["label"])
        c.font = Font(bold=True)
        c.alignment = Alignment(horizontal="center")
 
    row_idx += 1
 
    numeric_fields = {
        "invoice_value",
        "advance_payment",
        "outstanding",
        "exchange_rate",
        "inr_value_of_foreign",
        "invoice_age"
    }
 
# Skip total for selected numeric columns
    no_total_fields = {
         "exchange_rate",
         "invoice_age"
    }
 
    for row in data:
        col_idx = 1
 
        for col in columns:
            field = col["fieldname"]
            value = row.get(field)
 
            cell = ws.cell(row=row_idx, column=col_idx)
 
            if field in numeric_fields and value not in (None, ""):
 
                if field == "invoice_age":
                    cell.value = int(value or 0)
                    cell.number_format = "0"
                else:
                    cell.value = flt(value)
                    cell.number_format = "#,##0.00"
 
                cell.alignment = Alignment(horizontal="right")
 
            else:
                cell.value = value
                cell.alignment = Alignment(horizontal="left")
 
            col_idx += 1
 
        row_idx += 1
 
    # -----------------------------------------
    # TOTAL ROW
    # -----------------------------------------
 
    total_row = row_idx
 
    for idx, col in enumerate(columns, start=1):
        field = col["fieldname"]
        cell = ws.cell(row=total_row, column=idx)
 
        cell.fill = PatternFill(start_color="D3D3D3", fill_type="solid")
        cell.font = Font(bold=True)
 
        if idx == 1:
            cell.value = "Total"
            continue
 
        # Skip total for selected numeric columns
        if field in no_total_fields:
             cell.value = ""
             continue
 
        if field in numeric_fields:
            total_val = sum([flt(d.get(field)) for d in data])
 
            if field == "invoice_age":
                cell.value = ''  # No total for Invoice age
                cell.number_format = "0"
            else:
                cell.value = total_val
                cell.number_format = "#,##0.00"
 
            cell.alignment = Alignment(horizontal="right")
 
    # Auto column width
    for i in range(1, len(columns) + 1):
        ws.column_dimensions[get_column_letter(i)].width = 22
 
    output = BytesIO()
    wb.save(output)
    output.seek(0)
 
    return base64.b64encode(output.read()).decode()
 