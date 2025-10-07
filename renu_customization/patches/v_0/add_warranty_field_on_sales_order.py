import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Define the custom field
    field = {
        "fieldname": "warr",
        "label": "Warranty",
        "fieldtype": "Data",
        "insert_after": "insurance"
    }

    # Create field in Sales Order doctype
    create_custom_field("Sales Order", field)
