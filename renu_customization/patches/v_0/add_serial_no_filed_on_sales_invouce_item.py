import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Define custom field properties
    field = {
        "fieldname": "serials_no",
        "label": "Serial No",
        "fieldtype": "Text",
        "insert_after": "item_name",
        "in_list_view": 1
    }

    # Add the field to 'Sales Invoice Item'
    create_custom_field("Sales Invoice Item", field)
