import frappe

def execute():
    # ---------- Avoid duplicate field ----------
    if frappe.db.exists("Custom Field", "Stock Settings-enable_mrp"):
        return

    # ---------- SECTION BREAK ----------
    section = frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Stock Settings",
        "fieldname": "mrp_section",
        "fieldtype": "Section Break",
        "label": "MRP",
        "insert_after": "reorder_email_notify"
    })
    section.insert(ignore_permissions=True)

    # ---------- CHECKBOX FIELD ----------
    checkbox = frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Stock Settings",
        "fieldname": "enable_mrp",
        "fieldtype": "Check",
        "label": "Enable MRP",
        "insert_after": "mrp_section"
    })
    checkbox.insert(ignore_permissions=True)

    frappe.clear_cache(doctype="Stock Settings")
