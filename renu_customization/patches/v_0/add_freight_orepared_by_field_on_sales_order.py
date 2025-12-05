import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field = {
        "fieldname": "freight_prepared_by",
        "label": "Freight Prepared By",
        "fieldtype": "Link",
        "options": "Freight",
        "insert_after": "transport_mode"
        
    }

    create_custom_field("Sales Order", field)

    frappe.clear_cache(doctype="Sales Order")


