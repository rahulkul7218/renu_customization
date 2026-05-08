import frappe
from renu_customization.renu_customization.report.sales_order_report.sales_order_report import execute

def run():
    frappe.set_user("Administrator")
    filters = {"company": "RENU FACTORY AUTOMATION PVT. LTD"}
    columns, data = execute(filters)
    
    # Indices from get_columns():
    # 21: Booked Net Total
    # 22: Total Net Amount (INR) (Net of SC)
    # 23: Returned Net Total
    # 24: Delivered Net Total
    # 25: Net Delivered Net Total
    # 26: Balance Net Total
    
    total_booked_net = 0
    total_net_amt = 0
    total_returned = 0
    total_delivered_gross = 0
    total_delivered_net = 0
    total_balance = 0
    
    for row in data:
        # Since as_list=True in get_data, row is a tuple/list
        total_booked_net += frappe.utils.flt(row[21])
        total_net_amt += frappe.utils.flt(row[22])
        total_returned += frappe.utils.flt(row[23])
        total_delivered_gross += frappe.utils.flt(row[24])
        total_delivered_net += frappe.utils.flt(row[25])
        total_balance += frappe.utils.flt(row[26])
        
    print(f"Report Booked Net Total: {total_booked_net}")
    print(f"Report Total Net Amount (Net of SC): {total_net_amt}")
    print(f"Report Returned Total: {total_returned}")
    print(f"Report Delivered (Gross): {total_delivered_gross}")
    print(f"Report Delivered (Net): {total_delivered_net}")
    print(f"Report Balance (Pending): {total_balance}")

if __name__ == "__main__":
    run()
