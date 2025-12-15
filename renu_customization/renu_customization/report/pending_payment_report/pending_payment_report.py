# import frappe
 
# def execute(filters=None):

#     if not filters:

#         filters = {}
 
#     conditions = ""
 
    
 
#     if filters.get("customer_name"):

#         filters["customer_name"] = f"%{filters['customer_name']}%"

#         conditions += " AND c.customer_name LIKE %(customer_name)s"
 
#     if filters.get("invoice_id"):

#         conditions += " AND si.name = %(invoice_id)s"
 
#     # Date filters

#     if filters.get("from_date") and filters.get("to_date"):

#         conditions += " AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s"

#     elif filters.get("from_date"):

#         conditions += " AND si.posting_date >= %(from_date)s"

#     elif filters.get("to_date"):

#         conditions += " AND si.posting_date <= %(to_date)s"
 
#     if filters.get("currency"):

#         conditions += " AND si.currency = %(currency)s"
 
    
 
#     query = f"""

#         SELECT

#             IFNULL(c.customer_code, '') AS customer_code,

#             c.customer_name AS customer_name,

#             si.name AS invoice_id,

#             si.posting_date AS invoice_date,
 
#             si.grand_total AS invoice_value,

#             si.outstanding_amount * si.conversion_rate AS outstanding,
             
 
#             si.currency AS currency,

#             si.conversion_rate AS exchange_rate,

#             si.base_grand_total AS inr_value_of_foreign,
 
#             si.due_date AS payment_due_date,

#             DATEDIFF(CURDATE(), si.posting_date) AS invoice_age,

#             si.po_no AS po_no,

#             c.business_region_name AS business_region_name,
 
#             (

#                 SELECT GROUP_CONCAT(st.sales_person SEPARATOR ', ')

#                 FROM `tabSales Team` st

#                 WHERE st.parent = si.name

#             ) AS sales_person,
 
#             CASE

#                 WHEN IFNULL(a.country, '') = 'India' THEN 'Domestic'

#                 ELSE 'Export'

#             END AS domestic_export
 
#         FROM `tabSales Invoice` si

#         LEFT JOIN `tabCustomer` c ON c.name = si.customer

#         LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name

#         LEFT JOIN `tabItem` i ON i.name = sii.item_code

#         LEFT JOIN `tabCurrency` cu ON cu.name = si.currency

#         LEFT JOIN `tabAddress` a ON a.name = si.customer_address
 
#         WHERE si.docstatus = 1 {conditions}
 
#         GROUP BY si.name
#         ORDER BY si.posting_date ASC   --  ✅ CHANGED HERE (ASC)

#     """
 
#     data = frappe.db.sql(query, filters, as_dict=True)
 
#     columns = [

#         {"label": "Customer Code", "fieldname": "customer_code", "fieldtype": "Data", "width": 100},

#         {"label": "Customer Name", "fieldname": "customer_name", "fieldtype": "Data", "width": 200},

#         {"label": "Invoice ID", "fieldname": "invoice_id", "fieldtype": "Link", "options": "Sales Invoice", "width": 150},

#         {"label": "Invoice Date", "fieldname": "invoice_date", "fieldtype": "Date", "width": 140},
 
#         {"label": "Invoice Value", "fieldname": "invoice_value", "fieldtype": "Float", "width": 150},

#         {"label": "Outstanding Amount (INR)", "fieldname": "outstanding", "fieldtype": "Float", "width": 170},
 
#         {"label": "Currency", "fieldname": "currency", "fieldtype": "Data", "width": 140},

#         {"label": "Exchange Rate", "fieldname": "exchange_rate", "fieldtype": "Data", "width": 140},

#         {"label": "INR Value Of Foreign", "fieldname": "inr_value_of_foreign", "fieldtype": "Float", "width": 170},
 
#         {"label": "Payment Due Date", "fieldname": "payment_due_date", "fieldtype": "Date", "width": 160},

#         {"label": "Invoice Age", "fieldname": "invoice_age", "fieldtype": "Int", "width": 120},

#         {"label": "Customer's PO No.", "fieldname": "po_no", "fieldtype": "Data", "width": 160},
 
#         {"label": "Business Region Name", "fieldname": "business_region_name", "fieldtype": "Data", "width": 140},

#         {"label": "Sales Person", "fieldname": "sales_person", "fieldtype": "Data", "width": 200},

#         {"label": "Domestic/Export", "fieldname": "domestic_export", "fieldtype": "Data", "width": 150}

#     ]
 
#     return columns, data


# @frappe.whitelist()
# def download_xlsx(filters=None):

#     import base64
#     from io import BytesIO
#     import openpyxl
#     from openpyxl.styles import Alignment, Font, PatternFill
#     from openpyxl.utils import get_column_letter
#     from frappe.utils import flt

#     if isinstance(filters, str):
#         filters = frappe.parse_json(filters)

#     columns, data = execute(filters)

#     wb = openpyxl.Workbook()
#     ws = wb.active
#     ws.title = "Pending Payment Report"

#     # ---------------- HEADER ----------------
#     ws["A1"].value = "Report Name"
#     ws["A1"].font = Font(bold=True)
#     ws["B1"].value = "Pending Payment Report"

#     ws["A2"].value = "Generated On"
#     ws["A2"].font = Font(bold=True)
#     ws["B2"].value = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")

#     row_idx = 4

#     # ---------------- COLUMN HEADERS ----------------
#     for idx, col in enumerate(columns, start=1):
#         c = ws.cell(row=row_idx, column=idx, value=col["label"])
#         c.font = Font(bold=True)
#         c.alignment = Alignment(horizontal="center")

#     row_idx += 1

#     # Identify numeric fields
#     numeric_fields = {
#         "invoice_value",
#         "outstanding",
#         "exchange_rate",
#         "inr_value_of_foreign",
#         "invoice_age"
#     }

#     # ---------------- DATA ROWS ----------------
#     for row in data:
#         col_idx = 1
#         for col in columns:
#             field = col["fieldname"]
#             value = row.get(field)

#             cell = ws.cell(row=row_idx, column=col_idx)

#             if field in numeric_fields and value not in (None, ""):
#                 try:
#                     cell.value = flt(value)
#                 except:
#                     cell.value = value

#                 if field == "exchange_rate":
#                     cell.number_format = "#,##0.0000"
#                 elif field == "invoice_age":
#                     cell.number_format = "0"
#                 else:
#                     cell.number_format = "#,##0.00"

#                 cell.alignment = Alignment(horizontal="right")
#             else:
#                 cell.value = value
#                 cell.alignment = Alignment(horizontal="left")

#             col_idx += 1

#         row_idx += 1

#     # ---------------- TOTAL ROW ----------------
#     total_row = row_idx

#     for idx, col in enumerate(columns, start=1):
#         field = col["fieldname"]
#         cell = ws.cell(row=total_row, column=idx)

#         # Gray background
#         cell.fill = PatternFill(
#             start_color="D3D3D3",
#             end_color="D3D3D3",
#             fill_type="solid"
#         )
#         cell.font = Font(bold=True)

#         if idx == 1:
#             cell.value = "Total"
#             cell.alignment = Alignment(horizontal="left")
#             continue

#         if field in numeric_fields:
#             total_val = sum([flt(d.get(field)) for d in data])
#             cell.value = total_val

#             if field == "exchange_rate":
#                 cell.number_format = "#,##0.0000"
#             elif field == "invoice_age":
#                 cell.number_format = "0"
#             else:
#                 cell.number_format = "#,##0.00"

#             cell.alignment = Alignment(horizontal="right")
#         else:
#             cell.value = ""
#             cell.alignment = Alignment(horizontal="left")

#     # ---------------- COLUMN WIDTH ----------------
#     for i in range(1, len(columns) + 1):
#         ws.column_dimensions[get_column_letter(i)].width = 22

#     # ---------------- EXPORT ----------------
#     output = BytesIO()
#     wb.save(output)
#     output.seek(0)

#     return base64.b64encode(output.read()).decode()





import frappe
 
def execute(filters=None):
 
    if not filters:
 
        filters = {}
 
    conditions = ""
 
   
 
    if filters.get("customer_name"):
 
        filters["customer_name"] = f"%{filters['customer_name']}%"
 
        conditions += " AND c.customer_name LIKE %(customer_name)s"
 
    if filters.get("invoice_id"):
 
        conditions += " AND si.name = %(invoice_id)s"
 
    # Date filters
 
    if filters.get("from_date") and filters.get("to_date"):
 
        conditions += " AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s"
 
    elif filters.get("from_date"):
 
        conditions += " AND si.posting_date >= %(from_date)s"
 
    elif filters.get("to_date"):
 
        conditions += " AND si.posting_date <= %(to_date)s"
 
    if filters.get("currency"):
 
        conditions += " AND si.currency = %(currency)s"
 
   
 
    query = f"""
 
        SELECT
 
            IFNULL(c.customer_code, '') AS customer_code,
 
            c.customer_name AS customer_name,
 
            si.name AS invoice_id,
 
            si.posting_date AS invoice_date,
 
            si.grand_total AS invoice_value,
 
            si.outstanding_amount * si.conversion_rate AS outstanding,
             
 
            si.currency AS currency,
 
            si.conversion_rate AS exchange_rate,
 
            si.base_grand_total AS inr_value_of_foreign,
 
            si.due_date AS payment_due_date,
 
            DATEDIFF(CURDATE(), si.posting_date) AS invoice_age,
 
            si.po_no AS po_no,
 
            c.business_region_name AS business_region_name,
 
            (
 
                SELECT GROUP_CONCAT(st.sales_person SEPARATOR ', ')
 
                FROM `tabSales Team` st
 
                WHERE st.parent = si.name
 
            ) AS sales_person,
 
            CASE
 
                WHEN IFNULL(a.country, '') = 'India' THEN 'Domestic'
 
                ELSE 'Export'
 
            END AS domestic_export
 
        FROM `tabSales Invoice` si
 
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
 
        LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
 
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
 
        LEFT JOIN `tabCurrency` cu ON cu.name = si.currency
 
        LEFT JOIN `tabAddress` a ON a.name = si.customer_address
 
        WHERE si.docstatus = 1 AND si.outstanding_amount > 0
        {conditions}
 
        GROUP BY si.name
        ORDER BY si.posting_date ASC   --  CHANGED HERE (ASC)
 
    """
 
    data = frappe.db.sql(query, filters, as_dict=True)
 
    columns = [
 
        {"label": "Customer Code", "fieldname": "customer_code", "fieldtype": "Data", "width": 140},
 
        {"label": "Customer Name", "fieldname": "customer_name", "fieldtype": "Data", "width": 200},
 
        {"label": "Invoice ID", "fieldname": "invoice_id", "fieldtype": "Link", "options": "Sales Invoice", "width": 150},
 
        {"label": "Invoice Date", "fieldname": "invoice_date", "fieldtype": "Date", "width": 140},
 
        {"label": "Invoice Value", "fieldname": "invoice_value", "fieldtype": "Float", "width": 150},
 
        {"label": "Outstanding Amount (INR)", "fieldname": "outstanding", "fieldtype": "Float", "width": 170},
 
        {"label": "Currency", "fieldname": "currency", "fieldtype": "Data", "width": 140},
 
        {"label": "Exchange Rate", "fieldname": "exchange_rate", "fieldtype": "Data", "width": 140,"disable_total": 1},
 
        {"label": "INR Value Of Foreign", "fieldname": "inr_value_of_foreign", "fieldtype": "Float", "width": 170},
 
        {"label": "Payment Due Date", "fieldname": "payment_due_date", "fieldtype": "Date", "width": 160},
 
        {"label": "Invoice Age", "fieldname": "invoice_age", "fieldtype": "Int", "width": 120,"disable_total": 1},
 
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
    ws.title = "Pending Payment Report"
 
    # ---------- HEADER ----------
    ws["A1"].value = "Report Name"
    ws["A1"].font = Font(bold=True)
    ws["B1"].value = "Pending Payment Report"
 
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