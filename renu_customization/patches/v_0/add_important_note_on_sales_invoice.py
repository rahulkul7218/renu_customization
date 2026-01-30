import frappe

def execute():
    # Define your custom field
    field_name = "important_notes"

    # Check if field already exists
    if frappe.db.exists("Custom Field", f"Sales Invoice-{field_name}"):
        return

    # Create the custom field
    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Sales Invoice",
        "fieldname": field_name,
        "label": "Important Note",
        "fieldtype": "Small Text",
        "in_list_view": 1,
        "allow_on_submit": 1,
        "insert_after": "gst_vehicle_type"
    }).insert(ignore_permissions=True)

    frappe.clear_cache()
