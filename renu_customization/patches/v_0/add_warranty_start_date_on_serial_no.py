import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Serial No": [
            dict(
                fieldname="warranty_start_date",
                label="Warranty Start Date",
                fieldtype="Date",
                insert_after="warranty_expiry_date",
                reqd=0
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
