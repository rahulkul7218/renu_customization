import frappe

def execute():
    # Check if custom field already exists
    if frappe.db.exists("Custom Field", "Purchase Order Item-open_qty"):
        return

    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Purchase Order Item",
        "fieldname": "open_qty",
        "label": "Open Qty",
        "fieldtype": "Float",
        "insert_after": "received_qty",
        "in_list_view": 1
    }).insert(ignore_permissions=True)

    frappe.db.commit()
