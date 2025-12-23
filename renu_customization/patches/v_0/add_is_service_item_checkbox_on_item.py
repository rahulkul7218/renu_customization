import frappe

def execute():
    if not frappe.db.exists("Custom Field", {
        "dt": "Item",
        "fieldname": "custom_is_freight_item"
    }):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Item",
            "label": "Is Freight Item",
            "fieldname": "custom_is_freight_item",
            "fieldtype": "Check",
            "insert_after": "is_stock_item",  # you can change position
            "default": 0
        }).insert()

        frappe.db.commit()
