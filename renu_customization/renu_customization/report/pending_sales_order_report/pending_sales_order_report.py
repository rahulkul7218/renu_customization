# import frappe
# from frappe import _

# def execute(filters=None):
#     columns = get_columns()
#     data = get_data(filters)
#     return columns, data


# def get_columns():
#     return [
#         _("SO No") + ":Link/Sales Order:150",
#         _("SO Date") + ":Date:120",
#         _("Sr.No.") + ":Int:70",
#         _("Customer PO No.") + ":Data:170",
#         _("Customer PO Date") + ":Date:170",
#         _("Customer Code") + ":Link/Customer:150",
#         _("Customer Name") + ":Data:180",
#         _("Item Code") + ":Link/Item:120",
#         _("Item Name") + ":Data:180",
#         _("Description") + ":Data:250",
#         _("Order Quantity") + ":Float:120",
#         _("Delivered Qty") + ":Float:120",
#         _("Open Qty") + ":Float:120",
#         _("Item Rate") + ":Float:120",
#         _("Currency") + ":Link/Currency:100",
#         _("Exchange Rate") + ":Float:150",
#         _("Total Net Amount (INR)") + ":Float:180",
#         _("Delivered Net Total") + ":Float:200",
#         _("Balance Net Total") + ":Float:180",
#         _("Delivery Date") + ":Date:120",
#         _("Stock") + ":Float:150",
#         _("Business Region Name") + ":Data:190",
#         _("Sales Person") + ":Link/Sales Person:150",
#         _("Domestic/Export") + ":Data:150"
#     ]


# def get_conditions(filters):
#     conditions = ""
#     if filters.get("creation_no"):
#         conditions += " AND so.name = %(creation_no)s"
#     if filters.get("customer_name"):
#         filters["customer_name"] = f"%{filters['customer_name']}%"
#         conditions += " AND so.customer_name LIKE %(customer_name)s"
#     if filters.get("item_code"):
#         conditions += " AND soi.item_code = %(item_code)s"
#     if filters.get("currency"):
#         conditions += " AND so.currency = %(currency)s"
#     if filters.get("from_date"):
#         conditions += " AND DATE(so.creation) >= %(from_date)s"
#     if filters.get("to_date"):
#         conditions += " AND DATE(so.creation) <= %(to_date)s"
#     return conditions


# def get_data(filters):
#     conditions = get_conditions(filters)

#     sql = f"""
#         SELECT
#             so.name AS creation_no,
#             DATE(so.creation) AS creation_date,
#             ROW_NUMBER() OVER (PARTITION BY so.name ORDER BY soi.idx) AS sr_no,
#             so.po_no AS po_no,
#             so.po_date AS po_date,
#             c.customer_code AS customer_code,
#             so.customer_name AS customer_name,
#             soi.item_code AS item_code,
#             soi.item_name AS item_name,
#             # soi.description AS description,
#             REGEXP_REPLACE(soi.description, '<[^>]*>', '') AS description,
#             soi.qty AS po_qty,
#             soi.delivered_qty AS delivered_qty,
#             (soi.qty - soi.delivered_qty) AS open_qty,
#             soi.rate AS item_rate,
#             so.currency AS currency,
#             so.conversion_rate AS exchange_rate,
#             soi.base_amount AS total_net_amount_inr,
#             (soi.delivered_qty * soi.base_rate) AS delivered_net_total_inr,
#             (IFNULL(soi.base_amount,0) - (IFNULL(soi.delivered_qty,0) * IFNULL(soi.base_rate,0))) AS balance_net_total_inr,
#             so.delivery_date AS delivery_date,
#             (SELECT IFNULL(SUM(b.actual_qty), 0)
#              FROM `tabBin` b
#              WHERE b.item_code = soi.item_code
#             ) AS stock,
#             c.business_region_name AS business_region,
#             st.sales_person AS sales_person,
#             CASE WHEN IFNULL(a.country,'')='India' THEN 'Domestic' ELSE 'Export' END AS domestic_export
#         FROM `tabSales Order` so
#         INNER JOIN `tabSales Order Item` soi ON soi.parent = so.name
#         LEFT JOIN `tabItem` i ON i.name = soi.item_code
#         LEFT JOIN `tabSales Team` st ON st.parent = so.name
#         LEFT JOIN `tabCustomer` c ON so.customer = c.name
#         LEFT JOIN `tabAddress` a ON a.name = so.customer_address
#         LEFT JOIN (
#             SELECT sii.so_detail, sii.parent, MAX(si.modified) AS latest_invoice_modified
#             FROM `tabSales Invoice Item` sii
#             JOIN `tabSales Invoice` si ON si.name = sii.parent
#             GROUP BY sii.so_detail
#         ) latest_sii ON latest_sii.so_detail = soi.name
#         LEFT JOIN `tabSales Invoice` si ON si.name = latest_sii.parent
#         WHERE (so.status IS NULL OR so.status NOT IN ('Completed', 'To Bill'))
#         AND i.is_stock_item = 1
#         # AND (so.amended_from IS NULL OR so.name = (
#         #     SELECT MAX(name)
#         #     FROM `tabSales Order`
#         #     WHERE name LIKE CONCAT(SUBSTRING_INDEX(so.name, '-', 1), '%%')
#         # ))

#          AND so.name = (
#             SELECT MAX(name)
#             FROM `tabSales Order`
#             WHERE name LIKE CONCAT(SUBSTRING_INDEX(so.name, '-', 1), '%%')
#         )
#         {conditions}
#         GROUP BY soi.name
#         ORDER BY so.modified DESC, so.name ASC
#     """

#     return frappe.db.sql(sql, filters, as_list=True)

# import base64
# from io import BytesIO
# from frappe.utils import flt
# import openpyxl
# from openpyxl.styles import Alignment, Font, PatternFill
# from openpyxl.utils import get_column_letter

# @frappe.whitelist()
# def download_xlsx(filters=None):

#     if isinstance(filters, str):
#         filters = frappe.parse_json(filters)

#     columns, data = execute(filters)

#     wb = openpyxl.Workbook()
#     ws = wb.active
#     ws.title = "Pending Sales Order Report"

#     ws["A1"].value = "Report Name"
#     ws["A1"].font = Font(bold=True)
#     ws["B1"].value = "Pending Sales Order Report"

#     ws["A2"].value = "Generated On"
#     ws["A2"].font = Font(bold=True)
#     ws["B2"].value = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")

#     row_idx = 4

#     # Column headers
#     for i, col in enumerate(columns, start=1):
#         label = col.split(":")[0]
#         c = ws.cell(row=row_idx, column=i, value=label)
#         c.font = Font(bold=True)
#         c.alignment = Alignment(horizontal="center")

#     row_idx += 1

#     # Numeric columns (index from your SQL result)
#     # numeric_index_map = {
# 	#  2: True,  # SR NO
#     #     11: True,  # po_qty
#     #     12: True,  # delivered_qty
#     #     13: True,  # open_qty
#     #     14: True,  # item_rate
#     #     16: True,  # exchange_rate
#     #     17: True,  # total_net_amount_inr
#     #     18: True,  # delivered_net_total_inr
#     #     19: True,  # balance_net_total_inr
#     #     21: True   # stock
#     # }
#     numeric_index_map = {
#          2: True,  # SR.NO
#         10: True,  # po_qty
#         11: True,  # delivered_qty
#         12: True,  # open_qty
#         13: True,  # item_rate
#         15: True,  # exchange_rate
#         16: True,  # po_total
#         17: True,  # delivered_net_total_inr
#         18: True,  # balance_net_total_inr
#         20: True   # stock
#     }

#     # Data rows
#     for row in data:
#         for col_idx, value in enumerate(row, start=1):
#             cell = ws.cell(row=row_idx, column=col_idx)
#             if (col_idx - 1) in numeric_index_map and value not in (None, ""):
#                 try:
#                     cell.value = float(value)
#                     cell.number_format = "#,##0.00"
#                 except:
#                     cell.value = value
#                 cell.alignment = Alignment(horizontal="right")
#             else:
#                 cell.value = value
#                 cell.alignment = Alignment(horizontal="left")
#         row_idx += 1

#     # --------------------- ADD TOTAL ROW (WITH GRAY BACKGROUND) ---------------------
#     total_row = row_idx

#     for col_idx in range(1, len(columns) + 1):

#         cell = ws.cell(row=total_row, column=col_idx)

#         # Gray background + bold
#         cell.fill = PatternFill(start_color="D3D3D3", end_color="D3D3D3", fill_type="solid")
#         cell.font = Font(bold=True)

#         # First column → label "Total"
#         if col_idx == 1:
#             cell.value = "Total"
#             cell.alignment = Alignment(horizontal="left")
#             continue

#         # Numeric total columns only
#         field_idx = col_idx - 1
#         if field_idx in numeric_index_map:
#             try:
#                 total_val = sum([flt(r[field_idx]) for r in data])
#             except:
#                 total_val = 0

#             cell.value = total_val
#             cell.number_format = "#,##0.00"
#             cell.alignment = Alignment(horizontal="right", vertical="center")

#         else:
#             cell.value = ""
#             cell.alignment = Alignment(horizontal="left")

#     # Auto column widths
#     for i in range(1, len(columns) + 1):
#         ws.column_dimensions[get_column_letter(i)].width = 22

#     filedata = BytesIO()
#     wb.save(filedata)
#     filedata.seek(0)

#     return base64.b64encode(filedata.read()).decode()





 
import frappe
from frappe import _
 
def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data
 
 
def get_columns():
    return [
        _("SO No") + ":Link/Sales Order:150",
        _("SO Date") + ":Date:120",
        # _("Sr.No.") + ":Int:70",
        {
            "label": _("Sr.No."),
            "fieldname": "sr_no",
            "fieldtype": "Int",
            "width": 70,
            "disable_total": 1
        },
        _("Customer PO No.") + ":Data:170",
        _("Customer PO Date") + ":Date:170",
        _("Customer Code") + ":Link/Customer:150",
        _("Customer Name") + ":Data:180",
        _("Item Code") + ":Link/Item:120",
        _("Item Name") + ":Data:180",
        _("Description") + ":Data:250",
        _("Order Quantity") + ":Float:120",
        _("Delivered Qty") + ":Float:120",
        _("Open Qty") + ":Float:120",
        _("Item Rate") + ":Float:120",
        _("Currency") + ":Link/Currency:100",
        # _("Exchange Rate") + ":Float:150",
        {
            "label": "Exchange Rate",
            "fieldname": "exchange_rate",
            "fieldtype": "Float",
            "disable_total": 1
        },
        _("Total Net Amount (INR)") + ":Float:180",
        _("Delivered Net Total") + ":Float:200",
        _("Balance Net Total") + ":Float:180",
        _("Delivery Date") + ":Date:120",
        _("Stock") + ":Float:150",
        _("Business Region Name") + ":Data:190",
        _("Sales Person") + ":Link/Sales Person:150",
        _("Domestic/Export") + ":Data:150"
    ]
 
 
def get_conditions(filters):
    conditions = ""
    if filters.get("so_no"):
        conditions += " AND so.name = %(so_no)s"
    if filters.get("customer_name"):
        filters["customer_name"] = f"%{filters['customer_name']}%"
        conditions += " AND so.customer_name LIKE %(customer_name)s"
    if filters.get("item_code"):
        conditions += " AND soi.item_code = %(item_code)s"
    if filters.get("currency"):
        conditions += " AND so.currency = %(currency)s"
    if filters.get("from_date"):
        conditions += " AND so.transaction_date >= %(from_date)s"
    if filters.get("to_date"):
       conditions += " AND so.transaction_date <= %(to_date)s"
    return conditions
 
 
def get_data(filters):
    conditions = get_conditions(filters)
 
    sql = f"""
        SELECT
            so.name AS so_no,
            so.transaction_date AS so_date,
            ROW_NUMBER() OVER (PARTITION BY so.name ORDER BY soi.idx) AS sr_no,
            so.po_no AS po_no,
            so.po_date AS po_date,
            c.customer_code AS customer_code,
            so.customer_name AS customer_name,
            soi.item_code AS item_code,
            soi.item_name AS item_name,
            # soi.description AS description,
            REGEXP_REPLACE(soi.description, '<[^>]*>', '') AS description,
            soi.qty AS po_qty,
            soi.delivered_qty AS delivered_qty,
            (soi.qty - soi.delivered_qty) AS open_qty,
            soi.rate AS item_rate,
            so.currency AS currency,
            so.conversion_rate AS exchange_rate,
            soi.base_amount AS total_net_amount_inr,
            (soi.delivered_qty * soi.base_rate) AS delivered_net_total_inr,
            (IFNULL(soi.base_amount,0) - (IFNULL(soi.delivered_qty,0) * IFNULL(soi.base_rate,0))) AS balance_net_total_inr,
            so.delivery_date AS delivery_date,
            (SELECT IFNULL(SUM(b.actual_qty), 0)
             FROM `tabBin` b
             WHERE b.item_code = soi.item_code
            ) AS stock,
            c.business_region_name AS business_region,
            st.sales_person AS sales_person,
            CASE WHEN IFNULL(a.country,'')='India' THEN 'Domestic' ELSE 'Export' END AS domestic_export
        FROM `tabSales Order` so
        INNER JOIN `tabSales Order Item` soi ON soi.parent = so.name
        LEFT JOIN `tabItem` i ON i.name = soi.item_code
        LEFT JOIN `tabSales Team` st ON st.parent = so.name
        LEFT JOIN `tabCustomer` c ON so.customer = c.name
        LEFT JOIN `tabAddress` a ON a.name = so.customer_address
        LEFT JOIN (
            SELECT sii.so_detail, sii.parent, MAX(si.modified) AS latest_invoice_modified
            FROM `tabSales Invoice Item` sii
            JOIN `tabSales Invoice` si ON si.name = sii.parent
            GROUP BY sii.so_detail
        ) latest_sii ON latest_sii.so_detail = soi.name
        LEFT JOIN `tabSales Invoice` si ON si.name = latest_sii.parent
        WHERE (so.status IS NULL OR so.status NOT IN ('Completed', 'To Bill', 'Cancelled'))
        # AND i.is_stock_item = 1
        AND NOT (i.is_stock_item = 0 AND i.custom_is_freight_item = 1)
        AND (soi.qty - soi.delivered_qty) > 0
        # AND (so.amended_from IS NULL OR so.name = (
        #     SELECT MAX(name)
        #     FROM `tabSales Order`
        #     WHERE name LIKE CONCAT(SUBSTRING_INDEX(so.name, '-', 1), '%%')
        # ))
 
         AND so.name = (
            SELECT MAX(name)
            FROM `tabSales Order`
            WHERE name LIKE CONCAT(SUBSTRING_INDEX(so.name, '-', 1), '%%')
        )
        {conditions}
 
        GROUP BY soi.name
        ORDER BY so.name ASC,soi.idx ASC,so.transaction_date ASC
    """
 
    return frappe.db.sql(sql, filters, as_list=True)
 
import base64
from io import BytesIO
from frappe.utils import flt
import frappe
import json
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
 
@frappe.whitelist()
def download_xlsx(filters=None, include_filters=1):
 
    # -----------------------------
    #   PARSE FILTERS SAFELY
    # -----------------------------
    if isinstance(filters, str):
        try:
            filters = frappe.parse_json(filters)
        except Exception:
            filters = json.loads(filters)
 
    if not isinstance(filters, dict):
        filters = {}
 
    # -----------------------------
    #   GET REPORT DATA
    # -----------------------------
    columns, data = execute(filters)
 
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Pending Sales Order Report"
 
    # -----------------------------
    #   HEADER
    # -----------------------------
    ws["A1"].value = "Report Name"
    ws["A1"].font = Font(bold=True)
    ws["B1"].value = "Pending Sales Order Report"
 
    ws["A2"].value = "Generated On"
    ws["A2"].font = Font(bold=True)
    ws["B2"].value = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")
 
    ws["A3"].value = "Generated By"
    ws["A3"].font = Font(bold=True)
    full_name = frappe.db.get_value("User", frappe.session.user, "full_name")
    ws["B3"].value = full_name or frappe.session.user
 
    ws.append([])
 
    row_idx = 5
 
   
 
    # -----------------------------
    #   COLUMN HEADERS
    # -----------------------------
    for idx, col in enumerate(columns, start=1):
        # label = col.split(":")[0]
        label = col["label"] if isinstance(col, dict) else col.split(":")[0]
        c = ws.cell(row=row_idx, column=idx, value=label)
        c.font = Font(bold=True)
        c.alignment = Alignment(horizontal="center")
 
    row_idx += 1
 
    # -----------------------------
    #   NUMERIC COLUMNS MAP
    # -----------------------------
    numeric_index_map = {
        10: True,
        11: True,
        12: True,
        13: True,
        15: True,
        16: True,
        17: True,
        18: True,
        20: True
    }
 
    no_total_index_set = {2, 15}
    # -----------------------------
    #   DATA ROWS
    # -----------------------------
    for row in data:
        for col_idx, value in enumerate(row, start=1):
            cell = ws.cell(row=row_idx, column=col_idx)
 
            # field_label = columns[col_idx - 1].split(":")[0]  # Detect SR.NO
            col_def = columns[col_idx - 1]
            field_label = col_def["label"] if isinstance(col_def, dict) else col_def.split(":")[0]
 
            fieldname = field_label.lower().replace(" ", "_")
 
            # ---- SR.NO FIX ----
            if fieldname in ("sr.no.", "sr_no", "sr_no.", "sr.no"):
                cell.value = int(value) if value else 0
                cell.number_format = "0"
                cell.alignment = Alignment(horizontal="center")
                continue
 
            # ---- Numeric formatting ----
            if (col_idx - 1) in numeric_index_map and value not in (None, ""):
                try:
                    cell.value = float(value)
                    cell.number_format = "#,##0.00"
                except:
                    cell.value = value
                cell.alignment = Alignment(horizontal="right")
            else:
                cell.value = value
                cell.alignment = Alignment(horizontal="left")
 
        row_idx += 1
 
    # -----------------------------
    #   TOTAL ROW
    # -----------------------------
     # If include_filters = 0 → fetch all data
    if include_filters:
        # Use filters
        columns, data = execute(filters)
    else:
    # Fetch all data (no filters)
        columns, data = execute({})
 
 
    total_row = row_idx
 
    for col_idx in range(1, len(columns) + 1):
        cell = ws.cell(row=total_row, column=col_idx)
 
        cell.fill = PatternFill(start_color="D3D3D3", fill_type="solid")
        cell.font = Font(bold=True)
 
        if col_idx == 1:
            cell.value = "Total"
            cell.alignment = Alignment(horizontal="left")
            continue
 
        field_idx = col_idx - 1
 
        # if field_idx in numeric_index_map:
        if field_idx in numeric_index_map and field_idx not in no_total_index_set:
            try:
                total_val = sum(flt(r[field_idx]) for r in data)
            except:
                total_val = 0
 
            cell.value = total_val
            cell.number_format = "#,##0.00"
            cell.alignment = Alignment(horizontal="right")
        else:
            cell.value = ""
 
    # -----------------------------
    #   AUTO COLUMN WIDTH
    # -----------------------------
    for i in range(1, len(columns) + 1):
        ws.column_dimensions[get_column_letter(i)].width = 22
 
    # -----------------------------
    #   OUTPUT
    # -----------------------------
    out = BytesIO()
    wb.save(out)
    out.seek(0)
 
    return base64.b64encode(out.read()).decode()
 
 