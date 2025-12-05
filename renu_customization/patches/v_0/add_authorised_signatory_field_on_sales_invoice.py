import frappe

def execute():
    doctype = "Sales Invoice"
    fieldname = "authorised_signatory"

    # If custom field already exists, do nothing
    if frappe.db.exists("Custom Field", f"{doctype}-{fieldname}"):
        return

    # Create Custom Field
    cf = frappe.get_doc({
        "doctype": "Custom Field",
        "dt": doctype,
        "fieldname": fieldname,
        "label": "Authorised Signatory",
        "fieldtype": "Link",
        "options": "Authorised Signatory",
        "insert_after": "is_export_with_gst"
    })

    cf.insert(ignore_permissions=True)
    frappe.clear_cache(doctype=doctype)
