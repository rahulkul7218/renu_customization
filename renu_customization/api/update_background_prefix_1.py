# import frappe

# def set_prefix_digits(doc, method=None):
#     # Apply rule only for Sales Invoice and Delivery Note
#     if doc.document_type in ["Sales Invoice", "Delivery Note", "Sales Order"] and doc.prefix_digits != 1:
#         frappe.db.set_value("Document Naming Rule", doc.name, "prefix_digits", 1)
#         doc.prefix_digits = 1
#         frappe.db.commit()
