import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Invoice": [
            {
                "fieldname": "is_domestic",
                "label": "Is Domestic",
                "fieldtype": "Check",
                "insert_after": "customer"
            },
            {
                "fieldname": "is_export",
                "label": "Is Export",
                "fieldtype": "Check",
                "insert_after": "is_domestic"
            }
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)