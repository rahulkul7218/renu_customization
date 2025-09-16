import frappe
from frappe.model.document import Document

def execute():
    # Check if field already exists
    if not frappe.db.exists("Custom Field", "Pick List-invoice_type"):
        # Create the custom field
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Pick List",
            "fieldname": "invoice_type",
            "label": "Invoice Type",
            "fieldtype": "Data",
            "insert_after": "sales_order"  # adjust position if needed
        }).insert(ignore_permissions=True)
        frappe.db.commit()
        print("Custom Field 'Invoice Type' added to Pick List.")
    else:
        print("Field already exists.")
