import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field_name = "pick_list"
    doctype = "Delivery Note"

    # check if field already exists
    if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": field_name}):
        create_custom_field(doctype, {
            "fieldname": field_name,
            "label": "Pick List",
            "fieldtype": "Link",
            "options": "Pick List",
            "insert_after": "posting_time",
        })
        frappe.clear_cache(doctype=doctype)
