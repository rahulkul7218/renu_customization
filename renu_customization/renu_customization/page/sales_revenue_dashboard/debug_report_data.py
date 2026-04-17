import frappe
import json
from renu_customization.renu_customization.report.sales_invoice_report.sales_invoice_report import execute

def debug_report():
    # Try with a small date range
    filters = frappe._dict({
        "from_date": "2025-01-01",
        "to_date": "2025-12-31"
    })
    
    columns, raw_data = execute(filters)
    
    if raw_data:
        first_row = raw_data[0]
        print("First row keys:", first_row.keys())
        # Check standard names
        possible_keys = ["invoice_id", "name", "parent", "customer", "customer_name", "item_code", "posting_date", "invoice_date"]
        for k in possible_keys:
            print(f"{k}: {first_row.get(k)}")
    else:
        print("No data returned")

if __name__ == "__main__":
    debug_report()
