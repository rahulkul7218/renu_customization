import frappe
import os
import sys
import pandas as pd
from datetime import datetime

# Logging setup
LOG_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_SUCCESS = os.path.join(LOG_DIR, "br_excel_success.log")
LOG_ERROR = os.path.join(LOG_DIR, "br_excel_error.log")

def log_with_time(message, log_file):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_message = f"[{timestamp}] {message}"
    print(formatted_message)
    with open(log_file, "a") as f:
        f.write(formatted_message + "\n")

def log_success(message):
    log_with_time(f"[OK] {message}", LOG_SUCCESS)

def log_error(message):
    log_with_time(f"[ERROR] {message}", LOG_ERROR)

def log_affected_records(doctype, fieldname, old_val):
    """Logs the names of records that will be updated."""
    records = frappe.get_all(doctype, filters={fieldname: old_val}, fields=["name"])
    if records:
        names = [r.name for r in records]
        count = len(names)
        preview = ", ".join(names[:50])
        suffix = "..." if count > 50 else ""
        log_success(f"    - {doctype}.{fieldname}: {count} records ({preview}{suffix})")
        return True
    return False

def ensure_brc_exists(name, code):
    """Ensures a Business Region Code entry exists."""
    if not frappe.db.exists("Business Region Code", {"business_region_name": name}):
        # Check if code exists on another record
        existing_code = frappe.db.get_value("Business Region Code", {"business_region_code": code}, "name")
        if existing_code:
            log_error(f"  [!] Cannot create Business Region '{name}' with code '{code}'. Code '{code}' already used by '{existing_code}'.")
            return False
            
        doc = frappe.get_doc({
            "doctype": "Business Region Code",
            "business_region_name": name,
            "business_region_code": code
        })
        doc.insert(ignore_permissions=True)
        log_success(f"  [+] Created Business Region Code: {name} ({code})")
    return True

def update_region(old_name, new_name, new_code):
    """Updates a Business Region across Customer and Business Region Code records."""
    log_success(f"  [*] Starting update for '{old_name}' -> '{new_name}' (Code: {new_code})")
    
    # 1. Update Customers
    customers = frappe.get_all("Customer", filters={"business_region_name": old_name}, fields=["name"])
    if customers:
        cust_list = [c.name for c in customers]
        preview = ", ".join(cust_list[:50])
        suffix = "..." if len(cust_list) > 50 else ""
        log_success(f"    - Updating {len(cust_list)} Customers: ({preview}{suffix})")
        
        for name in cust_list:
            frappe.db.set_value("Customer", name, {
                "business_region_name": new_name,
                "business_regions_code": new_code
            }, update_modified=False)
    else:
        log_success("    - Customer: No records found.")
    
    # 2. Update Business Region Code Master
    brc_entries = frappe.get_all("Business Region Code", filters={"business_region_name": old_name}, fields=["name"])
    if brc_entries:
        for entry in brc_entries:
            # Check if target name or code already exists elsewhere to avoid duplicates
            existing_name = frappe.db.exists("Business Region Code", {"business_region_name": new_name})
            existing_code = frappe.db.get_value("Business Region Code", {"business_region_code": new_code}, "name")

            if existing_name and existing_name != entry.name:
                log_error(f"    [i] Target name '{new_name}' already exists. Source '{old_name}' is now redundant. Deleting source master record...")
                frappe.delete_doc("Business Region Code", entry.name, ignore_permissions=True)
                continue
                
            if existing_code and existing_code != entry.name:
                log_error(f"    [i] Target code '{new_code}' already exists on '{existing_code}'. Source '{old_name}' remains.")
                continue

            # Update the record
            frappe.db.set_value("Business Region Code", entry.name, {
                "business_region_name": new_name,
                "business_region_code": new_code
            }, update_modified=False)
            log_success(f"    - Updated Business Region Code Master: {entry.name} -> {new_name}")
    else:
        log_success("    - Business Region Code Master: No existing records found for source.")
        # If master didn't exist for old_name, ensure it exists for new_name
        ensure_brc_exists(new_name, new_code)

def execute(file_path=None):
    if isinstance(file_path, str):
        file_path = file_path.strip()

    log_success("========== BUSINESS REGION EXCEL UPDATE STARTED ==========")

    if not file_path:
        log_error("Error: No file path provided.")
        return

    # Path Resolution Logic
    if not os.path.exists(file_path):
        if not os.path.isabs(file_path):
            try:
                app_path = frappe.get_app_path("renu_customization")
                app_root = os.path.dirname(app_path)
                for base in [app_root, app_path, os.getcwd()]:
                    test_path = os.path.join(base, file_path)
                    if os.path.exists(test_path):
                        file_path = test_path
                        break
                
                if not os.path.exists(file_path) and os.path.basename(os.getcwd()) == "sites":
                    bench_root = os.path.dirname(os.getcwd())
                    test_path = os.path.join(bench_root, file_path)
                    if os.path.exists(test_path):
                        file_path = test_path
            except:
                pass

    if not os.path.exists(file_path):
        log_error(f"Error: File not found: {file_path}")
        return

    # Load mappings
    log_success(f"Reading mappings from: {file_path}")
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        df.columns = [c.strip() for c in df.columns]
        required_cols = ['Business Region Name', 'Replace with Business Region Name', 'Business Region Code']
        if not all(col in df.columns for col in required_cols):
            log_error(f"Missing required columns. Expected: {required_cols}")
            return
            
        log_success(f"Found {len(df)} rows to process.")
        
    except Exception as e:
        log_error(f"Error reading file: {str(e)}")
        return

    for index, row in df.iterrows():
        old_name = str(row['Business Region Name']).strip()
        new_name = str(row['Replace with Business Region Name']).strip()
        new_code = str(row['Business Region Code']).strip()
        
        if not old_name or not new_name or old_name == "nan" or new_name == "nan":
            continue

        log_success(f"\nRow {index + 1}: Processing '{old_name}' -> '{new_name}'")
        update_region(old_name, new_name, new_code)

    frappe.db.commit()
    frappe.clear_cache()
    log_success("\n========== BUSINESS REGION EXCEL UPDATE COMPLETED ==========")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        execute(sys.argv[1])
    else:
        print("Usage: bench --site [site] execute renu_customization.data_update_scripts.update_br_excel.execute --args '[\"file.xlsx\"]'")
