import frappe

def execute():
    # Hide the custom field 'delivery_note' in Sales Invoice
    custom_field = frappe.db.exists("Custom Field", {"dt": "Sales Invoice", "fieldname": "delivery_note"})
    if custom_field:
        frappe.db.set_value("Custom Field", custom_field, "hidden", 1)
        frappe.clear_cache(doctype="Sales Invoice")
