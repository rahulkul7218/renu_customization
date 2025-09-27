import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field = {
        "fieldname": "supplier_invoice_date",
        "label": "Supplier Invoice Date",
        "fieldtype": "Date",
        "insert_after": "supplier_invoice_no",
        "reqd": 1,   # make mandatory
    }

    create_custom_field("Purchase Receipt", field)
    frappe.clear_cache(doctype="Purchase Receipt")
