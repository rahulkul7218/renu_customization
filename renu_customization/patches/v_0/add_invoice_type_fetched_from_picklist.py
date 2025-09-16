import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Check if the custom field already exists
    if not frappe.db.exists("Custom Field", "Delivery Note-invoice_type"):
        # Create the custom field
        create_custom_field("Delivery Note", {
            "fieldname": "invoice_type",
            "label": "Invoice Type",
            "fieldtype": "Data",
            "insert_after": "pick_list"
            
        })
        frappe.db.commit()
