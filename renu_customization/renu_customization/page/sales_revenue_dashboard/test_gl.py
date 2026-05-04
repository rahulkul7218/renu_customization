import frappe
from frappe.utils import flt

def check_gl_income(from_date, to_date, company):
    # This query matches the final robust logic in sales_revenue_dashboard.py
    gl_data = frappe.db.sql(f"""
        SELECT SUM(gl.credit - gl.debit) as total_income
        FROM `tabGL Entry` gl
        JOIN `tabAccount` acc ON gl.account = acc.name
        WHERE gl.company = %(company)s 
        AND gl.posting_date >= %(from_date)s 
        AND gl.posting_date <= %(to_date)s 
        AND gl.is_cancelled = 0
        AND acc.root_type = 'Income'
    """, {"company": company, "from_date": from_date, "to_date": to_date}, as_dict=1)
    
    return gl_data[0].total_income if gl_data else 0

if __name__ == "__main__":
    # Example execution
    company = "Renu Electronics Pvt. Ltd." # Standard for this environment
    # Use dates from user's current view
    print(f"GL Master Income: {check_gl_income('2026-04-01', '2026-05-31', company)}")
