import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Serial No": [
            dict(
                fieldname="warranty_begins",
                label="Warranty Begins",
                fieldtype="Data",
                insert_after="warranty_period",
                reqd=0
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
