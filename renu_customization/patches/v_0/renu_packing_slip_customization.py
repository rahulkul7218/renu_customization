import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    doctype = "Packing Slip"

    custom_fields = [
        {"fieldname": "other_tab", "label": "Others", "fieldtype": "Tab Break","insert_after": "amended_from"},
        # {"fieldname": "country_of_origin", "label": "Country of Origin", "fieldtype": "Link","options": "Country", "insert_after": "other_tab"},

        # Totals and Remarks
        {"fieldname": "remarks", "label": "Remarks", "fieldtype": "Text", "insert_after": "total_boxes"},

    ]

    for field in custom_fields:
        if not frappe.db.exists("Custom Field", f"{doctype}-{field['fieldname']}"):
            create_custom_field(doctype, field)
