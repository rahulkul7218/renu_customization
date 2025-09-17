import frappe

def execute():
    # Fields to hide in Delivery Note
    fields_to_hide = ["pick_list", "invoice_type"]

    for fieldname in fields_to_hide:
        custom_field = frappe.db.exists("Custom Field", {"dt": "Delivery Note", "fieldname": fieldname})
        if custom_field:
            frappe.db.set_value("Custom Field", custom_field, "hidden", 1)

    # Clear cache for Delivery Note
    frappe.clear_cache(doctype="Delivery Note")
