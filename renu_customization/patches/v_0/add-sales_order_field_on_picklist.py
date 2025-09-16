import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field = {
        "fieldname": "sales_order",
        "label": "Sales Order",
        "fieldtype": "Link",
        "options": "Sales Order",
        "insert_after": "ignore_pricing_rule",
    }

    create_custom_field("Pick List", field)
