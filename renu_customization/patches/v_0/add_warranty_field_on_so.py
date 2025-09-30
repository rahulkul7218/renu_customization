# import frappe
# from frappe.custom.doctype.custom_field.custom_field import create_custom_field

# def execute():
#     # Define field properties
#     field = {
#         "fieldname": "warranty",
#         "label": "Warranty",
#         "fieldtype": "Link",
#         "options": "Warranty",
#         "insert_after": "insurance",
#         "reqd": 1
#     }

#     # Create custom field
#     create_custom_field("Sales Order", field)
#     frappe.clear_cache(doctype="Sales Order")
