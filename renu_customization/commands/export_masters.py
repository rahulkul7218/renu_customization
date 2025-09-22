import frappe
import json
import os
from datetime import datetime, date

EXPORT_DOCTYPES = [
    "Account", "Cost Center", "Warehouse", "Item Group", "Territory",
    "Company", "Currency", "Fiscal Year", "Global Defaults", "Domain",
    "User", "Role", "Role Profile", "User Permission",
    "Customer Group", "Customer", "Supplier Group", "Supplier", "Address", "Contact",
    "UOM", "Item Attribute", "Item Attribute Value", "Item", "Item Variant", "Item Price", "Item Tax Template",
    "BOM", "Workstation", "Work Order Operation", "Quality Inspection Template",
    "Employee", "Designation", "Department", "Shift Type", "Shift Schedule", "Shift Schedule Assignment",
    "Tax Category", "Sales Taxes and Charges Template", "Purchase Taxes and Charges Template",
    "GST Settings", "GST HSN Code", "GST Account"
]

SINGLE_DOCTYPES = ["Global Defaults", "Company", "GST Settings"]

def serialize(obj):
    """Convert non-JSON types to strings"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)

def execute():
    frappe.init(site=frappe.local.site)
    frappe.connect()

    export_path = frappe.get_app_path("renu_customization", "data", "masters_export.json")
    os.makedirs(os.path.dirname(export_path), exist_ok=True)

    export_data = {}

    for dt in EXPORT_DOCTYPES:
        try:
            if dt in SINGLE_DOCTYPES:
                doc = frappe.get_single(dt)
                export_data[dt] = [doc.as_dict()]
                print(f"Exported single doctype {dt}")
            else:
                records = frappe.get_all(dt, fields="*")
                export_data[dt] = records
                print(f"Exported {len(records)} records of {dt}")
        except frappe.DoesNotExistError:
            print(f"Skipping {dt}: does not exist on this site")
        except Exception as e:
            print(f"Error exporting {dt}: {e}")

    # Write JSON safely converting non-serializable objects
    with open(export_path, "w") as f:
        json.dump(export_data, f, indent=4, default=serialize)

    print(f"\n✅ Masters exported successfully to {export_path}")
    frappe.destroy()
