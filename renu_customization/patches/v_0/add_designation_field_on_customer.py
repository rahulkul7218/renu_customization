import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Customer": [
            dict(
                fieldname="designation",
                label="Designation",
                fieldtype="Link",
                options="Designation",
                insert_after="account_manager",
                reqd=1
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
