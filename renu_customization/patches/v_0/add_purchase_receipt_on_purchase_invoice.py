import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Purchase Invoice": [
            dict(
                fieldname="purchase_receipt",
                label="Purchase Receipt",
                fieldtype="Link",
                options="Purchase Receipt",
                insert_after="bill_no",
                
            )
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
