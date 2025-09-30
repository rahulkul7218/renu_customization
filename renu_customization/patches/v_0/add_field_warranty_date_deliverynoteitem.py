import frappe

def execute():
    # Check if the field already exists
    if not frappe.db.has_column("Delivery Note Item", "warranty_date"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Delivery Note Item",
            "label": "Warranty Date",
            "fieldname": "warranty_date",
            "fieldtype": "Date",
            "insert_after": "warranty_begins"
        }).insert()
        frappe.db.commit()
