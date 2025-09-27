import frappe

def execute():
    # Check if field exists
    field = frappe.db.exists("Custom Field", {"dt": "Purchase Receipt", "fieldname": "po_no"})
    if field:
        frappe.db.set_value("Custom Field", field, "hidden", 1)
    else:
        # In case it's a standard field, update DocField directly
        field = frappe.db.exists("DocField", {"parent": "Purchase Receipt", "fieldname": "po_no"})
        if field:
            frappe.db.set_value("DocField", field, "hidden", 1)

    frappe.clear_cache(doctype="Purchase Receipt")
