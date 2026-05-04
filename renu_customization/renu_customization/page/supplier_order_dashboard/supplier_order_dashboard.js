frappe.pages["supplier_order_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Supplier Order Dashboard "),
		single_column: true,
	});

	window.cur_page = page;
	page.set_primary_action(__("Refresh"), () => page.refresh());

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
		if (page.container) page.container.css("opacity", "0.6");

		frappe.call({
			method: "renu_customization.renu_customization.page.supplier_order_dashboard.supplier_order_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				if (page.container) page.container.css("opacity", "1");
				if (r.message) {
					page.dashboard_data = r.message;
					render_dashboard(r.message);
				}
			},
		});
	}

	const filter_fields = [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -12),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
		},
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_user_default("Company"),
		},
		{
			fieldname: "purchase_order",
			label: __("PO Details"),
			fieldtype: "Link",
			options: "Purchase Order",
			placeholder: __("Select PO"),
		},
		{
			fieldname: "supplier",
			label: __("Supplier"),
			fieldtype: "Link",
			options: "Supplier",
			placeholder: __("Select Supplier"),
		},
		{
			fieldname: "expected_delivery_date",
			label: __("Expected Delivery Date"),
			fieldtype: "Date",
			placeholder: __("Select Date"),
		},
		{
			fieldname: "actual_delivery_time",
			label: __("Actual Delivery Time"),
			fieldtype: "Date",
			placeholder: __("Select Date"),
		},
		{
			fieldname: "delivery_time_as_per_po",
			label: __("Delivery Time as per PO"),
			fieldtype: "Date",
			placeholder: __("Select Date"),
		},
		{
			fieldname: "supplier_agreed_time",
			label: __("Supplier Agreed Time"),
			fieldtype: "Date",
			placeholder: __("Select Date"),
		},
		{
			fieldname: "open_po_details",
			label: __("Open PO Details"),
			fieldtype: "Check",
		},
		{
			fieldname: "is_overdue",
			label: __("Overdue Deliveries"),
			fieldtype: "Check",
		},
		{
			fieldname: "due_next_week",
			label: __("Due in Next Week"),
			fieldtype: "Check",
		},
	];

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_parent,
		fields: filter_fields,
	});
	page.filter_group.make();

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
		.dashboard-filter-area input:not([type="checkbox"]),
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
		.dashboard-filter-area .frappe-control[data-fieldtype="Check"] {
			display: flex !important;
			align-items: center !important;
			padding-bottom: 4px !important;
		}
		.dashboard-filter-area .frappe-control[data-fieldtype="Check"] .control-label {
			display: none !important;
		}
		.dashboard-filter-area .frappe-control[data-fieldtype="Check"] .form-group {
			margin-bottom: 0 !important;
			width: 100% !important;
		}
		.dashboard-filter-area .frappe-control[data-fieldtype="Check"] .checkbox {
			margin: 0 !important;
		}
		.dashboard-filter-area .frappe-control[data-fieldtype="Check"] label {
			display: flex !important;
			align-items: center !important;
			margin-bottom: 0 !important;
			cursor: pointer !important;
			white-space: normal !important;
		}
		.dashboard-filter-area .frappe-control[data-fieldtype="Check"] input[type="checkbox"] {
			width: 16px !important;
			height: 16px !important;
			margin: 0 8px 0 0 !important;
			cursor: pointer !important;
			flex-shrink: 0 !important;
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

	filter_parent.addClass("border-bottom").css({
		"background-color": "#fff",
		"margin-bottom": "0",
	});

	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        .dashboard-content { 
            padding: 20px; 
            background: #ffffff; 
            min-height: 100vh; 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #1e293b;
            width: 100% !important;
            box-sizing: border-box;
        }

        .summary-wrapper { 
            display: grid !important; 
            grid-template-columns: repeat(4, 1fr) !important; 
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
        }
        .summary-card:hover { 
            transform: translateY(-4px); 
            box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1); 
        }
        
        /* Consistent Border Colors */
        .summary-card.blue { border-left-color: #3b82f6; }
        .summary-card.purple { border-left-color: #8b5cf6; }
        .summary-card.green { border-left-color: #10b981; }
        .summary-card.orange { border-left-color: #f59e0b; }
        .summary-card.cyan { border-left-color: #06b6d4; }
        .summary-card.red { border-left-color: #ef4444; }

        .summary-card .label { 
            font-size: 11px; 
            color: #64748b; 
            font-weight: 700; 
            margin-bottom: 8px; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .summary-card .value { 
            font-size: 20px; 
            font-weight: 800; 
            color: #0f172a; 
        }
        .summary-card .indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
        
        .bg-blue { background-color: #3b82f6; }
        .bg-green { background-color: #10b981; }
        .bg-orange { background-color: #f59e0b; }
        .bg-cyan { background-color: #06b6d4; }
        .bg-purple { background-color: #8b5cf6; }
        .bg-red { background-color: #ef4444; }

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

        .frappe-chart .chart-legend, .frappe-chart .legend { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important; }
        .frappe-chart text { font-size: 11px !important; }

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
        }
        .table-actions { display: flex; gap: 12px; align-items: center; }
        .export-btn { font-size: 12px; cursor: pointer; color: #475569; font-weight: 600; padding: 6px 14px; border-radius: 6px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; white-space: nowrap; }
        .export-btn:hover { color: #2563eb !important; background: #eff6ff !important; border-color: #bfdbfe !important; }
        tr.sticky-total td { position: sticky; bottom: 0; z-index: 9; background: #f1f3f5 !important; font-weight: 700; border-top: 2px solid #ddd; }
        
        .table-container { 
            overflow: auto; width: 100%; max-height: 750px; 
            position: relative;
        }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        
        .dashboard-table th { 
            background: #f8fafc; padding: 12px 16px; text-align: left; 
            font-size: 11px; font-weight: 700; color: #64748b; 
            position: sticky; top: 0; z-index: 50; 
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
            white-space: nowrap;
        }
        
        .dashboard-table td { 
            padding: 12px 16px; border-bottom: 1px solid #f1f5f9; 
            font-size: 13px; color: #334155; 
            background: #fff;
            vertical-align: middle;
            white-space: nowrap;
        }

        .col-sno { width: 60px !important; min-width: 60px !important; text-align: center !important; }
        .col-supplier { width: 280px !important; min-width: 280px !important; white-space: normal !important; word-wrap: break-word; }
        .col-po { width: 160px !important; min-width: 160px !important; }
        .col-date { width: 130px !important; min-width: 130px !important; }
        .col-status { width: 140px !important; min-width: 140px !important; }
        .col-amt { width: 140px !important; min-width: 140px !important; text-align: right !important; }

        .indicator-pill { 
            padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.025em;
        }
        .indicator-pill.green { background: #dcfce7; color: #166534; }
        .indicator-pill.blue { background: #dbeafe; color: #1e40af; }
        .indicator-pill.orange { background: #fef3c7; color: #92400e; }
        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
        .indicator-pill.gray { background: #f1f5f9; color: #475569; }
    </style>`).appendTo(page.main);

	function render_dashboard(data) {
		page.container.empty();
		page.clear_menu();
		if (!data.results || data.results.length === 0) {
			$(
				`<div class="text-center text-muted" style="padding: 100px 0;"><div>${__("No data found for the selected filters")}</div></div>`,
			).appendTo(page.container);
			return;
		}

		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach((m) => {
			let indicator = (m.indicator || "blue").toLowerCase();
			let val =
				m.fieldtype === "Currency"
					? "₹ " +
						(flt(m.value) / 1000000).toLocaleString("en-US", {
							minimumFractionDigits: 4,
							maximumFractionDigits: 4,
						}) +
						" M"
					: m.value;
			$(`
                <div class="summary-card ${indicator}">
                    <div class="label"><span class="indicator bg-${indicator}"></span>${m.label}</div>
                    <div class="value">${val}</div>
                </div>
            `).appendTo(summary_row);
		});

		// 2. Charts Row
		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		if (data.charts) {
			Object.keys(data.charts).forEach((chart_id) => {
				let chart_obj = data.charts[chart_id];
				if (!chart_obj.data.labels || chart_obj.data.labels.length === 0) return;

				$(`
					<div class="chart-card">
						<div class="title"><span>${chart_obj.title || chart_id.replace(/_/g, " ").toUpperCase()}</span></div>
						<div id="wrapper_${chart_id}" style="height: 350px;"></div>
						<div id="legend_${chart_id}" class="custom-legend"></div>
					</div>
				`).appendTo(charts_row);

				setTimeout(() => {
					let is_currency = chart_obj.is_currency || false;
					let c_data = Object.assign({}, chart_obj.data);

					if (is_currency) {
						c_data.datasets = c_data.datasets.map((ds) => ({
							name: ds.name,
							values: ds.values.map((v) => parseFloat((v / 1000000).toFixed(4))),
						}));
					}

					new frappe.Chart(`#wrapper_${chart_id}`, {
						data: c_data,
						type: chart_obj.type || "donut",
						height: 350,
						colors: chart_obj.colors,
						valuesOverPoints: 1,
						isNavigable: 1,
						legend: 0,
						show_legend: 0,
						legendOptions: { showLegend: false },
						tooltipOptions: {
							formatTooltipY: (d) =>
								is_currency
									? "₹ " +
										d.toLocaleString("en-US", {
											minimumFractionDigits: 4,
											maximumFractionDigits: 4,
										}) +
										" M"
									: d,
						},
					});

					let legend_container = page.container.find(`#legend_${chart_id}`);
					let total_val =
						chart_obj.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;

					chart_obj.data.labels.forEach((label, idx) => {
						let val = chart_obj.data.datasets[0].values[idx];
						let color = chart_obj.colors[idx % chart_obj.colors.length];
						let share = ((val / total_val) * 100).toFixed(1) + "%";

						let val_str = is_currency
							? "₹ " +
								(val / 1000000).toLocaleString("en-US", {
									minimumFractionDigits: 4,
									maximumFractionDigits: 4,
								}) +
								" M"
							: val;

						legend_container.append(`
							<div class="legend-item">
								<span class="dot" style="background: ${color}"></span>
								<div class="info">
									<span class="label">${label}</span>
									<span class="val">${val_str} (${share})</span>
								</div>
							</div>
						`);
					});

					// Append 'M' to Y-axis ticks and values-over-points in SVG
					if (is_currency) {
						const append_m_to_svg = () => {
							page.container.find(`#wrapper_${chart_id} text`).each(function () {
								let t = $(this).text();
								// Strip commas for isNaN check
								let clean_t = t.replace(/,/g, "").trim();
								if (
									!isNaN(clean_t) &&
									clean_t !== "" &&
									clean_t !== "0" &&
									!t.includes("M")
								) {
									// Exclude x-axis labels to avoid altering supplier names that might be numbers
									if ($(this).closest(".x-axis").length === 0) {
										$(this).text(t + " M");
									}
								}
							});
						};

						// Run initially
						setTimeout(append_m_to_svg, 100);

						// Observe SVG for animations/re-renders
						let wrapperNode = document.querySelector(`#wrapper_${chart_id}`);
						if (wrapperNode) {
							let observer = new MutationObserver(() => {
								append_m_to_svg();
							});
							observer.observe(wrapperNode, {
								childList: true,
								subtree: true,
								characterData: true,
							});
						}
					}
				}, 100);
			});
		}

		let tables_container = $('<div class="tables-view"></div>').appendTo(page.container);

		let months = [];
		let months_map = {};
		data.results.forEach((row) => {
			if (row.transaction_date) {
				let d = moment(row.transaction_date);
				let m_key = d.format("MMM YYYY");
				let m_sort = d.format("YYYYMM");
				if (!months_map[m_key]) {
					months_map[m_key] = m_sort;
					months.push({ key: m_key, sort: m_sort });
				}
			}
		});
		months.sort((a, b) => a.sort - b.sort);

		let tables_html = $(`
            <div class="table-card" style="margin-top: 24px; overflow: visible;">
                <div class="header" style="overflow: visible;">
                    <span style="font-size: 15px;">${__("Month-Wise Order Breakdown")}</span>
                    <div class="table-actions">
                        <span class="export-btn" id="export_month_table"><i class="fa fa-file-excel-o"></i> Export to Excel</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table month-table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-supplier">Supplier</th>
                                ${months.map((m) => `<th class="col-amt">${m.key}</th>`).join("")}
                                <th class="col-amt" style="position: sticky; right: 0; background: #f8fafc; z-index: 60; text-align: right;">Total (Net)</th>
                            </tr>
                        </thead>
                        <tbody id="po_month_body"></tbody>
                    </table>
                </div>
            </div>

            <div class="table-card" style="margin-top: 32px;">
                <div class="header">
                    <span style="font-size: 15px;">${__("Supplier Orders")}</span>
                    <div class="table-actions">
                        <span class="export-btn" id="export_list_table"><i class="fa fa-file-excel-o"></i> Export to Excel</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-po">PO No</th>
                                <th class="col-supplier">Supplier</th>
                                <th class="col-date">PO Date</th>
                                <th class="col-date">Expected Del.</th>
                                <th class="col-date">Agreed Time</th>
                                <th class="col-date">Delivery as per PO</th>
                                <th class="col-date">Actual Delivery</th>
                                <th class="col-status">Status</th>
                                <th class="col-amt">Net Total</th>
                            </tr>
                        </thead>
                        <tbody id="po_list_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(tables_container);

		let tbody_month = tables_container.find("#po_month_body");
		tbody_month.empty();

		let merged_data = {};
		data.results.forEach((row) => {
			let supp = row.supplier || "-";
			let amt = flt(row.net_total);
			let m_key = row.transaction_date
				? moment(row.transaction_date).format("MMM YYYY")
				: "Unknown";

			if (!merged_data[supp]) {
				merged_data[supp] = { supp: supp, months: {}, total: 0 };
			}
			merged_data[supp].months[m_key] = (merged_data[supp].months[m_key] || 0) + amt;
			merged_data[supp].total += amt;
		});

		let summary_list = Object.values(merged_data).sort((a, b) => b.total - a.total);
		let total_month_amts = {};
		let g_total_net = 0;

		if (summary_list.length === 0) {
			tbody_month.append(
				`<tr><td colspan="${3 + months.length}" class="text-center text-muted" style="padding: 40px;">No data matching filters</td></tr>`,
			);
		} else {
			summary_list.forEach((row, idx) => {
				g_total_net += row.total;
				let cells = months
					.map((m) => {
						let val = row.months[m.key] || 0;
						total_month_amts[m.key] = (total_month_amts[m.key] || 0) + val;
						return `<td class="col-amt" style="text-align: right;">₹ ${(val / 1000000).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} M</td>`;
					})
					.join("");

				tbody_month.append(`
					<tr>
						<td class="col-sno" style="color: #94a3b8; font-weight: 600; text-align: center;">${idx + 1}</td>
						<td class="col-supplier" style="font-weight: 600; color: #0f172a;">${row.supp}</td>
						${cells}
						<td class="col-amt" style="position: sticky; right: 0; background: #f8fafc; font-weight: 700; color: #4338ca; text-align: right; border-left: 1px solid #e2e8f0;">₹ ${(row.total / 1000000).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} M</td>
					</tr>
				`);
			});

			tbody_month.append(`
				<tr class="sticky-total">
					<td class="col-sno">-</td>
					<td class="col-supplier" style="text-align: right; padding-right: 20px; color: #64748b; font-size: 11px;">GRAND TOTAL</td>
					${months.map((m) => `<td class="col-amt" style="text-align: right;">₹ ${((total_month_amts[m.key] || 0) / 1000000).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} M</td>`).join("")}
					<td class="col-amt" style="position: sticky; right: 0; background: #f0f4ff !important; z-index: 80; text-align: right; border-left: 1px solid #e2e8f0;">₹ ${(g_total_net / 1000000).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} M</td>
				</tr>
			`);
		}

		let tbody_list = tables_container.find("#po_list_body");
		tbody_list.empty();

		let total_amt = 0;

		data.results.forEach((row, idx) => {
			let status_color = "gray";
			if (["Completed", "Closed"].includes(row.status)) status_color = "green";
			if (["Draft"].includes(row.status)) status_color = "blue";
			if (["To Receive", "To Bill", "To Receive and Bill"].includes(row.status))
				status_color = "orange";
			if (["Cancelled"].includes(row.status)) status_color = "red";

			let amt = flt(row.net_total);
			total_amt += amt;

			tbody_list.append(`
                <tr>
                    <td class="col-sno" style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                    <td class="col-po"><a href="/app/purchase-order/${row.name}" style="font-weight: 600; color: #4338ca;">${row.name}</a></td>
                    <td class="col-supplier" style="font-weight: 500;">${row.supplier || "-"}</td>
                    <td class="col-date">${frappe.datetime.str_to_user(row.transaction_date) || "-"}</td>
                    <td class="col-date" style="${row.is_overdue ? "color: red; font-weight: 600;" : ""}">${frappe.datetime.str_to_user(row.schedule_date) || "-"}</td>
                    <td class="col-date">${frappe.datetime.str_to_user(row.supplier_agreed_time) || "-"}</td>
                    <td class="col-date">${frappe.datetime.str_to_user(row.delivery_time_as_per_po) || "-"}</td>
                    <td class="col-date">${frappe.datetime.str_to_user(row.actual_delivery_time) || "-"}</td>
                    <td class="col-status"><span class="indicator-pill ${status_color}">${row.status}</span></td>
                    <td class="col-amt" style="font-weight: 700; color: #0f172a;">₹ ${(amt / 1000000).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} M</td>
                </tr>
            `);
		});

		let tfoot_list = $('<tfoot id="po_list_tfoot"></tfoot>').appendTo(
			tables_html.find(".dashboard-table"),
		);
		tfoot_list.append(`
            <tr class="sticky-total">
                <td colspan="9" style="text-align: right; padding-right: 24px; color: #64748b; font-weight: 700;">GRAND TOTAL</td>
                <td style="text-align: right; font-weight: 800; color: #0f172a; border-left: 1px solid #e2e8f0;">₹ ${(total_amt / 1000000).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} M</td>
            </tr>
        `);

		const export_to_excel = (export_type = "all") => {
			let filters = page.filter_group.get_values();
			frappe.call({
				method: "renu_customization.renu_customization.page.supplier_order_dashboard.supplier_order_dashboard.export_to_excel",
				args: { filters: filters, export_type: export_type },
				callback: function (r) {
					if (r.message) {
						const { filename, filecontent } = r.message;
						const byteCharacters = atob(filecontent);
						const byteNumbers = new Array(byteCharacters.length);
						for (let i = 0; i < byteCharacters.length; i++) {
							byteNumbers[i] = byteCharacters.charCodeAt(i);
						}
						const byteArray = new Uint8Array(byteNumbers);
						const blob = new Blob([byteArray], {
							type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						});
						const link = document.createElement("a");
						link.href = URL.createObjectURL(blob);
						link.download = filename;
						link.click();
					}
				},
			});
		};

		const export_to_pdf = async () => {
			const report_date = frappe.datetime.now_datetime();

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

			const [png1, png2] = await Promise.all([
				get_chart_png("top_10_suppliers"),
				get_chart_png("order_status"),
			]);

			const chart_h = (src, title) =>
				src
					? `<div style="margin-top:20px; text-align:center;"><h4 style="color:#444; margin-bottom: 15px; padding-bottom: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${title}</h4><img src="${src}" style="width:100%; max-width:900px; border:1px solid #f1f5f9; border-radius:12px; padding: 15px; background: #fff;"></div>`
					: "";

			const chart_l = (chart_id) => {
				const c_obj = data.charts[chart_id];
				if (!c_obj || !c_obj.data.labels.length) return "";
				const total_val = c_obj.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;
				let is_currency = c_obj.is_currency || false;

				let legend_html = '<div class="pdf-legend">';
				c_obj.data.labels.forEach((l, i) => {
					const val = c_obj.data.datasets[0].values[i];
					const color = c_obj.colors[i % c_obj.colors.length];
					const share = ((val / total_val) * 100).toFixed(1);
					const val_str = is_currency
						? format_currency(val / 1000000, "INR") + " M"
						: val;
					legend_html += `
                        <div class="pdf-legend-item">
                            <span class="pdf-dot" style="background: ${color}"></span>
                            <div class="pdf-legend-info">
                                <div class="pdf-legend-label">${l}</div>
                                <div class="pdf-legend-val">${val_str} (${share}%)</div>
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
				let is_currency = c_obj.is_currency || false;
				let rows = c_obj.data.labels
					.map((l, i) => {
						const val = c_obj.data.datasets[0].values[i];
						const share = ((val / total_val) * 100).toFixed(1);
						const val_str = is_currency
							? format_currency(val / 1000000, "INR") + " M"
							: val;
						return `<tr><td style="text-align:center;">${i + 1}</td><td>${l}</td><td style="text-align:right;">${val_str}</td><td style="text-align:right;">${share}%</td></tr>`;
					})
					.join("");
				return `<div style="margin-top:10px; page-break-inside: avoid;"><table style="width:80%; margin: 10px auto; border-collapse: collapse; font-size: 10px; border: 1px solid #eee;"><thead><tr style="background: #f8f9fa;"><th style="width: 40px; text-align:center; border-bottom:2px solid #3b82f6;">S.No.</th><th style="text-align:left; border-bottom:2px solid #3b82f6;">${title}</th><th style="width: 120px; text-align:right; border-bottom:2px solid #3b82f6;">Value</th><th style="width: 80px; text-align:right; border-bottom:2px solid #3b82f6;">Share %</th></tr></thead><tbody>${rows}</tbody></table></div>`;
			};

			const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 0; margin: 0; color: #1e293b; background: #fff; line-height: 1.2; }
                        @page { size: landscape; margin: 10mm; }
                        .report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }
                        
                        .kpi-wrapper { display: table; width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 20px; table-layout: fixed; }
                        .kpi-card { display: table-cell; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; background: #f8fafc; text-align: center; vertical-align: top; }
                        .kpi-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
                        .kpi-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
                        .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; }
                        
                        h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 25px; border-left: 4px solid #3b82f6; padding-left: 12px; text-transform: uppercase; letter-spacing: 0.025em; }
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9px; border: 1px solid #e2e8f0; table-layout: auto; page-break-inside: auto !important; }
                        tr { page-break-inside: avoid !important; page-break-after: auto !important; }
                        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; word-wrap: break-word; }
                        thead { display: table-header-group; }
                        tfoot { display: table-row-group; }
                        th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #3b82f6; }
                        
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-weight-bold { font-weight: 700; }
                        .page-break { page-break-after: always; }

                        /* Column Widths */
                        .col-sno { width: 40px; text-align: center; }
                        .col-customer, .col-supplier { width: 180px; }
                        .col-sp { width: 120px; }
                        .col-prod { width: 150px; }
                        .col-amt, .col-qty, .col-rate { width: 90px; text-align: right; }
                        .total-net-col, .grand-total-col { width: 100px; text-align: right; font-weight: 700; }

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
                        <h1 style="margin:0; font-size: 24px;">Supplier Order Dashboard</h1>
                        <p style="font-size: 11px; color: #999; margin: 8px 0 0 0;">Generated: ${report_date}</p>
                    </div>

                    <div class="kpi-wrapper">
                        ${data.summary
							.map(
								(m) => `
                            <div class="kpi-card">
                                <div class="kpi-label">${m.label}</div>
                                <div class="kpi-value">${m.fieldtype === "Currency" ? format_currency(m.value / 1000000, "INR") + " M" : m.value}</div>
                            </div>
                        `,
							)
							.join("")}
                    </div>

                    <h3>Visual Analytics</h3>
					${chart_h(png1, "Top 10 Suppliers")}
                    ${chart_l("top_10_suppliers")}
					${chart_t("top_10_suppliers", "Supplier Data")}
                    <div class="page-break"></div>

                    ${chart_h(png2, "Order Status")}
                    ${chart_l("order_status")}
					${chart_t("order_status", "Status Data")}
                    <div class="page-break"></div>

                    <h3>Month-Wise Order Breakdown</h3>
                    <table>
                        <thead>${tables_html.find(".month-table thead").html()}</thead>
                        <tbody>${tables_html.find("#po_month_body").html()}</tbody>
                    </table>
                    <div class="page-break"></div>

                    <h3>Supplier Orders List</h3>
                    <table>
                        <thead>${tables_html.find(".dashboard-table").not(".month-table").find("thead").html()}</thead>
                        <tbody>${tables_html.find("#po_list_body").html()}</tbody>
                        <tfoot>${tables_html.find("#po_list_tfoot").html()}</tfoot>
                    </table>
                </body>
                </html>
            `;

			const method_url =
				"/api/method/renu_customization.renu_customization.page.supplier_order_dashboard.supplier_order_dashboard.export_to_pdf";
			const $form =
				$(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
                <input type="hidden" name="html" value="">
                <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
            </form>`).appendTo("body");

			$form.find('input[name="html"]').val(html);
			$form.submit();
			$form.remove();
		};

		tables_html.find("#export_month_table").on("click", () => export_to_excel("summary"));
		tables_html.find("#export_list_table").on("click", () => export_to_excel("detail"));

		page.add_menu_item(__("Export to PDF"), export_to_pdf);
		page.add_menu_item(__("Export to Excel"), () => export_to_excel("all"));
	}

	page.refresh();
};
