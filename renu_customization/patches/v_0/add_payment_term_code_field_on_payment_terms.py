import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field = {
        "fieldname": "payment_term_code",
        "label": "Payment Term Code",
        "fieldtype": "Data",
        "insert_after": "payment_term_name"
    }

    create_custom_field("Payment Term", field)
