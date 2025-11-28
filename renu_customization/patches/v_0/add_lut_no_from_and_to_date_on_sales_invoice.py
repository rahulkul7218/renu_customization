import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # LUT Number (Link)
    create_custom_field("Sales Invoice", {
        "fieldname": "lut_number",
        "label": "LUT Number",
        "fieldtype": "Link",
        "options": "LUT Number",
        "insert_after": "amended_from"
    })

    # From Date (Date)
    create_custom_field("Sales Invoice", {
        "fieldname": "lut_from_date",
        "label": "From Date",
        "fieldtype": "Date",
        "insert_after": "lut_number"
    })

    # To Date (Date)
    create_custom_field("Sales Invoice", {
        "fieldname": "lut_to_date",
        "label": "To Date",
        "fieldtype": "Date",
        "insert_after": "lut_from_date"
    })
