import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Packing Slip": [
            {
                "fieldname": "invoice_no",
                "label": "Invoice No",
                "fieldtype": "Link",
                "options": "Sales Invoice",
                "insert_after": "delivery_note",
                "in_list_view": 1,
                "allow_on_submit": 1
            }
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
