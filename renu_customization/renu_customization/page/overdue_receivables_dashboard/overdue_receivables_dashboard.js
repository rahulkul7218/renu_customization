frappe.pages["overdue_receivables_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Overdue Receivables Dashboard"),
		single_column: true,
	});

	page.set_primary_action(__("Refresh"), () => page.refresh());

	// Export Functions
	const export_to_excel = (export_type = "all") => {
		const filters = page.filter_group.get_values();
		frappe.show_alert({ message: __("Generating Excel Report..."), indicator: "blue" });

		frappe.call({
			method: "renu_customization.renu_customization.page.overdue_receivables_dashboard.overdue_receivables_dashboard.export_to_excel",
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

		const report_date = moment().format("YYYY-MM-DD HH:mm");
		const data = page.dashboard_data;

		// Function to convert SVG chart to PNG Base64
		const get_chart_png = (selector) => {
			const container = document.querySelector(selector);
			const svg = container ? container.querySelector("svg") : null;
			if (!svg) return null;

			// Temporarily hide the internal chart legend for a cleaner PDF
			const legend = container.querySelector(".chart-legend, .graph-legend-active");
			if (legend) legend.style.display = "none";

			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d");
			const svg_data = new XMLSerializer().serializeToString(svg);
			const img = new Image();

			return new Promise((resolve) => {
				img.onload = () => {
					canvas.width = img.width * 2;
					canvas.height = img.height * 2;
					context.fillStyle = "white";
					context.fillRect(0, 0, canvas.width, canvas.height);
					context.drawImage(img, 0, 0, canvas.width, canvas.height);

					// Restore legend on screen
					if (legend) legend.style.display = "";

					resolve(canvas.toDataURL("image/png"));
				};
				img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg_data)));
			});
		};

		// Helper to generate legend HTML
		const get_legend_html = (chart_key) => {
			const chart = data.charts[chart_key];
			const total_val = chart.data.datasets[0].values.reduce((a, b) => a + (b || 0), 0) || 1;

			return chart.data.labels.map((label, i) => {
				const val = chart.data.datasets[0].values[i] || 0;
				const color = chart.colors[i % chart.colors.length];
				const share = ((val / total_val) * 100).toFixed(1) + "%";
				return `
					<div style="display: inline-block; width: 45%; margin: 5px 2%; vertical-align: top; text-align: left;">
						<span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: ${color}; margin-right: 5px;"></span>
						<div style="display: inline-block; vertical-align: top;">
							<div style="font-size: 9px; font-weight: 600; color: #475569;">${label}</div>
							<div style="font-size: 8px; color: #94a3b8;">${format_currency(val, true)} (${share})</div>
						</div>
					</div>
				`;
			}).join("");
		};

		const overdue_png = await get_chart_png("#overdue-chart");
		const ageing_png = await get_chart_png("#ageing-chart");

		let html = `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 0; margin: 0; color: #1e293b; background: #fff; }
                    @page { size: landscape; margin: 10mm; }
                    .header { text-align: center; border-bottom: 3px solid #ef4444; padding-bottom: 15px; margin-bottom: 25px; }
                    .kpi-wrapper { display: table; width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 25px; table-layout: fixed; }
                    .kpi-card { display: table-cell; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; text-align: center; background: #f8fafc; vertical-align: top; }
                    .kpi-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
                    .kpi-value { font-size: 16px; font-weight: 800; }

                    .charts-row { display: table; width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 30px; }
                    .chart-col { display: table-cell; width: 50%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; background: #fff; vertical-align: top; page-break-inside: avoid; }
                    .chart-img { width: 100%; height: auto; max-height: 250px; margin-bottom: 10px; object-fit: contain; }
                    .pdf-legend-box { background: #fafafa; border-radius: 8px; padding: 10px; border: 1px solid #f1f5f9; margin-top: 10px; }

                    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10px; margin-top: 15px; page-break-inside: auto; }
                    thead { display: table-header-group; }
                    tbody { display: table-row-group; }
                    tr { page-break-inside: avoid !important; page-break-after: auto; }
                    th, td {
                        padding: 8px;
                        border: 1px solid #e2e8f0;
                        text-align: left;
                        vertical-align: top;
                        page-break-inside: avoid !important;
                        word-wrap: break-word;
                    }
                    th { background: #f1f5f9; border-bottom: 2px solid #ef4444; color: #64748b; text-transform: uppercase; font-weight: 700; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin:0;">Overdue Receivables Report (Million INR)</h1>
                    <p style="font-size:10px; color:#999;">Generated: ${report_date}</p>
                </div>

                <div class="kpi-wrapper">
                    ${data.summary.map(m => `
                        <div class="kpi-card">
                            <div class="kpi-label">${m.label}</div>
                            <div class="kpi-value">${m.fieldtype === "Currency" ? format_currency(m.value) : m.value}</div>
                        </div>
                    `).join("")}
                </div>

                <div class="charts-row">
                    <div class="chart-col">
                        <h4 style="color:#334155; text-transform:uppercase; font-size:12px; margin: 0 0 10px 0; text-align: center;">${data.charts.overdue_breakdown.title}</h4>
                        <div style="text-align: center;">
                            <img src="${overdue_png}" class="chart-img">
                        </div>
                        <div class="pdf-legend-box">
                            ${get_legend_html('overdue_breakdown')}
                        </div>
                    </div>
                    <div class="chart-col">
                        <h4 style="color:#334155; text-transform:uppercase; font-size:12px; margin: 0 0 10px 0; text-align: center;">${data.charts.ageing_breakdown.title}</h4>
                        <div style="text-align: center;">
                            <img src="${ageing_png}" class="chart-img">
                        </div>
                        <div class="pdf-legend-box">
                            ${get_legend_html('ageing_breakdown')}
                        </div>
                    </div>
                </div>

                <h3 style="color:#334155; text-transform:uppercase; font-size:14px;">Detailed Overdue List</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Sales Person</th>
                            <th class="text-center">Type</th>
                            <th class="text-right">Overdue (M)</th>
                            <th class="text-right">Due Date</th>
                            <th class="text-right">Days</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.results
				.map(
					(row) => `
                            <tr>
                                <td>${row.name}</td>
                                <td>${frappe.datetime.str_to_user(row.posting_date)}</td>
                                <td>${row.customer_name || row.customer}</td>
                                <td>${row.sales_person || "-"}</td>
                                <td class="text-center">${row.type}</td>
                                <td class="text-right">${format_currency(row.outstanding_amount)}</td>
                                <td class="text-right">${row.due_date ? frappe.datetime.str_to_user(row.due_date) : "-"
						}</td>
                                <td class="text-right">${row.days_overdue}</td>
                            </tr>
                        `,
				)
				.join("")}
                        <tr style="background: #f8fafc; font-weight: bold;">
                            <td colspan="5" class="text-left" style="border-top: 2px solid #e2e8f0; padding: 12px 8px;">Grand Total</td>
                            <td class="text-right" style="border-top: 2px solid #e2e8f0; padding: 12px 8px;">${format_currency(
					data.results.reduce((sum, r) => sum + (r.outstanding_amount || 0), 0)
				)}</td>
                            <td colspan="2" style="border-top: 2px solid #e2e8f0;"></td>
                        </tr>
                    </tbody>
                </table>
            </body>
            </html>
        `;

		const method_url =
			"/api/method/renu_customization.renu_customization.page.overdue_receivables_dashboard.overdue_receivables_dashboard.export_to_pdf";
		const $form =
			$(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
            <input type="hidden" name="html" value="">
            <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
        </form>`).appendTo("body");

		$form.find('input[name="html"]').val(html);
		$form.submit();
		$form.remove();
	};

	page.add_menu_item(__("Export to PDF"), () => export_pdf());
	page.add_menu_item(__("Export to Excel"), () => export_to_excel("all"));

	let filter_area = $('<div class="dashboard-filter-area border-bottom"></div>').prependTo(
		page.main,
	);
	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

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
			fieldname: "date",
			label: __("Date"),
			fieldtype: "Date",
			default: frappe.datetime.now_date(),
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
			fieldname: "sales_person",
			label: __("Sales Person"),
			fieldtype: "Link",
			options: "Sales Person",
			placeholder: __("Select Sales Person"),
		},
		{
			fieldname: "from_days",
			label: __("From Overdue Days"),
			fieldtype: "Int",
			placeholder: __("Min Days"),
		},
		{
			fieldname: "to_days",
			label: __("To Overdue Days"),
			fieldtype: "Int",
			placeholder: __("Max Days"),
		},
		{ // Existing filters above
			fieldname: "dom_exp",
			label: __("Domestic/Export"),
			fieldtype: "Select",
			options: ["All", "Domestic", "Export"],
			default: "All",
			placeholder: __("Select Domestic/Export"),
		},
		{ // New Business Region Name filter
			fieldname: "business_region_name",
			label: __("Business Region Name"),
			fieldtype: "Select",
			options: ["All"],
			default: "All",
			placeholder: __("Select Business Region Name"),
		},

		{ // Type filter
			fieldname: "type",
			label: __("Domestic/Export"),
			fieldtype: "Select",
			options: ["All", "Domestic", "Export"],
			default: "All",
			placeholder: __("Select Type"),
		},

	];

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_area,
		fields: filter_fields,
	});
	page.filter_group.make();

	// if (renu_customization.dashboard_fiscal_year && renu_customization.dashboard_fiscal_year.init) {
	// 	renu_customization.dashboard_fiscal_year.init(page, { refresh_delay: 300 });
	// }
	// Hide specific filters
	const fieldsToHide = ['fiscal_year', 'from_date', 'to_date', 'from_days', 'to_days', 'date'];
	fieldsToHide.forEach(fn => {
		if (page.filter_group.fields_dict[fn]) {
			page.filter_group.fields_dict[fn].$wrapper.hide();
		}
	});
	// Populate Business Region Name options
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
				const names = [...new Set(r.message.map(x => x.business_region_name))]
					.filter(Boolean)
					.sort();
				page.filter_group.set_df_property("business_region_name", "options", ["All", ...names]);
			}
		}
	});



filter_area.css({
	padding: "10px 20px",
	"background-color": "#fff",
	"border-bottom": "1px solid #f1f5f9",
});

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
            .sticky-total td {
                position: sticky;
                bottom: 0;
                z-index: 10;
                background: #f8fafc !important;
                font-weight: 700;
                border-top: 2px solid #e2e8f0;
                box-shadow: 0 -2px 4px rgba(0,0,0,0.02);
            }
            .table-container {
                max-height: 600px;
                overflow-y: auto;
                position: relative;
            }
            thead th {
                position: sticky;
                top: 0;
                z-index: 20;
                background: #f8fafc;
            }
            .invoice-col { min-width: 130px !important; width: 130px !important; }
            .date-col { min-width: 120px !important; width: 120px !important; white-space: nowrap !important; }
            .customer-col { min-width: 220px !important; width: 220px !important; }
            .sp-col { min-width: 150px !important; width: 150px !important; }
            .type-col { min-width: 100px !important; width: 100px !important; text-align: center !important; }
            .amount-col { min-width: 140px !important; width: 140px !important; text-align: right !important; }
            .overdue-col { min-width: 80px !important; width: 80px !important; text-align: right !important; }
		`,
	)
	.appendTo(filter_area);

page.refresh = function () {
	let filters = page.filter_group.get_values();

	frappe.call({
		method: "renu_customization.renu_customization.page.overdue_receivables_dashboard.overdue_receivables_dashboard.get_dashboard_data",
		args: { filters: filters },
		callback: function (r) {
			if (r.message) {
				page.dashboard_data = r.message;
				render_dashboard(r.message);
			}
		},
	});
};

function render_dashboard(data) {
	page.container.empty();

	if (!$("#overdue-dashboard-style").length) {
		$(`<style id="overdue-dashboard-style">
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

                .dashboard-content {
                    padding: 20px;
                    background: transparent !important;
                    min-height: 100vh;
                    font-family: 'Inter', sans-serif;
                    color: #1e293b;
                    width: 100% !important;
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
				}
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
                    margin-bottom: 8px;
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

                .charts-wrapper {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 20px;
                    margin-bottom: 24px;
                }
                @media (max-width: 1200px) {
                    .charts-wrapper { grid-template-columns: 1fr !important; }
                }
				.chart-card {
                    background: #fff;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 1px solid #e2e8f0;
                }
                .chart-card .title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 20px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .custom-legend {
                    display: grid !important;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
                    gap: 12px 24px !important;
                    margin-top: 20px;
                    padding: 16px !important;
                    background: #f8fafc !important;
                    border-radius: 8px !important;
                    border: 1px solid #eef2f6 !important;
                }
                .legend-item {
                    display: flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                }
                .legend-item .dot { width: 10px !important; height: 10px !important; border-radius: 2px !important; flex-shrink: 0; }
                .legend-item .info { display: flex !important; align-items: center !important; gap: 8px !important; width: 100%; }
                .legend-item .label { font-size: 11px !important; font-weight: 600 !important; color: #475569 !important; white-space: nowrap; }
                .legend-item .val-pct { font-size: 10px !important; color: #94a3b8 !important; }
                .legend-item .val-amount { font-size: 11px !important; font-weight: 700 !important; color: #1e293b !important; margin-left: auto; white-space: nowrap !important; }

				.table-card {
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    margin-bottom: 24px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    width: 100%;
                }
				.table-card .header {
                    padding: 15px 24px;
                    background: #fff;
                    border-bottom: 1px solid #f1f5f9;
                    font-weight: 700;
                    color: #0f172a;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .table-container {
                    overflow: auto;
                    width: 100%;
                    max-height: 600px;
                }
				.dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
				.dashboard-table th {
                    background: #f8fafc;
                    padding: 12px 16px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: 700;
                    color: #64748b;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    border-bottom: 1px solid #e2e8f0;
                    text-transform: uppercase;
                }
				.dashboard-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid #f1f5f9;
                    font-size: 13px;
                    color: #334155;
                    background: #fff;
                }
				.dashboard-table tr:hover td { background: #f8fafc; }
				.dashboard-table tfoot td { position: sticky; bottom: -1px; z-index: 10; background: #f8fafc; border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; }
				.text-right { text-align: right; }
                .text-center { text-align: center; }

                .indicator-pill {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .indicator-pill.Domestic { background: #e0f2fe; color: #0369a1; }
                .indicator-pill.Export { background: #fef3c7; color: #92400e; }

                .overdue-days { color: #ef4444; font-weight: 700; }

                .export-btn:hover { color: #2563eb; background: #eff6ff; border-color: #bfdbfe; }

                /* Hide Internal Chart Legend */
                .frappe-chart .chart-legend,
                .frappe-chart .legend,
                .frappe-chart .frappe-chart-legend,
                .frappe-chart .legend-dataset-text {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    height: 0 !important;
                    overflow: hidden !important;
                }

                .frappe-chart text { font-size: 11px !important; }
			</style>`).appendTo("head");
	}

	let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
	data.summary.forEach((s) => {
		let indicator = (s.indicator || "blue").toLowerCase();
		$(`
				<div class="summary-card ${indicator}">
					<div class="label"><span class="indicator bg-${indicator}"></span>${s.label}</div>
					<div class="value">${s.fieldtype === "Currency" ? format_currency(s.value) : s.value}</div>
				</div>
			`).appendTo(summary_row);
	});

	let charts_row = $('<div class="charts-wrapper"></div>').appendTo(page.container);

	let breakdown_card = $(`
            <div class="chart-card">
                <div class="title">${data.charts.overdue_breakdown.title}</div>
                <div id="overdue-chart" style="height: 300px;"></div>
                <div id="overdue-legend" class="custom-legend"></div>
            </div>
        `).appendTo(charts_row);

	let ageing_card = $(`
            <div class="chart-card">
                <div class="title">${data.charts.ageing_breakdown.title}</div>
                <div id="ageing-chart" style="height: 300px;"></div>
                <div id="ageing-legend" class="custom-legend"></div>
            </div>
        `).appendTo(charts_row);

	setTimeout(() => {
		// Donut Chart: Export vs Domestic
		new frappe.Chart("#overdue-chart", {
			data: data.charts.overdue_breakdown.data,
			type: "donut",
			height: 300,
			colors: data.charts.overdue_breakdown.colors,
			legend: 0,
			show_legend: 0,
		});

		// Render Custom Legend for Breakdown
		let breakdown_legend = breakdown_card.find("#overdue-legend");
		let b_total = data.charts.overdue_breakdown.data.datasets[0].values.reduce((a, b) => a + b, 0);
		data.charts.overdue_breakdown.data.labels.forEach((label, idx) => {
			let val = data.charts.overdue_breakdown.data.datasets[0].values[idx];
			let color = data.charts.overdue_breakdown.colors[idx % data.charts.overdue_breakdown.colors.length];
			let share = b_total > 0 ? ((val / b_total) * 100).toFixed(1) + "%" : "0%";
			breakdown_legend.append(`
                    <div class="legend-item">
                        <span class="dot" style="background: ${color}"></span>
                        <div class="info">
                            <span class="label">${label}</span>
                            <span class="val-pct">(${share})</span>
                            <span class="val-amount">${format_currency(val, true)}</span>
                        </div>
                    </div>
                `);
		});

		// Bar Chart: Ageing
		new frappe.Chart("#ageing-chart", {
			data: data.charts.ageing_breakdown.data,
			type: "bar",
			height: 300,
			colors: data.charts.ageing_breakdown.colors,
			legend: 0,
			show_legend: 0,
		});

		// Render Custom Legend for Ageing
		let ageing_legend = ageing_card.find("#ageing-legend");
		let a_total = data.charts.ageing_breakdown.data.datasets[0].values.reduce((a, b) => a + b, 0);
		data.charts.ageing_breakdown.data.labels.forEach((label, idx) => {
			let val = data.charts.ageing_breakdown.data.datasets[0].values[idx];
			let color = data.charts.ageing_breakdown.colors[idx % data.charts.ageing_breakdown.colors.length];
			let share = a_total > 0 ? ((val / a_total) * 100).toFixed(1) + "%" : "0%";
			ageing_legend.append(`
                    <div class="legend-item">
                        <span class="dot" style="background: ${color}"></span>
                        <div class="info">
                            <span class="label">${label}</span>
                            <span class="val-pct">(${share})</span>
                            <span class="val-amount">${format_currency(val, true)}</span>
                        </div>
                    </div>
                `);
		});
	}, 100);

	let detail_sort = { field: "days", asc: false };

	let table_card = $(`
            <div class="table-card">
                <div class="header">
                    <span>${__("Detailed Overdue List")}</span>
                    <div class="export-btn" id="export_excel_table">
                        <i class="fa fa-file-excel-o"></i> Export to Excel
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table" id="detail_table">
                        <thead>
                            <tr>
                                <th class="invoice-col sortable-header" data-field="name" style="cursor: pointer; user-select: none;">${__("Invoice ID")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="date-col sortable-header" data-field="posting_date" style="cursor: pointer; user-select: none;">${__("Date")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="customer-col sortable-header" data-field="customer" style="cursor: pointer; user-select: none;">${__("Customer")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="sp-col sortable-header" data-field="sales_person" style="cursor: pointer; user-select: none;">${__("Sales Person")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="type-col sortable-header" data-field="type" style="cursor: pointer; user-select: none;">${__("Type")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="amount-col sortable-header" data-field="outstanding" style="cursor: pointer; user-select: none;">${__("Overdue (M)")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="date-col text-right sortable-header" data-field="due_date" style="cursor: pointer; user-select: none;">${__("Due Date")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="overdue-col sortable-header" data-field="days" style="cursor: pointer; user-select: none;">${__("Days")} <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="detail_table_body"></tbody>
                        <tfoot></tfoot>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

	const render_detail_table = () => {
		let sorted_data = [...(data.results || [])];
		sorted_data.sort((a, b) => {
			let val_a, val_b;
			if (detail_sort.field === "name" || detail_sort.field === "sales_person" || detail_sort.field === "type") {
				val_a = a[detail_sort.field] || "";
				val_b = b[detail_sort.field] || "";
				return detail_sort.asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
			} else if (detail_sort.field === "customer") {
				val_a = a.customer_name || a.customer || "";
				val_b = b.customer_name || b.customer || "";
				return detail_sort.asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
			} else if (detail_sort.field === "posting_date") {
				val_a = a.posting_date ? new Date(a.posting_date) : new Date(0);
				val_b = b.posting_date ? new Date(b.posting_date) : new Date(0);
			} else if (detail_sort.field === "due_date") {
				val_a = a.due_date ? new Date(a.due_date) : new Date(0);
				val_b = b.due_date ? new Date(b.due_date) : new Date(0);
			} else if (detail_sort.field === "outstanding") {
				val_a = flt(a.outstanding_amount);
				val_b = flt(b.outstanding_amount);
			} else if (detail_sort.field === "days") {
				val_a = flt(a.days_overdue);
				val_b = flt(b.days_overdue);
			}
			return detail_sort.asc ? val_a - val_b : val_b - val_a;
		});

		let tbody = table_card.find("#detail_table_body");
		tbody.empty();

		let total_outstanding_raw = 0;
		sorted_data.forEach((row) => {
			total_outstanding_raw += flt(row.outstanding_amount);

			let display_name = row.name;
			let link_url = row.voucher_type ? `/app/${frappe.router.slug(row.voucher_type)}/${row.name}` : "#";

			if (row.outstanding_amount < 0 && (row.name === __("On Account") || row.voucher_type === "Payment Entry")) {
				display_name = row.name === __("On Account") ? __("On Account Advance") : row.name;
				if (row.voucher_type === "Payment Entry") {
					link_url = `/app/payment-entry/${row.name}`;
				}
			}

			tbody.append(`
					<tr>
						<td class="invoice-col"><a href="${link_url}" style="font-weight: 600; color: #4338ca;">${display_name}</a></td>
						<td class="date-col">${frappe.datetime.str_to_user(row.posting_date)}</td>
						<td class="customer-col" style="font-weight: 500;">${row.customer_name || row.customer}</td>
						<td class="sp-col">${row.sales_person || "-"}</td>
						<td class="type-col">
							<span class="indicator-pill ${row.type}">${__(row.type)}</span>
						</td>
						<td class="amount-col" style="font-weight: 700; color: #0f172a;">${format_currency(row.outstanding_amount)}</td>
						<td class="date-col text-right">${row.due_date ? frappe.datetime.str_to_user(row.due_date) : "-"}</td>
						<td class="overdue-col overdue-days">${row.days_overdue || 0}</td>
					</tr>
				`);
		});

		// Format the total from the raw sum
		let total_display = format_currency(total_outstanding_raw);

		let tfoot = table_card.find("tfoot");
		tfoot.empty();
		tfoot.append(`
				<tr class="sticky-total">
					<td colspan="5" class="text-left" style="padding-left: 20px; font-size: 11px; color: #64748b; font-weight: 600;">GRAND TOTAL</td>
					<td class="amount-col" style="color: #0f172a; font-weight: 800;">${total_display}</td>
					<td colspan="2"></td>
				</tr>
			`);
	};

	render_detail_table();

	table_card.find(".sortable-header").on("click", function () {
		const field = $(this).data("field");
		if (detail_sort.field === field) {
			detail_sort.asc = !detail_sort.asc;
		} else {
			detail_sort.field = field;
			detail_sort.asc = true;
		}

		// Reset icons
		table_card.find(".sortable-header i").removeClass("fa-sort-asc fa-sort-desc").addClass("fa-sort text-muted");

		// Update active icon
		if (detail_sort.asc) {
			$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-asc");
		} else {
			$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-desc");
		}

		render_detail_table();
	});

	table_card.find("#export_excel_table").click(() => export_to_excel("detail"));
}

function format_currency(v, already_divided = false) {
	if (!v && v !== 0) return "₹ 0.00 M";

	// Convert to Million INR if not already divided
	let value = already_divided ? flt(v) : flt(v) / 1000000;

	return (
		"₹ " +
		value.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}) +
		" M"
	);
}

page.refresh();
};
