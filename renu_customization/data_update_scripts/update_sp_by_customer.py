import frappe
import json
import os
import pandas as pd
import sys
from datetime import datetime
from frappe.utils import flt

LOG_DIR = os.path.dirname(__file__)
LOG_SUCCESS = os.path.join(LOG_DIR, "sp_missing_success.log")
LOG_ERROR = os.path.join(LOG_DIR, "sp_missing_error.log")

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

def ensure_sp_in_customer(customer_name, sp_name):
    """Adds Sales Person to Customer's Sales Team if missing."""
    customer = frappe.db.get_value("Customer", {"customer_name": customer_name}, "name")
    if not customer:
        log_error(f"  [!] Customer not found by name: {customer_name}")
        return None

    # Ensure SP exists in master
    if not frappe.db.exists("Sales Person", sp_name):
        log_error(f"  [!] Sales Person master record missing: {sp_name}")
        return None

    # Check if already exists in Customer's Sales Team
    exists = frappe.db.exists("Sales Team", {"parent": customer, "parenttype": "Customer", "sales_person": sp_name})
    if not exists:
        log_success(f"  [+] Adding {sp_name} to Customer master: {customer}")
        doc = frappe.get_doc("Customer", customer)
        doc.append("sales_team", {
            "sales_person": sp_name,
            "allocated_percentage": 100
        })
        doc.save(ignore_permissions=True)
    else:
        log_success(f"  [*] {sp_name} already exists in Customer master: {customer}")
    
    return customer

def update_transactions_for_customer(customer_id, sp_name):
    """Updates non-cancelled transactions for a customer ONLY if NO sales person is currently assigned."""
    for dt in TRANSACTION_DOCTYPES:
        if not frappe.db.table_exists(dt): continue
        
        meta = frappe.get_meta(dt)
        cust_field = "customer" if meta.has_field("customer") else "party_name" if meta.has_field("party_name") else None
        if not cust_field: continue

        # Find ALL transactions for this customer (Draft and Submitted)
        net_total_field = "base_net_total" if meta.has_field("base_net_total") else "opportunity_amount" if meta.has_field("opportunity_amount") else "net_total" if meta.has_field("net_total") else "0"
        
        sql = f"SELECT name, {net_total_field} as net_total FROM `tab{dt}` WHERE `{cust_field}` = %s AND docstatus < 2"
        target_docs = frappe.db.sql(sql, (customer_id,), as_dict=True)
        
        if target_docs:
            for d in target_docs:
                # Check if ANY sales person already exists in this transaction
                exists = frappe.db.exists("Sales Team", {"parent": d.name, "parenttype": dt})
                
                if exists:
                    log_success(f"      [skipped] {dt}: {d.name} (Sales person already available)")
                    continue

                # If empty, set the single new Sales Person
                base_net_total = flt(d.get("net_total") or 0)
                
                frappe.db.sql("""
                    INSERT INTO `tabSales Team` 
                    (name, parent, parentfield, parenttype, sales_person, allocated_percentage, allocated_amount, idx, creation, modified)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    frappe.generate_hash(length=10), 
                    d.name, 
                    "sales_team", 
                    dt, 
                    sp_name, 
                    100.0, 
                    base_net_total,
                    1,
                    datetime.now(),
                    datetime.now()
                ))
                log_success(f"      [added] {dt}: {d.name} -> {sp_name} (100% / {base_net_total})")

def execute(file_path=None):
    if isinstance(file_path, str):
        file_path = file_path.strip()

    log_success("========== MISSING SALES PERSON UPDATE BY CUSTOMER STARTED ==========")

    if not file_path:
        log_error("Error: No file path provided.")
        return

    # Normalize path for cross-platform compatibility (Windows \ to Linux /)
    file_path = file_path.replace("\\", "/")
    basename = os.path.basename(file_path)

    # Path resolution logic: Try multiple common locations
    if not os.path.exists(file_path):
        if not os.path.isabs(file_path):
            # 1. Try relative to the script's own directory (Highest priority for local files)
            script_dir = os.path.dirname(os.path.abspath(__file__))
            test_path = os.path.join(script_dir, basename)
            if os.path.exists(test_path):
                file_path = test_path
            else:
                # 2. Try standard Frappe app and bench paths
                try:
                    app_path = frappe.get_app_path("renu_customization")
                    app_root = os.path.abspath(os.path.join(app_path, "..")) # .../apps/renu_customization
                    apps_dir = os.path.abspath(os.path.join(app_root, "..")) # .../apps
                    bench_root = os.path.abspath(os.path.join(apps_dir, "..")) # .../frappe-bench
                    
                    # Search bases
                    search_bases = [
                        os.getcwd(), 
                        bench_root, 
                        apps_dir, 
                        app_root, 
                        app_path,
                        os.path.abspath(os.path.join(os.getcwd(), "..")) # One level up from CWD
                    ]
                    
                    found = False
                    for base in search_bases:
                        # Try the path as provided
                        test_path = os.path.abspath(os.path.join(base, file_path))
                        if os.path.exists(test_path):
                            file_path = test_path
                            found = True
                            break
                        # Try just the filename in these locations
                        test_path = os.path.abspath(os.path.join(base, basename))
                        if os.path.exists(test_path):
                            file_path = test_path
                            found = True
                            break
                        # Special check for data_update_scripts subfolder
                        test_path = os.path.abspath(os.path.join(base, "data_update_scripts", basename))
                        if os.path.exists(test_path):
                            file_path = test_path
                            found = True
                            break
                except: pass

    if not os.path.exists(file_path):
        log_error(f"Error: File not found: {file_path}")
        log_error(f"Current Working Directory: {os.getcwd()}")
        log_error(f"Please provide an absolute path or place the file in: {os.path.dirname(os.path.abspath(__file__))}")
        return

    # Load Excel/CSV
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        else:
            log_error("Unsupported file format.")
            return
        
        df.columns = [c.strip() for c in df.columns]
        
        # Priority mapping for your specific columns
        cust_code_col = "Customer Code" if "Customer Code" in df.columns else None
        cust_name_col = "Customer Name" if "Customer Name" in df.columns else None
        sp_col = "Sales Person" if "Sales Person" in df.columns else None

        if not (cust_code_col or cust_name_col) or not sp_col:
            log_error(f"Missing required columns. Expected: [Customer Code/Name, Sales Person]. Found: {df.columns.tolist()}")
            return
            
        log_success(f"Found {len(df)} rows to process.")
        
    except Exception as e:
        log_error(f"Error reading file: {str(e)}")
        return

    # Process each row
    for index, row in df.iterrows():
        cust_code = str(row[cust_code_col]).strip() if cust_code_col else None
        cust_name = str(row[cust_name_col]).strip() if cust_name_col else None
        sp_name = str(row[sp_col]).strip()
        
        if (not cust_code and not cust_name) or not sp_name or sp_name == "nan":
            continue

        # Find customer: Priority to Code, then Name
        customer_id = None
        if cust_code and cust_code != "nan":
            if frappe.db.exists("Customer", cust_code):
                customer_id = cust_code
            else:
                log_error(f"  [!] Customer Code not found: {cust_code}")
        
        if not customer_id and cust_name and cust_name != "nan":
            customer_id = frappe.db.get_value("Customer", {"customer_name": cust_name}, "name")
            if not customer_id:
                log_error(f"  [!] Customer Name not found: {cust_name}")

        if not customer_id:
            continue

        log_success(f"\nRow {index + 1}: Processing Customer '{customer_id}' -> SP '{sp_name}'")
        
        # 1. Update Customer Master (Ensure SP is assigned only if missing)
        # Ensure SP exists in master
        if not frappe.db.exists("Sales Person", sp_name):
            log_error(f"  [!] Sales Person master record missing: {sp_name}")
            continue

        # Check if ANY sales person already exists in Customer
        cust_sp_exists = frappe.db.exists("Sales Team", {"parent": customer_id, "parenttype": "Customer"})
        
        if not cust_sp_exists:
            log_success(f"  [+] Setting Sales Person for Customer: {customer_id} -> {sp_name}")
            doc = frappe.get_doc("Customer", customer_id)
            doc.append("sales_team", {
                "sales_person": sp_name,
                "allocated_percentage": 100
            })
            doc.save(ignore_permissions=True)
        else:
            log_success(f"  [*] Skipping Customer Master: {customer_id} (Sales person already assigned)")
        
        # 2. Update Transactions
        update_transactions_for_customer(customer_id, sp_name)

    frappe.db.commit()
    frappe.clear_cache()
    log_success("\n========== MISSING SALES PERSON UPDATE COMPLETED ==========")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        execute(sys.argv[1])
    else:
        print("Usage: bench --site [site] execute renu_customization.data_update_scripts.update_sp_by_customer.execute --args '[\"path/to/file.xlsx\"]'")
