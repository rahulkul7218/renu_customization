import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Item": [
            dict(
                fieldname="business_group",
                label="Business Group",
                fieldtype="Link",
                options="Business Group",
                insert_after="item_group",
                reqd=1
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
