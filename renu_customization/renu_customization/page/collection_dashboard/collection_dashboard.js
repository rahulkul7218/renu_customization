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
        
        /* Filter Area Styling */
        .dashboard-filter-area { background: #fff; padding: 16px 24px; width: 100%; border-bottom: 1px solid #f1f5f9; }
        .dashboard-filter-area .section-body { 
            display: grid !important; 
            grid-template-columns: repeat(6, 1fr) !important; 
            gap: 12px 20px !important; 
            align-items: flex-end !important; 
        }
        .dashboard-filter-area .form-column { 
            width: 100% !important; 
            padding: 0 !important; 
            float: none !important; 
            flex: none !important; 
            max-width: none !important;
        }
        .dashboard-filter-area .frappe-control { margin-bottom: 0 !important; }
        .dashboard-filter-area .section-head { display: none !important; }

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
                                <th style="min-width: 250px;">${__("Customer")}</th>
                                <th style="min-width: 300px;">${__("Item")}</th>
                                <th style="min-width: 180px;">${__("Sales Person")}</th>
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
                    <td style="white-space: nowrap;">${row.customer}</td>
                    <td>
                        <div style="line-height: 1.4;">
                            <div style="font-size: 11px; color: #64748b;">${row.item_code || "-"}</div>
                            <div style="font-weight: 600;">${row.item_name || "-"}</div>
                        </div>
                    </td>
                    <td style="white-space: nowrap;">${row.sales_person || "-"}</td>
                    <td style="text-align: right; font-weight: 700; white-space: nowrap;">${format_currency_short(row.allocated_amount)}</td>
                    <td style="text-align: center;"><span class="indicator-pill ${type_label}">${__(type_label)}</span></td>
                </tr>
            `).appendTo(tbody);
		});

		// Grand Total Footer
		let total_display = "₹ " + total_amt.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + " M";
		$(`
			<tfoot>
				<tr class="sticky-total">
					<td colspan="6" style="text-align: right; padding-right: 20px;">GRAND TOTAL</td>
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
                            <span class="indicator-pill ${row.due_days <= 3 ? 'Domestic' : 'Export'}" style="width: 100%; display: inline-block;">
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
			$(`<tr><td colspan="7" class="text-center text-muted" style="padding: 20px;">No upcoming payments due in next 15 days</td></tr>`).appendTo(due_tbody);
		}
	}

	// --- 3. INITIALIZE FILTERS AND ACTIONS ---
	const filter_fields = [
		{ fieldname: "fiscal_year", label: __("Fiscal Year"), fieldtype: "Link", options: "Fiscal Year", placeholder: __("Select Year") },
		{ fieldtype: "Column Break" },
		{ fieldname: "from_date", label: __("From Date"), fieldtype: "Date", placeholder: __("Start Date") },
		{ fieldtype: "Column Break" },
		{ fieldname: "to_date", label: __("To Date"), fieldtype: "Date", placeholder: __("End Date") },
		{ fieldtype: "Column Break" },
		{ fieldname: "customer", label: __("Customer"), fieldtype: "Link", options: "Customer", placeholder: __("Select Customer") },
		{ fieldtype: "Column Break" },
		{ fieldname: "sales_person", label: __("Sales Person"), fieldtype: "Link", options: "Sales Person", placeholder: __("Select Sales Person") },
		{ fieldtype: "Column Break" },
		{ fieldname: "dom_exp", label: __("Type"), fieldtype: "Select", options: ["", "Domestic", "Export"], placeholder: __("Select Type") },
		{ fieldtype: "Column Break" },
		{ fieldtype: "Column Break" },
		{ fieldtype: "Column Break" },
		{ fieldtype: "Column Break" },
	];

	// Initialize filters
	setTimeout(() => {
		page.filter_group = new frappe.ui.FieldGroup({
			parent: filter_parent,
			fields: filter_fields
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
				if (key === "fiscal_year") {
					const fy = field.get_value();
					if (fy) {
						frappe.db.get_value("Fiscal Year", fy, ["year_start_date", "year_end_date"], (r) => {
							if (r && r.year_start_date && r.year_end_date) {
								page.filter_group.set_values({
									from_date: r.year_start_date,
									to_date: r.year_end_date
								});
								page.refresh();
							}
						});
					} else {
						page.refresh();
					}
				} else {
					page.refresh();
				}
			};

			// Use df.on_change for framework-level detection
			field.df.on_change = trigger_refresh;

			// Also attach to DOM events for "realtime" feel
			if (field.$input) {
				field.$input.on("change blur", () => {
					// Small delay to allow the framework to update the internal value
					setTimeout(() => trigger_refresh(), 50);
				});
			}

			// Extra safeguard for Select and Link fields
			if (["Select", "Link"].includes(field.df.fieldtype)) {
				field.on_change = trigger_refresh;
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
					for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
					const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
					const link = document.createElement("a");
					link.href = window.URL.createObjectURL(blob);
					link.download = filename;
					link.click();
					frappe.show_alert({ message: __("Excel Report Downloaded"), indicator: "green" });
				}
			},
		});
	};

	const export_pdf = async () => {
		if (!page.dashboard_data) return;
		frappe.show_alert({ message: __("Preparing PDF..."), indicator: "blue" });
		const get_chart_png = () => {
			const svg_elem = document.querySelector(`#chart_wrapper svg`);
			if (!svg_elem) return null;

			const svg_clone = svg_elem.cloneNode(true);
			const legends = svg_clone.querySelectorAll(".chart-legend, .legend-dataset-text");
			legends.forEach(l => l.remove());

			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d");
			const svg_data = new XMLSerializer().serializeToString(svg_clone);
			const img = new Image();
			return new Promise((resolve) => {
				img.onload = () => {
					canvas.width = img.width * 2; canvas.height = img.height * 2;
					context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
					context.drawImage(img, 0, 0, canvas.width, canvas.height);
					resolve(canvas.toDataURL("image/png"));
				};
				img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg_data)));
			});
		};

		const chart_png = await get_chart_png();
		const data = page.dashboard_data;
		const total_val = data.chart.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;
		const period = (page.filter_group.get_values().from_date) ? `${page.filter_group.get_values().from_date} to ${page.filter_group.get_values().to_date}` : "Current Selection";

		let html = `<html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 20px; }
            .report-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4f46e5; padding-bottom: 15px; }
            .report-header h1 { margin: 0; color: #0f172a; font-size: 24px; }
            .report-header p { margin: 5px 0 0; color: #64748b; font-size: 12px; font-weight: 500; }
            
            .kpi-container { width: 100%; margin-bottom: 30px; overflow: hidden; }
            .kpi-card { width: 23.5%; float: left; margin-right: 2%; background: #f8fafc; border-top: 4px solid #cbd5e1; padding: 12px 5px; text-align: center; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); box-sizing: border-box; }
            .kpi-card:last-child { margin-right: 0 !important; }
            .kpi-card.blue { border-top-color: #3b82f6; background: #eff6ff; }
            .kpi-card.green { border-top-color: #10b981; background: #ecfdf5; }
            .kpi-card.orange { border-top-color: #f59e0b; background: #fff7ed; }
            .kpi-card.red { border-top-color: #ef4444; background: #fef2f2; }
            
            .kpi-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
            .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; }
            
            .chart-section { text-align: center; margin-bottom: 40px; page-break-inside: avoid; background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
            .chart-title { font-weight: 700; color: #334155; margin-bottom: 15px; font-size: 14px; }
            .pdf-legend { width: 80%; margin: 20px auto 0; padding: 12px; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
            .legend-item { width: 45%; float: left; margin: 0 2.5%; display: block; text-align: center; }
            .dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; margin-right: 5px; vertical-align: middle; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; background: #fff; border: 1px solid #e2e8f0; }
            th { background: #f1f5f9; color: #475569; font-weight: 700; padding: 10px 8px; text-align: left; border: 1px solid #e2e8f0; text-transform: uppercase; font-size: 9px; }
            td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: top; font-size: 9px; }
            tr:nth-child(even) { background: #fafafa; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .bold { font-weight: 700; }
            .status-pill { padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 700; }
            
            .footer { margin-top: 40px; font-size: 8px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            .section-title { color: #0f172a; margin: 25px 0 10px; font-size: 14px; border-left: 4px solid #4f46e5; padding-left: 10px; }
        </style></head><body>
            <div class="report-header">
                <h1>Collection Dashboard</h1>
                <p>Period: ${period}</p>
            </div>

            <div class="kpi-container">
                ${data.summary.map(m => {
                    let cls = (m.indicator || "blue").toLowerCase();
                    return `
                        <div class="kpi-card ${cls}">
                            <div class="kpi-label">${m.label}</div>
                            <div class="kpi-value">${format_currency_short(m.value)}</div>
                        </div>
                    `;
                }).join("")}
            </div>
            
            <div class="chart-section">
                <div class="chart-title">Collection Breakdown</div>
                <img src="${chart_png}" style="max-width:380px;">
                <div class="pdf-legend">
                    ${data.chart.data.labels.map((label, idx) => {
                        let val = data.chart.data.datasets[0].values[idx];
                        let color = data.chart.colors[idx % data.chart.colors.length];
                        let share = total_val > 0 ? ((val / total_val) * 100).toFixed(1) + "%" : "0%";
                        return `
                            <div class="legend-item">
                                <span class="dot" style="background: ${color}"></span>
                                <span style="font-weight:700; white-space: nowrap;">${label}: ${format_currency_short(val)} (${share})</span>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>

            <div class="section-title">Detailed Collection List</div>
            <table>
                <thead>
                    <tr>
                        <th width="15%">Payment ID</th>
                        <th width="12%">Invoice ID</th>
                        <th width="10%">Date</th>
                        <th width="33%">Customer</th>
                        <th width="20%" class="text-right">Allocated Amount</th>
                        <th width="10%" class="text-center">Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.results.map(row => `
                        <tr>
                            <td class="bold">${row.payment_entry}</td>
                            <td style="color: #64748b;">${row.name}</td>
                            <td>${frappe.datetime.str_to_user(row.posting_date)}</td>
                            <td>${row.customer}</td>
                            <td class="text-right bold">${format_currency_short(row.allocated_amount)}</td>
                            <td class="text-center">${row.is_export ? "Export" : "Domestic"}</td>
                        </tr>
                    `).join("")}
                </tbody>
                <tfoot>
                    <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #e2e8f0;">
                        <td colspan="4" class="text-right">GRAND TOTAL</td>
                        <td class="text-right">${format_currency_short(data.results.reduce((a, b) => a + flt(b.allocated_amount), 0))}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>

            <div class="section-title">Upcoming Payments Due (Next 15 Days)</div>
            <table>
                <thead>
                    <tr>
                        <th width="15%">Invoice ID</th>
                        <th width="35%">Customer</th>
                        <th width="12%">Posting Date</th>
                        <th width="12%">Due Date</th>
                        <th width="8%" class="text-center">Days</th>
                        <th width="18%" class="text-right">Outstanding</th>
                    </tr>
                </thead>
                <tbody>
                    ${(data.due_results && data.due_results.length > 0) ? data.due_results.map(row => `
                        <tr>
                            <td class="bold">${row.name}</td>
                            <td>${row.customer}</td>
                            <td>${frappe.datetime.str_to_user(row.posting_date)}</td>
                            <td style="color: #e53e3e; font-weight: bold;">${frappe.datetime.str_to_user(row.due_date)}</td>
                            <td class="text-center">${row.due_days}</td>
                            <td class="text-right bold" style="color: #c53030;">${format_currency_short(row.outstanding_amount)}</td>
                        </tr>
                    `).join("") : '<tr><td colspan="6" class="text-center">No upcoming payments due</td></tr>'}
                </tbody>
                <tfoot>
                    <tr style="background: #fef2f2; font-weight: bold; border-top: 2px solid #e2e8f0; color: #c53030;">
                        <td colspan="5" class="text-right">TOTAL OUTSTANDING</td>
                        <td class="text-right">${format_currency_short(data.due_results.reduce((a, b) => a + flt(b.outstanding_amount), 0))}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                Printed on: ${frappe.datetime.now_datetime()} | renu_customization - Collection Analysis Report
            </div>
        </body></html>`;

		const $form = $(`<form action="/api/method/renu_customization.renu_customization.page.collection_dashboard.collection_dashboard.export_to_pdf" method="POST" target="_blank" style="display:none;"><input type="hidden" name="html" value=""><input type="hidden" name="csrf_token" value="${frappe.csrf_token}"></form>`).appendTo("body");
		$form.find('input[name="html"]').val(html);
		$form.submit();
		$form.remove();
	};
};
