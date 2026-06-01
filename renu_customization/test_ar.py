import frappe
from frappe.utils import flt

def test():
    frappe.init(site='renu-demo.localhost')
    frappe.connect()
    
    from erpnext.accounts.report.accounts_receivable.accounts_receivable import execute as execute_ar
    from erpnext.accounts.report.accounts_payable.accounts_payable import execute as execute_ap
    
    filters = frappe._dict({"company": "Renu Fashion Apparels Private Limited", "report_date": "2026-06-01", "ageing_based_on": "Due Date"})
    try:
        cols, data = execute_ar(filters)
        total = 0
        print(f"AR rows returned: {len(data) if data else 0}")
        if data:
            print("AR First row:", data[0])
            print("AR Last row:", data[-1])
            for row in data:
                if isinstance(row, dict) and not row.get("is_total_row") and "'" not in str(row.get('party', '')) and "Total" not in str(row.get('party', '')):
                    total += flt(row.get("outstanding"))
        print("AR Total:", total)
    except Exception as e:
        print("AR error:", e)

if __name__ == "__main__":
    test()
