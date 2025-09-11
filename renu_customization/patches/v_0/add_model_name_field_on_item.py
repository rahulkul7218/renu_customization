import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Item": [
            dict(
                fieldname="model_name",
                label="Model Name",
                fieldtype="Data",
                insert_after="item_name",
                reqd=1
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
