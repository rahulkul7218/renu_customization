import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    fieldname = "VesselorFlightNo"
    doctype = "Delivery Note"

    # Check if field already exists
    if not frappe.db.exists("Custom Field", f"{doctype}-{fieldname}"):
        create_custom_field(doctype, {
            "fieldname": fieldname,
            "label": "Vessel/Flight No.",
            "fieldtype": "Data",   # you can change to Select, Int, etc.
            "insert_after": "lr_date",  # position in form
            "reqd": 0,
        })
