import frappe

def execute():
    # Fetch all doctypes
    doctypes = frappe.get_all("DocType", pluck="name")

    for dt in doctypes:
        try:
            frappe.db.set_value("DocType", dt, "allow_import", 1, update_modified=False)
            print(f"✔ Enabled Allow Import for: {dt}")
        except Exception as e:
            print(f"❌ Could not update {dt}: {e}")
