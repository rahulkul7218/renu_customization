# your_app/patches/make_item_fields_mandatory.py
import frappe

def execute():
    fields_to_update = [
        "item_name",
        "description",
        "standard_rate",
        "purchase_uom",
        "valuation_method",
        "item_defaults",
        "lead_time_days",
        "safety_stock"
    ]

    for fieldname in fields_to_update:
        frappe.db.set_value("DocField",
            {"parent": "Item", "fieldname": fieldname},
            "reqd", 1
        )
