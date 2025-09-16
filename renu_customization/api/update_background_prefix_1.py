import frappe

def set_prefix_digits(doc, method=None):
    # Only for Sales Invoice
    if doc.document_type == "Sales Invoice" and doc.prefix_digits != 1:
        frappe.db.set_value("Document Naming Rule", doc.name, "prefix_digits", 1)
        doc.prefix_digits = 1
        frappe.db.commit()
