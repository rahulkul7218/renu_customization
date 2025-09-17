import frappe

def execute():
    # Fields to hide in Pick List
    fields_to_hide = ["sales_order", "invoice_type"]

    for fieldname in fields_to_hide:
        custom_field = frappe.db.exists("Custom Field", {"dt": "Pick List", "fieldname": fieldname})
        if custom_field:
            frappe.db.set_value("Custom Field", custom_field, "hidden", 1)

    # Clear cache for Pick List
    frappe.clear_cache(doctype="Pick List")
