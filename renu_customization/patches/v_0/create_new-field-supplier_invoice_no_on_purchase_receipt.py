import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Define the new field
    field = {
        "fieldname": "supplier_invoice_no",
        "label": "Supplier Invoice No",
        "fieldtype": "Data",
        "insert_after": "set_posting_time",
        "reqd": 1,  # mandatory field
    }

    # Create the custom field
    create_custom_field("Purchase Receipt", field)
    frappe.clear_cache(doctype="Purchase Receipt")
