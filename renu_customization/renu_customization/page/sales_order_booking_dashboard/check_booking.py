import frappe
from renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard import get_dashboard_data

def check():
    frappe.set_user("Administrator")
    filters = {"company": "RENU FACTORY AUTOMATION PVT. LTD"}
    result = get_dashboard_data(filters)
    
    print(f"--- Detailed Dashboard Totals for {filters['company']} ---")
    summary = result.get("summary", [])
    if not summary:
        print("No summary found in result keys:", result.keys())
    for card in summary:
        print(f"{card['label']}: {card['value']}")

if __name__ == "__main__":
    check()
