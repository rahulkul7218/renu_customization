import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    if not frappe.db.exists(
        "Custom Field",
        {"dt": "Sales Invoice", "fieldname": "lut_from_date"}
    ):
        create_custom_field(
            "Sales Invoice",
            {
                "label": "LUT Start Date",
                "fieldname": "lut_from_date",
                "fieldtype": "Data",
                "insert_after": "lut_no",
                "read_only": 1,
            }
        )
