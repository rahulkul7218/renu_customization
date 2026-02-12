import frappe

def execute():
    if not frappe.db.exists("Custom Field", "Purchase-Order-send_email_mrp"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Purchase Order",
            "fieldname": "send_email_mrp",
            "label": "Send Email MRP",
            "fieldtype": "Check",
            "insert_after": "add_email_on_purchase_order",
            "fetch_from":"supplier.email_send_to_supplier_on_mrp"
            
            
        }).insert()
        frappe.db.commit()
