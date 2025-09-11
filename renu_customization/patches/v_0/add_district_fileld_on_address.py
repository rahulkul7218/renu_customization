import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field = {
        "fieldname": "district",
        "label": "District",
        "fieldtype": "Data",
        "insert_after": "city"
       
    }

    create_custom_field("Address", field)
