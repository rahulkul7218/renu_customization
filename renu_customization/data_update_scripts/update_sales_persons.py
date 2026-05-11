import frappe
import json
import os

LOG_DIR = os.path.dirname(__file__)
LOG_SUCCESS = os.path.join(LOG_DIR, "sp_success.log")
LOG_ERROR = os.path.join(LOG_DIR, "sp_error.log")

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

    log_success("========== SALES PERSON UPDATE STARTED ==========")

    # Mappings
    HQ_OLD_NAMES = ["Ajay Bhagwat", "Amol Raikar", "Corporate Customer"]
    HQ_NEW_NAME = "HQ"
    
    SP_REGION_OLD_NAME = "Vaibhav Kulkarni"
    SP_REGION_MAPPING = {
        "India West (Mumbai)": "Vishal Patil",
        "India West (Gujrat)": "Vishal Patil",
        "India South (Chennai and Coimbatore)": "Vishal Patil",
        "India West (Rest of MH)": "Kalpak Medhekar",
        "IndiaWest (Rest of MH)": "Kalpak Medhekar",
        "India South (Bangalore)": "Kalpak Medhekar",
        "India North": "Kalpak Medhekar",
        "India South (AP and Telangana)": "Vinod Babu",
    }

    NEW_SALES_PERSONS = ["HQ", "Vishal Patil", "Kalpak Medhekar", "Vinod Babu"]
    TRANSACTION_DOCTYPES = ["Quotation", "Sales Order", "Delivery Note", "Sales Invoice", "Opportunity"]

    missing_report = []

    # 1. Verify/Create New Sales Persons
    log_success("Step 1: Verifying Sales Persons...")
    # Find root SP group
    root_sp = frappe.db.get_value("Sales Person", {"is_group": 1, "parent_sales_person": ["in", ["", None]]}, "name") or "Sales Team"
    log_success(f"  [i] Using root Sales Person group: {root_sp}")

    for sp in NEW_SALES_PERSONS:
        if not frappe.db.exists("Sales Person", sp):
            frappe.get_doc({
                "doctype": "Sales Person",
                "sales_person_name": sp,
                "parent_sales_person": root_sp,
                "enabled": 1
            }).insert(ignore_permissions=True)
            log_success(f"  [+] Created Sales Person: {sp}")

    # 2. HQ Mappings (Direct Link Fields)
    log_success("\nStep 2: Updating HQ mappings (Link Fields)...")
    link_fields = frappe.get_all("DocField", filters={"fieldtype": "Link", "options": "Sales Person"}, fields=["parent", "fieldname"])
    for field in link_fields:
        if field.parent == "Sales Team" or not frappe.db.table_exists(field.parent): continue
        for old in HQ_OLD_NAMES:
            # frappe.db.sql returns the number of affected rows for UPDATE
            count = frappe.db.sql(f"UPDATE `tab{field.parent}` SET `{field.fieldname}` = %s WHERE `{field.fieldname}` = %s", (HQ_NEW_NAME, old))
            if count:
                log_success(f"  [*] Updated {field.parent}.{field.fieldname}: {old} -> {HQ_NEW_NAME} ({count} records)")

    # 3. Update Sales Team Child Tables (HQ)
    log_success("\nStep 3: Updating HQ mappings (Sales Team tables)...")
    count = frappe.db.sql("UPDATE `tabSales Team` SET sales_person = %s WHERE sales_person IN %s", (HQ_NEW_NAME, tuple(HQ_OLD_NAMES)))
    log_success(f"  [*] Updated {count} entries in Sales Team tables for HQ.")

    # 4. Update Sales Team (Region-based for Vaibhav Kulkarni)
    log_success("\nStep 4: Updating region-based mappings for Vaibhav Kulkarni...")
    
    # Customers
    log_success("  Processing Customers...")
    for cust in frappe.get_all("Customer", fields=["name", "business_region_name"]):
        st_entries = frappe.get_all("Sales Team", filters={"parent": cust.name, "parenttype": "Customer", "sales_person": SP_REGION_OLD_NAME}, fields=["name"])
        if not st_entries: continue
        
        new_sp = SP_REGION_MAPPING.get(cust.business_region_name)
        if new_sp:
            for st in st_entries:
                frappe.db.set_value("Sales Team", st.name, "sales_person", new_sp)
            log_success(f"    [*] Updated Customer {cust.name}: {cust.business_region_name} -> {new_sp}")
        else:
            msg = f"MISSING MAPPING: Customer {cust.name} | Region: {cust.business_region_name}"
            log_error(msg)
            missing_report.append({"type": "Customer", "id": cust.name, "region": cust.business_region_name, "issue": "No SP Mapping"})

    # Transactions
    log_success("  Processing Transactions...")
    for dt in TRANSACTION_DOCTYPES:
        try:
            meta = frappe.get_meta(dt)
            cust_field = "customer" if meta.has_field("customer") else "party_name" if meta.has_field("party_name") else None
            if not cust_field: continue

            docs = frappe.get_all(dt, fields=["name", cust_field])
            processed_dt = 0
            for doc in docs:
                customer = doc.get(cust_field)
                st_entries = frappe.get_all("Sales Team", filters={"parent": doc.name, "parenttype": dt, "sales_person": SP_REGION_OLD_NAME}, fields=["name"])
                if not st_entries: continue

                region = frappe.db.get_value("Customer", customer, "business_region_name")
                new_sp = SP_REGION_MAPPING.get(region)
                if new_sp:
                    for st in st_entries:
                        frappe.db.set_value("Sales Team", st.name, "sales_person", new_sp)
                    processed_dt += 1
                else:
                    msg = f"MISSING MAPPING: {dt} {doc.name} | Region: {region or 'N/A'}"
                    log_error(msg)
                    missing_report.append({"type": dt, "id": doc.name, "region": region or "N/A", "issue": "No SP Mapping"})
            if processed_dt:
                log_success(f"    [*] Updated {processed_dt} records in {dt}")
        except Exception as e:
            log_error(f"    [!] Error in {dt}: {e}")

    frappe.db.commit()
    frappe.clear_cache()

    # Final Report
    if missing_report:
        log_error("\n--- MISSING MAPPING SUMMARY ---")
        for item in missing_report:
            log_error(f"  {item['type']}: {item['id']} | Region: {item['region']}")
        
        with open("sales_person_missing_report.json", "w") as f:
            json.dump(missing_report, f, indent=4)
        log_success(f"\n[ok] JSON Report saved to sales_person_missing_report.json")

    log_success("\n========== SALES PERSON UPDATE COMPLETED ==========")

if __name__ == "__main__":
    execute()
