// Copyright (c) 2026, Assimilate Technologies Pvt Ltd and contributors
// For license information, please see license.txt

frappe.query_reports["Sales Revenue Aging Report"] = {
	"filters": [
		{
			"fieldname": "customer",
			"label": __("Customer"),
			"fieldtype": "Link",
			"options": "Customer",
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "customer_group",
			"label": __("Customer Group"),
			"fieldtype": "Link",
			"options": "Customer Group",
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "item",
			"label": __("Product (Item)"),
			"fieldtype": "Link",
			"options": "Item",
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "item_group",
			"label": __("Product Group"),
			"fieldtype": "Link",
			"options": "Item Group",
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "sales_person",
			"label": __("Sales Person"),
			"fieldtype": "Link",
			"options": "Sales Person",
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "territory",
			"label": __("Territory"),
			"fieldtype": "Link",
			"options": "Territory",
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "dom_exp",
			"label": __("Type"),
			"fieldtype": "Select",
			"options": ["", "Domestic", "Export"],
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "invoice_type",
			"label": __("Invoice Type"),
			"fieldtype": "Select",
			"options": ["", "Product Domestic", "Product Export", "Engineering Service Domestic", "Engineering Service Export"],
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "fiscal_year",
			"label": __("Fiscal Year"),
			"fieldtype": "Link",
			"options": "Fiscal Year",
            "on_change": function() {
                var fiscal_year = frappe.query_report.get_filter_value('fiscal_year');
                if (fiscal_year) {
                    frappe.db.get_value('Fiscal Year', fiscal_year, ['year_start_date', 'year_end_date'], (r) => {
                        if (r.year_start_date && r.year_end_date) {
                            frappe.query_report.set_filter_value('from_date', r.year_start_date);
                            frappe.query_report.set_filter_value('to_date', r.year_end_date);
                            frappe.query_report.refresh();
                        }
                    });
                }
            }
		},
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"on_change": () => frappe.query_report.refresh()
		},
		{
			"fieldname": "period_type",
			"label": __("Period Type"),
			"fieldtype": "Select",
			"options": ["Monthly", "Quarterly", "Yearly", "Fiscal Year", "Aging"],
			"default": "Aging",
			"reqd": 1,
			"on_change": () => frappe.query_report.refresh()
		}
	],
    "formatter": function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldtype == "Currency" && row && row[column.fieldname] < 0) {
            value = `<span style="color:red">${value}</span>`;
        }

        return value;
    },
    "onload": function(report) {
        // Backup: attach listeners to all filter inputs for immediate refresh
        report.page.on('change', 'input, select', () => {
            report.refresh();
        });
    }
};
