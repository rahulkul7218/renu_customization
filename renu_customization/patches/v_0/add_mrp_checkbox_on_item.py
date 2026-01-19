import frappe

def execute():
    if not frappe.db.exists("Custom Field", "Item-mrp"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Item",
            "fieldname": "mrp",
            "label": "MRP",
            "fieldtype": "Check",
            "insert_after": "has_variants"  
        }).insert()
        frappe.db.commit()
