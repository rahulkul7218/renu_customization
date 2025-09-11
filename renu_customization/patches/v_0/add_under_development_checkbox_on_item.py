# app_name/patches/add_under_development_field.py

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field = {
        "fieldname": "under_development",
        "label": "Under Development",
        "fieldtype": "Check",
        "insert_after": "disabled"
    }

    create_custom_field("Item", field, ignore_validate=True)
