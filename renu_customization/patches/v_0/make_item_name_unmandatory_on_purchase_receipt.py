import frappe

def execute():
    # Ensure doctype exists before applying
    if frappe.db.exists("DocType", "Purchase Receipt Item"):
        frappe.db.set_value(
            "DocField",
            {"parent": "Purchase Receipt Item", "fieldname": "item_name"},
            "reqd",
            0
        )
        frappe.clear_cache(doctype="Purchase Receipt Item")
        print("✅ Made 'item_name' field optional on Purchase Receipt Item.")
