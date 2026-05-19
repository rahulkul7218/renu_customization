import frappe
import openpyxl
import os

def execute(file_path):
    """
    To run this script from bench:
    bench execute apps.renu_customization.renu_customization.data_update_scripts.update_item_group_type.execute --args "['/path/to/your/excel_file.xlsx']"
    """
    if not os.path.isabs(file_path):
        bench_path = frappe.utils.get_bench_path()
        file_path = os.path.join(bench_path, file_path)

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Reading from {file_path}...")
    wb = openpyxl.load_workbook(file_path, data_only=True)
    ws = wb.active

    # Read header
    headers = [cell.value for cell in ws[1]]
    
    col_idx = {str(name).strip(): idx for idx, name in enumerate(headers) if name}
    
    required_columns = ['Item Code', 'New Item Group', 'Item Type']
    for col in required_columns:
        if col not in col_idx:
            print(f"Missing required column in Excel file: {col}")
            print(f"Found columns: {list(col_idx.keys())}")
            return

    updated_count = 0
    not_found_count = 0
    
    # Check fieldname for Item Type (custom field or standard field)
    item_meta = frappe.get_meta("Item")
    item_type_fieldname = "item_type" if item_meta.has_field("item_type") else "item_type"

    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        item_code = row[col_idx['Item Code']]
        new_item_group = row[col_idx['New Item Group']]
        item_type = row[col_idx['Item Type']]

        if not item_code:
            continue
            
        item_code = str(item_code).strip()

        if not frappe.db.exists("Item", item_code):
            print(f"Row {row_idx}: Item not found: {item_code}")
            not_found_count += 1
            continue

        update_dict = {}
        if new_item_group:
            update_dict['item_group'] = str(new_item_group).strip()
            
        if item_type:
            update_dict[item_type_fieldname] = str(item_type).strip()
                
        if update_dict:
            try:
                frappe.db.set_value("Item", item_code, update_dict)
                updated_count += 1
            except Exception as e:
                print(f"Row {row_idx}: Error updating item {item_code}: {str(e)}")

    frappe.db.commit()
    print(f"Update completed. Updated {updated_count} items. {not_found_count} items not found.")
