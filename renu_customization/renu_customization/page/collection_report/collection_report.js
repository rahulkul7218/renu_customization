/* Collection Report Dashboard - Version 3.4 */
frappe.pages["collection_report"].on_page_load = function (wrapper) {
	console.log("Collection Report Dashboard - Version 3.4 (Stable Load)");
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Collection Report"),
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
        .dashboard-filter-area .section-body { display: flex !important; flex-wrap: wrap !important; gap: 12px !important; align-items: flex-end; }
        .dashboard-filter-area .frappe-control { margin-bottom: 0 !important; flex: 1; min-width: 180px; max-width: 240px; }
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

        .summary-card .label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .summary-card .value { font-size: 20px; font-weight: 800; color: #0f172a; }
        .summary-card .indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
        .bg-blue { background-color: #3b82f6; }
        .bg-green { background-color: #10b981; }
        .bg-orange { background-color: #f59e0b; }
        .bg-purple { background-color: #8b5cf6; }

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

    </style>`).appendTo(page.main);

	let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);
	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	// --- 2. DEFINE LOGIC FUNCTIONS ---
	function format_currency_short(num) {
		if (!num && num !== 0) return "₹ 0.0000 M";
		let value = flt(num) / 1000000;
		return (
			"₹ " +
			value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 }) +
			" M"
		);
	}

	page.refresh = function () {
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
			method: "renu_customization.renu_customization.page.collection_report.collection_report.get_dashboard_data",
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
			page.chart = new frappe.Chart("#chart_wrapper", {
				data: data.chart.data,
				type: "donut",
				height: 350,
				colors: data.chart.colors,
				legend: 0,
				tooltipOptions: { formatTooltipY: (d) => format_currency_short(d) },
			});

			let legend_container = chart_card.find("#chart_legend");
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
                                <th>${__("Payment ID")}</th>
                                <th>${__("Invoice ID")}</th>
                                <th>${__("Date")}</th>
                                <th>${__("Customer")}</th>
                                <th>${__("Item")}</th>
                                <th>${__("Sales Person")}</th>
                                <th style="text-align: right;">${__("Amount")}</th>
                                <th style="text-align: center;">${__("Type")}</th>
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
                    <td><a href="/app/payment-entry/${row.payment_entry}" style="font-weight: 600; color: #4338ca;">${row.payment_entry}</a></td>
                    <td><a href="/app/sales-invoice/${row.name}" style="font-weight: 500; color: #64748b;">${row.name}</a></td>
                    <td>${frappe.datetime.str_to_user(row.posting_date)}</td>
                    <td>${row.customer}</td>
                    <td>
                        <div style="line-height: 1.4;">
                            <div style="font-size: 11px; color: #64748b;">${row.item_code || "-"}</div>
                            <div style="font-weight: 600;">${row.item_name || "-"}</div>
                        </div>
                    </td>
                    <td>${row.sales_person || "-"}</td>
                    <td style="text-align: right; font-weight: 700;">${format_currency_short(row.allocated_amount)}</td>
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
	];

	page.filter_group = new frappe.ui.FieldGroup({ parent: filter_parent, fields: filter_fields });
	page.filter_group.make();

	// Attach events
	Object.keys(page.filter_group.fields_dict).forEach((key) => {
		let field = page.filter_group.fields_dict[key];
		field.on_change = () => page.refresh();
	});

	page.set_primary_action(__("Refresh"), () => page.refresh());
	page.add_menu_item(__("Export to PDF"), () => export_pdf());
	page.add_menu_item(__("Export to Excel"), () => export_to_excel("all"));

	// --- 4. EXPORT FUNCTIONS ---
	const export_to_excel = (export_type = "all") => {
		const filters = page.filter_group.get_values();
		frappe.show_alert({ message: __("Generating Excel Report..."), indicator: "blue" });
		frappe.call({
			method: "renu_customization.renu_customization.page.collection_report.collection_report.export_to_excel",
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
			const svg = document.querySelector(`#chart_wrapper svg`);
			if (!svg) return null;
			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d");
			const svg_data = new XMLSerializer().serializeToString(svg);
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
            body { font-family: sans-serif; font-size: 10px; }
            .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
            .kpi-wrapper { display: flex; gap: 10px; margin-bottom: 20px; }
            .kpi-card { flex: 1; border: 1px solid #eee; padding: 10px; text-align: center; background: #fafafa; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #eee; padding: 6px; text-align: left; }
            th { background: #f4f4f4; }
        </style></head><body>
            <div class="header"><h1>Collection Report</h1><p>${period}</p></div>
            <div class="kpi-wrapper">${data.summary.map(m => `<div class="kpi-card"><div>${m.label}</div><div style="font-size:14px;font-weight:bold;">${format_currency_short(m.value)}</div></div>`).join("")}</div>
            <div style="text-align:center;"><img src="${chart_png}" style="max-width:400px;"></div>
            <h3>Detailed Collection List</h3>
            <table><thead><tr><th>Payment ID</th><th>Invoice ID</th><th>Date</th><th>Customer</th><th>Amount</th><th>Type</th></tr></thead>
            <tbody>${data.results.map(row => `<tr><td>${row.payment_entry}</td><td>${row.name}</td><td>${row.posting_date}</td><td>${row.customer}</td><td>${format_currency_short(row.allocated_amount)}</td><td>${row.is_export ? "Export" : "Domestic"}</td></tr>`).join("")}</tbody>
            </table></body></html>`;

		const $form = $(`<form action="/api/method/renu_customization.renu_customization.page.collection_report.collection_report.export_to_pdf" method="POST" target="_blank" style="display:none;"><input type="hidden" name="html" value=""><input type="hidden" name="csrf_token" value="${frappe.csrf_token}"></form>`).appendTo("body");
		$form.find('input[name="html"]').val(html);
		$form.submit();
		$form.remove();
	};

	// --- 5. INITIAL LOAD ---
	page.refresh();
};
