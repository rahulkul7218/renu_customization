# your_app/patches/make_item_fields_mandatory.py
import frappe

def execute():
    fields_to_update = [
        "email_id",
        "phone",
        # "pincode",
        # "gstin",
        # "state"
        
    ]

    for fieldname in fields_to_update:
        frappe.db.set_value("DocField",
            {"parent": "Address", "fieldname": fieldname},
            "reqd", 1
        )
