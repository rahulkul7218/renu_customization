import frappe
from erpnext.accounts.report.accounts_receivable.accounts_receivable import execute

def test_report():
    filters = frappe._dict({
        "company": "Renu Electronics Pvt. Ltd.", # Guessing company name or leaving blank
        "report_date": "2026-05-13",
        "range_1": 30,
        "range_2": 60,
        "range_3": 90,
        "range_4": 120
    })
    columns, data = execute(filters)
    print(f"Columns: {len(columns)}")
    if data:
        print("First row sample:")
        print(data[0])
    else:
        print("No data found")

if __name__ == "__main__":
    test_report()
