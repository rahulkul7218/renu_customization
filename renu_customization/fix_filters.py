import os
import re

files = [
    "/home/ubuntu/renu-dev/apps/renu_customization/renu_customization/renu_customization/page/supplier_order_dashboard/supplier_order_dashboard.js",
    "/home/ubuntu/renu-dev/apps/renu_customization/renu_customization/renu_customization/page/sales_order_booking_dashboard/sales_order_booking_dashboard.js",
    "/home/ubuntu/renu-dev/apps/renu_customization/renu_customization/renu_customization/page/purchase_invoice_dashboard/purchase_invoice_dashboard.js",
    "/home/ubuntu/renu-dev/apps/renu_customization/renu_customization/renu_customization/page/sales_revenue_dashboard/sales_revenue_dashboard.js",
    "/home/ubuntu/renu-dev/apps/renu_customization/renu_customization/renu_customization/page/gross_margin_dashboard/gross_margin_dashboard.js"
]

for path in files:
    if not os.path.exists(path): continue
    
    with open(path, "r") as file:
        content = file.read()
    
    # Remove { fieldtype: "Column Break" } and { fieldtype: "Section Break" }
    content = re.sub(r"\{\s*fieldtype:\s*[\"'](?:Column Break|Section Break)[\"']\s*\},?\n?", "", content)
    
    with open(path, "w") as file:
        file.write(content)
print("Done")
