import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Customer": [
            dict(
                fieldname="customer_code",
                label="Customer Code",
                fieldtype="Data",
                insert_after="salutation",
                reqd=1
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
