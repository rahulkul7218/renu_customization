import frappe

def execute():
    if not frappe.db.exists("Custom Field", {"dt": "Serial No", "fieldname": "warranty_days"}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Serial No",
            "fieldname": "warranty_days",
            "label": "Warranty Days",
            "fieldtype": "Data",   # As per your request
            "insert_after": "warranty_period",
            "read_only": 1
        }).insert()
