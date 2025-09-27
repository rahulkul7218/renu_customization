import frappe

def execute():
    if not frappe.db.exists("Document Naming Rule", {"document_type": "Sales Order", "prefix": "YY.ESO2000"}):
        rule = frappe.get_doc({
            "doctype": "Document Naming Rule",
            "document_type": "Sales Order",
            "prefix": "YY.ESO2000",
            "counter": 0,
            "digits": 1,
            "priority": 1,
            "conditions": [
                {
                    "field": "invoice_type",
                    "condition": "=",
                    "value": "Product Export"
                }
            ]
        })
        rule.insert(ignore_permissions=True)
        frappe.db.commit()