import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Invoice Item": [
            dict(
                fieldname="ref_po_no",
                label="Ref PO No.",
                fieldtype="Data",
                insert_after="customer_item_code",
                
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
