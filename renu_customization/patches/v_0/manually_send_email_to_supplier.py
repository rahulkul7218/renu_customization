import frappe

def execute():
    if not frappe.db.exists("Custom Field", "Purchase-Order-manually_send_email_supplier"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Purchase Order",
            "fieldname": "manually_send_email_supplier",
            "label": "Send Email",
            "fieldtype": "Check",
            "insert_after": "send_email_mrp",
            "allow_on_submit": 1
            
        }).insert()
        frappe.db.commit()
