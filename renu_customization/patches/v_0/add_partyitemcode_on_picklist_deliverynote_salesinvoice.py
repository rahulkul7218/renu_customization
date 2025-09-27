import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    doctypes = [
        "Pick List Item",
        "Delivery Note Item",
        "Sales Invoice Item"
    ]

    for doctype in doctypes:
        if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": "party_item_code"}):
            create_custom_field(doctype, {
                "fieldname": "party_item_code",
                "label": "Party Item Code",
                "fieldtype": "Data",
                "insert_after": "item_name",
                "reqd": 0,          # not mandatory in these doctypes
                "in_list_view": 1   # show in child table list view
            })
            frappe.clear_cache(doctype=doctype)
