frappe.pages["sales_order_booking_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Sales Order Booking Dashboard"),
		single_column: true,
	});

	window.cur_page = page;
	page.set_primary_action(__("Refresh"), () => page.refresh());

	// Standard Frappe Filters
	let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);

	let refresh_timer = null;
	page.refresh = function () {
		if (refresh_timer) clearTimeout(refresh_timer);
		refresh_timer = setTimeout(() => {
			perform_refresh();
		}, 50);
	};

	function perform_refresh() {
		let filters = page.filter_group.get_values();

		// Show loading indicator
		if (page.container.is(":empty") || page.container.find(".summary-wrapper").length === 0) {
			page.container.html(
				'<div class="text-center" style="padding: 100px 0;"><i class="fa fa-refresh fa-spin fa-2x text-muted"></i><div class="mt-2 text-muted">Loading Sales Order Booking Data...</div></div>'
			);
		} else {
			page.container.css("opacity", "0.6");
		}

		frappe.call({
			method: "renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				page.container.css("opacity", "1");
				if (r.message) {
					page.dashboard_data = r.message;
					render_dashboard(r.message);
				}
			},
		});
	}

	const filter_fields = [
		{
			fieldname: "fiscal_year",
			label: __("Fiscal Year"),
			fieldtype: "Link",
			options: "Fiscal Year",
			placeholder: __("Select Year"),
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
		},
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_user_default("Company"),
		},

		{
			fieldname: "customer_group",
			label: __("Customer Group"),
			fieldtype: "Link",
			options: "Customer Group",
			placeholder: __("Select Customer Group"),
		},
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
			placeholder: __("Select Customer"),
		},
		{
			fieldname: "item_group",
			label: __("Product Group"),
			fieldtype: "Link",
			options: "Item Group",
			placeholder: __("Select Product Group"),
		},
		{
			fieldname: "item_type",
			label: __("Item Type"),
			fieldtype: "Link",
			options: "Item Type",
			placeholder: __("Select Item Type"),
		},
		{
			fieldname: "item_code",
			label: __("Product (Item)"),
			fieldtype: "Link",
			options: "Item",
			placeholder: __("Select Product"),
		},
		{
			fieldname: "sales_person",
			label: __("Sales Person"),
			fieldtype: "Link",
			options: "Sales Person",
			placeholder: __("Select Sales Person"),
		},
		{
			fieldname: "business_region_name",
			label: __("Business Region Name"),
			fieldtype: "Select",
			options: ["All"],
			default: "All",
			placeholder: __("Select Business Region Name"),
		},
		{
			fieldname: "dom_exp",
			label: __("Domestic/Export"),
			fieldtype: "Select",
			options: ["All", "Domestic", "Export"],
			default: "All",
			placeholder: __("Select Domestic/Export"),
		},
		{
			fieldname: "invoice_type",
			label: __("Invoice Type"),
			fieldtype: "Select",
			options: [
				"All",
				"Product Domestic",
				"Product Export",
				"Engineering Service Domestic",
				"Engineering Service Export",
			],
			default: "All",
			placeholder: __("Select Invoice Type"),
		},
	];

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_parent,
		fields: filter_fields,
	});
	page.filter_group.make();

	// Populate Business Region Name options from database
	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Business Region Code",
			fields: ["business_region_name"],
			filters: [["Business Region Code", "enable", "=", 1]],
			order_by: "business_region_name asc",
			limit_page_length: 500,
		},
		callback: function (r) {
			if (r.message) {
				const names = [...new Set(r.message.map((x) => x.business_region_name))]
					.filter(Boolean)
					.sort();
				page.filter_group.set_df_property("business_region_name", "options", [
					"All",
					...names,
				]);
			}
		},
	});

	$("<style>")
		.text(
			`
		.dashboard-filter-area {
			padding: 15px 20px 5px 20px !important;
			background-color: #fff !important;
			border-bottom: 1px solid #e2e8f0 !important;
		}
		.dashboard-filter-area .form-section .section-body,
		.dashboard-filter-area .section-body,
		.dashboard-filter-area .form-column {
			display: block !important;
			width: 100% !important;
		}
		.dashboard-filter-area .form-column form {
			display: flex !important;
			flex-wrap: wrap !important;
			gap: 15px !important;
			align-items: flex-end !important;
		}
		.dashboard-filter-area .frappe-control[data-fieldtype="Column Break"],
		.dashboard-filter-area .frappe-control[data-fieldtype="Section Break"] {
			display: none !important;
		}
		.dashboard-filter-area .frappe-control {
			margin-bottom: 10px !important;
			width: calc(25% - 12px) !important;
		}
		.dashboard-filter-area .frappe-control .form-group {
			margin-bottom: 0 !important;
			width: 100% !important;
		}
		.dashboard-filter-area .control-input,
		.dashboard-filter-area .awesomplete,
		.dashboard-filter-area input,
		.dashboard-filter-area select {
			width: 100% !important;
			max-width: 100% !important;
		}
		.dashboard-filter-area label,
		.dashboard-filter-area .control-label {
			font-size: 12px !important;
			font-weight: 600 !important;
			color: #475569 !important;
			margin-bottom: 6px !important;
			display: block !important;
			white-space: nowrap !important;
		}
	`,
		)

		.appendTo(filter_parent);

	Object.keys(page.filter_group.fields_dict).forEach((key) => {
		let field = page.filter_group.fields_dict[key];
		field.on_change = () => page.refresh();
		if (field.$input) {
			field.$input.on("change input blur", () => {
				setTimeout(() => page.refresh(), 50);
			});
		}
	});

	if (page.filter_group.fields_dict.customer) {
		page.filter_group.fields_dict.customer.get_query = function () {
			let filters = {};
			let customer_group = page.filter_group.get_value("customer_group");
			if (customer_group) filters.customer_group = customer_group;
			return { filters: filters };
		};
	}

	if (page.filter_group.fields_dict.item_group) {
		page.filter_group.fields_dict.item_group.get_query = function () {
			return {
				filters: {
					parent_item_group: "All Item Groups"
				}
			};
		};

		page.filter_group.fields_dict.item_group.on_change = function () {
			let val = this.get_value();
			if (val) {
				frappe.db.get_value("Item Group", val, ["lft", "rgt"]).then((r) => {
					if (r && r.message) {
						frappe.db.get_list("Item Group", {
							filters: [
								["lft", ">=", r.message.lft],
								["rgt", "<=", r.message.rgt]
							],
							fields: ["name"],
							limit: 1000
						}).then((list) => {
							if (!page.filter_group._item_group_children) {
								page.filter_group._item_group_children = {};
							}
							page.filter_group._item_group_children[val] = list.map(d => d.name);
						});
					}
				});
			}
			page.refresh();
		};
	}

	if (page.filter_group.fields_dict.item_code) {
		page.filter_group.fields_dict.item_code.get_query = function () {
			let filters = {};
			let item_group = page.filter_group.get_value("item_group");
			if (item_group) {
				if (page.filter_group._item_group_children && page.filter_group._item_group_children[item_group]) {
					filters.item_group = ["in", page.filter_group._item_group_children[item_group]];
				} else {
					filters.item_group = item_group;
				}
			}
			let item_type = page.filter_group.get_value("item_type");
			if (item_type) filters.item_type = item_type;
			return { filters: filters };
		};
	}


	// --- FISCAL YEAR & DATE INTERACTION LOGIC ---
	const fy_field = page.filter_group.fields_dict.fiscal_year;
	const from_field = page.filter_group.fields_dict.from_date;
	const to_field = page.filter_group.fields_dict.to_date;

	// Helper to validate date within FY
	const validate_fy_bounds = (val, field_name) => {
		const fy = fy_field.get_value();
		if (!fy || !val || !fy_field._start_date) return true;

		if (val < fy_field._start_date || val > fy_field._end_date) {
			frappe.show_alert({
				message: __("Selected date is outside {0} ({1} to {2})", [
					fy,
					frappe.datetime.str_to_user(fy_field._start_date),
					frappe.datetime.str_to_user(fy_field._end_date),
				]),
				indicator: "orange",
			});
			// Clip to boundary
			const clipped = val < fy_field._start_date ? fy_field._start_date : fy_field._end_date;
			page.filter_group.set_value(field_name, clipped);
			return false;
		}
		return true;
	};

	// Handle Fiscal Year and Date Range Interaction
	fy_field.on_change = function () {
		let fy = this.get_value();
		if (fy) {
			frappe.db.get_doc("Fiscal Year", fy).then((doc) => {
				fy_field._start_date = doc.year_start_date;
				fy_field._end_date = doc.year_end_date;

				// Constrain current values if they are outside the new FY bounds
				let fd = from_field.get_value();
				let td = to_field.get_value();

				if (fd && (fd < doc.year_start_date || fd > doc.year_end_date)) {
					page.filter_group.set_value("from_date", doc.year_start_date);
				}
				if (td && (td < doc.year_start_date || td > doc.year_end_date)) {
					page.filter_group.set_value("to_date", doc.year_end_date);
				}

				page.refresh();
			});
		} else {
			fy_field._start_date = null;
			fy_field._end_date = null;
			page.refresh();
		}
	};

	// Override Date Changes with FY Constraint
	from_field.on_change = function () {
		validate_fy_bounds(this.get_value(), "from_date");
		page.refresh();
	};

	to_field.on_change = function () {
		validate_fy_bounds(this.get_value(), "to_date");
		page.refresh();
	};

	filter_parent.addClass("border-bottom").css({
		"background-color": "#fff",
		"margin-bottom": "0",
	});

	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .dashboard-content {
            padding: 24px;
            background: #ffffff;
            min-height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #1e293b;
            width: 100% !important;
            box-sizing: border-box;
        }
        .page-container { max-width: 100% !important; }

        /* Sorting Styles */
        .sortable-header {
            cursor: pointer;
            user-select: none;
            transition: background 0.2s;
        }
        .sortable-header:hover {
            background: #e2e8f0 !important;
        }
        .sortable-header i {
            transition: transform 0.2s;
        }

        /* KPI Cards Styling */
        .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #1e293b;
            margin: 32px 0 16px 0;
            display: flex;
            align-items: center;
            gap: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .section-title::after {
            content: "";
            flex: 1;
            height: 1px;
            background: #e2e8f0;
        }
        .summary-wrapper {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
            gap: 16px;
            margin-bottom: 24px;
            width: 100% !important;
        }
        .summary-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            border-left: 5px solid #cbd5e1;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            min-width: 190px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            box-sizing: border-box;
        }

        .lifecycle-total-col {
            position: sticky !important;
            right: 0;
            position: sticky; top: 0; z-index: 2;
            background: #f8fafc !important;
            font-weight: 800;
            color: #0f172a !important;
            text-align: right !important;
            border-left: 2px solid #cbd5e1;
            width: 150px !important;
            min-width: 150px !important;
            white-space: nowrap !important;
        }
        th.lifecycle-total-col { z-index: 2 !important; background: #f1f5f9 !important; }
        .summary-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
        }

        /* Consistent Border Colors */
        .summary-card.blue { border-left-color: #3b82f6; }
        .summary-card.green { border-left-color: #10b981; }
        .summary-card.orange { border-left-color: #f59e0b; }
        .summary-card.cyan { border-left-color: #06b6d4; }
        .summary-card.purple { border-left-color: #8b5cf6; }
        .summary-card.red { border-left-color: #ef4444; }

        .summary-card .label {
            font-size: 11px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .summary-card .value {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            white-space: nowrap;
            display: block;
        }
        .summary-card .indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }

        .bg-blue { background-color: #3b82f6; }
        .bg-green { background-color: #10b981; }
        .bg-orange { background-color: #f59e0b; }
        .bg-cyan { background-color: #06b6d4; }
        .bg-purple { background-color: #8b5cf6; }
        .bg-red { background-color: #ef4444; }

        /* Charts Row Styling */
        .charts-row {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
            margin-bottom: 24px;
            width: 100%;
        }
        .chart-card {
            background: #fff; border-radius: 12px; padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
        }
        .chart-card .title {
            font-size: 15px; font-weight: 700; color: #1e293b;
            margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.025em;
        }

        .custom-legend {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 16px;
            margin-top: 30px;
            padding: 20px;
            border-top: 1px solid #f1f5f9;
            background: #fafafa;
            border-radius: 8px;
        }
        .legend-item { display: flex; align-items: flex-start; gap: 12px; }
        .legend-item .dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
        .legend-item .info { display: flex; flex-direction: column; line-height: 1.2; }
        .legend-item .label { font-size: 12px; font-weight: 600; color: #475569; text-decoration: none !important; }
        .legend-item .val { font-size: 11px; color: #94a3b8; }

        /* Hard hide internal chart legend */
        .frappe-chart .chart-legend, .frappe-chart .legend { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important; }

        /* Standard chart text */
        .frappe-chart text { font-size: 11px !important; }
        .chart-actions, .table-actions { display: flex; gap: 12px; align-items: center; }
        .chart-card .export-btn, .table-card .header .export-btn, .table-card .header .pdf-btn, .export-btn {
            font-size: 12px; cursor: pointer; color: #475569; font-weight: 600;
            padding: 6px 14px; border-radius: 6px; transition: all 0.2s;
            display: inline-flex; align-items: center; gap: 6px;
            background: #fff; border: 1px solid #e2e8f0;
            white-space: nowrap;
        }
        .export-btn:hover {
            color: #2563eb !important; background: #eff6ff !important; border-color: #bfdbfe !important;
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
        }
        .export-btn i { font-size: 14px; }

        /* Modern Table Styling */
        .table-card {
            background: #fff; border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px; overflow: hidden;
            border: 1px solid #e2e8f0;
            width: 100%;
        }
        .table-card .header {
            padding: 15px 24px; background: #fff;
            border-bottom: 1px solid #f1f5f9; font-weight: 700;
            color: #0f172a; display: flex; justify-content: space-between; align-items: center;
            flex-wrap: nowrap; gap: 16px;
        }

        .table-container {
            overflow: auto; width: 100%; max-height: 800px;
            position: relative;
            border-top: 1px solid #e2e8f0;
        }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }

        .dashboard-table th {
            background: #f8fafc; padding: 12px 16px; text-align: left;
            font-size: 11px; font-weight: 700; color: #64748b;
            position: sticky; top: 0; z-index: 2;
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            white-space: nowrap !important;
        }

        .dashboard-table td {
            padding: 12px 14px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #334155;
            background: #fff; line-height: 1.4; vertical-align: top;
        }

        /* Column Widths & Alignment */
        .col-sno { width: 60px !important; min-width: 60px !important; text-align: center !important; }
        .col-customer { width: 280px !important; min-width: 280px !important; }
        .col-customer-group { width: 160px !important; min-width: 160px !important; }
        .col-item-group { width: 160px !important; min-width: 160px !important; }
        .col-sp { width: 180px !important; min-width: 180px !important; }
        .col-prod { width: 350px !important; min-width: 350px !important; }
        .col-amt {
            width: 130px !important; min-width: 130px !important;
            text-align: right !important;
            white-space: nowrap !important;
        }
        .col-qty { width: 80px !important; min-width: 80px !important; text-align: right !important; }
        .col-date { width: 110px !important; min-width: 110px !important; }
        .col-id { width: 140px !important; min-width: 140px !important; }
        .col-status { width: 120px !important; min-width: 120px !important; }

        /* Table Sticky Columns - Table 1 (Booking Breakdown) */
        .month-table .col-sno { position: sticky !important; left: 0; z-index: 1; width: 50px !important; text-align: center !important; background: #f8fafc !important; }
        .month-table .col-customer { position: sticky !important; left: 50px; z-index: 1; background: #fff !important; border-right: 2px solid #e2e8f0; width: 220px !important; min-width: 220px !important; }

        /* Table Sticky Columns - Table 2 (Detailed List) */
        .detailed-list-table .col-sno { position: sticky !important; left: 0; z-index: 1; width: 50px !important; text-align: center !important; background: #f8fafc !important; }
        .detailed-list-table .col-customer { position: sticky !important; left: 50px; z-index: 1; background: #fff !important; border-right: 2px solid #e2e8f0; }
        .detailed-list-table .col-id { position: relative; width: 140px !important; min-width: 140px !important; }





        .total-net-col {
            position: relative !important;
            background: #f1f5f9 !important; font-weight: 800; color: #0f172a !important;
            text-align: right !important; border-left: 1px solid #cbd5e1;
            width: 150px !important; min-width: 150px !important;
        }
        .grand-total-col {
            position: relative !important;
            background: #f0f4ff !important; font-weight: 800; color: #4338ca !important;
            text-align: right !important; border-left: 2px solid #cbd5e1;
            width: 150px !important; min-width: 150px !important;
        }
        th.total-net-col, th.grand-total-col { z-index: 2 !important; background: #f1f3f5 !important; }

        /* Sticky Footer */
        .dashboard-table tr.sticky-total td {
            position: sticky !important; background: #f8fafc !important;
            border-top: 2px solid #cbd5e1 !important; z-index: 2 !important; font-weight: 700; color: #0f172a;
            box-shadow: 0 -2px 5px rgba(0,0,0,0.05);
            height: 40px !important;
            padding: 8px 14px !important;
            line-height: 1.2 !important;
        }

        /* Stacked Sticky Footers (Table 1 has two) */
        .dashboard-table tr.sticky-total:nth-last-child(2) td { bottom: 40px !important; z-index: 2 !important; }
        .dashboard-table tr.sticky-total:nth-last-child(1) td { bottom: 0 !important; z-index: 2 !important; }

        .dashboard-table tr.sticky-total td.total-net-col, .dashboard-table tr.sticky-total td.grand-total-col { z-index: 2 !important; background: #f1f3f5 !important; }

        /* Ensure sticky columns stay on top in Header and Footer */
        .dashboard-table th.col-sno, .dashboard-table th.col-customer, .dashboard-table th.col-category { z-index: 10 !important; }
        .dashboard-table tr.sticky-total td.col-sno { z-index: 10 !important; left: 0 !important; background: #f8fafc !important; }
        .dashboard-table tr.sticky-total td.col-customer { z-index: 10 !important; left: 50px !important; background: #f8fafc !important; }
        .dashboard-table tr.sticky-total td.col-category { z-index: 10 !important; left: 0 !important; background: #f8fafc !important; }

        /* Lifecycle Table Category Sticky */
        .lifecycle-table .col-category {
            position: sticky !important; left: 0; z-index: 5 !important;
            background: #f8fafc !important; border-right: 1px solid #e2e8f0;
            width: 220px !important; min-width: 220px !important;
            white-space: nowrap !important;
        }

        .indicator-pill {
            padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.025em;
        }
        .indicator-pill.green { background: #dcfce7; color: #166534; }
        .indicator-pill.blue { background: #dbeafe; color: #1e40af; }
        .indicator-pill.orange { background: #fef3c7; color: #92400e; }
        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
        .indicator-pill.gray { background: #f1f5f9; color: #475569; }

        .export-btn {
            background: #fff; border: 1px solid #e2e8f0; padding: 6px 14px;
            border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569;
            cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px;
            width: fit-content !important; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .export-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; transform: translateY(-1px); }

        /* Hybrid Filters Styling */
        .hybrid-filter-container { display: flex; gap: 16px; align-items: center; }
        .hybrid-filter-container .frappe-control { width: 220px !important; }
        .hybrid-filter-container input {
            height: 38px !important; border-radius: 10px !important;
            background: #f8fafc !important; border: 1px solid #e2e8f0 !important;
            font-size: 13px !important;
        }
    </style>`).appendTo(page.main);

	const PDF_EXPORT_TABLE_CSS = `
		table.pdf-export-table {
			width: 100%; border-collapse: collapse; font-size: 6.5px;
			table-layout: fixed; page-break-inside: auto; margin-top: 10px;
		}
		table.pdf-export-table th, table.pdf-export-table td {
			border: 1px solid #cbd5e1; padding: 3px 4px; word-wrap: break-word;
			overflow-wrap: break-word; vertical-align: top;
			position: static !important; bottom: auto !important; top: auto !important;
			left: auto !important; right: auto !important; box-shadow: none !important;
		}
		table.pdf-export-table thead { display: table-header-group; }
		table.pdf-export-table thead th { background: #f1f5f9 !important; font-weight: 700; }
		table.pdf-export-table tbody tr { page-break-inside: auto !important; }
		table.pdf-export-table tr.sticky-total { page-break-inside: avoid !important; }
		table.pdf-export-table tr.sticky-total td { background: #f8fafc !important; font-weight: 700; }
		table.pdf-export-table .month-col, table.pdf-export-table .total-col,
		table.pdf-export-table .col-amt, table.pdf-export-table .total-net-col,
		table.pdf-export-table .grand-total-col, table.pdf-export-table .lifecycle-total-col {
			text-align: right !important; white-space: nowrap;
		}
	`;

	const prepare_table_html_for_pdf = ($table) => {
		if (!$table || !$table.length) {
			return "";
		}
		const $clone = $table.first().clone();
		$clone.addClass("pdf-export-table").removeAttr("style").css({ width: "100%" });
		$clone.find("colgroup").remove();
		$clone.find("a").each(function () {
			$(this).replaceWith(document.createTextNode($(this).text()));
		});
		$clone.find("i.fa").remove();
		$clone.find(".indicator-pill, .pct-badge").each(function () {
			$(this).replaceWith($(this).text());
		});
		$clone.find("th, td").each(function () {
			const $el = $(this);
			let style = ($el.attr("style") || "")
				.replace(/position\s*:\s*(sticky|relative|fixed|absolute)[^;]*/gi, "")
				.replace(/\b(bottom|top|left|right)\s*:\s*[^;]*/gi, "")
				.replace(/z-index\s*:\s*[^;]*/gi, "")
				.replace(/box-shadow\s*:\s*[^;]*/gi, "");
			style = style.replace(/;\s*;/g, ";").trim();
			if (style) {
				$el.attr("style", style);
			} else {
				$el.removeAttr("style");
			}
		});
		return $clone[0].outerHTML;
	};

	function render_dashboard(data) {
		page.container.empty();
		page.clear_menu();
		page.add_menu_item(__("Export to PDF"), () => export_pdf());
		page.add_menu_item(__("Export to Excel"), () => export_to_excel());

		if (!data.results || data.results.length === 0) {
			$(
				`<div class="text-center text-muted" style="padding: 100px 0;"><div>${__("No data found for the selected filters")}</div></div>`,
			).appendTo(page.container);
			return;
		}

		// 1. KPI Cards
		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach((metric) => {
			let clean_label = metric.label.replace("Global ", "").trim();
			let indicator = metric.indicator || "blue";

			$(`
                <div class="summary-card ${indicator}">
                    <div class="label">
                        <span class="indicator bg-${indicator}"></span>
                        ${clean_label}
                    </div>
                    <div class="value">${format_currency_short(metric.value)}</div>
                </div>
            `).appendTo(summary_row);
		});

		// 2. Charts Row
		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		Object.keys(data.charts).forEach((chart_id) => {
			let chart_obj = data.charts[chart_id];
			if (!chart_obj.data.labels || chart_obj.data.labels.length === 0) return;

			$(`
                <div class="chart-card">
                    <div class="title"><span>${chart_obj.title}</span></div>
                    <div id="wrapper_${chart_id}" style="height: 350px;"></div>
                    <div id="legend_${chart_id}" class="custom-legend"></div>
                </div>
            `).appendTo(charts_row);

			setTimeout(() => {
				const chart = new frappe.Chart(`#wrapper_${chart_id}`, {
					data: chart_obj.data,
					type: "donut",
					height: 350,
					colors: chart_obj.colors,
					valuesOverPoints: 1,
					isNavigable: 1,
					legend: 0,
					show_legend: 0,
					legendOptions: { showLegend: false },
					tooltipOptions: { formatTooltipY: (d) => format_currency_short(d) },
				});

				// Force redraw after a short delay to fix potential dimension issues on first load
				setTimeout(() => chart.draw(true), 250);

				// Render Custom Legend
				let legend_container = page.container.find(`#legend_${chart_id}`);
				let total_val = chart_obj.data.datasets[0].values.reduce((a, b) => a + b, 0);

				chart_obj.data.labels.forEach((label, idx) => {
					let val = chart_obj.data.datasets[0].values[idx];
					let color = chart_obj.colors[idx % chart_obj.colors.length];
					let share = total_val > 0 ? ((val / total_val) * 100).toFixed(1) + "%" : "0%";

					// Clean double names (e.g. "John Doe - John Doe")
					let display_label = label;
					if (label && label.includes(" - ")) {
						let parts = label.split(" - ");
						if (parts[0] === parts[1]) display_label = parts[0];
					}

					legend_container.append(`
                        <div class="legend-item">
                            <span class="dot" style="background: ${color}"></span>
                            <div class="info">
                                <span class="label">${display_label}</span>
                                <span class="val">${format_currency_short(val)} (${share})</span>
                            </div>
                        </div>
                    `);
				});
			}, 100);
		});

		// 3. Tables Section
		let tables_container = $('<div class="tables-view"></div>').appendTo(page.container);

		// Prepare unique sorted months
		let months = [];
		let months_map = {};
		data.results.forEach((row) => {
			let d = moment(row.so_date);
			let m_key = d.format("MMM YYYY");
			let m_sort = d.format("YYYYMM");
			if (!months_map[m_key]) {
				months_map[m_key] = m_sort;
				months.push({ key: m_key, sort: m_sort });
			}
		});
		months.sort((a, b) => a.sort - b.sort);

		let tables_html = $(`
            <div class="table-card" style="margin-top: 24px; overflow: visible;">
                <div class="header" style="overflow: visible;">
                    <span style="font-size: 15px;">${__("Month-Wise Booking Breakdown")}</span>
                    <div class="table-actions" style="overflow: visible;">
                        <div class="d-flex table-filters" style="gap: 10px; overflow: visible;">
                            <div id="filter_customer_link" style="width: 200px;"></div>
                            <div id="filter_sp_link" style="width: 200px;"></div>
                            <div id="filter_product_link" style="width: 200px;"></div>
                        </div>
                        <div class="d-flex" style="gap: 8px; margin-left: 10px;">
                            <span class="export-btn" id="export_month_table">
                                <i class="fa fa-file-excel-o"></i>Export to Excel
                            </span>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table month-table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-customer sortable-header" data-field="cust">Customer <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-customer-group sortable-header" data-field="cust_group" style="min-width: 150px;">Customer Group <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-sp sortable-header" data-field="sp">Sales Person <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-prod sortable-header" data-field="item_code">Product <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-item-group sortable-header" data-field="item_group" style="min-width: 150px;">Item Group <i class="fa fa-sort text-muted ml-1"></i></th>
                                ${months.map((m) => `<th class="col-amt sortable-header" data-field="${m.key}">${m.key} <i class="fa fa-sort text-muted ml-1"></i></th>`).join("")}
                                <th class="total-net-col sortable-header" data-field="total">Total (Net) (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="grand-total-col sortable-header" data-field="total_gross">Grand Total (Gross) (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="booking_month_body"></tbody>
                    </table>
                </div>
            </div>

            <div class="table-card" style="margin-top: 32px; overflow: visible;">
                <div class="header" style="overflow: visible;">
                    <span style="font-size: 15px;">${__("Monthly Lifecycle Summary")}</span>
                </div>
                <div class="table-container">
                    <table class="dashboard-table lifecycle-table">
                        <thead>
                            <tr>
                                <th class="col-category">Category</th>
                                ${months.map((m) => `<th class="col-amt">${m.key}</th>`).join("")}
                                <th class="lifecycle-total-col">Total (M)</th>
                            </tr>
                        </thead>
                        <tbody id="lifecycle_summary_body"></tbody>
                    </table>
                </div>
            </div>

            <div class="table-card" style="margin-top: 32px;">
                <div class="header">
                    <span style="font-size: 15px;">${__("Detailed Sales Orders List")}</span>
                    <div class="table-actions">
                        <span id="so_count" style="font-size: 12px; color: #64748b; font-weight: 500; margin-right: 12px;"></span>
                        <div class="export-btn" id="export_list_table">
                            <i class="fa fa-file-excel-o"></i>Export to Excel
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table detailed-list-table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-id sortable-header" data-field="name">Order ID <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date sortable-header" data-field="so_date" style="white-space: nowrap;">Date <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-status sortable-header" data-field="status">Status <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-customer sortable-header" data-field="customer_name">Customer <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-customer-group sortable-header" data-field="customer_group">Customer Group <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-po sortable-header" data-field="customer_po_no" style="width: 140px; white-space: nowrap;">Cust. PO No. <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-prod sortable-header" data-field="item_code">Item <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-item-group sortable-header" data-field="item_group">Item Group <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-deliv-date sortable-header" data-field="delivery_date" style="width: 110px; white-space: nowrap;">Deliv. Date <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-sp sortable-header" data-field="sales_person">Sales Person <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-field="total_booked_value">Booked (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-field="total_net_amount_inr">Total Booked (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-field="cancelled_val">Short Close (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-field="picked_value">Picked (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-field="dashboard_net_delivered">Delivered (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-field="pending_value">Pending (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-field="overdue_value">Overdue (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="so_list_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(tables_container);

		const render_filtered_view = (filtered_data) => {
			// Initialize page-level sorting states if not already present
			page.summary_sort = page.summary_sort || { field: "total", asc: false };
			page.detail_sort = page.detail_sort || { field: "total_booked_value", asc: false };

			let tbody_month = tables_container.find("#booking_month_body");
			let tbody_lifecycle = tables_container.find("#lifecycle_summary_body");
			let tbody_list = tables_container.find("#so_list_body");

			tbody_month.empty();
			tbody_lifecycle.empty();
			tbody_list.empty();

			// 3.0 Process Monthly Lifecycle Summary
			let lifecycle_buckets = {
				Booked: { color: "#3b82f6", data: {} },
				Cancelled: { color: "#ef4444", data: {} },
				"Short Close": { color: "#f59e0b", data: {} },
				"Total Booked Value": { color: "#10b981", data: {} },
				Returned: { color: "#f43f5e", data: {} },
				Picked: { color: "#facc15", data: {} },
				Delivered: { color: "#06b6d4", data: {} },
				Overdue: { color: "#8b5cf6", data: {} },
			};

			const today_moment = moment().startOf("day");

			// Initialize buckets for the 4 display categories
			const display_categories = ["Total Booked Value", "Delivered", "Pending", "Overdue"];
			display_categories.forEach(cat => {
				lifecycle_buckets[cat] = { color: "#10b981", data: {} };
			});
			lifecycle_buckets["Delivered"].color = "#06b6d4";
			lifecycle_buckets["Pending"].color = "#f59e0b";
			lifecycle_buckets["Overdue"].color = "#8b5cf6";

			filtered_data.forEach((row) => {
				let m_key = moment(row.so_date).format("MMM YYYY");

				// Use pre-calculated fields from Python get_dashboard_data
				let tbv = flt(row.total_booked_value || 0);
				let deliv = flt(row.delivered_net_total_inr || row.dashboard_net_delivered || 0);
				let pending = flt(row.pending_value || 0);
				let overdue = flt(row.overdue_value || 0);

				lifecycle_buckets["Total Booked Value"].data[m_key] = (lifecycle_buckets["Total Booked Value"].data[m_key] || 0) + tbv;
				lifecycle_buckets["Delivered"].data[m_key] = (lifecycle_buckets["Delivered"].data[m_key] || 0) + deliv;
				lifecycle_buckets["Pending"].data[m_key] = (lifecycle_buckets["Pending"].data[m_key] || 0) + pending;
				lifecycle_buckets["Overdue"].data[m_key] = (lifecycle_buckets["Overdue"].data[m_key] || 0) + overdue;
			});


			display_categories.forEach((cat) => {
				let row_data = lifecycle_buckets[cat];
				if (!row_data) return;

				let display_name = cat;
				if (cat === "Delivered") display_name = "Total Delivered";
				if (cat === "Pending") display_name = "Total Pending";
				if (cat === "Overdue") display_name = "Total Overdue";

				let cells = months
					.map(
						(m) =>
							`<td class="col-amt">${format_currency_short(row_data.data[m.key] || 0)}</td>`,
					)
					.join("");
				let total = Object.values(row_data.data).reduce((a, b) => a + b, 0);

				tbody_lifecycle.append(`
					<tr>
						<td class="col-category" style="font-weight: 700; color: #475569;">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${row_data.color}; margin-right: 8px; vertical-align: middle;"></span>
                             ${display_name}
                        </td>
						${cells}
						<td class="lifecycle-total-col">${format_currency_short(total)}</td>
					</tr>
				`);
			});

			// 3.1 Process Month-Wise Booking Breakdown
			let merged_data = {};
			filtered_data.forEach((row) => {
				let sp = row.sales_person || "-";
				let cust = row.customer_name || "-";
				let cust_group = row.customer_group || "-";
				let item_code = row.item_code || "-";
				let item_name = row.item_name || "-";
				let item_group = row.item_group || "-";
				let amt = row.hasOwnProperty("total_booked_value") ? flt(row.total_booked_value) : flt(row["total_net_amount_(inr)"] || 0);
				let g_amt = flt(row.gross_total || amt);
				let m_key = moment(row.so_date).format("MMM YYYY");
				let key = sp + "|" + cust + "|" + item_code;
				if (!merged_data[key])
					merged_data[key] = {
						sp,
						cust,
						cust_group,
						item_code,
						item_name,
						item_group,
						months: {},
						total: 0,
						total_cancelled: 0,
						total_gross: 0,
					};
				if (row.status !== "Cancelled" && row.status !== "Draft") {
					merged_data[key].months[m_key] = (merged_data[key].months[m_key] || 0) + amt;
					merged_data[key].total += amt;
					merged_data[key].total_gross += g_amt;
				}
				merged_data[key].total_cancelled += flt(row.cancelled_val || 0);
			});

			let summary_list = Object.values(merged_data);
			summary_list.sort((a, b) => {
				let val_a, val_b;
				let field = page.summary_sort.field;
				let asc = page.summary_sort.asc;

				if (field === "cust" || field === "sp" || field === "item_code") {
					val_a = a[field] || "";
					val_b = b[field] || "";
					return asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
				} else if (field === "total" || field === "total_gross") {
					val_a = flt(a[field]);
					val_b = flt(b[field]);
					return asc ? val_a - val_b : val_b - val_a;
				} else {
					val_a = flt(a.months[field] || 0);
					val_b = flt(b.months[field] || 0);
					return asc ? val_a - val_b : val_b - val_a;
				}
			});
			let total_month_amts = {};
			let total_month_gross_amts = {};
			let g_total_net = 0;
			let g_total_cancelled = 0;
			let g_total_gross = 0;

			if (summary_list.length === 0) {
				tbody_month.append(
					`<tr><td colspan="${8 + months.length}" class="text-center text-muted" style="padding: 40px;">No data matching filters</td></tr>`,
				);
			} else {
				summary_list.forEach((row, idx) => {
					g_total_net += row.total;
					g_total_cancelled += row.total_cancelled;
					g_total_gross += row.total_gross;
					let cells = months
						.map((m) => {
							let val = row.months[m.key] || 0;
							total_month_amts[m.key] = (total_month_amts[m.key] || 0) + val;
							return `<td class="col-amt">${format_currency_short(val)}</td>`;
						})
						.join("");

					tbody_month.append(`
                        <tr>
                            <td class="col-sno" style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                            <td class="col-customer" style="font-weight: 600; color: #0f172a;">${row.cust}</td>
                            <td class="col-customer-group" style="min-width: 150px;">${row.cust_group}</td>
                            <td class="col-sp">${row.sp}</td>
                            <td class="col-prod">
                                <div style="line-height: 1.4;">
                                    <div style="font-size: 11px; color: #64748b; font-weight: 500;">${row.item_code}</div>
                                    <div style="font-weight: 600; color: #1e293b;">${row.item_name}</div>
                                </div>
                            </td>
                            <td class="col-item-group" style="min-width: 150px;">${row.item_group}</td>
                            ${cells}
                            <td class="total-net-col">${format_currency_short(row.total)}</td>
                            <td class="grand-total-col">${format_currency_short(row.total_gross)}</td>
                        </tr>
                    `);
				});

				filtered_data.forEach((r) => {
					if (r.status !== "Cancelled" && r.status !== "Draft") {
						let m_key = moment(r.so_date).format("MMM YYYY");
						total_month_gross_amts[m_key] =
							(total_month_gross_amts[m_key] || 0) +
							flt(r.gross_total || r.total_net_amount_inr);
					}
				});

				// Footer Rows
				tbody_month.append(`
                    <tr class="sticky-total">
                        <td class="col-sno">-</td>
                        <td class="col-customer" style="text-align: right; padding-right: 20px; color: #1e293b; font-size: 11px; font-weight: 700;">GRAND TOTAL (NET)</td>
                        <td class="col-customer-group">-</td>
                        <td class="col-sp">-</td>
                        <td class="col-prod">-</td>
                        <td class="col-item-group">-</td>
                        ${months.map((m) => `<td class="col-amt" style="color: #1e293b;">${format_currency_short(total_month_amts[m.key] || 0)}</td>`).join("")}
                        <td class="total-net-col" style="color: #1e293b;">${format_currency_short(g_total_net)}</td>
                        <td class="grand-total-col">-</td>
                    </tr>
                    <tr class="sticky-total">
                        <td class="col-sno">-</td>
                        <td class="col-customer" style="text-align: right; padding-right: 20px; color: #1e293b; font-size: 11px; font-weight: 700;">GRAND TOTAL (GROSS)</td>
                        <td class="col-customer-group">-</td>
                        <td class="col-sp">-</td>
                        <td class="col-prod">-</td>
                        <td class="col-item-group">-</td>
                        ${months.map((m) => `<td class="col-amt" style="color: #1e293b;">${format_currency_short(total_month_gross_amts[m.key] || 0)}</td>`).join("")}
                        <td class="total-net-col">-</td>
                        <td class="grand-total-col" style="color: #1e293b;">${format_currency_short(g_total_gross)}</td>
                    </tr>
                `);
			}

			// 3.2 Detailed Sales Orders List
			let detailed_list = [...filtered_data];
			detailed_list.sort((a, b) => {
				let val_a, val_b;
				let field = page.detail_sort.field;
				let asc = page.detail_sort.asc;

                let num_fields = ["total_booked_value", "total_net_amount_inr", "cancelled_val", "picked_value", "dashboard_net_delivered", "pending_value", "overdue_value"];
				if (num_fields.includes(field)) {
					val_a = flt(a[field] || (field === 'dashboard_net_delivered' ? a.delivered_net_total_inr : 0) || (field === 'total_booked_value' ? a['total_net_amount_(inr)'] : 0));
					val_b = flt(b[field] || (field === 'dashboard_net_delivered' ? b.delivered_net_total_inr : 0) || (field === 'total_booked_value' ? b['total_net_amount_(inr)'] : 0));
					return asc ? val_a - val_b : val_b - val_a;
				} else {
					val_a = a[field] || "";
					val_b = b[field] || "";
					return asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
				}
			});

			tables_container.find("#so_count").text(`Showing ${filtered_data.length} orders`);
			let total_amt = 0,
				total_actual = 0,
				total_returned = 0,
				total_sc = 0,
				total_picked = 0,
				total_deliv = 0,
				total_pending = 0,
				total_overdue = 0;

			if (filtered_data.length === 0) {
				tbody_list.append(
					`<tr><td colspan="16" class="text-center text-muted" style="padding: 40px;">No data matching filters</td></tr>`,
				);
			} else {
				detailed_list.forEach((row, idx) => {
					let status_color = "gray";
					if (["Completed", "Closed"].includes(row.status)) status_color = "green";
					if (["Draft"].includes(row.status)) status_color = "blue";
					if (["To Deliver", "To Bill", "To Deliver and Bill"].includes(row.status))
						status_color = "orange";
					if (["Cancelled"].includes(row.status)) status_color = "red";

					let amt = row.hasOwnProperty("total_booked_value")
						? flt(row.total_booked_value)
						: flt(row["total_net_amount_(inr)"] || 0);
					let deliv_total = flt(row.delivered_net_total_inr || 0);
					let sc_value = flt(row.sc_value || 0);
					let ret_val = flt(row.returned_val || 0);
					let actual_val = flt(row.total_booked_value || 0);
					let pending_val = flt(row.pending_value || 0);
					let overdue_val = flt(row.overdue_value || 0);

					let cust_po = row.customer_po_no || row.po_no || "-";
					let deliv_date_str = row.delivery_date
						? frappe.datetime.str_to_user(row.delivery_date)
						: "-";

					let original_amt = flt(row.booked_net_total || amt);
					if (row.status !== "Cancelled") total_amt += original_amt;
					total_actual += actual_val;
					total_returned += ret_val;
					total_sc += sc_value;
					total_picked += flt(row.picked_net_total_inr || 0);
					total_deliv += deliv_total;
					total_pending += pending_val;
					total_overdue += overdue_val;

					tbody_list.append(`
                        <tr>
                            <td class="col-sno" style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                            <td class="col-id"><a href="/app/sales-order/${row.so_no}" style="font-weight: 600; color: #4338ca;">${row.so_no}</a></td>
                            <td class="col-date" style="white-space: nowrap;">${frappe.datetime.str_to_user(row.so_date)}</td>
                            <td class="col-status"><span class="indicator-pill ${status_color}">${row.status}</span></td>
                            <td class="col-customer" style="font-weight: 500;">${row.customer_name}</td>
                            <td class="col-customer-group">${row.customer_group || "-"}</td>
                            <td class="col-po" style="color: #475569; font-size: 11px; font-weight: 500; white-space: nowrap;">${cust_po}</td>
                            <td class="col-prod">
                                <div style="line-height: 1.4;">
                                    <div style="font-size: 11px; color: #64748b; font-weight: 500;">${row.item_code || "-"}</div>
                                    <div style="font-weight: 600; color: #1e293b;">${row.item_name || "-"}</div>
                                </div>
                            </td>
                            <td class="col-item-group">${row.item_group || "-"}</td>
                            <td class="col-deliv-date" style="color: #475569; font-size: 11px; white-space: nowrap;">${deliv_date_str}</td>
                            <td class="col-sp">${row.sales_person || "-"}</td>
                            <td class="col-amt" style="font-weight: 700; color: #1e293b;">${format_currency_short(original_amt)}</td>
                            <td class="col-amt" style="font-weight: 700; color: #059669;">${format_currency_short(actual_val)}</td>
                            <td class="col-amt" style="color: #f59e0b;">${format_currency_short(sc_value)}</td>
                            <td class="col-amt" style="color: #0f172a;">${format_currency_short(row.picked_net_total_inr || 0)}</td>
                            <td class="col-amt" style="color: #06b6d4;">${format_currency_short(deliv_total)}</td>
                            <td class="col-amt" style="font-weight: 700; color: #4338ca;">${format_currency_short(pending_val)}</td>
                            <td class="col-amt" style="font-weight: 700; color: #7c3aed;">${format_currency_short(overdue_val)}</td>
                        </tr>
                    `);
				});

				tbody_list.append(`
                    <tr class="sticky-total">
                        <td class="col-sno" style="background: #f1f5f9 !important; border-top: 2px solid #cbd5e1;">-</td>
                        <td class="col-id" style="border-top: 2px solid #cbd5e1;"></td>
                        <td class="col-date" style="border-top: 2px solid #cbd5e1;"></td>
                        <td class="col-status" style="border-top: 2px solid #cbd5e1;"></td>
                        <td class="col-customer" style="text-align: right; padding-right: 20px; color: #1e293b; font-size: 11px; font-weight: 800; background: #f1f5f9 !important; border-top: 2px solid #cbd5e1;">GRAND TOTAL</td>
                        <td class="col-customer-group" style="border-top: 2px solid #cbd5e1; background: #f1f5f9 !important;"></td>
                        <td class="col-po" style="border-top: 2px solid #cbd5e1;"></td>
                        <td class="col-prod" style="border-top: 2px solid #cbd5e1;"></td>
                        <td class="col-item-group" style="border-top: 2px solid #cbd5e1;"></td>
                        <td class="col-deliv-date" style="border-top: 2px solid #cbd5e1;"></td>
                        <td class="col-sp" style="border-top: 2px solid #cbd5e1;"></td>
                        <td class="col-amt" style="font-weight: 800; color: #1e293b; background: #f1f5f9 !important; z-index: 2; border-top: 2px solid #cbd5e1;">${format_currency_short(total_amt)}</td>
                        <td class="col-amt" style="font-weight: 800; color: #059669; background: #f1f5f9 !important; z-index: 2; border-top: 2px solid #cbd5e1;">${format_currency_short(total_actual)}</td>
                        <td class="col-amt" style="color: #f59e0b; background: #f1f5f9 !important; z-index: 2; border-top: 2px solid #cbd5e1;">${format_currency_short(total_sc)}</td>
                        <td class="col-amt" style="color: #1e293b; background: #f1f5f9 !important; z-index: 2; border-top: 2px solid #cbd5e1;">${format_currency_short(total_picked)}</td>
                        <td class="col-amt" style="color: #06b6d4; background: #f1f5f9 !important; z-index: 2; border-top: 2px solid #cbd5e1;">${format_currency_short(total_deliv)}</td>
                        <td class="col-amt" style="font-weight: 800; color: #4338ca; background: #f1f5f9 !important; z-index: 2; border-top: 2px solid #cbd5e1;">${format_currency_short(total_pending)}</td>
                        <td class="col-amt" style="font-weight: 800; color: #7c3aed; background: #f1f5f9 !important; z-index: 2; border-top: 2px solid #cbd5e1;">${format_currency_short(total_overdue)}</td>
                    </tr>
                `);
			}

			// Restore/Update active sort icon in DOM
			if (page.summary_sort) {
				let th = tables_container.find(`.month-table .sortable-header[data-field="${page.summary_sort.field}"]`);
				if (th.length) {
					tables_container.find(".month-table .sortable-header i")
						.removeClass("fa-sort-asc fa-sort-desc")
						.addClass("fa-sort text-muted");
					th.find("i")
						.removeClass("fa-sort text-muted")
						.addClass(page.summary_sort.asc ? "fa-sort-asc" : "fa-sort-desc");
				}
			}
			if (page.detail_sort) {
				let th = tables_container.find(`.detailed-list-table .sortable-header[data-field="${page.detail_sort.field}"]`);
				if (th.length) {
					tables_container.find(".detailed-list-table .sortable-header i")
						.removeClass("fa-sort-asc fa-sort-desc")
						.addClass("fa-sort text-muted");
					th.find("i")
						.removeClass("fa-sort text-muted")
						.addClass(page.detail_sort.asc ? "fa-sort-asc" : "fa-sort-desc");
				}
			}
		};

		const export_pdf = async () => {
			const report_date = frappe.datetime.now_datetime();
			const filters = page.filter_group.get_values();
			let period = "Custom Period";
			if (filters.fiscal_year) period = filters.fiscal_year;
			if (filters.from_date && filters.to_date)
				period = `${filters.from_date} to ${filters.to_date}`;

			const get_chart_png = (id) => {
				const svg_el = document.querySelector(`#wrapper_${id} svg`);
				if (!svg_el) return null;
				const clone = svg_el.cloneNode(true);
				const internal_legend = clone.querySelector(
					".chart-legend, .legend, .frappe-chart-legend",
				);
				if (internal_legend) internal_legend.style.display = "none";
				const canvas = document.createElement("canvas");
				const context = canvas.getContext("2d");
				const svg_data = new XMLSerializer().serializeToString(clone);
				const img = new Image();
				return new Promise((resolve) => {
					img.onload = () => {
						canvas.width = img.width * 2;
						canvas.height = img.height * 2;
						context.fillStyle = "white";
						context.fillRect(0, 0, canvas.width, canvas.height);
						context.drawImage(img, 0, 0, canvas.width, canvas.height);
						resolve(canvas.toDataURL("image/png"));
					};
					img.src =
						"data:image/svg+xml;base64," +
						btoa(unescape(encodeURIComponent(svg_data)));
				});
			};

			const [png1, png2, png3] = await Promise.all([
				get_chart_png("top_10_salesperson"),
				get_chart_png("top_10_customers"),
				get_chart_png("top_10_products"),
			]);

			const chart_h = (src, title) =>
				src
					? `<div style="margin-top:20px; text-align:center;"><h4 style="color:#444; margin-bottom: 15px; padding-bottom: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${title}</h4><img src="${src}" style="width:100%; max-width:900px; border:1px solid #f1f5f9; border-radius:12px; padding: 15px; background: #fff;"></div>`
					: "";

			const chart_l = (chart_id) => {
				const c_obj = data.charts[chart_id];
				if (!c_obj || !c_obj.data.labels.length) return "";
				const total_val = c_obj.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;

				let legend_html = '<div class="pdf-legend">';
				c_obj.data.labels.forEach((l, i) => {
					const val = c_obj.data.datasets[0].values[i];
					const color = c_obj.colors[i % c_obj.colors.length];
					const share = ((val / total_val) * 100).toFixed(1);
					let display_label = l;
					if (l && l.includes(" - ")) {
						let parts = l.split(" - ");
						if (parts[0] === parts[1]) display_label = parts[0];
					}
					legend_html += `
                        <div class="pdf-legend-item">
                            <span class="pdf-dot" style="background: ${color}"></span>
                            <div class="pdf-legend-info">
                                <div class="pdf-legend-label">${display_label}</div>
                                <div class="pdf-legend-val">${format_currency_short(val)} (${share}%)</div>
                            </div>
                        </div>
                    `;
				});
				legend_html += "</div>";
				return legend_html;
			};

			const chart_t = (chart_id, title) => {
				const c_obj = data.charts[chart_id];
				if (!c_obj || !c_obj.data.labels.length) return "";
				const total_val = c_obj.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;
				let rows = c_obj.data.labels
					.map((l, i) => {
						const val = c_obj.data.datasets[0].values[i];
						const share = ((val / total_val) * 100).toFixed(1);
						let display_label = l;
						if (l && l.includes(" - ")) {
							let parts = l.split(" - ");
							if (parts[0] === parts[1]) display_label = parts[0];
						}
						return `<tr><td style="text-align:center;">${i + 1}</td><td>${display_label}</td><td style="text-align:right;">${format_currency_short(val)}</td><td style="text-align:right;">${share}%</td></tr>`;
					})
					.join("");
				return `<div style="margin-top:10px; page-break-inside: avoid;"><table style="width:80%; margin: 10px auto; border-collapse: collapse; font-size: 10px; border: 1px solid #eee;"><thead><tr style="background: #f8f9fa;"><th style="width: 40px; text-align:center; border-bottom:2px solid #3b82f6;">S.No.</th><th style="text-align:left; border-bottom:2px solid #3b82f6;">${title}</th><th style="width: 120px; text-align:right; border-bottom:2px solid #3b82f6;">Net Booking (M)</th><th style="width: 80px; text-align:right; border-bottom:2px solid #3b82f6;">Share %</th></tr></thead><tbody>${rows}</tbody></table></div>`;
			};

			const html = `
				<html>
				<head>
					<style>
                        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 0; margin: 0; color: #1e293b; background: #fff; line-height: 1.2; }
                        @page { size: landscape; margin: 10mm; }
                        .report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }

                        .kpi-section-title { font-size: 13px; font-weight: 700; color: #3b82f6; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase; }
                        .kpi-container { width: 100%; clear: both; margin-bottom: 5px; display: block; }
                        .kpi-card { float: left; width: 23.5%; border: 1px solid #e2e8f0; padding: 6px 4px; margin: 0.5%; border-radius: 6px; background: #f8fafc; text-align: center; height: 45px; box-sizing: border-box; }
                        .kpi-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
                        .kpi-label { font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                        .kpi-value { font-size: 11px; font-weight: 800; color: #0f172a; line-height: 1.1; }

                        h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 25px; border-left: 4px solid #3b82f6; padding-left: 12px; text-transform: uppercase; letter-spacing: 0.025em; }

                        ${PDF_EXPORT_TABLE_CSS}

                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-weight-bold { font-weight: 700; }
                        .page-break { page-break-after: always; }

                        .pdf-legend { display: block; margin-top: 15px; text-align: left; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
                        .pdf-legend-item { display: inline-block; width: 31%; margin-bottom: 12px; vertical-align: top; margin-right: 2%; }
                        .pdf-dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 8px; vertical-align: middle; }
                        .pdf-legend-info { display: inline-block; vertical-align: middle; width: calc(100% - 25px); }
                        .pdf-legend-label { font-size: 11px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                        .pdf-legend-val { font-size: 9px; color: #64748b; }
					</style>
				</head>
				<body>
					<div class="report-header">
						<h1 style="margin:0; font-size: 24px;">Sales Order Booking Dashboard</h1>
						<p style="font-size: 14px; color: #555; margin: 8px 0;">${period}</p>
						<p style="font-size: 11px; color: #999; margin: 0;">Generated: ${report_date}</p>
					</div>
					<div class="kpi-container">
						${data.summary
							.map((m) => {
								let color = "#3498db";
								if (m.indicator === "blue") color = "#3b82f6";
								if (m.indicator === "green") color = "#2ecc71";
								if (m.indicator === "cyan") color = "#06b6d4";
								if (m.indicator === "orange") color = "#e67e22";
								if (m.indicator === "purple") color = "#9b59b6";
								if (m.indicator === "red") color = "#e74c3c";

								return `
									<div class="kpi-card">
										<div class="kpi-label"><span class="kpi-dot" style="background: ${color};"></span>${m.label}</div>
										<div class="kpi-value">${format_currency_short(m.value)}</div>
									</div>
								`;
							})
							.join("")}
					</div>
					<div style="clear: both; margin-bottom: 20px;"></div>
					<h3>Visual Analytics</h3>
					${chart_h(png1, "Top Salesperson by Booking")}
                    ${chart_l("top_10_salesperson")}
					${chart_t("top_10_salesperson", "Top Salesperson Data")}
                    <div class="page-break"></div>
					${chart_h(png2, "Top Customers by Booking")}
                    ${chart_l("top_10_customers")}
					${chart_t("top_10_customers", "Top Customers Data")}
					${chart_h(png3, "Top Products by Booking")}
                    ${chart_l("top_10_products")}
					${chart_t("top_10_products", "Top Products Data")}
					<div class="page-break"></div>
					<h3>Month-Wise Booking Breakdown (M)</h3>
					${prepare_table_html_for_pdf(tables_container.find(".month-table")) || "<p>No data</p>"}
					<div class="page-break"></div>
					<h3>Monthly Lifecycle Summary (M)</h3>
					${prepare_table_html_for_pdf(tables_container.find(".lifecycle-table")) || "<p>No data</p>"}
					<div class="page-break"></div>
					<h3>Detailed Sales Orders List (M)</h3>
					${prepare_table_html_for_pdf(tables_container.find(".table-card:last table")) || "<p>No data</p>"}
				</body>
				</html>
			`;

			const method_url =
				"/api/method/renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard.export_to_pdf";
			const iframe_name = `so_booking_pdf_${Date.now()}`;
			$(`<iframe name="${iframe_name}" style="display:none;"></iframe>`).appendTo("body");
			const $form = $(`<form action="${method_url}" method="POST" target="${iframe_name}" style="display:none;">
                <input type="hidden" name="html" value="">
                <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
            </form>`).appendTo("body");
			$form.find('input[name="html"]').val(html);
			$form[0].submit();
			setTimeout(() => $form.remove(), 5000);
			frappe.show_alert({ message: __("PDF download started"), indicator: "green" });
		};

		// Hybrid Filter Logic
		const apply_local_filters = () => {
			const c_val = (f_cust_ctrl.$input ? f_cust_ctrl.$input.val() || "" : "")
				.toLowerCase()
				.trim();
			const s_val = (f_sp_ctrl.$input ? f_sp_ctrl.$input.val() || "" : "")
				.toLowerCase()
				.trim();
			const i_val = (f_item_ctrl.$input ? f_item_ctrl.$input.val() || "" : "")
				.toLowerCase()
				.trim();

			let filtered = data.results.filter((row) => {
				const cust_match =
					!c_val ||
					(row.customer_name || "").toLowerCase().includes(c_val) ||
					(row.customer || "").toLowerCase().includes(c_val);
				const sp_match = !s_val || (row.sales_person || "").toLowerCase().includes(s_val);
				const item_match =
					!i_val ||
					(row.item_code || "").toLowerCase().includes(i_val) ||
					(row.item_name || "").toLowerCase().includes(i_val);
				return cust_match && sp_match && item_match;
			});
			render_filtered_view(filtered);
		};

		let f_cust_ctrl, f_sp_ctrl, f_item_ctrl;

		const make_hybrid_filter = (parent_id, placeholder, options) => {
			let parent = page.container.find("#" + parent_id);
			let ctrl = frappe.ui.form.make_control({
				parent: parent,
				df: {
					fieldtype: "Autocomplete",
					placeholder: placeholder,
					options: options,
					on_change: () => apply_local_filters(),
				},
				render_input: true,
			});

			parent.css("position", "relative");
			if (ctrl.$input) {
				let control_input = parent.find(".control-input");
				control_input.css("position", "relative");
				ctrl.$input.css({ "padding-right": "24px" });

				let clear_btn = $(
					'<span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #adb5bd; font-size: 16px; font-weight: 600; display: none; line-height: 1; user-select: none;">&times;</span>',
				).appendTo(control_input);

				ctrl.$input.on("input change awesomplete-selectcomplete", function () {
					if ($(this).val()) {
						clear_btn.show();
					} else {
						clear_btn.hide();
					}
				});

				clear_btn.on("click", function () {
					ctrl.$input.val("").trigger("change");
					ctrl.$input.focus();
					clear_btn.hide();
				});
			}
			return ctrl;
		};

		const init_hybrid_ui = () => {
			f_cust_ctrl = make_hybrid_filter(
				"filter_customer_link",
				__("Filter Customer"),
				[...new Set(data.results.map((r) => r.customer_name || r.customer))].sort(),
			);
			f_sp_ctrl = make_hybrid_filter(
				"filter_sp_link",
				__("Filter Sales Person"),
				[...new Set(data.results.map((r) => r.sales_person || ""))].filter(Boolean).sort(),
			);
			f_item_ctrl = make_hybrid_filter(
				"filter_product_link",
				__("Filter Product"),
				[...new Set(data.results.map((r) => r.item_code))].sort(),
			);

			[f_cust_ctrl, f_sp_ctrl, f_item_ctrl].forEach((ctrl) => {
				if (ctrl && ctrl.$input) {
					ctrl.$input.on("input change", () => apply_local_filters());
					ctrl.$input.on("awesomplete-selectcomplete", () =>
						setTimeout(() => apply_local_filters(), 10),
					);
				}
			});
		};

		// Table Action Handlers
		tables_container.on("click", "#export_month_table", () => export_to_excel("summary"));
		tables_container.on("click", "#pdf_month_table", () => export_pdf());
		tables_container.on("click", "#export_list_table", () => export_to_excel("detail"));

		tables_container.off("click", ".month-table .sortable-header");
		tables_container.on("click", ".month-table .sortable-header", function () {
			let field = $(this).attr("data-field");
			if (page.summary_sort.field === field) {
				page.summary_sort.asc = !page.summary_sort.asc;
			} else {
				page.summary_sort.field = field;
				page.summary_sort.asc = false;
			}
			apply_local_filters();
		});

		tables_container.off("click", ".detailed-list-table .sortable-header");
		tables_container.on("click", ".detailed-list-table .sortable-header", function () {
			let field = $(this).attr("data-field");
			if (page.detail_sort.field === field) {
				page.detail_sort.asc = !page.detail_sort.asc;
			} else {
				page.detail_sort.field = field;
				page.detail_sort.asc = false;
			}
			apply_local_filters();
		});

		// Initial table render
		render_filtered_view(data.results);
		init_hybrid_ui();
	}

	const export_to_excel = (export_type = "all") => {
		frappe.call({
			method: "renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard.export_to_excel",
			args: {
				filters: page.filter_group.get_values(),
				export_type: export_type,
			},
			callback: (r) => {
				if (r.message) {
					const b64 = r.message.filecontent;
					const link = document.createElement("a");
					link.href =
						"data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," +
						b64;
					link.download = r.message.filename;
					link.click();
				}
			},
		});
	};

	setTimeout(() => page.refresh(), 300);
};

function format_currency_short(num) {
	if (!num && num !== 0) return "₹ 0.00 M";
	let value = flt(num) / 1000000;
	return (
		"₹ " +
		value.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}) +
		" M"
	);
}
