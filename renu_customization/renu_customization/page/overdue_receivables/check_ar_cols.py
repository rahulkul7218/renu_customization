import frappe
from erpnext.accounts.report.accounts_receivable.accounts_receivable import execute

def test():
    filters = frappe._dict({
        "company": frappe.defaults.get_user_default("Company"),
        "report_date": frappe.utils.nowdate(),
        "range_1": 30,
        "range_2": 60,
        "range_3": 90,
        "range_4": 120,
        "based_on_payment_terms": 1
    })
    columns, data = execute(filters)
    for col in columns:
        print(f"Label: {col.get('label')}, Fieldname: {col.get('fieldname')}")

if __name__ == "__main__":
    test()
