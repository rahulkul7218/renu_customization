# import frappe

# def execute():
#     if not frappe.db.exists("Document Naming Rule", {"document_type": "Sales Invoice", "prefix": "YY.D1000"}):
#         rule = frappe.get_doc({
#             "doctype": "Document Naming Rule",
#             "document_type": "Sales Invoice",
#             "prefix": "YY.D1000",
#             "counter": 0,
#             "digits": 0,
#             "priority": 0,
#             "conditions": [
#                 {
#                     "field": "invoice_type",
#                     "condition": "=",
#                     "value": "Product Domestic"
#                 }
#             ]
#         })
#         rule.insert(ignore_permissions=True)
#         frappe.db.commit()

# import frappe

# def execute():
#     # Check if the rule already exists
#     rule_name = frappe.db.exists(
#         "Document Naming Rule",
#         {"document_type": "Sales Invoice", "prefix": "YY.D1000"}
#     )

#     if not rule_name:
#         # If not exists, create with both conditions
#         rule = frappe.get_doc({
#             "doctype": "Document Naming Rule",
#             "document_type": "Sales Invoice",
#             "prefix": "YY.D1000",
#             "counter": 0,
#             "digits": 0,
#             "priority": 0,
#             "conditions": [
#                 {
#                     "field": "invoice_type",
#                     "condition": "=",
#                     "value": "Product Domestic"
#                 },
#                 {
#                     "field": "invoice_typ",
#                     "condition": "=",
#                     "value": "Product Domestic"
#                 }
#             ]
#         })
#         rule.insert(ignore_permissions=True)
#     else:
#         # If exists, update conditions by appending new one (if not already there)
#         rule = frappe.get_doc("Document Naming Rule", rule_name)
#         exists = any(
#             cond.field == "invoice_typ" and cond.value == "Product Domestic"
#             for cond in rule.conditions
#         )
#         if not exists:
#             rule.append("conditions", {
#                 "field": "invoice_typ",
#                 "condition": "=",
#                 "value": "Product Domestic"
#             })
#             rule.save(ignore_permissions=True)

#     frappe.db.commit()
