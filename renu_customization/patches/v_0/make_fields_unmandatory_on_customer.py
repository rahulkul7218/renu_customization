import frappe

def execute():
    fields_to_update = [
        "customer_primary_address",
        "customer_primary_contact",
    ]

    for fieldname in fields_to_update:
        frappe.db.set_value(
            "DocField",
            {"parent": "Customer", "fieldname": fieldname},
            "reqd",
            0  # make unmandatory
        )

    frappe.clear_cache(doctype="Customer")
