import frappe
import json
import os

SINGLE_DOCTYPES = ["Global Defaults", "Company", "GST Settings"]

def execute():
    frappe.init(site=frappe.local.site)
    frappe.connect()

    import_path = frappe.get_app_path("renu_customization", "data", "masters_export.json")
    
    if not os.path.exists(import_path):
        print(f"❌ File not found: {import_path}")
        return

    with open(import_path) as f:
        data = json.load(f)

    for dt, records in data.items():
        try:
            if dt in SINGLE_DOCTYPES:
                doc = frappe.get_single(dt)
                for key, value in records[0].items():
                    setattr(doc, key, value)
                doc.save()
                print(f"Updated single doctype {dt}")
            else:
                for record in records:
                    record.pop("creation", None)
                    record.pop("modified", None)
                    record.pop("owner", None)
                    record.pop("doctype", None)
                    record.pop("docstatus", None)
                    
                    if frappe.db.exists(dt, record.get("name")):
                        doc = frappe.get_doc(dt, record.get("name"))
                        for key, value in record.items():
                            setattr(doc, key, value)
                        doc.save(ignore_permissions=True)
                        print(f"Updated {dt}: {record.get('name')}")
                    else:
                        doc = frappe.get_doc(record)
                        doc.insert(ignore_permissions=True)
                        print(f"Inserted {dt}: {record.get('name')}")
        except Exception as e:
            print(f"Error importing {dt}: {e}")

    print("\n✅ Masters imported successfully!")
    frappe.destroy()
