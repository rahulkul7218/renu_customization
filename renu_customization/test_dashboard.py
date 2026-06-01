import frappe

def test():
    from renu_customization.renu_customization.page.ytd_profit_and_loss_.ytd_profit_and_loss_ import get_dashboard_data
    
    company = frappe.db.get_value("Company", {}, "name")
    print(f"Company: {company}")
    
    result = get_dashboard_data(company)
    
    print("\n=== SUMMARY CARDS ===")
    for key, val in result.get("summary_cards", {}).items():
        print(f"  {key}: YTD={val.get('ytd')}, PYD={val.get('pyd')}, Variance={val.get('variance')}")
    
    print("\n=== TABLE DATA (key rows) ===")
    for group in result.get("table_data", []):
        print(f"\n  --- {group['bucket']} ---")
        for src in group.get("sources", []):
            print(f"    {src['name']}: ytd_val={src.get('ytd_val')}, pyd_val={src.get('pyd_val')}, var_val={src.get('var_val')}")
