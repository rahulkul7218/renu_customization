# import frappe


# def execute():
#     # Short Closed Qty field
#     if not frappe.db.exists(
#         "Custom Field",
#         {"dt": "Sales Order Item", "fieldname": "custom_short_closed_qty"},
#     ):
#         frappe.get_doc({
#             "doctype": "Custom Field",
#             "dt": "Sales Order Item",
#             "label": "Short Closed Qty",
#             "fieldname": "custom_short_closed_qty",
#             "fieldtype": "Float",
#             "allow_on_submit": 1,
#             "insert_after": "production_plan_qty",
#         }).insert(ignore_permissions=True)

#     # Status field
#     if not frappe.db.exists(
#         "Custom Field",
#         {"dt": "Sales Order Item", "fieldname": "custom_status"},
#     ):
#         frappe.get_doc({
#             "doctype": "Custom Field",
#             "dt": "Sales Order Item",
#             "label": "Status",
#             "fieldname": "custom_status",
#             "fieldtype": "Select",
#             "options": "\nOpen\nShort Close",
            
#             "insert_after": "custom_short_closed_qty",
#         }).insert(ignore_permissions=True)

#     if not frappe.db.exists(
#         "Custom Field",
#         {"dt": "Sales Order Item", "fieldname": "custom_picked_but_not_delivered"},
#     ):
#         frappe.get_doc({
#             "doctype": "Custom Field",
#             "dt": "Sales Order Item",
#             "label": "Picked But Not Delivered",
#             "fieldname": "custom_picked_but_not_delivered",
#             "fieldtype": "Int",
#             "allow_on_submit": 1,
#             "insert_after": "custom_status",
#         }).insert(ignore_permissions=True)

#     if not frappe.db.exists(
#         "Custom Field",
#         {"dt": "Sales Order Item", "fieldname": "total_short_close_qty"},
#     ):
#         frappe.get_doc({
#             "doctype": "Custom Field",
#             "dt": "Sales Order Item",
#             "label": "Total Short Closed Qty",
#             "fieldname": "total_short_close_qty",
#             "fieldtype": "Int",
#             "allow_on_submit": 1,
#             "insert_after": "custom_picked_but_not_delivered",
#         }).insert(ignore_permissions=True)
    
#     if not frappe.db.exists(
#         "Custom Field",
#         {"dt": "Sales Order Item", "fieldname": "short_close_log"},
#     ):
#         frappe.get_doc({
#             "doctype": "Custom Field",
#             "dt": "Sales Order Item",
#             "label": "Short Close Log",
#             "fieldname": "short_close_log",
#             "fieldtype": "Text",
#             "allow_on_submit": 1,
#             "insert_after": "total_short_close_qty",
#         }).insert(ignore_permissions=True)
