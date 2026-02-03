import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    fieldname = "party_item_code"
    doctype = "Sales Order Item"

    if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": fieldname}):
        create_custom_field(doctype, {
            "fieldname": fieldname,
            "label": "Party Item Code",
            "fieldtype": "Data",
            "insert_after": "item_name",
            "reqd": 0,
            "in_list_view": 1,
        })
        frappe.clear_cache(doctype=doctype)
