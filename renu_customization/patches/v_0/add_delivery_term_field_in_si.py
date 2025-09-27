import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Invoice": [
            dict(
                fieldname="delivery_term",
                label="Delivery Terms",
                fieldtype="Link",
                options="Delivery Term",
                insert_after="terms"
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
