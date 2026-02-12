# import frappe

# def execute():
#     if not frappe.db.exists("Custom Field", {
#         "dt": "Sales Order Item",
#         "fieldname": "custom_picked_but_not_delivered"
#     }):
#         frappe.get_doc({
#             "doctype": "Custom Field",
#             "dt": "Sales Order Item",
#             "label": "Picked But Not Delivered",
#             "fieldname": "custom_picked_but_not_delivered",
#             "fieldtype": "Int",
#             "insert_after": "custom_short_closed_qty"
            
#         }).insert(ignore_permissions=True)

#     frappe.clear_cache()
