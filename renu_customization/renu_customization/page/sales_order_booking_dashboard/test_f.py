import json
import frappe

def execute():
    frappe.init(site="localhost")
    frappe.connect()
    
    so_meta = frappe.get_meta("Sales Order")
    soi_meta = frappe.get_meta("Sales Order Item")
    
    data = {
        "so_fields": [f.fieldname for f in so_meta.fields if "return" in f.fieldname or "cancel" in f.fieldname],
        "soi_fields": [f.fieldname for f in soi_meta.fields if "return" in f.fieldname or "cancel" in f.fieldname or "short" in f.fieldname],
        "so_status_options": [f.options for f in so_meta.fields if f.fieldname == "status"]
    }
    
    print(json.dumps(data))
