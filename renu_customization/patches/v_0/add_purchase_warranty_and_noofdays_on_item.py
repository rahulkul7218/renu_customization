import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Add Purchase Warranty field (Link to Warranty)
    purchase_warranty_field = {
        "fieldname": "purchase_warranty",
        "label": "Purchase Warranty",
        "fieldtype": "Link",
        "options": "Warranty",
        "insert_after": "is_purchase_item",  # adjust placement
    }

    # Add Warranty Days field (Data)
    warranty_days_field = {
        "fieldname": "warranty_day",
        "label": "Warranty Days",
        "fieldtype": "Data",
        "insert_after": "purchase_warranty",
    }

    for field in [purchase_warranty_field, warranty_days_field]:
        create_custom_field("Item", field)
