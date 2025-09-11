import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Invoice Item": [
            dict(
                fieldname="business_unit",
                label="Business Unit",
                fieldtype="Data",
                insert_after="amount",
                read_only=1,
                in_list_view=1,
                fetch_from="item_code.business_unit"
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
