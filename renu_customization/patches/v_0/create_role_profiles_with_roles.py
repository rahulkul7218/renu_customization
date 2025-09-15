import frappe

def execute():
    role_profiles = {
        "Sales Coordinator": [
            "Sales User", "Sales Manager", "Accounts User", "Stock User", "Purchase User"
        ],
        "Finance Manager": [
            "Accounts Manager", "Accounts User", "Report Manager"
        ],
        "Assistant Manager": [
            "HR User", "Employee Self Service", "Projects User", "Sales User", "Purchase User"
        ],
        "Senior Executive": [
            "Sales User", "Purchase User", "Accounts User"
        ],
        "Account Executive": [
            "Accounts User", "Report Manager"
        ],
        "Sales Head": [
            "Sales Manager", "Sales Master Manager", "Report Manager"
        ],
        "Business Unit Head": [
            "Projects Manager", "Sales Manager", "Accounts Manager", "Stock Manager"
        ],
        "Project Manager": [
            "Projects Manager", "Projects User", "Employee"
        ],
        "IT Manager": [
            "System Manager", "Workspace Manager", "Script Manager"
        ],
        
        
        
        "Admin": [
            "Academics User", "Accounts Manager", "Accounts User", "Agriculture Manager",
            "Agriculture User", "Analytics", "Auditor", "Blogger", "Customer",
            "Dashboard Manager", "Delivery Manager", "Delivery User", "Employee",
            "Fleet Manager", "Fulfillment User", "HR Manager", "HR User", "Inbox User",
            "Item Manager", "Knowledge Base Contributor", "Knowledge Base Editor",
            "Maintenance Manager", "Maintenance User", "Manufacturing Manager",
            "Manufacturing User", "Newsletter Manager", "Prepared Report User",
            "Projects Manager", "Projects User", "Purchase Manager",
            "Purchase Master Manager", "Purchase User", "Quality Manager", "Report Manager",
            "Sales Manager", "Sales Master Manager", "Sales User", "Script Manager",
            "Stock Manager", "Stock User", "Supplier", "Support Team", "System Manager",
            "Translator", "Website Manager", "Workspace Manager"
            
        ]
    }

    for profile_name, roles in role_profiles.items():
        if frappe.db.exists("Role Profile", profile_name):
            role_profile = frappe.get_doc("Role Profile", profile_name)
        else:
            role_profile = frappe.new_doc("Role Profile")
            role_profile.role_profile = profile_name
            # Bypass normal insert (no on_update)
            role_profile.db_insert()

        existing_roles = {r.role for r in role_profile.roles}

        for role in roles:
            if not frappe.db.exists("Role", role):
                frappe.logger().warning(f"Skipping missing role: {role}")
                continue

            if role not in existing_roles:
                # Insert directly into Has Role child table
                child = frappe.new_doc("Has Role")
                child.parent = role_profile.name
                child.parentfield = "roles"
                child.parenttype = "Role Profile"
                child.role = role
                child.db_insert()

        frappe.db.commit()
