import frappe
from frappe.model.utils.rename_field import rename_field

def execute():
    doctype = "Purchase Receipt"
    fieldname = "purchase_order_no"

    # Check if field already exists
    if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": fieldname}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": doctype,
            "fieldname": fieldname,
            "label": "Purchase Order No",
            "fieldtype": "Link",
            "options": "Purchase Order",
            "insert_after": "po_no",
             "read_only": 1
        }).insert(ignore_permissions=True)
        frappe.clear_cache(doctype=doctype)
