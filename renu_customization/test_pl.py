import frappe

def test():
    frappe.init(site='renu-demo.localhost')
    frappe.connect()
    
    from renu_customization.renu_customization.page.ytd_profit_and_loss_.ytd_profit_and_loss_ import get_dashboard_data
    try:
        res = get_dashboard_data("RENU FACTORY AUTOMATION PVT. LTD", filters={"fiscal_year": "2025-2026"})
        print("Success! Dashboard data keys:", res.keys())
        print("Summary cards:")
        for k, v in res["summary_cards"].items():
            print(f"  {k}: {v}")
        print("Table data:")
        for group in res["table_data"]:
            print(f"Group: {group['bucket']}")
            for src in group["sources"]:
                print(f"  Source: {src['name']} | YTD: {src['ytd_val']} | PYD: {src['pyd_val']} | Var%: {src['var_pct']}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
