import frappe
def execute():
    frappe.connect()
    print("--- TARGET SP COUNTS ---")
    res = frappe.db.sql("SELECT sales_person, count(*) as count FROM `tabSales Team` WHERE sales_person IN ('Vineet Gupta', 'HQ') GROUP BY sales_person", as_dict=True)
    print(res)
execute()
