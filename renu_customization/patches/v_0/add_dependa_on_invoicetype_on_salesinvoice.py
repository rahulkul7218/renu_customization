import frappe

def execute():
    # Update the 'depends_on' property of the invoice_type field in Sales Invoice
    frappe.db.set_value(
        "Custom Field",
        {"dt": "Sales Invoice", "fieldname": "invoice_type"},
        "depends_on",
        "eval:doc.invoice_type"
    )

    # Also clear cache so changes reflect
    frappe.clear_cache(doctype="Sales Invoice")
