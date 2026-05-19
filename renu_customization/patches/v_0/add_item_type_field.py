import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Item": [
            dict(
                fieldname="item_type",
                label="Item Type",
                fieldtype="Link",
                options="Item Type",
                insert_after="item_group"
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
