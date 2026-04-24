import frappe
import re

@frappe.whitelist()
def export_to_excel(doctype, name, print_format):
    try:
        # Render the print format to HTML
        html = frappe.get_print(doctype, name, print_format)
        
        # Strip out <html> and <body> tags if present to avoid nesting
        # Excel's HTML import handles nested tags poorly
        html = re.sub(r'<!DOCTYPE.*?>', '', html, flags=re.IGNORECASE | re.DOTALL)
        html = re.sub(r'<html>', '', html, flags=re.IGNORECASE)
        html = re.sub(r'</html>', '', html, flags=re.IGNORECASE)
        html = re.sub(r'<head>.*?</head>', '', html, flags=re.IGNORECASE | re.DOTALL)
        html = re.sub(r'<body>', '', html, flags=re.IGNORECASE)
        html = re.sub(r'</body>', '', html, flags=re.IGNORECASE)
        
        # Remove any existing border attributes from the HTML tags
        html = re.sub(r'border="[^"]*"', '', html, flags=re.IGNORECASE)
        html = re.sub(r'border=\d+', '', html, flags=re.IGNORECASE)
        
        # Ensure all tables start with border="0"
        html = html.replace('<table', '<table border="0" cellpadding="0" cellspacing="0"')

        # Process images to absolute URLs
        base_url = frappe.utils.get_url()
        html = html.replace('src="/files/', f'src="{base_url}/files/')
        html = html.replace('src="files/', f'src="{base_url}/files/')

        # Determine if we should show borders by default based on the format name
        # Invoices and Product exports usually need borders, Annexures/SDF do not.
        show_borders = not any(x in print_format for x in ["Annexure", "SDF", "Scomet"])
        default_border = "1pt solid #000" if show_borders else "none"
        
        # Wrap HTML in Excel-friendly format (HTML-based XLS)
        excel_html = f"""
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>{name[:30]}</x:Name>
                            <x:WorksheetOptions>
                                <x:ProtectContents>False</x:ProtectContents>
                                <x:ProtectObjects>False</x:ProtectObjects>
                                <x:ProtectScenarios>False</x:ProtectScenarios>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table {{ border-collapse: collapse !important; width: 100%; }}
                td, th {{ 
                    vertical-align: top !important; 
                    padding: 4px !important; 
                    font-family: Arial, sans-serif !important;
                    font-size: 10pt !important;
                    border: {default_border} !important;
                    mso-number-format:"\@";
                    white-space: normal;
                }}
                /* Standard alignment and style classes */
                .center {{ text-align: center !important; }}
                .right {{ text-align: right !important; }}
                .left {{ text-align: left !important; }}
                .bold {{ font-weight: bold !important; }}
                .no-border {{ border: none !important; }}
                
                /* Standard border classes */
                .border {{ border: 1pt solid #000 !important; }}
                .border-top {{ border-top: 1pt solid #000 !important; }}
                .border-bottom {{ border-bottom: 1pt solid #000 !important; }}
            </style>
        </head>
        <body>
            <div style="width: 800px;">
                {html}
            </div>
        </body>
        </html>
        """
        
        frappe.response['type'] = 'binary'
        frappe.response['filename'] = f"{name}_{print_format}.xls"
        frappe.response['filecontent'] = excel_html.encode('utf-8')

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Export to Excel Error")
        return f"<h1>Export Failed</h1><p>Error: {str(e)}</p><p>Please check the Error Logs in Frappe for more details.</p>"
