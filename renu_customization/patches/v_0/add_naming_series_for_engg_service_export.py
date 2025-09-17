import frappe
 
def execute():
    if not frappe.db.exists("Document Naming Rule", {"document_type": "Sales Invoice", "prefix": "YY.N4000"}):
        rule = frappe.get_doc({
            "doctype": "Document Naming Rule",
            "document_type": "Sales Invoice",
            "prefix": "YY.N4000",
            "counter": 1,
            "digits": 1,
            "priority": 1,
            "conditions": [
                {
                    "field": "invoice_type",
                    "condition": "=",
                    "value": "Engineering Service Export"
                }
            ]
        })
        rule.insert(ignore_permissions=True)
        frappe.db.commit()
 