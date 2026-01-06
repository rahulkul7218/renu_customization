import frappe

def execute():
    # Check if field already exists
    if frappe.db.exists("DocField", {
        "parent": "Delivery Note",
        "fieldname": "sales_order"
    }):
        return

    # Create new DocField
    docfield = frappe.get_doc({
        "doctype": "DocField",
        "parent": "Delivery Note",
        "parenttype": "DocType",
        "parentfield": "fields",
        "fieldname": "sales_order",
        "label": "Sales Order",
        "fieldtype": "Link",
        "options": "Sales Order",
        "insert_after": "distance"   # you can change position
        
    })

    docfield.insert(ignore_permissions=True)

    # Clear cache so field appears
    frappe.clear_cache()
