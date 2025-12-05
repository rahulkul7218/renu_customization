import frappe

def execute():
    # Update field label for 'for_buying'
    frappe.db.set_value(
        "DocField",
        {"parent": "Currency Exchange", "fieldname": "for_buying"},
        "label",
        "For Buying (Import)"
    )

    # Update field label for 'for_selling'
    frappe.db.set_value(
        "DocField",
        {"parent": "Currency Exchange", "fieldname": "for_selling"},
        "label",
        "For Selling (Export)"
    )

    # Clear cache so label changes reflect
    frappe.clear_cache(doctype="Currency Exchange")
