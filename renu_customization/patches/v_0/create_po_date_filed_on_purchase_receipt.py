import frappe
from frappe.model.utils.rename_field import rename_field

def execute():
    doctype = "Purchase Receipt"
    fieldname = "purchase_order_date"

    # check if field already exists
    if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": fieldname}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": doctype,
            "fieldname": fieldname,
            "label": "Purchase Order Date",
            "fieldtype": "Date",
            "insert_after": "purchase_order_no",
            "read_only": 1,
            "fetch_from": "purchase_order_no.transaction_date",
            "depends_on": "eval:doc.purchase_order_no"  # only show if PO is selected
        }).insert()
        frappe.clear_cache(doctype=doctype)
