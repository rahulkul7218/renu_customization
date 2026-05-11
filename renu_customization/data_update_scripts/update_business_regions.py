import frappe
import os

LOG_FILE = os.path.join(os.path.dirname(__file__), "business_region_update.log")

def log(message):
    print(message)
    with open(LOG_FILE, "a") as f:
        f.write(message + "\n")

def execute():
    # Clear existing log if any
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)

    log("\n" + "="*50)
    log("BUSINESS REGION UPDATE STARTED")
    log("="*50 + "\n")

    REGION_UPDATE_MAP = {
        "India Corporate Customers": {"target_name": "India Corporate", "target_code": "16"},
        "House Accounts": {"target_name": "India Corporate", "target_code": "16"},
        
        "India Delhi NCR": {"target_name": "India North", "target_code": "8"},
        "North India": {"target_name": "India North", "target_code": "8"},
        
        "India South (Chennai)": {"target_name": "India South (Chennai and Coimbatore)", "target_code": "13"},
        "India South (Coimbatore)": {"target_name": "India South (Chennai and Coimbatore)", "target_code": "13"},
        
        "India South (Excluding Chennai, Coimbatore, Bangalore)": {"target_name": "India South (AP and Telangana)", "target_code": "18"},
        "India South (Excluding Chennai, Coimbatore, Bangalore": {"target_name": "India South (AP and Telangana)", "target_code": "18"},
        "India South (Hyderabad)": {"target_name": "India South (AP and Telangana)", "target_code": "18"},
        
        "India West (Guj.)": {"target_name": "India West (Gujrat)", "target_code": "11"},
        "IndiaWest (Guj.)": {"target_name": "India West (Gujrat)", "target_code": "11"},
        "India West (Gujrat)": {"target_name": "India West (Gujrat)", "target_code": "11"}
    }

    # 1. Update Customers
    log("Step 1: Updating Customers...")
    customers = frappe.get_all("Customer", fields=["name", "business_region_name"])
    cust_updated = 0
    for cust in customers:
        if cust.business_region_name in REGION_UPDATE_MAP:
            target = REGION_UPDATE_MAP[cust.business_region_name]
            frappe.db.set_value("Customer", cust.name, {
                "business_region_name": target["target_name"],
                "business_regions_code": target["target_code"]
            }, update_modified=False)
            cust_updated += 1
            log(f"  [*] Updated Customer {cust.name}: '{cust.business_region_name}' -> '{target['target_name']}'")
    log(f"  [ok] Total Updated: {cust_updated} Customers.")

    # 2. Update Business Region Code Master
    log("\nStep 2: Updating Business Region Code records...")
    brc_updated = 0
    for old_name, target in REGION_UPDATE_MAP.items():
        brc_entries = frappe.get_all("Business Region Code", filters={"business_region_name": old_name}, fields=["name"])
        for entry in brc_entries:
            if not frappe.db.exists("Business Region Code", {"business_region_name": target["target_name"]}):
                frappe.db.set_value("Business Region Code", entry.name, {
                    "business_region_name": target["target_name"],
                    "business_region_code": target["target_code"]
                }, update_modified=False)
                brc_updated += 1
                log(f"  [*] Updated Master {entry.name}: '{old_name}' -> '{target['target_name']}'")
            elif old_name == target["target_name"]:
                # Ensure code is correct even if name matches
                frappe.db.set_value("Business Region Code", entry.name, "business_region_code", target["target_code"], update_modified=False)

    frappe.db.commit()
    frappe.clear_cache()
    log(f"  [ok] Total Updated: {brc_updated} master records.")
    log("\n========== BUSINESS REGION UPDATE COMPLETED ==========\n")

if __name__ == "__main__":
    execute()
