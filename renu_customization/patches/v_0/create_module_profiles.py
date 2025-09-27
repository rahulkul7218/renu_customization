import frappe

def execute():
    # Mapping of Module Profiles to modules they SHOULD HAVE access to
    required_modules = {
        "Sales Coordinator": ["Selling", "CRM", "Stock", "Buying", "Accounts", "Communication"],
        "Finance Manager": ["Accounts", "Assets", "Bulk Transaction", "Buying", "Stock", "Projects", "Quality Management", "Setup"],
        "Assistant Manager": ["Projects", "Selling", "Buying", "Accounts", "Communication"],
        "Senior Executive": ["Selling", "CRM", "Stock", "Buying", "Accounts"],
        "Account Executive": ["Accounts", "CRM", "Selling", "Communication"],
        "Sales Head": ["Selling", "CRM", "Stock", "Accounts", "Projects", "Communication"],
        "Business Unit Head": ["Projects", "Selling", "Buying", "Accounts", "Stock", "Quality Management", "Setup"],
        "Project Manager": ["Projects", "Quality Management", "Stock", "Buying", "Accounts"],
        "IT Manager": ["Core", "Custom", "Setup", "Integrations", "Utilities", "Email", "Automation"],
        "Admin": [m.name for m in frappe.get_all("Module Def")]  # Admin gets all modules, so nothing blocked
    }

    # Get all modules in the system
    all_modules = [m.name for m in frappe.get_all("Module Def")]

    for profile_name, allowed_modules in required_modules.items():
        try:
            # Modules to block = all modules except allowed ones
            modules_to_block = [m for m in all_modules if m not in allowed_modules]

            if not frappe.db.exists("Module Profile", profile_name):
                mp = frappe.get_doc({
                    "doctype": "Module Profile",
                    "module_profile_name": profile_name,
                    "block_modules": [{"module": m} for m in modules_to_block]
                })
                mp.insert(ignore_permissions=True)
                print(f"Created Module Profile: {profile_name}")
            else:
                mp = frappe.get_doc("Module Profile", profile_name)
                # Clear existing block_modules
                mp.set("block_modules", [])
                # Add the modules to block
                for m in modules_to_block:
                    mp.append("block_modules", {"module": m})
                mp.save(ignore_permissions=True)
                print(f"Updated Module Profile: {profile_name}")

            frappe.db.commit()

        except Exception as e:
            print(f"Error creating/updating Module Profile '{profile_name}': {e}")
