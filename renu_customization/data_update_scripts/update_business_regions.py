import frappe
import os

LOG_DIR = os.path.dirname(__file__)
LOG_SUCCESS = os.path.join(LOG_DIR, "br_success.log")
LOG_ERROR = os.path.join(LOG_DIR, "br_error.log")

def log_success(message):
    print(f"[OK] {message}")
    with open(LOG_SUCCESS, "a") as f:
        f.write(message + "\n")

def log_error(message):
    print(f"[ERROR] {message}")
    with open(LOG_ERROR, "a") as f:
        f.write(message + "\n")

def execute():
    # Clear existing logs
    for f in [LOG_SUCCESS, LOG_ERROR]:
        if os.path.exists(f): os.remove(f)

    log_success("========== BUSINESS REGION UPDATE STARTED ==========")

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
    log_success("Step 1: Updating Customers...")
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
            log_success(f"  [*] Updated Customer {cust.name}: '{cust.business_region_name}' -> '{target['target_name']}'")
    log_success(f"  [ok] Total Updated: {cust_updated} Customers.")

    # 2. Update Business Region Code Master
    log_success("\nStep 2: Updating Business Region Code records...")
    brc_updated = 0
    
    # Track processed target names to avoid trying to update multiple sources to the same target
    processed_targets = set()

    for old_name, target in REGION_UPDATE_MAP.items():
        target_name = target["target_name"]
        target_code = target["target_code"]
        
        brc_entries = frappe.get_all("Business Region Code", filters={"business_region_name": old_name}, fields=["name"])
        for entry in brc_entries:
            # Check if this target name or code is already handled
            if target_name in processed_targets:
                log_error(f"  [i] Target '{target_name}' already processed. Skipping redundant source '{old_name}'.")
                continue

            # Check if another record already has this target name or code
            existing_name = frappe.db.exists("Business Region Code", {"business_region_name": target_name})
            existing_code = frappe.db.get_value("Business Region Code", {"business_region_code": target_code}, "name")
            
            if existing_name and existing_name != entry.name:
                log_error(f"  [i] Target name '{target_name}' already exists. Source '{old_name}' is now redundant.")
                processed_targets.add(target_name)
                continue
                
            if existing_code and existing_code != entry.name:
                log_error(f"  [i] Target code '{target_code}' already exists on '{existing_code}'. Skipping source '{old_name}'.")
                processed_targets.add(target_name)
                continue

            # Update the record
            frappe.db.set_value("Business Region Code", entry.name, {
                "business_region_name": target_name,
                "business_region_code": target_code
            }, update_modified=False)
            brc_updated += 1
            processed_targets.add(target_name)
            log_success(f"  [*] Updated Master {entry.name}: '{old_name}' -> '{target_name}' (Code: {target_code})")

    frappe.db.commit()
    frappe.clear_cache()
    log_success(f"  [ok] Total Updated: {brc_updated} master records.")
    log_success("\n========== BUSINESS REGION UPDATE COMPLETED ==========")

if __name__ == "__main__":
    execute()
