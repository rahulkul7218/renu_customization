import frappe
 
def execute():
    if not frappe.db.exists("Document Naming Rule", {"document_type": "Sales Invoice", "prefix": "YY.C5000"}):
        rule = frappe.get_doc({
            "doctype": "Document Naming Rule",
            "document_type": "Delivery Note",
            "prefix": "YY.C5000",
            "counter": 0,
            "digits": 1,
            "priority": 1,
            
        })
        rule.insert(ignore_permissions=True)
        frappe.db.commit()
 
 