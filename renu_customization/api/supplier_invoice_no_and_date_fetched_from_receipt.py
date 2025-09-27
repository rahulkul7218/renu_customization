import frappe

def supplier_invoice_no_and_date_fetched_from_receipt(doc, method):
    """
    Fetch supplier_invoice_no and supplier_invoice_date from linked Purchase Receipt
    and set into bill_no and bill_date fields of Purchase Invoice before validation.
    """
    if doc.purchase_receipt:
        pr = frappe.get_doc("Purchase Receipt", doc.purchase_receipt)
        # Set mandatory field before validation
        doc.bill_no = pr.supplier_invoice_no
        doc.bill_date = pr.supplier_invoice_date

