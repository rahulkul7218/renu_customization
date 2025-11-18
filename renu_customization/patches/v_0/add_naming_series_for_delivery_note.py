# import frappe

# def execute():
#     # Run only if rule does not exist
#     if not frappe.db.exists("Document Naming Rule", {
#         "document_type": "Delivery Note",
#         "prefix": "YY.C5000"
#     }):
#         rule = frappe.get_doc({
#             "doctype": "Document Naming Rule",
#             "document_type": "Delivery Note",  # fixed (you had "Delivery Note")
#             "prefix": "YY.C5000",
#             "counter": 0,
#             "prefix_digits": 1,
#             "priority": 1,
#         })
#         rule.insert(ignore_permissions=True)
