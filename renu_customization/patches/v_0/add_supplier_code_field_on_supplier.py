import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Supplier": [
            dict(
                fieldname="supplier_code",
                label="Supplier Code",
                fieldtype="Data",
                insert_after="naming_series",
                reqd=1
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
