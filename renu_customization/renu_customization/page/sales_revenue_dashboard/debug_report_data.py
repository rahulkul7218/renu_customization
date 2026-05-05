import frappe
import json
from renu_customization.renu_customization.report.sales_invoice_report.sales_invoice_report import execute
from frappe.utils import flt

def debug_report():
    # Use the company from the dashboard
    company = "Renu Electronics Pvt. Ltd."
    filters = frappe._dict({
        "from_date": "2026-04-01",
        "to_date": "2026-05-31",
        "company": company
    })
    
    # 1. Check Invoice Report Data
    columns, raw_data = execute(filters)
    invoice_net_sum = 0
    if raw_data:
        unique_inv = set()
        for row in raw_data:
            inv_id = row.get("invoice_id")
            if inv_id not in unique_inv:
                invoice_net_sum += flt(row.get("si_net_total") or 0)
                unique_inv.add(inv_id)
        print(f"Report Unique Invoice Net Total: {invoice_net_sum}")
    else:
        print("No report data returned")
        
    # 2. Check GL Master Income
    gl_data = frappe.db.sql(f"""
        SELECT SUM(gl.credit - gl.debit) as total_income
        FROM `tabGL Entry` gl
        JOIN `tabAccount` acc ON gl.account = acc.name
        WHERE gl.company = %(company)s 
        AND gl.posting_date >= %(from_date)s 
        AND gl.posting_date <= %(to_date)s 
        AND gl.is_cancelled = 0
        AND acc.root_type = 'Income'
    """, filters, as_dict=1)
    
    master_gl = flt(gl_data[0].total_income) if gl_data else 0
    print(f"GL Master Total Income: {master_gl}")
    print(f"Discrepancy: {master_gl - invoice_net_sum}")

if __name__ == "__main__":
    debug_report()
