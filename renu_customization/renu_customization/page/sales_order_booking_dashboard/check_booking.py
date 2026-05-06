import frappe
from renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard import get_dashboard_data

def check():
    frappe.set_user("Administrator")
    company = "RENU FACTORY AUTOMATION PVT. LTD"
    filters = {"company": company}
    data = get_dashboard_data(filters)
    
    summary = {s['label']: s['value'] for s in data.get('summary', [])}
    
    print(f"\n--- All Time Sales Booking for {company} ---")
    for label, val in summary.items():
        print(f"{label}: {val} M")
