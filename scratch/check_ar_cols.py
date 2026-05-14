import frappe
from erpnext.accounts.report.accounts_receivable.accounts_receivable import execute

def test_report_columns():
    filters = frappe._dict({
        "company": frappe.db.get_value("Company", {}, "name"),
        "report_date": "2026-05-13",
        "range_1": 30,
        "range_2": 60,
        "range_3": 90,
        "range_4": 120,
        "group_by_party": 0
    })
    columns, data = execute(filters)
    fieldnames = [c.get("fieldname") for c in columns if isinstance(c, dict)]
    print(f"Fieldnames: {fieldnames}")
    if data:
        print(f"Sample row keys: {data[0].keys()}")

if __name__ == "__main__":
    test_report_columns()
