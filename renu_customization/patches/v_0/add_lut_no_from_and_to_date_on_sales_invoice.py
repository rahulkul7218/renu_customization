import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # LUT Number (Link)
    create_custom_field("Sales Invoice", {
        "fieldname": "lut_no",
        "label": "LUT No",
        "fieldtype": "Data",
        "insert_after": "amended_from",
        "read_only": 1
    })

   

    # To Date (Date)
    create_custom_field("Sales Invoice", {
        "fieldname": "lut_expiry_date",
        "label": "LUT Expiry Date",
        "fieldtype": "Date",
        "insert_after": "lut_no",
        "read_only": 1
    })
