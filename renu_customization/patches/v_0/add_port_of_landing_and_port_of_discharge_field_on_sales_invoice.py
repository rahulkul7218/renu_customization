import frappe

def execute():
    # 1️⃣ Add "Port of Loading"
    if not frappe.db.exists("Custom Field", 
            {"dt": "Sales Invoice", "fieldname": "port_of_loading"}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Sales Invoice",
            "fieldname": "port_of_loading",
            "label": "Port of Loading",
            "fieldtype": "Link",
            "options": "Port of Loading",
            "default": "Mumbai",
            "insert_after": "freight_prepared_by"
           
        }).insert()
        print("✔ Added Port of Loading field")

    # 2️⃣ Add "Port of Discharge"
    if not frappe.db.exists("Custom Field",
            {"dt": "Sales Invoice", "fieldname": "port_of_discharg"}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Sales Invoice",
            "fieldname": "port_of_discharg",
            "label": "Port of Discharge",
            "fieldtype": "Link",
            "options": "Port of Discharge",
            "insert_after": "vessel_flight_no"
            
        }).insert()
        print("✔ Added Port of Discharge field")

    frappe.clear_cache()
