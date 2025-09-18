import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    """Add 'Order Type' field to Sales Invoice"""
    field_name = "invoice_typ"

    # Check if field already exists
    if not frappe.db.exists("Custom Field", {"dt": "Sales Invoice", "fieldname": field_name}):
        create_custom_field("Sales Invoice", {
            "fieldname": field_name,
            "label": "Invoice Type",
            "fieldtype": "Select",
            "options": "\n".join([
                "",  # 👈 Blank option (default)
                "Product Domestic",
                "Product Export",
                "Engineering Service Domestic",
                "Engineering Service Export"
            ]),
            "insert_after": "invoice_type",
            "reqd": 1
        })
        frappe.msgprint("Custom Field 'Invoice Type' added to Sales Invoice")
