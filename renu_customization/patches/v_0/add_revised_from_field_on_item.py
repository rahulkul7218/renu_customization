import frappe

def execute():
    if not frappe.db.exists("Custom Field", {
        "dt": "Item",
        "fieldname": "custom_revision"
    }):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Item",
            "label": "Revised From",
            "fieldname": "custom_revision",
            "fieldtype": "Data",
            "read_only": 1,
            "insert_after": "stock_uom",  # change if you want another position
        }).insert()

    frappe.clear_cache(doctype="Item")
