import frappe
import json
import os

IMPORT_FOLDER = "renu_customization/fixtures/masters"  # relative to site path
MAX_ERROR_TITLE = 140  # truncate error title for Error Log


def execute():
    site_path = frappe.local.site_path
    import_path = os.path.join(site_path, IMPORT_FOLDER)

    if not os.path.exists(import_path):
        frappe.throw(f"Import path not found: {import_path}")

    files = [f for f in os.listdir(import_path) if f.endswith(".json")]

    for file_name in files:
        doctype = file_name.replace(".json", "")
        file_path = os.path.join(import_path, file_name)

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            print(f"Importing {doctype}...")

            meta = frappe.get_meta(doctype)

            if meta.issingle:
                # Single DocType
                doc = frappe.get_single(doctype)
                for k, v in data.items():
                    setattr(doc, k, v)
                doc.save(ignore_permissions=True, ignore_version=True)
            else:
                # Standard DocType
                for record_data in data:
                    name = record_data.get("name")
                    if not name:
                        continue

                    if frappe.db.exists(doctype, name):
                        # Always fetch latest version
                        doc = frappe.get_doc(doctype, name)
                        doc.update(record_data)
                        doc.save(ignore_permissions=True, ignore_version=True)
                    else:
                        # New doc
                        doc = frappe.get_doc(record_data)
                        doc.insert(ignore_permissions=True)
                        frappe.db.commit()  # ensure it's saved

            count = len(data) if isinstance(data, list) else 1
            print(f"Imported {count} records of {doctype}")

        except Exception as e:
            # Truncate error message for Error Log title
            title = f"Error importing {doctype}: {str(e)}"
            if len(title) > MAX_ERROR_TITLE:
                title = title[:MAX_ERROR_TITLE]

            frappe.log_error(message=str(e), title=title)
            print(f"Error importing {doctype}: {e}")
