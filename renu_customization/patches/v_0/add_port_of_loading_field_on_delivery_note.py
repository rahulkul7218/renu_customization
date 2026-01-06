import frappe

def execute():
    if not frappe.db.exists("DocType", "Delivery Note"):
        return

    # Check if field already exists
    if frappe.db.exists("Custom Field", {
        "dt": "Delivery Note",
        "fieldname": "port_of_loading"
    }):
        return

    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Delivery Note",
        "label": "Port of Loading",
        "fieldname": "port_of_loading",
        "default": "Mumbai",
        "fieldtype": "Link",
        "options": "Port of Loading",
        "insert_after": "vesselorflightno",  # you can change position
        
    }).insert(ignore_permissions=True)

    frappe.db.commit()
