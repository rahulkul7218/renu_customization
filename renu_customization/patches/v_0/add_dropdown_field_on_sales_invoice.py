# your_app/patches/add_sales_type_field.py

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    fieldname = "sales_type"
    doctype = "Sales Invoice"  # 🔹 Change this if needed

    # Check if field already exists
    if not frappe.db.exists("Custom Field", f"{doctype}-{fieldname}"):
        create_custom_field(doctype, {
            "fieldname": fieldname,
            "label": "Sales Type",
            "fieldtype": "Select",
            "options": "\nProduct\nSales\nService",
            "insert_after": "due_date",
        })
