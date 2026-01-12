import frappe

def execute():
    if not frappe.db.exists("Custom Field", "Supplier-email_send_to_supplier_on_mrp"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Supplier",
            "fieldname": "email_send_to_supplier_on_mrp",
            "label": "Email Send to Supplier on MRP",
            "fieldtype": "Check",
            "insert_after": "is_transporter"
            
        }).insert()
        frappe.db.commit()
