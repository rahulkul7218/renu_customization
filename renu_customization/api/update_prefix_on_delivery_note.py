import frappe

def set_prefix_digit(doc, method=None):
    # Only for Sales Invoice
    if doc.document_type == "Delivery Note" and doc.prefix_digits != 1:
        frappe.db.set_value("Document Naming Rule", doc.name, "prefix_digits", 1)
        doc.prefix_digits = 1
        frappe.db.commit()
