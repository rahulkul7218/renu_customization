frappe.provide("renu_customization.dashboard_fiscal_year");

/**
 * Default current fiscal year on dashboard load (does not set from_date / to_date).
 * Backend prepare_filters still applies FY dates when those fields are empty.
 */
renu_customization.dashboard_fiscal_year = {
	set_default_current_fiscal_year(page, on_done) {
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
				if (on_done) on_done();
			},
		});
	},

	cache_fiscal_year_bounds(page) {
		const fy_field = page.filter_group?.fields_dict?.fiscal_year;
		if (!fy_field) return Promise.resolve();

		const fy = fy_field.get_value();
		if (!fy) {
			fy_field._start_date = null;
			fy_field._end_date = null;
			return Promise.resolve();
		}

		return frappe.db.get_doc("Fiscal Year", fy).then((doc) => {
			fy_field._start_date = doc.year_start_date;
			fy_field._end_date = doc.year_end_date;
		});
	},

	bind_fiscal_year_change(page, options = {}) {
		const fy_field = page.filter_group?.fields_dict?.fiscal_year;
		if (!fy_field) return;

		const cache_bounds = options.cache_bounds !== false;

		fy_field.on_change = function () {
			const apply = () => page.refresh && page.refresh();

			if (!cache_bounds) {
				apply();
				return;
			}

			const fy = this.get_value();
			if (!fy) {
				fy_field._start_date = null;
				fy_field._end_date = null;
				apply();
				return;
			}

			frappe.db.get_doc("Fiscal Year", fy).then((doc) => {
				fy_field._start_date = doc.year_start_date;
				fy_field._end_date = doc.year_end_date;
				apply();
			});
		};
	},

	init(page, options = {}) {
		const { cache_bounds = false, refresh_delay = 300 } = options;

		this.set_default_current_fiscal_year(page, () => {
			const done = () => {
				if (page.refresh) {
					setTimeout(() => page.refresh(), refresh_delay);
				}
			};

			if (cache_bounds) {
				this.cache_fiscal_year_bounds(page).then(done);
			} else {
				done();
			}
		});
	},
};
