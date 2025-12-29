# import frappe
# import re

# def execute(filters=None):
#     filters = filters or {}

#     item_filter = filters.get("item")

#     conditions = "WHERE it.is_stock_item = 1"
#     values = {}

#     if item_filter:
#         conditions = "WHERE it.item_code = %(item)s"
#         values["item"] = item_filter

#     query = f"""
#         SELECT
#             it.item_code,
#             it.item_name,
#             it.description,
           

#             /* Latest Purchase Rate */
#             # (
#             #     SELECT ip.price_list_rate
#             #     FROM `tabItem Price` ip
#             #     WHERE ip.item_code = it.item_code
#             #       AND ip.buying = 1
#             #     ORDER BY ip.modified DESC
#             #     LIMIT 1
#             # ) AS last_purchase_rate,

#             (
#                 SELECT ip.price_list_rate
#                 FROM `tabItem Price` ip
#                 WHERE ip.item_code = it.item_code
#                   AND ip.buying = 1
#                 ORDER BY ip.modified DESC
#                 LIMIT 1
#             ) AS last_purchase_rate,

#             /* Available Qty */
#             IFNULL(SUM(bin.actual_qty), 0) AS item_available_qty,

#             it.safety_stock,

#             /* PO Booking Qty = Total ordered qty */
#             IFNULL((
#                 SELECT SUM(IFNULL(poi.qty, 0))
#                 FROM `tabSales Order Item` poi
#                 INNER JOIN `tabSales Order` po ON poi.parent = po.name
#                 WHERE poi.item_code = it.item_code
#                 AND po.docstatus = 1
#                 AND po.status NOT IN ('Stopped', 'Cancelled')
#             ), 0) AS po_booking_qty,

#             /* Open PO Qty FIXED = SUM(poi.open_qty) */
#             /* Correct Open PO Qty = SUM(qty - received_qty) */
#             IFNULL((
#     SELECT SUM(
#         (IFNULL(soi.qty, 0) - IFNULL(soi.delivered_qty, 0))
#     )
#     FROM `tabSales Order Item` soi
#     INNER JOIN `tabSales Order` so ON soi.parent = so.name
#     WHERE soi.item_code = it.item_code
#       AND so.docstatus = 1
#       AND so.status NOT IN ('Closed', 'Cancelled', 'Completed')
# ), 0) AS open_qty,



#             /* Free Qty = Stock - Pending purchase orders */
# (
#     IFNULL(SUM(bin.actual_qty), 0) -
#     IFNULL((
#         SELECT SUM(GREATEST(0, soi.qty))
#         FROM `tabSales Order Item` soi
#         INNER JOIN `tabSales Order` so ON soi.parent = so.name
#         WHERE soi.item_code = it.item_code
#           AND so.docstatus = 1
#           AND so.status NOT IN ('Closed', 'Cancelled')
#     ), 0)
# ) AS free_item_qty,


#             /* Units Sold (Last 6 Months) */
#             IFNULL((
#                 SELECT SUM(sii.qty)
#                 FROM `tabSales Invoice Item` sii
#                 INNER JOIN `tabSales Invoice` si ON sii.parent = si.name
#                 WHERE sii.item_code = it.item_code
#                   AND si.docstatus = 1
#                   AND si.posting_date >= (CURDATE() - INTERVAL 6 MONTH)
#             ), 0) AS units_sold_last_6_months

#         FROM `tabItem` it
#         LEFT JOIN `tabBin` bin ON bin.item_code = it.item_code

#         {conditions}

#         GROUP BY it.item_code, it.item_name, it.description
#         ORDER BY it.item_code
#     """

#     data = frappe.db.sql(query, values, as_dict=True)

#     columns = [
#         {"label": "Item Code", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 150},
#         {"label": "Item Name", "fieldname": "item_name", "fieldtype": "Data", "width": 180},
#         {"label": "Description", "fieldname": "description", "fieldtype": "Data", "width": 250},

#         {"label": "Purchase Rate", "fieldname": "last_purchase_rate", "fieldtype": "Float", "width": 120, "show_totals": 1},
#         {"label": "Item Available Qty", "fieldname": "item_available_qty", "fieldtype": "Float", "width": 130, "show_totals": 1},
#         {"label": "Safety Stock", "fieldname": "safety_stock", "fieldtype": "Float", "width": 120, "show_totals": 1},

#         {"label": "PO Booking Qty", "fieldname": "po_booking_qty", "fieldtype": "Float", "width": 120, "show_totals": 1},
#         {"label": "Open PO Qty (Supplier End)", "fieldname": "open_qty", "fieldtype": "Float", "width": 140, "show_totals": 1},

#         {"label": "Free Item Qty", "fieldname": "free_item_qty", "fieldtype": "Float", "width": 120, "show_totals": 1},
#         {"label": "Units Sold (Last 6 Months)", "fieldname": "units_sold_last_6_months", "fieldtype": "Float", "width": 160, "show_totals": 1},
#     ]

#     return columns, data



# def strip_html(text):
#     if not text:
#         return ""
#     return re.sub("<.*?>", "", text)


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
#     ws.title = "Stock Status Report"

#     # Header
#     ws["A1"].value = "Report Name"
#     ws["A1"].font = Font(bold=True)
#     ws["B1"].value = "Stock Status Report"

#     ws["A2"].value = "Generated On"
#     ws["A2"].font = Font(bold=True)
#     ws["B2"].value = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")

#     row_idx = 4

#     # Column headers
#     for idx, col in enumerate(columns, start=1):
#         c = ws.cell(row=row_idx, column=idx, value=col["label"])
#         c.font = Font(bold=True)
#         c.alignment = Alignment(horizontal="center")

#     row_idx += 1

#     # Numeric fields
#     numeric_fields = {
#         "last_purchase_rate",
#         "item_available_qty",
#         "safety_stock",
#         "po_booking_qty",
#         "open_qty",
#         "free_item_qty",
#         "units_sold_last_6_months"
#     }

#     # Data rows
#     for row in data:
#         col_idx = 1
#         for col in columns:
#             field = col["fieldname"]
#             value = row.get(field)

#             cell = ws.cell(row=row_idx, column=col_idx)

#             if field in numeric_fields and value not in (None, ""):
#                 cell.value = flt(value)
#                 cell.number_format = "#,##0.00"
#                 cell.alignment = Alignment(horizontal="right")
#             # else:
#             #     cell.value = value
#             #     cell.alignment = Alignment(horizontal="left")
#             else:
#                 # Strip HTML for description or any HTML text
#                 if field == "description":
#                     clean_text = strip_html(value)
#                     cell.value = clean_text
#                 else:
#                     cell.value = value

#                 cell.alignment = Alignment(horizontal="left")


#             col_idx += 1

#         row_idx += 1

#     # TOTAL ROW
#     total_row = row_idx

#     for idx, col in enumerate(columns, start=1):
#         field = col["fieldname"]
#         cell = ws.cell(row=total_row, column=idx)

#         # Gray total row
#         cell.fill = PatternFill(
#             start_color="D9D9D9",
#             end_color="D9D9D9",
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
#             cell.number_format = "#,##0.00"
#             cell.alignment = Alignment(horizontal="right")
#         else:
#             cell.value = ""
#             cell.alignment = Alignment(horizontal="left")

#     # Column width
#     for i in range(1, len(columns) + 1):
#         ws.column_dimensions[get_column_letter(i)].width = 22

#     # Export file
#     output = BytesIO()
#     wb.save(output)
#     output.seek(0)

#     return base64.b64encode(output.read()).decode()




import frappe
import re
 
def execute(filters=None):
    filters = filters or {}
 
    item_filter = filters.get("item")
 
    conditions = "WHERE it.is_stock_item = 1"
    values = {}
 
    if item_filter:
        conditions = "WHERE it.item_code = %(item)s"
        values["item"] = item_filter
 
    query = f"""
        SELECT
            it.item_code,
            it.item_name,
            it.description,
           
 
            /* Latest Purchase Rate */
            # (
            #     SELECT ip.price_list_rate
            #     FROM `tabItem Price` ip
            #     WHERE ip.item_code = it.item_code
            #       AND ip.buying = 1
            #     ORDER BY ip.modified DESC
            #     LIMIT 1
            # ) AS last_purchase_rate,
 
            (
                SELECT ip.price_list_rate
                FROM `tabItem Price` ip
                WHERE ip.item_code = it.item_code
                  AND ip.buying = 1
                ORDER BY ip.modified DESC
                LIMIT 1
            ) AS last_purchase_rate,
 
            /* Available Qty */
            IFNULL(SUM(bin.actual_qty), 0) AS item_available_qty,
 
            it.safety_stock,
 
#             /* PO Booking Qty = Total ordered qty */
#             IFNULL((
#                 SELECT SUM(IFNULL(poi.qty, 0))
#                 FROM `tabSales Order Item` poi
#                 INNER JOIN `tabSales Order` po ON poi.parent = po.name
#                 WHERE poi.item_code = it.item_code
#                 AND po.docstatus = 1
#                 AND po.status NOT IN ('Stopped', 'Cancelled')
#             ), 0) AS po_booking_qty,
 
#             /* Open PO Qty FIXED = SUM(poi.open_qty) */
#             /* Correct Open PO Qty = SUM(qty - received_qty) */
#             IFNULL((
#     SELECT SUM(
#         (IFNULL(soi.qty, 0) - IFNULL(soi.delivered_qty, 0))
#     )
#     FROM `tabSales Order Item` soi
#     INNER JOIN `tabSales Order` so ON soi.parent = so.name
#     WHERE soi.item_code = it.item_code
#       AND so.docstatus = 1
#       AND so.status NOT IN ('Closed', 'Cancelled', 'Completed')
# ), 0) AS open_qty,
 
 
 
#             /* Free Qty = Stock - Pending purchase orders */
# (
#     IFNULL(SUM(bin.actual_qty), 0) -
#     IFNULL((
#         SELECT SUM(GREATEST(0, soi.qty))
#         FROM `tabSales Order Item` soi
#         INNER JOIN `tabSales Order` so ON soi.parent = so.name
#         WHERE soi.item_code = it.item_code
#           AND so.docstatus = 1
#           AND so.status NOT IN ('Closed', 'Cancelled')
#     ), 0)
# ) AS free_item_qty,

            /* PO Booking Qty [ data get from sales order] */
            IFNULL((
                SELECT SUM(IFNULL(poi.qty, 0))
                FROM `tabPurchase Order Item` poi
                INNER JOIN `tabPurchase Order` po ON poi.parent = po.name
                WHERE poi.item_code = it.item_code
                AND po.docstatus = 1
                AND (po.status IS NULL OR po.status NOT IN ('Stopped', 'Cancelled'))
            ), 0) AS po_booking_qty,
 
 
            /* Open PO Qty (Supplier End) */
            IFNULL((
                SELECT SUM(poi.open_qty)
                FROM `tabPurchase Order Item` poi
                INNER JOIN `tabPurchase Order` po ON poi.parent = po.name
                WHERE poi.item_code = it.item_code
                  AND po.docstatus = 0
                  AND (po.status IS NULL OR po.status NOT IN ('Cancelled', 'Stopped'))
            ), 0) AS open_po_qty,
 
            /* Free Qty */
            (
                IFNULL(SUM(bin.actual_qty), 0) -
                IFNULL((
                    SELECT SUM(GREATEST(0, (poi.qty - IFNULL(poi.received_qty,0))))
                    FROM `tabPurchase Order Item` poi
                    INNER JOIN `tabPurchase Order` po ON poi.parent = po.name
                    WHERE poi.item_code = it.item_code
                      AND po.docstatus = 1
                      AND (po.status IS NULL OR po.status NOT IN ('Stopped', 'Cancelled'))
                ), 0)
            ) AS free_item_qty,
 
 
 
            /* Units Sold (Last 6 Months) */
            IFNULL((
                SELECT SUM(sii.qty)
                FROM `tabSales Invoice Item` sii
                INNER JOIN `tabSales Invoice` si ON sii.parent = si.name
                WHERE sii.item_code = it.item_code
                  AND si.docstatus = 1
                  AND si.posting_date >= (CURDATE() - INTERVAL 6 MONTH)
            ), 0) AS units_sold_last_6_months
 
        FROM `tabItem` it
        LEFT JOIN `tabBin` bin ON bin.item_code = it.item_code
 
        {conditions}
 
        GROUP BY it.item_code, it.item_name, it.description
        ORDER BY it.item_code
    """
 
    data = frappe.db.sql(query, values, as_dict=True)
 
    columns = [
        {"label": "Item Code", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 150},
        {"label": "Item Name", "fieldname": "item_name", "fieldtype": "Data", "width": 180},
        {"label": "Description", "fieldname": "description", "fieldtype": "Data", "width": 250},
 
        {"label": "Purchase Rate", "fieldname": "last_purchase_rate", "fieldtype": "Float", "width": 120},
        {"label": "Item Available Qty", "fieldname": "item_available_qty", "fieldtype": "Float", "width": 160, "show_totals": 1},
        {"label": "Safety Stock", "fieldname": "safety_stock", "fieldtype": "Float", "width": 120, "show_totals": 1},
 
        {"label": "PO Booking Qty", "fieldname": "po_booking_qty", "fieldtype": "Float", "width": 150, "show_totals": 1},
        {"label": "Open PO Qty (Supplier End)", "fieldname": "open_qty", "fieldtype": "Float", "width": 220, "show_totals": 1},
 
        {"label": "Free Item Qty", "fieldname": "free_item_qty", "fieldtype": "Float", "width": 120, "show_totals": 1},
        {"label": "Units Sold (Last 6 Months)", "fieldname": "units_sold_last_6_months", "fieldtype": "Float", "width": 210, "show_totals": 1},
    ]
 
    return columns, data
 
 
 
def strip_html(text):
    if not text:
        return ""
    return re.sub("<.*?>", "", text)
 
 
@frappe.whitelist()
def download_xlsx(filters=None):
 
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
    ws.title = "Stock Status Report"
 
    # ---------- HEADER ----------
    ws["A1"].value = "Report Name"
    ws["A1"].font = Font(bold=True)
    ws["B1"].value = "Stock Status Report"
 
    ws["A2"].value = "Generated On"
    ws["A2"].font = Font(bold=True)
    ws["B2"].value = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")
 
    ws["A3"].value = "Generated By"
    ws["A3"].font = Font(bold=True)
    full_name = frappe.db.get_value("User", frappe.session.user, "full_name")
    ws["B3"].value = full_name or frappe.session.user
 
    ws.append([])
    row_idx = 5
 
    # Column headers
    for idx, col in enumerate(columns, start=1):
        c = ws.cell(row=row_idx, column=idx, value=col["label"])
        c.font = Font(bold=True)
        c.alignment = Alignment(horizontal="center")
 
    row_idx += 1
 
    # Numeric fields
    numeric_fields = {
        "last_purchase_rate",
        "item_available_qty",
        "safety_stock",
        "po_booking_qty",
        "open_qty",
        "free_item_qty",
        "units_sold_last_6_months"
    }
 
    # Skip total for selected numeric columns
    no_total_fields = {
    #    "last_purchase_rate"
    }
 
    # Data rows
    for row in data:
        col_idx = 1
        for col in columns:
            field = col["fieldname"]
            value = row.get(field) or 0
 
            cell = ws.cell(row=row_idx, column=col_idx)
 
            if field in numeric_fields and value not in (None, ""):
                cell.value = flt(value)
                cell.number_format = "#,##0.00"
                cell.alignment = Alignment(horizontal="right")
            # else:
            #     cell.value = value
            #     cell.alignment = Alignment(horizontal="left")
            else:
                # Strip HTML for description or any HTML text
                if field == "description":
                    clean_text = strip_html(value)
                    cell.value = clean_text
                else:
                    cell.value = value
 
                cell.alignment = Alignment(horizontal="left")
 
 
            col_idx += 1
 
        row_idx += 1
 
    # TOTAL ROW
    total_row = row_idx
 
    for idx, col in enumerate(columns, start=1):
        field = col["fieldname"]
        cell = ws.cell(row=total_row, column=idx)
 
        # Gray total row
        cell.fill = PatternFill(
            start_color="D9D9D9",
            end_color="D9D9D9",
            fill_type="solid"
        )
        cell.font = Font(bold=True)
 
        if idx == 1:
            cell.value = "Total"
            cell.alignment = Alignment(horizontal="left")
            continue
       
        # Skip total for selected numeric columns
        if field in no_total_fields:
             cell.value = ""
             continue
 
        if field in numeric_fields:
            total_val = sum([flt(d.get(field)) for d in data])
            cell.value = total_val
            cell.number_format = "#,##0.00"
            cell.alignment = Alignment(horizontal="right")
        else:
            cell.value = ""
            cell.alignment = Alignment(horizontal="left")
 
    # Column width
    for i in range(1, len(columns) + 1):
        ws.column_dimensions[get_column_letter(i)].width = 22
 
    # Export file
    output = BytesIO()
    wb.save(output)
    output.seek(0)
 
    return base64.b64encode(output.read()).decode()
 
 