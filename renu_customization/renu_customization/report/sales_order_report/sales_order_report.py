# import frappe
# from frappe import _

 
# def execute(filters=None):
#     if not filters:
#         filters = {}
 
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
#         # _("Party Item Code") + ":Link/Item:150",
#         _("Item Code") + ":Link/Item:120",
#         _("Item Name") + ":Data:180",
#         _("Description") + ":Data:250",
#         _("Order Quantity") + ":Float:130",
#         _("Delivered Qty") + ":Float:120",
#         _("Open Qty") + ":Float:120",
#         _("Item Rate") + ":Float:120",
#         _("Currency") + ":Link/Currency:100",
#         _("Exchange Rate") + ":Float:150",
#         _("Total Net Amount (INR)") + ":Float:180",
#         _("Delivered Net Total") + ":Float:180",
#         _("Balance Net Total") + ":Float:170",
#         _("Delivery Date") + ":Date:120",
#         _("Stock") + ":Float:150",
#         _("Business Region Name") + ":Data:190",
#         _("Sales Person") + ":Link/Sales Person:150",
#         _("Domestic/Export") + ":Data:150",
#     ]
 
 
# def get_conditions(filters):
#     conditions = ""
 
#     # -------- Status filter (multiple selection) --------
 
#     status = filters.get("status")
 
#     if status:
#         # From report UI it comes as a list, e.g. ["Draft", "To Deliver"]
#         if isinstance(status, str):
#             # Just in case it's a comma string
#             status_list = [s.strip() for s in status.split(",") if s.strip()]
#         else:
#             status_list = status
 
#         if status_list:
#             filters["status"] = tuple(status_list)
#             conditions += " AND so.status IN %(status)s"
 
#     # -------- Other filters --------
#     if filters.get("creation_no"):
#         conditions += " AND so.name = %(creation_no)s"
 
#     if filters.get("customer_code"):
#         conditions += " AND so.customer_code = %(customer_code)s"
 
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
#             # so.status AS status,
#             c.customer_code AS customer_code,
#             so.customer_name AS customer_name,
#             # soi.party_item_code AS party_item_code,
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
#             soi.base_amount AS po_total,
#             (soi.delivered_qty * soi.base_rate) AS delivered_net_total_inr,
#             (IFNULL(soi.base_amount, 0) - (IFNULL(soi.delivered_qty, 0) * IFNULL(soi.base_rate, 0))) AS balance_net_total_inr,
#             so.delivery_date AS delivery_date,
 
#             (
#                 SELECT IFNULL(SUM(b.actual_qty), 0)
#                 FROM `tabBin` b
#                 WHERE b.item_code = soi.item_code
#             ) AS stock,
 
#             c.business_region_name AS business_region,
#             st.sales_person AS sales_person,
 
#             CASE
#                 WHEN IFNULL(a.country, '') = 'India' THEN 'Domestic'
#                 ELSE 'Export'
#             END AS domestic_export
 
#         FROM `tabSales Order` so
#         INNER JOIN `tabSales Order Item` soi ON soi.parent = so.name
#         LEFT JOIN `tabItem` i ON i.name = soi.item_code
#         LEFT JOIN `tabSales Team` st ON st.parent = so.name
#         LEFT JOIN `tabCustomer` c ON so.customer = c.name
#         LEFT JOIN `tabAddress` a ON a.name = so.customer_address
#         LEFT JOIN `tabSales Invoice Item` sii ON sii.so_detail = soi.name
#         LEFT JOIN `tabSales Invoice` si ON si.name = sii.parent
        
#         WHERE 1 = 1
#         AND i.is_stock_item = 1
#         # AND (so.amended_from IS NULL OR so.name = (
#         #     SELECT MAX(name)
#         #     FROM `tabSales Order`
#         #     WHERE name LIKE CONCAT(SUBSTRING_INDEX(so.name, '-', 1), '%%')
#         # ))

#         AND so.name = (
#             SELECT MAX(name)
#             FROM `tabSales Order`
#             WHERE name LIKE CONCAT(SUBSTRING_INDEX(so.name, '-', 1), '%%')
#         )


#         {conditions}
 
#         GROUP BY soi.name
#         ORDER BY so.creation ASC, so.name ASC
#     """
 
#     return frappe.db.sql(sql, filters, as_list=True)



# import base64
# from io import BytesIO
# from frappe.utils import flt
# import openpyxl
# from openpyxl.styles import Alignment, Font, PatternFill
# from openpyxl.utils import get_column_letter
# from datetime import datetime

# @frappe.whitelist()
# def download_xlsx(filters=None):

#     if isinstance(filters, str):
#         filters = frappe.parse_json(filters)

#     columns, data = execute(filters)

#     wb = openpyxl.Workbook()
#     ws = wb.active
#     ws.title = "Sales Order Report"

#     current_row = 1

#     # Report Header
#     ws["A1"].value = "Report Name"
#     ws["A1"].font = Font(bold=True)
#     ws["B1"].value = "Sales Order Report"

#     ws["A2"].value = "Generated On"
#     ws["A2"].font = Font(bold=True)
#     ws["B2"].value = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")

#     current_row = 4

#     # Header Row
#     for idx, col in enumerate(columns, start=1):
#         label = col.split(":")[0]
#         cell = ws.cell(row=current_row, column=idx, value=label)
#         cell.font = Font(bold=True)
#         cell.alignment = Alignment(horizontal="center")

#     current_row += 1

#     # Numeric column index mapping
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

#     # DATA ROWS
#     for row in data:
#         for index, value in enumerate(row):

#             cell = ws.cell(row=current_row, column=index+1)

#             if index in numeric_index_map and value not in (None, ""):
#                 try:
#                     cell.value = float(value)
#                     cell.number_format = "#,##0.00"
#                 except:
#                     cell.value = value

#                 cell.alignment = Alignment(horizontal="right")

#             else:
#                 cell.value = value
#                 cell.alignment = Alignment(horizontal="left")

#         current_row += 1

#     # ----------------------------------------------------
#     #                 TOTAL ROW (WITH COLOR)
#     # ----------------------------------------------------
#     total_row = current_row

#     for col_index in range(len(columns)):
#         cell = ws.cell(row=total_row, column=col_index + 1)

#         # Gray Background + Bold
#         cell.fill = PatternFill(
#             start_color="D9D9D9",
#             end_color="D9D9D9",
#             fill_type="solid"
#         )
#         cell.font = Font(bold=True)

#         # First cell label
#         if col_index == 0:
#             cell.value = "Total"
#             cell.alignment = Alignment(horizontal="left")
#             continue

#         # Numeric totals
#         if col_index in numeric_index_map:
#             total_val = sum([flt(r[col_index]) for r in data])
#             cell.value = total_val
#             cell.number_format = "#,##0.00"
#             cell.alignment = Alignment(horizontal="right")

#         else:
#             cell.value = ""
#             cell.alignment = Alignment(horizontal="left")

#     # Set column widths
#     for col_idx in range(1, len(columns)+1):
#         ws.column_dimensions[get_column_letter(col_idx)].width = 22

#     # Prepare file
#     output = BytesIO()
#     wb.save(output)
#     output.seek(0)
#     return base64.b64encode(output.read()).decode()



 
import frappe
from frappe import _
from frappe.utils import flt
import json
import base64
from io import BytesIO
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
 
 
def execute(filters=None):
    if not filters:
        filters = {}
 
    columns = get_columns()
    data = get_data(filters)
 
    return columns, data
 
 
def get_columns():
    return [
        {"label": "name", "fieldname": "name", "fieldtype": "Data", "hidden": 1},
        _("SO No") + ":Link/Sales Order:150",
        _("SO Date") + ":Date:120",
        # _("Sr.No.") + ":Data:70",
        {
            "label": _("Sr.No."),
            "fieldname": "sr_no",
            "fieldtype": "Int",
            "width": 70,
            "disable_total": 1
        },
        _("Supplier PO No.") + ":Link/Purchase Order:150",
        _("Supplier PO Date") + ":Date:120",
        _("Customer PO No.") + ":Data:170",
        _("Customer PO Date") + ":Date:170",
        _("Customer Code") + ":Link/Customer:150",
        _("Customer Name") + ":Data:180",
        # _("Party Item Code") + ":Link/Item:150",
        _("Item Code") + ":Link/Item:120",
        _("Item Name") + ":Data:180",
        _("Description") + ":Data:250",
        _("Order Quantity") + ":Float:130",
        _("Delivered Qty") + ":Float:120",
        _("Short Close Qty") + ":Float:120",
        _("Open Qty") + ":Float:120",
        _("Item Rate") + ":Float:120",
        _("Base Rate") + ":Float:120",
        _("Currency") + ":Link/Currency:100",
        # _("Exchange Rate") + ":Float:150",
        {
            "label": "Exchange Rate",
            "fieldname": "exchange_rate",
            "fieldtype": "Float",
            "disable_total": 1
        },
        _("Total Net Amount (INR)") + ":Float:180",
        # _("Delivered Net Total") + ":Float:180",
        _("Net Delivered Net Total") + ":Float:180",
        _("Balance Net Total") + ":Float:170",
        _("Delivery Date") + ":Date:120",
        _("Stock") + ":Float:150",
        _("Business Region Name") + ":Data:190",
        _("Sales Person") + ":Data:150",
        _("Domestic/Export") + ":Data:150",
    ]
 
 
def get_conditions(filters):
    if not filters:
        filters = {}
    conditions = ""
 
    # -------- Status filter (multiple selection) --------
 
    status = filters.get("status")
 
    if status:
        # From report UI it comes as a list, e.g. ["Draft", "To Deliver"]
        if isinstance(status, str):
            # Just in case it's a comma string
            status_list = [s.strip() for s in status.split(",") if s.strip()]
        else:
            status_list = status
 
        if status_list:
            filters["status"] = tuple(status_list)
            conditions += " AND so.status IN %(status)s"
 
    # -------- Other filters --------
    if filters.get("sales_person"):
        conditions += " AND EXISTS (SELECT 1 FROM `tabSales Team` WHERE parent = so.name AND sales_person = %(sales_person)s)"

    if filters.get("so_no"):
        conditions += " AND so.name = %(so_no)s"
 
    if filters.get("customer_name"):
        filters["customer_name"] = f"%{filters['customer_name']}%"
        conditions += " AND so.customer_name LIKE %(customer_name)s"
 
    if filters.get("item_code"):
        conditions += " AND soi.item_code = %(item_code)s"
 
    if filters.get("currency"):
        conditions += " AND so.currency = %(currency)s"
 
    # -------- Correct date filters using transaction_date --------
    if filters.get("from_date"):
        conditions += " AND so.transaction_date >= %(from_date)s"
 
    if filters.get("to_date"):
        conditions += " AND so.transaction_date <= %(to_date)s"
 
    return conditions
 
 
 
def get_data(filters):
    if not filters:
        filters = {}
    conditions = get_conditions(filters)
 
    sql = f"""
        SELECT
            soi.name AS name,
            so.name AS so_no,
            so.transaction_date AS so_date,
            ROW_NUMBER() OVER (PARTITION BY so.name ORDER BY soi.idx) AS sr_no,
            (SELECT MAX(poi.parent) FROM `tabPurchase Order Item` poi WHERE poi.sales_order_item = soi.name) AS supplier_po_no,
            (SELECT po.transaction_date FROM `tabPurchase Order` po JOIN `tabPurchase Order Item` poi ON poi.parent = po.name WHERE poi.sales_order_item = soi.name LIMIT 1) AS supplier_po_date,
            so.po_no AS customer_po_no,
            so.po_date AS customer_po_date,
            # so.status AS status,
            c.customer_code AS customer_code,
            so.customer_name AS customer_name,
            # soi.party_item_code AS party_item_code,
            soi.item_code AS item_code,
            soi.item_name AS item_name,
            # soi.description AS description,
            REGEXP_REPLACE(soi.description, '<[^>]*>', '') AS description,
            soi.qty AS order_quantity,
            soi.delivered_qty AS delivered_qty,
            soi.total_short_close_qty AS short_close_qty,
            (soi.qty - soi.delivered_qty - IFNULL(soi.custom_picked_but_not_delivered, 0) - IFNULL(soi.total_short_close_qty, 0)) AS open_qty,
            soi.rate AS item_rate,
            soi.base_rate AS base_rate,
            so.currency AS currency,
            so.conversion_rate AS exchange_rate,
            ((soi.qty - IFNULL(soi.total_short_close_qty, 0)) * soi.base_rate) AS `total_net_amount_(inr)`,
            ((soi.delivered_qty - IFNULL(soi.returned_qty, 0)) * soi.base_rate) AS net_delivered_net_total,
            (((soi.qty - IFNULL(soi.total_short_close_qty, 0)) * soi.base_rate) - ((soi.delivered_qty - IFNULL(soi.returned_qty, 0)) * soi.base_rate)) AS balance_net_total,
            soi.delivery_date AS delivery_date,
 
            (
                SELECT IFNULL(SUM(b.actual_qty), 0)
                FROM `tabBin` b
                WHERE b.item_code = soi.item_code
            ) AS stock,
 
            c.business_region_name AS business_region_name,
            (SELECT GROUP_CONCAT(DISTINCT sales_person SEPARATOR ', ') FROM `tabSales Team` WHERE parent = so.name) AS sales_person,
 
            CASE
                WHEN IFNULL(a.country, '') = 'India' THEN 'Domestic'
                ELSE 'Export'
            END AS `domestic/export`
 
        FROM `tabSales Order` so
        INNER JOIN `tabSales Order Item` soi ON soi.parent = so.name
        LEFT JOIN `tabItem` i ON i.name = soi.item_code
        LEFT JOIN `tabCustomer` c ON so.customer = c.name
        LEFT JOIN `tabAddress` a ON a.name = so.customer_address
       
        WHERE 1 = 1
        AND so.docstatus = 1
        AND IFNULL(i.custom_is_freight_item, 0) = 0
        AND soi.item_name != 'Freight'
        # Included all items to match user's global booking total (375,461,138.54)
        # AND (so.amended_from IS NULL OR so.name = (
        #     SELECT MAX(name)
        #     FROM `tabSales Order`
        #     WHERE name LIKE CONCAT(SUBSTRING_INDEX(so.name, '-', 1), '%%')
        # ))
 
        # AND so.name = (
        #     SELECT MAX(name)
        #     FROM `tabSales Order`
        #     WHERE name LIKE CONCAT(SUBSTRING_INDEX(so.name, '-', 1), '%%')
        # )
 
 
        {conditions}
 
        GROUP BY soi.name
        # ORDER BY so.creation ASC, so.name ASC
        ORDER BY
         so.transaction_date ASC,
         so.name ASC,
         soi.idx ASC
 
    """
 
    return frappe.db.sql(sql, filters, as_list=True)
 
 
 

 
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
 
    # read include_filters flag
    include_filters = frappe.utils.cint(filters.get("include_filters", include_filters))
 
    # remove include_filters from list
    actual_filters = {k: v for k, v in filters.items() if k != "include_filters"}
 
 
    # If include_filters = 0 → fetch all data
    if include_filters:
        # Use filters
        columns, data = execute(filters)
    else:
    # Fetch all data (no filters)
        columns, data = execute({})
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sales Order Report"
 
    # -----------------------------
    #   HEADER
    # -----------------------------
    ws["A1"].value = "Report Name"
    ws["A1"].font = Font(bold=True)
    ws["B1"].value = "Sales Order Report"
 
    ws["A2"].value = "Generated On"
    ws["A2"].font = Font(bold=True)
    ws["B2"].value = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")
 
    ws["A3"].value = "Generated By"
    ws["A3"].font = Font(bold=True)
    full_name = frappe.db.get_value("User", frappe.session.user, "full_name")
    ws["B3"].value = full_name or frappe.session.user
 
    # -----------------------------
    #   FILTERS SECTION
    # -----------------------------
    row_idx = 4
    if filters:
        for key, val in filters.items():
            if not val or key in ["include_filters", "report_name", "current_datetime"]:
                continue
            
            label = frappe.unscrub(key)
            if isinstance(val, (list, tuple)):
                val = ", ".join([str(v) for v in val])
            
            ws.cell(row=row_idx, column=1, value=label).font = Font(bold=True)
            ws.cell(row=row_idx, column=2, value=str(val))
            row_idx += 1
    
    row_idx += 1 # Space before table
 
    # -----------------------------
    #   FILTER OUT HIDDEN COLUMNS
    # -----------------------------
    keep_indices = []
    filtered_columns = []
    for i, col in enumerate(columns):
        if isinstance(col, dict) and col.get("hidden"):
            continue
        keep_indices.append(i)
        filtered_columns.append(col)
    
    columns = filtered_columns
    data = [[row[i] for i in keep_indices] for row in data]
 
    # -----------------------------
    #   COLUMN HEADERS
    # -----------------------------
    header_row = row_idx
    for idx, col in enumerate(columns, start=1):
        label = col["label"] if isinstance(col, dict) else col.split(":")[0]
        c = ws.cell(row=header_row, column=idx, value=label)
        c.font = Font(bold=True)
        c.alignment = Alignment(horizontal="center")
 
    row_idx += 1
 
    # -----------------------------
    #   NUMERIC COLUMNS MAP (DYNAMIC)
    # -----------------------------
    numeric_index_map = {}
    no_total_index_set = set()
    
    for i, col in enumerate(columns):
        label = col["label"] if isinstance(col, dict) else col.split(":")[0]
        f_type = col.get("fieldtype") if isinstance(col, dict) else (col.split(":")[1] if ":" in col else "")
        
        if f_type in ["Float", "Int", "Currency", "Percent"]:
            numeric_index_map[i] = True
            
        # Skip totals for rates, dates, etc.
        if label in ["SO Date", "Item Rate", "Base Rate", "Currency", "Exchange Rate", "Supplier PO Date", "Customer PO Date", "Delivery Date"]:
            no_total_index_set.add(i)
 
    # -----------------------------
    #   DATA ROWS
    # -----------------------------
    for row in data:
        for col_idx, value in enumerate(row, start=1):
            cell = ws.cell(row=row_idx, column=col_idx)
            
            col_def = columns[col_idx - 1]
            label = col_def["label"] if isinstance(col_def, dict) else col_def.split(":")[0]
            fieldname = label.lower().replace(" ", "_")
 
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

 
 