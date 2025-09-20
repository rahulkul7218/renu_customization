import frappe

def execute():
    # Check if field exists
    field = frappe.db.get_value(
        "Custom Field",
        {"dt": "Customer", "fieldname": "old_customer_code"},
        "name"
    )
    if field:
        # Update read_only to 0
        frappe.db.set_value("Custom Field", field, "read_only", 0)
        frappe.clear_cache(doctype="Customer")
