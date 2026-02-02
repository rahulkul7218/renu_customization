import frappe


def execute():
    # Short Closed Qty field
    if not frappe.db.exists(
        "Custom Field",
        {"dt": "Sales Order Item", "fieldname": "custom_short_closed_qty"},
    ):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Sales Order Item",
            "label": "Shot Closed Qty",
            "fieldname": "custom_short_closed_qty",
            "fieldtype": "Float",
            "insert_after": "production_plan_qty",
        }).insert(ignore_permissions=True)

    # Status field
    if not frappe.db.exists(
        "Custom Field",
        {"dt": "Sales Order Item", "fieldname": "custom_status"},
    ):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Sales Order Item",
            "label": "Status",
            "fieldname": "custom_status",
            "fieldtype": "Select",
            "options": "Open\nShort Close",
            "default": "Open",
            "insert_after": "custom_short_closed_qty",
        }).insert(ignore_permissions=True)
