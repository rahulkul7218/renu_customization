# import frappe
# from frappe.model.custom_field import create_custom_field

# def execute():
#     # Define the custom field
#     custom_field = {
#         "fieldname": "delivery_note",
#         "label": "Delivery Note",
#         "fieldtype": "Link",
#         "options": "Delivery Note",
#         "insert_after": "due_date",
#         "reqd": 0
#     }

#     # Add the field to Sales Invoice
#     create_custom_field("Sales Invoice", custom_field)
#     frappe.db.commit()


import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field_name = "delivery_note"
    doctype = "Sales Invoice"

    # check if field already exists
    if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": field_name}):
        create_custom_field(doctype, {
            "fieldname": field_name,
            "label": "Delivery Note",
            "fieldtype": "Link",
            "options": "Delivery Note",
            "insert_after": "due_date",
        })
        frappe.clear_cache(doctype=doctype)
