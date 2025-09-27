import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Customer": [
            dict(
                fieldname="old_customer_code",
                label="Old Customer Code",
                fieldtype="Data",
                insert_after="salutation",
                read_only=1
            )
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
