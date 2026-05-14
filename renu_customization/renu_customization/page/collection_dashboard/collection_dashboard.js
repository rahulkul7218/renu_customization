/* Collection Dashboard - Version 3.4 */
frappe.pages["collection_dashboard"].on_page_load = function (wrapper) {
	console.log("Collection Dashboard - Version 3.4 (Stable Load)");
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Collection Dashboard"),
		single_column: true,
	});

	// --- 1. SETUP CONTAINERS AND CSS ---
	$(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .layout-main-section { background-color: transparent !important; }
        .page-container { background-color: transparent !important; }
        .dashboard-content { padding: 20px; background: transparent !important; min-height: 100vh; font-family: 'Inter', sans-serif; color: #1e293b; width: 100% !important; }
        
        .dashboard-filter-area {
            padding: 10px 10px 10px 10px !important;
            background-color: #fff !important;
            border-bottom: 1px solid #e2e8f0 !important;
            margin-bottom: 0 !important;
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
            gap: 12px 12px !important;
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
            height: 28px !important;
            font-size: 13px !important;
        }
        .dashboard-filter-area label,
        .dashboard-filter-area .control-label {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #475569 !important;
            margin-bottom: 6px !important;
            display: block !important;
            white-space: nowrap !important;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        .dashboard-filter-area .help-box,
        .dashboard-filter-area .description {
            display: none !important;
        }

        /* Dashboard Cards */
        .summary-wrapper { 
            display: grid !important; 
            grid-template-columns: repeat(4, 1fr) !important; 
            gap: 16px; 
            margin-bottom: 24px; 
            width: 100% !important; 
        }
        .summary-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border-left: 5px solid #cbd5e1; transition: all 0.3s ease; position: relative; }
        .summary-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1); }
        .summary-card.blue { border-left-color: #3b82f6; }
        .summary-card.green { border-left-color: #10b981; }
        .summary-card.orange { border-left-color: #f59e0b; }
        .summary-card.purple { border-left-color: #8b5cf6; }
        .summary-card.red { border-left-color: #ef4444; }

        .summary-card .label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .summary-card .value { font-size: 20px; font-weight: 800; color: #0f172a; }
        .summary-card .indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
        .bg-blue { background-color: #3b82f6; }
        .bg-green { background-color: #10b981; }
        .bg-orange { background-color: #f59e0b; }
        .bg-purple { background-color: #8b5cf6; }
        .bg-red { background-color: #ef4444; }

        /* Charts & Tables */
        .charts-row { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px; width: 100%; }
        .chart-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .chart-card .title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
        .custom-legend { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 30px; padding: 20px; border-top: 1px solid #f1f5f9; background: #fafafa; border-radius: 8px; }
        .legend-item { display: flex; align-items: flex-start; gap: 12px; }
        .legend-item .dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; margin-top: 2px; }
        .legend-item .label { font-size: 11px; font-weight: 600; color: #475569; }
        .legend-item .val-pct { font-size: 10px !important; color: #94a3b8 !important; font-weight: 500 !important; }

        .table-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; overflow: hidden; border: 1px solid #e2e8f0; width: 100%; }
        .table-card .header { padding: 15px 24px; background: #fff; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a; display: flex; justify-content: space-between; align-items: center; }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .dashboard-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; }
        .dashboard-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
        .dashboard-table tr:hover td { background: #f8fafc; }
        
        tr.sticky-total td { position: sticky; bottom: 0; z-index: 30; background: #f8fafc !important; font-weight: 700; border-top: 2px solid #e2e8f0 !important; color: #0f172a; }

        .export-btn { font-size: 12px; cursor: pointer; color: #475569; font-weight: 600; padding: 6px 14px; border-radius: 6px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; }
        .export-btn:hover { color: #2563eb !important; background: #eff6ff !important; border-color: #bfdbfe !important; }
        
        /* Indicators */
        .indicator-pill { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
        .indicator-pill.Export { background: #ecfdf5; color: #065f46; }
        .indicator-pill.Domestic { background: #fff7ed; color: #9a3412; }

        /* Hide default Frappe Chart legend */
        .frappe-chart .chart-legend { display: none !important; }

    </style>`).appendTo(page.main);

	let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);
	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	// --- 2. DEFINE LOGIC FUNCTIONS ---
	function format_currency_short(num) {
		if (!num && num !== 0) return "₹ 0.00 M";
		let value = flt(num) / 1000000;
		return (
			"₹ " +
			value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
			" M"
		);
	}

	page.refresh = function () {
		if (page._refresh_timer) clearTimeout(page._refresh_timer);
		page._refresh_timer = setTimeout(() => {
			page.execute_refresh();
		}, 150); // 150ms debounce
	};

	page.execute_refresh = function () {
		let filters = page.filter_group ? page.filter_group.get_values() : {};

		// Show loading indicator
		if (page.container.is(":empty") || page.container.find(".summary-wrapper").length === 0) {
			page.container.html(
				'<div class="text-center" style="padding: 100px 0;"><i class="fa fa-refresh fa-spin fa-2x text-muted"></i><div class="mt-2 text-muted">Loading Collection Data...</div></div>',
			);
		} else {
			page.container.css("opacity", 0.6);
		}

		frappe.call({
			method: "renu_customization.renu_customization.page.collection_dashboard.collection_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				page.container.css("opacity", 1);
				if (r.message) {
					page.dashboard_data = r.message;
					render_dashboard(r.message);
				}
			},
		});
	};

	function render_dashboard(data) {
		page.container.empty();
		if (!data.results || data.results.length === 0) {
			$(
				`<div class="text-center text-muted" style="padding: 100px 0;"><div>${__("No data found for selected criteria")}</div></div>`,
			).appendTo(page.container);
			return;
		}

		// KPI Cards
		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach((metric) => {
			let indicator = (metric.indicator || "blue").toLowerCase();
			$(`
                <div class="summary-card ${indicator}">
                    <div class="label"><span class="indicator bg-${indicator}"></span>${metric.label}</div>
                    <div class="value">${format_currency_short(metric.value)}</div>
                </div>
            `).appendTo(summary_row);
		});

		// Chart Section
		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		let chart_card = $(`
            <div class="chart-card">
                <div class="title">${data.chart.title}</div>
                <div id="chart_wrapper" style="height: 350px;"></div>
                <div id="chart_legend" class="custom-legend"></div>
            </div>
        `).appendTo(charts_row);

		setTimeout(() => {
			if (page.chart) page.chart.destroy();
			page.chart = new frappe.Chart("#chart_wrapper", {
				data: data.chart.data,
				type: "donut",
				height: 350,
				colors: data.chart.colors,
				lineOptions: { hideDots: 1 },
				axisOptions: { xIsSeries: 1 },
				legend: false, // Strictly disable default legend
				tooltipOptions: { formatTooltipY: (d) => format_currency_short(d) },
			});

			let legend_container = chart_card.find("#chart_legend");
			legend_container.empty();
			let total_val = data.chart.data.datasets[0].values.reduce((a, b) => a + b, 0);

			data.chart.data.labels.forEach((label, idx) => {
				let val = data.chart.data.datasets[0].values[idx];
				let color = data.chart.colors[idx % data.chart.colors.length];
				let share = total_val > 0 ? ((val / total_val) * 100).toFixed(1) + "%" : "0%";
				legend_container.append(`
                    <div class="legend-item">
                        <span class="dot" style="background: ${color}"></span>
                        <div class="info">
                            <span class="label">${label}</span>
                            <span class="val-pct">${format_currency_short(val)} (${share})</span>
                        </div>
                    </div>
                `);
			});
		}, 50);

		// Detailed Table
		let table_card = $(`
            <div class="table-card">
                <div class="header">
                    <span>${__("Detailed Collection List")}</span>
                    <div class="export-btn" id="export_excel_btn">
                        <i class="fa fa-file-excel-o"></i> Export to Excel
                    </div>
                </div>
                <div style="overflow: auto; width: 100%; max-height: 800px;">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="min-width: 130px;">${__("Payment ID")}</th>
                                <th style="min-width: 110px;">${__("Invoice ID")}</th>
                                <th style="min-width: 100px;">${__("Date")}</th>
                                <th style="min-width: 100px;">${__("Due Date")}</th>
                                <th style="min-width: 80px; text-align: center;">${__("Due Days")}</th>
                                <th style="min-width: 250px;">${__("Customer")}</th>
                                <th style="min-width: 300px;">${__("Item")}</th>
                                <th style="min-width: 130px; text-align: right;">${__("Amount")}</th>
                                <th style="min-width: 90px; text-align: center;">${__("Type")}</th>
                            </tr>
                        </thead>
                        <tbody id="collection_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let tbody = table_card.find("#collection_table_body");
		let total_amt = 0;
		data.results.forEach((row) => {
			let type_label = row.is_export ? "Export" : "Domestic";
			let display_val = Math.round((flt(row.allocated_amount) / 1000000) * 10000) / 10000;
			total_amt += display_val;
			$(`
                <tr>
                    <td style="white-space: nowrap;"><a href="/app/payment-entry/${row.payment_entry}" style="font-weight: 600; color: #4338ca;">${row.payment_entry}</a></td>
                    <td style="white-space: nowrap;"><a href="/app/sales-invoice/${row.name}" style="font-weight: 500; color: #64748b;">${row.name}</a></td>
                    <td style="white-space: nowrap;">${frappe.datetime.str_to_user(row.posting_date)}</td>
                    <td style="white-space: nowrap; color: #64748b;">${frappe.datetime.str_to_user(row.due_date)}</td>
                    <td style="text-align: center;"><span class="indicator-pill ${row.due_days > 0 ? "Domestic" : "Export"}">${row.due_days}</span></td>
                    <td style="white-space: nowrap;">${row.customer}</td>
                    <td>
                        <div style="line-height: 1.4;">
                            <div style="font-size: 11px; color: #64748b;">${row.item_code || "-"}</div>
                            <div style="font-weight: 600;">${row.item_name || "-"}</div>
                        </div>
                    </td>
                    <td style="text-align: right; font-weight: 700; white-space: nowrap;">${format_currency_short(row.allocated_amount)}</td>
                    <td style="text-align: center;"><span class="indicator-pill ${type_label}">${__(type_label)}</span></td>
                </tr>
            `).appendTo(tbody);
		});

		// Grand Total Footer
		let total_display =
			"₹ " +
			total_amt.toLocaleString("en-US", {
				minimumFractionDigits: 4,
				maximumFractionDigits: 4,
			}) +
			" M";
		$(`
			<tfoot>
				<tr class="sticky-total">
					<td colspan="7" style="text-align: right; padding-right: 20px;">GRAND TOTAL</td>
					<td style="text-align: right; font-weight: 800; border-left: 1px solid #e2e8f0; background: #f8fafc;">${total_display}</td>
					<td></td>
				</tr>
			</tfoot>
		`).appendTo(table_card.find(".dashboard-table"));

		table_card.find("#export_excel_btn").click(() => export_to_excel("detail"));

		// Due Payments Table
		let due_table_card = $(`
            <div class="table-card" style="margin-top: 30px;">
                <div class="header" style="background: #fff5f5; border-bottom: 1px solid #fed7d7;">
                    <span style="color: #c53030;"><i class="fa fa-clock-o"></i> ${__("Payment Due in Next 15 Days")}</span>
                </div>
                <div style="overflow: auto; width: 100%; max-height: 500px;">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="min-width: 110px;">${__("Invoice ID")}</th>
                                <th style="min-width: 250px;">${__("Customer")}</th>
                                <th style="min-width: 100px;">${__("Posting Date")}</th>
                                <th style="min-width: 100px;">${__("Due Date")}</th>
                                <th style="min-width: 90px; text-align: center;">${__("Due Days")}</th>
                                <th style="min-width: 130px; text-align: right;">${__("Net Total")}</th>
                                <th style="min-width: 130px; text-align: right;">${__("Outstanding")}</th>
                            </tr>
                        </thead>
                        <tbody id="due_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		due_table_card.find(".header").append(`
            <div class="export-btn" id="export_due_excel_btn" style="background: #fff; border-color: #fed7d7;">
                <i class="fa fa-file-excel-o"></i> Export
            </div>
        `);

		due_table_card.find("#export_due_excel_btn").click(() => export_to_excel("due"));

		let due_tbody = due_table_card.find("#due_table_body");
		if (data.due_results && data.due_results.length > 0) {
			let total_due_net = 0;
			let total_due_outstanding = 0;

			data.due_results.forEach((row) => {
				total_due_net += flt(row.base_net_total);
				total_due_outstanding += flt(row.outstanding_amount);

				$(`
                    <tr>
                        <td><a href="/app/sales-invoice/${row.name}" style="font-weight: 600; color: #c53030;">${row.name}</a></td>
                        <td>${row.customer}</td>
                        <td>${frappe.datetime.str_to_user(row.posting_date)}</td>
                        <td style="color: #e53e3e; font-weight: 600;">${frappe.datetime.str_to_user(row.due_date)}</td>
                        <td style="text-align: center;">
                            <span class="indicator-pill ${row.due_days <= 3 ? "Domestic" : "Export"}" style="width: 100%; display: inline-block;">
                                ${row.due_days} ${__("Days")}
                            </span>
                        </td>
                        <td style="text-align: right;">${format_currency_short(row.base_net_total)}</td>
                        <td style="text-align: right; font-weight: 700; color: #c53030;">${format_currency_short(row.outstanding_amount)}</td>
                    </tr>
                `).appendTo(due_tbody);
			});

			// Add Total Footer for Due Table
			$(`
				<tfoot>
					<tr class="sticky-total">
						<td colspan="5" style="text-align: right; padding-right: 20px;">TOTAL DUE</td>
						<td style="text-align: right; font-weight: 700; border-left: 1px solid #e2e8f0; background: #fdf2f2;">${format_currency_short(total_due_net)}</td>
						<td style="text-align: right; font-weight: 800; border-left: 1px solid #e2e8f0; background: #fdf2f2; color: #c53030;">${format_currency_short(total_due_outstanding)}</td>
					</tr>
				</tfoot>
			`).appendTo(due_table_card.find(".dashboard-table"));
		} else {
			$(
				`<tr><td colspan="7" class="text-center text-muted" style="padding: 20px;">No upcoming payments due in next 15 days</td></tr>`,
			).appendTo(due_tbody);
		}
	}

	// --- 3. INITIALIZE FILTERS AND ACTIONS ---
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
			placeholder: __("Start Date"),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			placeholder: __("End Date"),
		},
		{
			fieldname: "customer_group",
			label: __("Customer Group"),
			fieldtype: "Link",
			options: "Customer Group",
			placeholder: __("Select Group"),
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
			fieldname: "dom_exp",
			label: __("Domestic/Export"),
			fieldtype: "Select",
			options: ["", "Domestic", "Export"],
			placeholder: __("Select"),
		},
	];

	// Initialize filters
	setTimeout(() => {
		page.filter_group = new frappe.ui.FieldGroup({
			parent: filter_parent,
			fields: filter_fields,
		});
		page.filter_group.make();
		setup_filter_events();

		// Initial Load after filter group is ready
		page.refresh();
	}, 100);

	function setup_filter_events() {
		Object.keys(page.filter_group.fields_dict).forEach((key) => {
			let field = page.filter_group.fields_dict[key];

			const trigger_refresh = () => {
				page.refresh();
			};

			// Comprehensive event binding
			field.df.on_change = trigger_refresh;
			field.on_change = trigger_refresh;

			if (field.$input) {
				field.$input.on("change input blur", () => {
					setTimeout(() => trigger_refresh(), 100);
				});
			}
		});
	}

	page.set_primary_action(__("Refresh"), () => page.refresh());
	page.add_menu_item(__("Export to PDF"), () => export_pdf());
	page.add_menu_item(__("Export to Excel"), () => export_to_excel("all"));

	// --- 4. EXPORT FUNCTIONS ---
	const export_to_excel = (export_type = "all") => {
		const filters = page.filter_group.get_values();
		frappe.show_alert({ message: __("Generating Excel Report..."), indicator: "blue" });
		frappe.call({
			method: "renu_customization.renu_customization.page.collection_dashboard.collection_dashboard.export_to_excel",
			args: { filters: filters, export_type: export_type },
			callback: function (r) {
				if (r.message) {
					const { filename, filecontent } = r.message;
					const byteCharacters = atob(filecontent);
					const byteNumbers = new Array(byteCharacters.length);
					for (let i = 0; i < byteCharacters.length; i++)
						byteNumbers[i] = byteCharacters.charCodeAt(i);
					const blob = new Blob([new Uint8Array(byteNumbers)], {
						type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					});
					const link = document.createElement("a");
					link.href = window.URL.createObjectURL(blob);
					link.download = filename;
					link.click();
					frappe.show_alert({
						message: __("Excel Report Downloaded"),
						indicator: "green",
					});
				}
			},
		});
	};

	const export_pdf = async () => {
		if (!page.dashboard_data) return;
		frappe.show_alert({ message: __("Preparing PDF..."), indicator: "blue" });

		const data = page.dashboard_data;
		const report_date = frappe.datetime.now_datetime();
		const filters = page.filter_group.get_values();
		let period = "All Time";
		if (filters.from_date && filters.to_date) {
			period = `${frappe.datetime.str_to_user(filters.from_date)} to ${frappe.datetime.str_to_user(filters.to_date)}`;
		}

		// Standard Chart Capture Logic
		const get_chart_image = (wrapper_id) => {
			const chart_svg = document.querySelector(`#${wrapper_id} svg`);
			if (!chart_svg) return null;

			const clone = chart_svg.cloneNode(true);
			const internal_legend = clone.querySelector(
				".chart-legend, .legend, .frappe-chart-legend",
			);
			if (internal_legend) internal_legend.style.display = "none";

			return new Promise((resolve) => {
				const canvas = document.createElement("canvas");
				const svg_data = new XMLSerializer().serializeToString(clone);
				const img = new Image();

				img.onload = () => {
					canvas.width = img.width * 2;
					canvas.height = img.height * 2;
					const ctx = canvas.getContext("2d");
					ctx.fillStyle = "white";
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
					resolve(canvas.toDataURL("image/png"));
				};
				img.src =
					"data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg_data)));
			});
		};

		// Helper for Chart Legend in PDF
		const chart_l = (chart_obj) => {
			if (!chart_obj || !chart_obj.data.labels.length) return "";
			const total_val = chart_obj.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;

			let legend_html = '<div class="pdf-legend">';
			chart_obj.data.labels.forEach((l, i) => {
				const val = chart_obj.data.datasets[0].values[i];
				const color = chart_obj.colors[i % chart_obj.colors.length];
				const share = ((val / total_val) * 100).toFixed(1);
				legend_html += `
					<div class="pdf-legend-item">
						<span class="pdf-dot" style="background: ${color}"></span>
						<div class="pdf-legend-info">
							<div class="pdf-legend-label">${l}</div>
							<div class="pdf-legend-val">${format_currency_short(val)} (${share}%)</div>
						</div>
					</div>
				`;
			});
			legend_html += "</div>";
			return legend_html;
		};

		const chart_png = await get_chart_image("chart_wrapper");

		const html = `
			<html>
			<head>
				<style>
					body { font-family: 'Inter', sans-serif; padding: 15px; color: #1e293b; background: #fff; line-height: 1.4; font-size: 10px; }
					@page { size: landscape; margin: 8mm; }
					
					.report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
					.header-title { margin: 0; font-size: 22px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
					
					.kpi-wrapper { width: 100%; clear: both; margin-bottom: 20px; display: block; overflow: hidden; }
					.kpi-card { float: left; width: 23.5%; border: 1px solid #e2e8f0; padding: 12px 6px; margin: 0.5%; border-radius: 8px; background: #f8fafc; text-align: center; border-left: 4px solid #3b82f6; box-sizing: border-box; }
					.kpi-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
					.kpi-value { font-size: 14px; font-weight: 800; color: #0f172a; }
					
					.pdf-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; }
					.card-title { margin: 0 0 12px 0; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
					
					.chart-content { text-align: center; }
					.chart-img { width: 60%; max-height: 280px; object-fit: contain; margin-bottom: 15px; }
					
					.pdf-legend { display: block; text-align: left; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; margin-top: 10px; overflow: hidden; }
					.pdf-legend-item { display: inline-block; width: 31%; margin-bottom: 8px; vertical-align: top; margin-right: 2%; }
					.pdf-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
					.pdf-legend-info { display: inline-block; vertical-align: middle; width: calc(100% - 20px); }
					.pdf-legend-label { font-size: 9px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
					.pdf-legend-val { font-size: 8px; color: #64748b; }

					table { width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #e2e8f0; }
					th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
					thead th { background: #f1f5f9 !important; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #3b82f6; }
					.text-right { text-align: right; }
					.text-center { text-align: center; }
					.bold { font-weight: 700; }
					
					.section-title { font-size: 13px; font-weight: 700; color: #3b82f6; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; }
					.page-break { page-break-after: always; }
				</style>
			</head>
			<body>
				<div class="report-header">
					<h1 class="header-title">Collection Dashboard</h1>
					<p style="font-size: 11px; color: #64748b; margin: 4px 0;">Period: ${period}</p>
					<p style="font-size: 9px; color: #94a3b8; margin: 0;">Generated: ${report_date}</p>
				</div>

				<div class="kpi-wrapper">
					${data.summary
						.map(
							(m) => `
						<div class="kpi-card" style="border-left-color: ${m.indicator === "green" ? "#10b981" : m.indicator === "orange" ? "#f59e0b" : "#3b82f6"}">
							<div class="kpi-label">${m.label}</div>
							<div class="kpi-value">${format_currency_short(m.value)}</div>
						</div>
					`,
						)
						.join("")}
				</div>

				<div class="pdf-card chart-section">
					<h4 class="card-title">Collection Breakdown</h4>
					<div class="chart-content">
						<img src="${chart_png}" class="chart-img">
						${chart_l(data.chart)}
					</div>
				</div>

				<div class="page-break"></div>
				<h3 class="section-title">Detailed Collection List</h3>
				<table>
					<thead>
						<tr>
							<th width="12%">Payment ID</th>
							<th width="12%">Invoice ID</th>
							<th width="10%">Date</th>
							<th width="10%">Due Date</th>
							<th width="8%" class="text-center">Days</th>
							<th width="20%">Customer</th>
							<th width="18%" class="text-right">Amount (M)</th>
							<th width="10%" class="text-center">Type</th>
						</tr>
					</thead>
					<tbody>
						${data.results
							.map(
								(row) => `
							<tr>
								<td class="bold">${row.payment_entry}</td>
								<td style="color: #64748b;">${row.name}</td>
								<td>${frappe.datetime.str_to_user(row.posting_date)}</td>
								<td>${frappe.datetime.str_to_user(row.due_date)}</td>
								<td class="text-center ${row.due_days > 0 ? "bold" : ""}" style="${row.due_days > 0 ? "color: #ef4444;" : ""}">${row.due_days}</td>
								<td>${row.customer}</td>
								<td class="text-right bold">${format_currency_short(row.allocated_amount)}</td>
								<td class="text-center">${row.is_export ? "Export" : "Domestic"}</td>
							</tr>
						`,
							)
							.join("")}
					</tbody>
					<tfoot>
						<tr style="background: #f8fafc; font-weight: bold;">
							<td colspan="6" class="text-right">GRAND TOTAL</td>
							<td class="text-right">${format_currency_short(data.results.reduce((a, b) => a + flt(b.allocated_amount), 0))}</td>
							<td></td>
						</tr>
					</tfoot>
				</table>

				${
					data.due_results && data.due_results.length > 0
						? `
					<div class="page-break"></div>
					<h3 class="section-title" style="color: #ef4444; border-bottom-color: #ef4444;">Upcoming Payments Due (Next 15 Days)</h3>
					<table>
						<thead>
							<tr>
								<th width="15%">Invoice ID</th>
								<th width="35%">Customer</th>
								<th width="12%">Posting Date</th>
								<th width="12%">Due Date</th>
								<th width="8%" class="text-center">Days</th>
								<th width="18%" class="text-right">Outstanding (M)</th>
							</tr>
						</thead>
						<tbody>
							${data.due_results
								.map(
									(row) => `
								<tr>
									<td class="bold">${row.name}</td>
									<td>${row.customer}</td>
									<td>${frappe.datetime.str_to_user(row.posting_date)}</td>
									<td style="color: #ef4444; font-weight: bold;">${frappe.datetime.str_to_user(row.due_date)}</td>
									<td class="text-center">${row.due_days}</td>
									<td class="text-right bold" style="color: #ef4444;">${format_currency_short(row.outstanding_amount)}</td>
								</tr>
							`,
								)
								.join("")}
						</tbody>
						<tfoot>
							<tr style="background: #fef2f2; font-weight: bold; color: #ef4444;">
								<td colspan="5" class="text-right">TOTAL OUTSTANDING</td>
								<td class="text-right">${format_currency_short(data.due_results.reduce((a, b) => a + flt(b.outstanding_amount), 0))}</td>
							</tr>
						</tfoot>
					</table>
				`
						: ""
				}
				
				<div style="margin-top: 30px; font-size: 8px; color: #94a3b8; text-align: center;">
					Printed on: ${frappe.datetime.now_datetime()} | renu_customization - Collection Analysis Report
				</div>
			</body></html>
		`;

		const $form = $(
			`<form action="/api/method/renu_customization.renu_customization.page.collection_dashboard.collection_dashboard.export_to_pdf" method="POST" target="_blank" style="display:none;"><input type="hidden" name="html" value=""><input type="hidden" name="csrf_token" value="${frappe.csrf_token}"></form>`,
		).appendTo("body");
		$form.find('input[name="html"]').val(html);
		$form.submit();
		$form.remove();
	};
};
