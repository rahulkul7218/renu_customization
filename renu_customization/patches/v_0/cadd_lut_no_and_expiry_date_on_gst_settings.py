import frappe

def execute():

    # Create LUT No Field
    if not frappe.db.exists("Custom Field", "GST Settings-lut_no"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "GST Settings",
            "fieldname": "lut_no",
            "label": "LUT No",
            "fieldtype": "Data",
            "insert_after": "enable_overseas_transactions"
           
        }).insert(ignore_permissions=True)
    
    # Create LUT Expiry Date Field
    if not frappe.db.exists("Custom Field", "GST Settings-lut_expiry_date"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "GST Settings",
            "fieldname": "lut_expiry_date",
            "label": "LUT Expiry Date",
            "fieldtype": "Date",
            "insert_after": "lut_no"
           
        }).insert(ignore_permissions=True)
