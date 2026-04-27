import frappe
import base64

@frappe.whitelist()
def export_to_excel(doctype, name, print_format):
    try:
        # Render the print format to HTML
        html = frappe.get_print(doctype, name, print_format)
        
        # Process images to absolute URLs so they show up in Excel
        base_url = frappe.utils.get_url()
        html = html.replace('src="/files/', f'src="{base_url}/files/')
        html = html.replace('src="files/', f'src="{base_url}/files/')
        html = html.replace('src="/assets/', f'src="{base_url}/assets/')
        
        # Wrap the body in a fixed-width container so tables don't stretch infinitely in Excel
        import re
        html = re.sub(r'(<body[^>]*>)', r'\1<div style="width: 800px; margin: auto; background: white;">', html, count=1, flags=re.IGNORECASE)
        html = re.sub(r'(</body>)', r'</div>\1', html, count=1, flags=re.IGNORECASE)
        
        # Add Excel-specific styling to ensure spacing and borders are preserved exactly
        excel_style = """
        <style>
            table { border-collapse: collapse !important; }
            /* Prevent Excel from stretching columns unnecessarily */
            td, th { white-space: normal; }
        </style>
        """
        html = re.sub(r'(</head>)', f'{excel_style}\\1', html, count=1, flags=re.IGNORECASE)
        
        # We want to export the print format "as it is", so we retain the original HTML and CSS.
        # Frappe's get_print returns a full HTML document which Excel can open as an .xls file.
        # We add a UTF-8 BOM so Excel properly renders the ₹ symbol and other characters.
        utf8_bom = b'\xef\xbb\xbf'
        encoded_html = utf8_bom + html.encode('utf-8')
        
        return {
            "filename": f"{name}_{print_format}.xls",
            "filecontent": base64.b64encode(encoded_html).decode('utf-8')
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Export to Excel Error")
        frappe.throw(f"Export Failed: {str(e)}")
