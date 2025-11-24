import frappe

def execute():
    # Check if custom field already exists
    if not frappe.db.exists("Custom Field", "Sales Order Item-customer_acknowledge_date"):
        
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Sales Order Item",
            "fieldname": "customer_acknowledge_date",
            "label": "Customer Acknowledge Date",
            "fieldtype": "Date",
            "insert_after": "delivery_date",
            "in_list_view": 1,
            "allow_on_submit": 1
        }).insert()

        frappe.db.commit()
