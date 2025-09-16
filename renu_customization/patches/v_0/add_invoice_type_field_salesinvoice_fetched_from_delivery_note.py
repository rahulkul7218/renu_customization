import frappe

def execute():
    if not frappe.db.exists("Custom Field", "Sales Invoice-invoice_type"):
        field = frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Sales Invoice",
            "fieldname": "invoice_type",
            "label": "Invoice Type",
            "fieldtype": "Data",
            "insert_after": "delivery_note",
            "fetch_from": "delivery_note.invoice_type",
        })
        field.insert(ignore_permissions=True)
        frappe.db.commit()
