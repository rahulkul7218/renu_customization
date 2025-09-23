import frappe
import json
import os

EXPORT_FOLDER = "renu_customization/fixtures/masters"  # relative to site path


def execute():
    site_path = frappe.local.site_path
    export_path = os.path.join(site_path, EXPORT_FOLDER)
    os.makedirs(export_path, exist_ok=True)

    doctypes_to_export = [
        "Account", "Cost Center", "Warehouse", "Item Group", "Territory",
        "Currency", "Fiscal Year", "Global Defaults", "Domain", "UOM",
        "Item Attribute", "Item Attribute Value", "Item", "Item Tax Template",
        "Designation", "Department", "Tax Category", "Sales Taxes and Charges Template",
        "Purchase Taxes and Charges Template", "GST Settings", "GST HSN Code",
        "Bank", "Bank Account", "Mode of Payment", "Payment Terms Template",
        "Custom Field", "Property Setter", "Print Format", "Email Template",
        "Notification", "Notification Settings", "Workflow State", "Workflow Action Master"
    ]

    for doctype in doctypes_to_export:
        try:
            print(f"Exporting {doctype}...")

            meta = frappe.get_meta(doctype)
            if meta.issingle:
                doc = frappe.get_single(doctype)
                data = serialize_doc(doc)
            else:
                records = frappe.get_all(doctype, fields=["name"])
                data = [serialize_doc(frappe.get_doc(doctype, r.name)) for r in records]

            file_path = os.path.join(export_path, f"{doctype}.json")
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, default=json_serial)

            count = len(data) if isinstance(data, list) else 1
            print(f"Exported {count} records of {doctype}")

        except Exception as e:
            frappe.log_error(f"Error exporting {doctype}: {e}", "Export Masters")
            print(f"Error exporting {doctype}: {e}")


def serialize_doc(doc):
    """Convert Frappe document to JSON-safe dictionary recursively"""
    if isinstance(doc, dict) or isinstance(doc, frappe._dict):
        return {k: serialize_doc(v) for k, v in doc.items() if k not in ["__islocal", "__unsaved"]}
    elif isinstance(doc, list):
        return [serialize_doc(v) for v in doc]
    elif hasattr(doc, "as_dict"):
        return serialize_doc(doc.as_dict())
    return doc


def json_serial(obj):
    """Serialize unsupported types like datetime"""
    import datetime
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    return str(obj)
