import frappe
import json
import os
import pandas as pd
import sys
from datetime import datetime

LOG_DIR = os.path.dirname(__file__)
LOG_SUCCESS = os.path.join(LOG_DIR, "sp_excel_success.log")
LOG_ERROR = os.path.join(LOG_DIR, "sp_excel_error.log")

TRANSACTION_DOCTYPES = ["Quotation", "Sales Order", "Delivery Note", "Sales Invoice", "Opportunity"]

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

def ensure_sp_exists(sp_name):
    """Ensures the target Sales Person exists in the system."""
    if not frappe.db.exists("Sales Person", sp_name):
        root_sp = frappe.db.get_value("Sales Person", {"is_group": 1, "parent_sales_person": ["in", ["", None]]}, "name") or "Sales Team"
        frappe.get_doc({
            "doctype": "Sales Person",
            "sales_person_name": sp_name,
            "parent_sales_person": root_sp,
            "enabled": 1
        }).insert(ignore_permissions=True)
        log_success(f"  [+] Created Sales Person: {sp_name}")
        return True
    return False

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
    else:
        log_success(f"    - {doctype}.{fieldname}: No records found.")
        return False

def log_sales_team_affected(old_sp, parenttype=None, parent_list=None):
    """Logs the parents of Sales Team entries that will be updated."""
    filters = {"sales_person": old_sp}
    if parenttype: filters["parenttype"] = parenttype
    if parent_list: filters["parent"] = ["in", parent_list]
    
    affected = frappe.get_all("Sales Team", filters=filters, fields=["parent", "parenttype"])
    if affected:
        parents = sorted(list(set([f"{a.parenttype} {a.parent}" for a in affected])))
        count = len(parents)
        preview = ", ".join(parents[:50])
        suffix = "..." if count > 50 else ""
        log_success(f"    - Sales Team entries in {count} records: ({preview}{suffix})")
        return True
    else:
        log_success(f"    - Sales Team: No records found" + (f" for {parenttype}" if parenttype else ""))
        return False

def update_globally(old_sp, new_sp):
    """Updates all occurrences of a Sales Person across the entire system."""
    log_success(f"  [*] Starting GLOBAL update for {old_sp} -> {new_sp}")
    
    # 1. Update Direct Link Fields
    link_fields = frappe.get_all("DocField", filters={"fieldtype": "Link", "options": "Sales Person"}, fields=["parent", "fieldname"])
    for field in link_fields:
        dt = field.parent
        if dt == "Sales Team" or not frappe.db.table_exists(dt): continue
        
        if log_affected_records(dt, field.fieldname, old_sp):
            frappe.db.sql(f"UPDATE `tab{dt}` SET `{field.fieldname}` = %s WHERE `{field.fieldname}` = %s", (new_sp, old_sp))

    # 2. Update Sales Team Child Tables
    if log_sales_team_affected(old_sp):
        frappe.db.sql("UPDATE `tabSales Team` SET sales_person = %s WHERE sales_person = %s", (new_sp, old_sp))

def update_by_region(old_sp, new_sp, region_name):
    """Updates Sales Person only for records associated with a specific Business Region."""
    log_success(f"  [*] Starting REGION-BASED update ({region_name}) for {old_sp} -> {new_sp}")
    
    # 1. Find Customers in this region
    customers = frappe.get_all("Customer", filters={"business_region_name": region_name}, fields=["name"])
    if not customers:
        log_error(f"    [!] No Customers found for region: {region_name}")
        return

    cust_list = [c.name for c in customers]
    
    # Update Sales Team for these customers
    if log_sales_team_affected(old_sp, parenttype="Customer", parent_list=cust_list):
        frappe.db.sql("""
            UPDATE `tabSales Team` 
            SET sales_person = %s 
            WHERE sales_person = %s AND parenttype = 'Customer' AND parent IN %s
        """, (new_sp, old_sp, tuple(cust_list)))

    # 2. Update Transactions for these customers
    for dt in TRANSACTION_DOCTYPES:
        if not frappe.db.table_exists(dt): continue
        
        meta = frappe.get_meta(dt)
        cust_field = "customer" if meta.has_field("customer") else "party_name" if meta.has_field("party_name") else None
        if not cust_field: continue

        # Find transactions belonging to these customers
        tx_docs = frappe.get_all(dt, filters={cust_field: ["in", cust_list]}, fields=["name"])
        if not tx_docs: continue
        
        tx_list = [d.name for d in tx_docs]
        
        if log_sales_team_affected(old_sp, parenttype=dt, parent_list=tx_list):
            frappe.db.sql(f"""
                UPDATE `tabSales Team` 
                SET sales_person = %s 
                WHERE sales_person = %s AND parenttype = %s AND parent IN %s
            """, (new_sp, old_sp, dt, tuple(tx_list)))

def execute(file_path=None):
    if isinstance(file_path, str):
        file_path = file_path.strip()

    log_success("========== CUSTOM SALES PERSON UPDATE STARTED ==========")

    if not file_path:
        log_error("Error: No file path provided. Please provide a CSV or Excel file.")
        return

    if not os.path.exists(file_path):
        # Try finding it relative to the bench or app directory
        if not os.path.isabs(file_path):
            # 1. Try relative to app root
            try:
                app_path = frappe.get_app_path("renu_customization")
                # app_path points to .../apps/renu_customization/renu_customization
                # We go up one level to search from .../apps/renu_customization/
                app_root = os.path.dirname(app_path)
                
                # Check if file exists relative to app root or inside renu_customization
                for base in [app_root, app_path, os.getcwd()]:
                    test_path = os.path.join(base, file_path)
                    if os.path.exists(test_path):
                        file_path = test_path
                        break
                
                # 2. If still not found, try relative to bench root (one level up from sites)
                if not os.path.exists(file_path) and os.path.basename(os.getcwd()) == "sites":
                    bench_root = os.path.dirname(os.getcwd())
                    test_path = os.path.join(bench_root, file_path)
                    if os.path.exists(test_path):
                        file_path = test_path

                # 3. Final fallback: look in the script's own directory
                if not os.path.exists(file_path):
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    test_path = os.path.join(script_dir, os.path.basename(file_path))
                    if os.path.exists(test_path):
                        file_path = test_path
            except:
                pass

    if not os.path.exists(file_path):
        log_error(f"Error: File not found: {file_path}")
        log_error(f"Current Working Directory: {os.getcwd()}")
        return

    # Load mappings from file
    log_success(f"Reading mappings from: {file_path}")
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        else:
            log_error("Unsupported file format. Please provide a CSV or Excel file.")
            return
        
        # Normalize column names (strip spaces)
        df.columns = [c.strip() for c in df.columns]
        
        required_cols = ['Sales person', 'Replace with Sales person']
        if not all(col in df.columns for col in required_cols):
            log_error(f"Missing required columns. Expected: {required_cols}, Found: {df.columns.tolist()}")
            return
            
        log_success(f"Found {len(df)} rows to process.")
        
    except Exception as e:
        log_error(f"Error reading file: {str(e)}")
        return

    # Process each row
    for index, row in df.iterrows():
        old_sp = str(row['Sales person']).strip()
        new_sp = str(row['Replace with Sales person']).strip()
        
        if not old_sp or not new_sp or old_sp == "nan" or new_sp == "nan":
            continue

        # Check for Region column (Business Region Name(optional) or Reason name)
        region_col = next((col for col in ['Business Region Name(optional)', 'Reason name'] if col in df.columns), None)
        region_name = str(row[region_col]).strip() if region_col and pd.notna(row[region_col]) else None
        
        if region_name == "nan": region_name = None

        log_success(f"\nRow {index + 1}: Processing '{old_sp}' -> '{new_sp}'" + (f" for Region: {region_name}" if region_name else ""))
        
        # Ensure target SP exists
        ensure_sp_exists(new_sp)
        
        if region_name:
            update_by_region(old_sp, new_sp, region_name)
        else:
            update_globally(old_sp, new_sp)

    frappe.db.commit()
    frappe.clear_cache()

    log_success("\n========== CUSTOM SALES PERSON UPDATE COMPLETED ==========")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        execute(sys.argv[1])
    else:
        print("Usage: bench --site [site] execute renu_customization.data_update_scripts.update_sp_amit_abhijit.execute --args '[\"path/to/file.csv\"]'")
