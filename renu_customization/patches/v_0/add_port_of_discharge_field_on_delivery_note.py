import frappe

def execute():
    if not frappe.db.exists("DocType", "Delivery Note"):
        return

    # Check if field already exists
    if frappe.db.exists("Custom Field", {
        "dt": "Delivery Note",
        "fieldname": "port_of_discharge"
    }):
        return

    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Delivery Note",
        "label": "Port of Discharge",
        "fieldname": "port_of_discharge",
        "fieldtype": "Link",
        "options": "Port of Discharge",
        "insert_after": "port_of_loading"  # you can change position
        
    }).insert(ignore_permissions=True)

    frappe.db.commit()
