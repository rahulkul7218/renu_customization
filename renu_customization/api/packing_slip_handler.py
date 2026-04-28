import frappe
from frappe import _

def fetch_invoice_no(doc, method=None):
    # This is for when Packing Slip is saved/updated (might not find invoice if not created yet)
    _update_invoice_no(doc)

def update_packing_slip_invoice_no(doc, method=None):
    # This is for when Sales Invoice is submitted
    # Find all delivery notes linked to this invoice
    dn_names = list(set([d.delivery_note for d in doc.items if d.delivery_note]))
    
    if not dn_names:
        return

    # Find all Packing Slips for these Delivery Notes
    packing_slips = frappe.get_all("Packing Slip", 
        filters={"delivery_note": ["in", dn_names]},
        fields=["name"]
    )

    for ps in packing_slips:
        ps_doc = frappe.get_doc("Packing Slip", ps.name)
        _update_invoice_no(ps_doc)
        ps_doc.db_set("invoice_no", ps_doc.invoice_no)

def _update_invoice_no(doc):
    if not doc.delivery_note:
        return

    # Find all Sales Invoices linked to this Delivery Note
    sales_invoices = frappe.get_all("Sales Invoice Item", 
        filters={
            "delivery_note": doc.delivery_note,
            "docstatus": 1
        },
        fields=["parent"]
    )

    if not sales_invoices:
        return

    invoice_ids = list(set([d.parent for d in sales_invoices]))

    if len(invoice_ids) == 1:
        doc.invoice_no = invoice_ids[0]
        return

    # Match items
    ps_items = [{"item_code": i.item_code, "qty": i.qty} for i in doc.items]
    if not ps_items:
        return

    for inv_id in invoice_ids:
        inv_items = frappe.get_all("Sales Invoice Item",
            filters={"parent": inv_id, "delivery_note": doc.delivery_note},
            fields=["item_code", "qty"]
        )

        comparable_inv_items = [{"item_code": i.item_code, "qty": i.qty} for i in inv_items]

        match = True
        for ps_item in ps_items:
            found = False
            for inv_item in comparable_inv_items:
                if inv_item["item_code"] == ps_item["item_code"] and inv_item["qty"] == ps_item["qty"]:
                    found = True
                    break
            if not found:
                match = False
                break
        
        if match:
            doc.invoice_no = inv_id
            break
