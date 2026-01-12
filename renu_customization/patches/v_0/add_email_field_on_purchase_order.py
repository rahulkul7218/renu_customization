import frappe

def execute():
    if not frappe.db.exists("Custom Field", "Purchase-Order-add_email_on_purchase_order"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Purchase Order",
            "fieldname": "add_email_on_purchase_order",
            "label": "Email",
            "fieldtype": "Data",
            "insert_after": "supplier"
            
        }).insert()
        frappe.db.commit()
