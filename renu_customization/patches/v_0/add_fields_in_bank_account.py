import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Bank Account": [
             dict(
                fieldname="rbi_code",
                label="RBI Code",
                fieldtype="Data",
                insert_after="iban",
            )
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
