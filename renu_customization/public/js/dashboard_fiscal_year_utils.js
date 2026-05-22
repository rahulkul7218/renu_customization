frappe.provide("renu_customization.dashboard_fiscal_year");

/**
 * Set current fiscal year on dashboard filter_group and trigger page.refresh().
 */
renu_customization.dashboard_fiscal_year.init = function (page, options = {}) {
	const refresh_delay = flt(options.refresh_delay) || 300;

	const trigger_refresh = () => {
		if (typeof page.refresh !== "function") {
			return;
		}
		page.refresh();
		setTimeout(() => page.refresh(), refresh_delay);
	};

	frappe.call({
		method: "frappe.client.get_value",
		args: {
			doctype: "Fiscal Year",
			filters: {
				year_start_date: ["<=", frappe.datetime.get_today()],
				year_end_date: [">=", frappe.datetime.get_today()],
			},
			fieldname: "name",
		},
		callback(r) {
			if (r.message && page.filter_group) {
				page.filter_group.set_value("fiscal_year", r.message.name);
			}
		},
		always() {
			setTimeout(trigger_refresh, refresh_delay);
		},
	});
};
