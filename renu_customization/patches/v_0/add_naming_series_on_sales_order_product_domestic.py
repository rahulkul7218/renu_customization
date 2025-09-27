import frappe

def execute():
    if not frappe.db.exists("Document Naming Rule", {"document_type": "Sales Order", "prefix": "YY.DSO1000"}):
        rule = frappe.get_doc({
            "doctype": "Document Naming Rule",
            "document_type": "Sales Order",
            "prefix": "YY.DSO1000",
            "counter": 0,
            "digits": 0,
            "priority": 0,
            "conditions": [
                {
                    "field": "invoice_type",
                    "condition": "=",
                    "value": "Product Domestic"
                }
            ]
        })
        rule.insert(ignore_permissions=True)
        frappe.db.commit()