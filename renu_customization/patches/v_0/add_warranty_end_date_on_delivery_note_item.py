import frappe

def execute():
    doctype = "Delivery Note Item"
    fieldname = "warranty_end_date"

    # Check if field already exists
    if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": fieldname}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": doctype,
            "fieldname": fieldname,
            "label": "Warranty End Date",
            "fieldtype": "Date",
            "insert_after": "warranty_date"
            
        }).insert(ignore_permissions=True)
        frappe.db.commit()
        print(f"Custom Field '{fieldname}' added to {doctype}.")
    else:
        print(f"Custom Field '{fieldname}' already exists in {doctype}.")
