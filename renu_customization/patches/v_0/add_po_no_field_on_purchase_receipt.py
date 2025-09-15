import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Purchase Receipt": [
            dict(
                fieldname="po_no",
                label="PO NO",
                fieldtype="Data",
                insert_after="return_against"
            )
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
