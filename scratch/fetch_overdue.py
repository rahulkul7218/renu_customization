import frappe
from frappe.utils import nowdate

def fetch_overdue_invoices():
    # Standard ERPNext definition of Overdue
    invoices = frappe.get_all("Sales Invoice", 
        filters={
            "docstatus": 1,
            "outstanding_amount": [">", 0],
            "is_return": 0,
            "due_date": ["<", nowdate()]
        }, 
        fields=["name", "customer", "due_date", "outstanding_amount", "status"]
    )
    
    print(f"Total Overdue Invoices found: {len(invoices)}")
    for inv in invoices[:10]: # Show first 10
        print(f"Name: {inv.name}, Customer: {inv.customer}, Due: {inv.due_date}, Outstanding: {inv.outstanding_amount}, Status: {inv.status}")

if __name__ == "__main__":
    fetch_overdue_invoices()
