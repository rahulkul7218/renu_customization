import frappe

def fetch_serial_no_on_invoice(doc, method):
    for item in doc.items:
        if item.get("dn_detail"):  # dn_detail is the Delivery Note Item link
            dn_item = frappe.get_doc("Delivery Note Item", item.dn_detail)
            if dn_item.serial_no:
                item.serials_no = dn_item.serial_no
