import frappe

def execute():
    if not frappe.db.exists("Custom Field", {
        "dt": "Delivery Note",
        "fieldname": "sales_order"
    }):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Delivery Note",
            "label": "Sales Order",
            "fieldname": "sales_order",
            "fieldtype": "Link",
            "options": "Sales Order",
            "insert_after": "distance",  # adjust if needed
            "reqd": 0,
            "read_only": 0
        }).insert()

        frappe.db.commit()
