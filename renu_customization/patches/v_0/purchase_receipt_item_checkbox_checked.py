# your_app/patches/set_use_serial_batch_fields_checked.py

import frappe

def execute():
    """Set default value of 'use_serial_batch_fields' to 1 (checked) in Purchase Receipt Item"""
    try:
        # Update field property
        frappe.db.set_value(
            "Custom Field",
            {"dt": "Purchase Receipt Item", "fieldname": "use_serial_batch_fields"},
            "default",
            "1",
        )
        
        # Also update property setter if exists
        frappe.db.set_value(
            "Property Setter",
            {"doc_type": "Purchase Receipt Item", "field_name": "use_serial_batch_fields", "property": "default"},
            "value",
            "1",
        )

        frappe.db.commit()
        frappe.clear_cache(doctype="Purchase Receipt Item")

    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="Patch Error - use_serial_batch_fields")
        raise
