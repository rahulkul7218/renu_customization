import frappe
def run():
    res1 = frappe.db.sql("SELECT SUM(base_net_total) FROM `tabSales Order` WHERE docstatus=1")
    res2 = frappe.db.sql("SELECT SUM(base_net_total) FROM `tabSales Order` WHERE docstatus=2")
    print(f"Docstatus 1 (Submitted): {res1[0][0]}")
    print(f"Docstatus 2 (Cancelled): {res2[0][0]}")
