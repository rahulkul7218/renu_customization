import frappe

def execute():
    # Check if property setter already exists
    existing = frappe.db.exists(
        "Property Setter",
        {
            "doc_type": "Purchase Order Item",
            "field_name": "item_name",
            "property": "reqd"
        }
    )

    if existing:
        # Update if exists
        frappe.db.set_value("Property Setter", existing, "value", 0)
        frappe.db.commit()
        return

    # Create property setter
    frappe.get_doc({
        "doctype": "Property Setter",
        "doctype_or_field": "DocField",
        "doc_type": "Purchase Order Item",
        "field_name": "item_name",
        "property": "reqd",
        "value": 0,
        "property_type": "Check"
    }).insert(ignore_permissions=True)

    frappe.db.commit()
