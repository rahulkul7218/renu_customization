import frappe

def execute():
    if not frappe.db.exists("Custom Field", {
        "dt": "Delivery Note",
        "fieldname": "pre_carriage_by"
    }):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Delivery Note",
            "label": "Pre-Carriage by",
            "fieldname": "pre_carriage_by",
            "fieldtype": "Link",
            "options": "Pre Carriage Mode",
            "insert_after": "port_of_discharge",  # adjust if needed
            "reqd": 0,
            "read_only": 0
        }).insert()

        frappe.db.commit()
