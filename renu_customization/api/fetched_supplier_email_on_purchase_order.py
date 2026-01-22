import frappe

def set_supplier_email(doc, method=None):
    """
    Fetch Supplier Address email and set it in
    add_email_on_purchase_order field
    """

    if not doc.supplier:
        doc.add_email_on_purchase_order = ""
        return

    addresses = frappe.get_all(
        "Address",
        filters=[
            ["Dynamic Link", "link_doctype", "=", "Supplier"],
            ["Dynamic Link", "link_name", "=", doc.supplier]
        ],
        fields=["email_id"],
        limit_page_length=1
    )

    if addresses and addresses[0].get("email_id"):
        doc.add_email_on_purchase_order = addresses[0]["email_id"]
    else:
        doc.add_email_on_purchase_order = ""
