frappe.pages["gross_margin_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Gross Margin Dashboard"),
		single_column: true,
	});

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
		if (page.container) page.container.css("opacity", "0.6");

		frappe.call({
			method: "renu_customization.renu_customization.page.gross_margin_dashboard.gross_margin_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				if (page.container) page.container.css("opacity", "1");
				if (r.message) {
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
		},
		{ fieldtype: "Column Break" },
		{ label: __("Customer"), fieldname: "customer", fieldtype: "Link", options: "Customer" },
		{ fieldtype: "Column Break" },
		{
			fieldname: "customer_group",
			label: __("Customer Group"),
			fieldtype: "Link",
			options: "Customer Group",
		},
		{ fieldtype: "Column Break" },
		{
			label: __("Product (Item)"),
			fieldname: "item_code",
			fieldtype: "Link",
			options: "Item",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "item_group",
			label: __("Product Group"),
			fieldtype: "Link",
			options: "Item Group",
		},
		{ fieldtype: "Section Break" },
		{
			label: __("Sales Person"),
			fieldname: "sales_person",
			fieldtype: "Link",
			options: "Sales Person",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "territory",
			label: __("Territory"),
			fieldtype: "Link",
			options: "Territory",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "MultiSelect",
			options: ["Draft", "To Bill", "To Deliver and Bill", "To Deliver", "Completed"],
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "dom_exp",
			label: __("Type"),
			fieldtype: "Select",
			options: ["", "Domestic", "Export"],
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "invoice_type",
			label: __("Invoice Type"),
			fieldtype: "Select",
			options: [
				"",
				"Product Domestic",
				"Product Export",
				"Engineering Service Domestic",
				"Engineering Service Export",
			],
		},
	];

	page.filter_group = new frappe.ui.FieldGroup({ parent: filter_parent, fields: filter_fields });
	page.filter_group.make();

	Object.keys(page.filter_group.fields_dict).forEach((key) => {
		let field = page.filter_group.fields_dict[key];
		if (!["Column Break", "Section Break"].includes(field.df.fieldtype)) {
			field.on_change = () => page.refresh();
			if (field.$input)
				field.$input.on("change input blur", () => setTimeout(() => page.refresh(), 50));
		}
	});

	filter_parent
		.addClass("border-bottom")
		.css({ "background-color": "#fff", "margin-bottom": "0" });
	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        .dashboard-content { padding: 20px; background: #fff; min-height: 100vh; }
        .summary-wrapper { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .summary-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 12px; 
            padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
        }
        .summary-card:hover { transform: translateY(-3px); }
        .summary-card .label { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .summary-card .value { font-size: 24px; font-weight: 700; color: #000; }
        .summary-card .indicator { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
        
        .bg-blue { background-color: #3498db; }
        .bg-green { background-color: #2ecc71; }
        .bg-orange { background-color: #e67e22; }
        .bg-purple { background-color: #9b59b6; }
        
        .charts-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .charts-row .full-width { grid-column: span 2; }
        @media (max-width: 991px) { .charts-row { grid-template-columns: 1fr; } .charts-row .full-width { grid-column: span 1; } }

        .chart-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 8px; 
            padding: 24px; box-shadow: var(--shadow-sm); min-height: 400px; margin-bottom: 20px;
        }
        .chart-card .title { font-size: 16px; font-weight: 600; color: #000; margin-bottom: 20px; display: flex; justify-content: space-between; }
        .reset-btn { font-size: 11px; cursor: pointer; color: var(--primary); font-weight: 500; }

        .table-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 8px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 30px; overflow: visible;
            display: flex; flex-direction: column;
        }
        .table-card .header { padding: 15px 24px; border-bottom: 1px solid var(--border-color); font-weight: 600; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .table-container { overflow: auto; width: 100%; max-height: 500px; position: relative; }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .dashboard-table th { background: #f8f9fa; padding: 12px 14px; text-align: left; font-size: 11px; color: #555; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #dee2e6; white-space: nowrap; }
        .dashboard-table td { padding: 12px 14px; border-top: 1px solid #eee; font-size: 13px; color: #333; background: #fff; white-space: nowrap; }
        .dashboard-table tr:hover td { background: #f9f9f9; }
        .text-right { text-align: right !important; }
        .font-weight-bold { font-weight: 700 !important; }
        .export-btn { font-size: 11px; cursor: pointer; color: #6c757d; border: 1px solid #ddd; padding: 4px 12px; border-radius: 4px; height: fit-content; align-self: center; }
        .export-btn:hover { color: #2b6cb0; background: #ebf8ff; border-color: #bee3f8; }
        .indicator-pill { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .indicator-pill.green { background: #dcfce7; color: #166534; }
        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
        
        .sticky-right-1 { position: sticky; right: 0; z-index: 5; background: #f8f9fa !important; border-left: 1px solid #ddd; }
        .sticky-right-2 { position: sticky; right: 100px; z-index: 5; background: #f8f9fa !important; border-left: 1px solid #ddd; }
        th.sticky-right-1, th.sticky-right-2 { z-index: 11; }
        tr.sticky-total td.sticky-right-1, tr.sticky-total td.sticky-right-2 { position: sticky; bottom: 0; z-index: 9; background: #f1f3f5 !important; font-weight: 700; border-top: 2px solid #ddd; }

        @media print {
            @page { size: landscape; margin: 5mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { background: #fff !important; margin: 0 !important; padding: 0 !important; font-family: Inter, sans-serif !important; width: 100% !important; }
            .dashboard-filter-area, .page-head, .refresh-btn, .btn, .export-btn, .no-print, .reset-btn { display: none !important; }
            .dashboard-content { padding: 0 !important; }
            .summary-wrapper { display: flex !important; flex-wrap: nowrap !important; gap: 8px !important; margin-bottom: 20px !important; }
            .summary-card { flex: 1 !important; border: 1px solid #ddd !important; padding: 10px !important; box-shadow: none !important; }
            .chart-card { border: 1px solid #eee !important; page-break-inside: avoid !important; min-height: auto !important; margin-bottom: 20px !important; }
            .table-card { border: none !important; box-shadow: none !important; }
            .table-container { max-height: none !important; overflow: visible !important; }
            .dashboard-table { zoom: 0.8; width: 100% !important; table-layout: auto !important; }
            .dashboard-table th, .dashboard-table td { border: 0.5pt solid #000 !important; white-space: normal !important; }
            .total-col { position: static !important; }
        }
    </style>`).appendTo(page.main);

	function format_currency_short(num, fieldtype) {
		if (!num && num !== 0) return fieldtype === "Percent" ? "0.00%" : "₹ 0.00 M";
		if (fieldtype === "Percent") return flt(num).toFixed(2) + "%";
		let value = flt(num) / 1000000;
		return (
			"₹ " +
			value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
			" M"
		);
	}

	function format_chart_value(d) {
		return (
			"₹ " +
			flt(d).toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) +
			" M"
		);
	}

	function render_dashboard(data) {
		page.container.empty();
		if (!data.results || data.results.length === 0) {
			$(
				`<div class="text-center text-muted" style="padding: 100px 0;"><div>${__("No data found")}</div></div>`,
			).appendTo(page.container);
			return;
		}

		// 1. Summary Metrics
		if (data.summary) {
			let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
			data.summary.forEach((m) => {
				$(`
                    <div class="summary-card">
                        <div class="label"><span class="indicator bg-${m.indicator.toLowerCase()}"></span>${m.label}</div>
                        <div class="value">${format_currency_short(m.value, m.fieldtype)}</div>
                    </div>
                `).appendTo(summary_row);
			});
		}

		// 2. Charts
		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		const chart_config = {
			margin_trend: { title: "Monthly Revenue vs Margin" },
			top_10_salesperson: { field: "sales_person", title: "Top 10 Salesperson" },
			top_10_customers: { field: "customer", title: "Top 10 Customers" },
			top_10_products: { field: "item_code", title: "Top 10 Products" },
		};

		Object.keys(data.charts).forEach((id) => {
			let chart_obj = data.charts[id];
			let config = chart_config[id];
			if (!chart_obj.data.labels || chart_obj.data.labels.length === 0) return;

			let is_full = id === "margin_trend";
			let wrapper = $(`
                <div class="chart-card ${is_full ? "full-width" : ""}">
                    <div class="title">
                        <span>${chart_obj.title}</span>
                        ${config && config.field && page.filter_group.get_value(config.field) ? `<span class="reset-btn" data-field="${config.field}">Reset</span>` : ""}
                    </div>
                    <div id="wrapper_${id}" style="min-height: 300px;"></div>
                </div>
            `).appendTo(charts_row);

			setTimeout(() => {
				new frappe.Chart(`#wrapper_${id}`, {
					data: chart_obj.data,
					type: chart_obj.type || "donut",
					height: is_full ? 350 : 300,
					colors: chart_obj.colors,
					tooltipOptions: { formatTooltipY: (d) => format_chart_value(d) },
					barOptions: { stacked: 0, spaceRatio: 0.2 },
					onClick: (event) => {
						if (config && config.field && event.label) {
							page.filter_group.set_value(config.field, event.label);
							page.refresh();
						}
					},
				});
			}, 100);
		});

		charts_row.on("click", ".reset-btn", function () {
			let field = $(this).data("field");
			page.filter_group.set_value(field, "");
			page.refresh();
		});

		// 3. Tables
		let months_map = {};
		let months = [];
		data.results.forEach((r) => {
			let date = r.invoice_date || r.posting_date;
			let m_key = moment(date).format("MMM YYYY");
			let m_sort = moment(date).format("YYYYMM");
			if (!months_map[m_key]) {
				months_map[m_key] = m_sort;
				months.push({ key: m_key, sort: m_sort });
			}
		});
		months.sort((a, b) => a.sort - b.sort);

		let tables_row = $('<div style="margin-top: 24px;"></div>').appendTo(page.container);

		let card = $(`
            <div class="table-card">
                <div class="header">
                    <h6 class="m-0 font-weight-bold text-primary">${__("Month-Wise Margin")}</h6>
                    <div class="d-flex" style="gap: 10px;">
                        <div id="filter_customer_link" style="width: 200px;"></div>
                        <div id="filter_sp_link" style="width: 200px;"></div>
                        <span class="export-btn" id="export_month_btn">Export</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table" id="consolidated_table">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center;">S.No.</th>
                                <th style="min-width: 250px;">Customer</th>
                                <th style="min-width: 180px;">Sales Person</th>
                                <th style="min-width: 250px;">Product</th>
                                ${months.map((m) => `<th class="text-right" style="min-width: 110px;">${m.key}</th>`).join("")}
                                <th class="text-right sticky-right-2" style="min-width: 130px; right: 100px;">Total Margin (M)</th>
                                <th class="text-right sticky-right-1" style="min-width: 100px; right: 0;">Total Margin %</th>
                            </tr>
                        </thead>
                        <tbody id="consolidated_table_body"></tbody>
                    </table>
                </div>
            </div>

            <div class="table-card" style="margin-top: 24px;">
                <div class="header">
                    <h6 class="m-0 font-weight-bold text-primary">${__("Gross Margin Details")}</h6>
                    <span class="export-btn" id="export_detail_btn">Export</span>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center;">S.No.</th>
                                <th>Invoice</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Item</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right" style="min-width: 110px;">Revenue (M)</th>
                                <th class="text-right" style="min-width: 110px;">COGS (M)</th>
                                <th class="text-right font-weight-bold" style="min-width: 110px;">Margin (M)</th>
                                <th class="text-right">Margin %</th>
                            </tr>
                        </thead>
                        <tbody id="invoice_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(tables_row);

		const render_filtered_view = (results) => {
			let tbody_summary = card.find("#consolidated_table_body");
			let tbody_detail = card.find("#invoice_table_body");
			tbody_summary.empty();
			tbody_detail.empty();

			// Summary Table Logic
			let merged = {};
			results.forEach((r) => {
				let sp = r.sales_person || "-";
				let cust = r.customer_name || r.customer || "-";
				let prod = r.item_code + " - " + (r.item_name || "");
				let key = sp + "|" + cust + "|" + r.item_code;
				if (!merged[key])
					merged[key] = { sp, cust, prod, months: {}, total: 0, total_rev: 0 };
				let m_key = moment(r.invoice_date).format("MMM YYYY");
				merged[key].months[m_key] = (merged[key].months[m_key] || 0) + flt(r.margin);
				merged[key].total += flt(r.margin);
				merged[key].total_rev += flt(r.base_amount);
			});

			let total_month_amts = {};
			let grand_total = 0;
			let grand_total_rev = 0;
			Object.values(merged)
				.sort((a, b) => b.total - a.total)
				.slice(0, 100)
				.forEach((r, i) => {
					grand_total += r.total;
					grand_total_rev += r.total_rev;
					let cells = months
						.map((m) => {
							let val = r.months[m.key] || 0;
							total_month_amts[m.key] = (total_month_amts[m.key] || 0) + val;
							return `<td class="text-right">${format_currency_short(val)}</td>`;
						})
						.join("");
					let margin_pct = (r.total / r.total_rev) * 100 || 0;
					let m_color = margin_pct > 20 ? "green" : margin_pct < 5 ? "red" : "";
					tbody_summary.append(`
                    <tr>
                        <td style="text-align: center;">${i + 1}</td>
                        <td>${r.cust}</td>
                        <td>${r.sp}</td>
                        <td><div class="text-truncate" style="max-width: 250px;" title="${r.prod}">${r.prod}</div></td>
                        ${cells}
                        <td class="text-right font-weight-bold sticky-right-2" style="right: 100px;">${format_currency_short(r.total)}</td>
                        <td class="text-right sticky-right-1" style="right: 0;"><span class="indicator-pill ${m_color}">${margin_pct.toFixed(2)}%</span></td>
                    </tr>
                `);
				});

			if (results.length > 0) {
				let footer = months
					.map(
						(m) =>
							`<td class="text-right">${format_currency_short(total_month_amts[m.key] || 0)}</td>`,
					)
					.join("");
				let grand_margin_pct = (grand_total / grand_total_rev) * 100 || 0;
				tbody_summary.append(`
                    <tr class="sticky-total">
                        <td colspan="4" style="text-align: right; background: #f1f3f5 !important; position: sticky; bottom: 0; z-index: 8; border-top: 2px solid #ddd;">Grand Total</td>
                        ${months.map((m) => `<td class="text-right" style="background: #f1f3f5 !important; position: sticky; bottom: 0; z-index: 8; border-top: 2px solid #ddd;">${format_currency_short(total_month_amts[m.key] || 0)}</td>`).join("")}
                        <td class="text-right sticky-right-2" style="right: 100px;">${format_currency_short(grand_total)}</td>
                        <td class="text-right sticky-right-1" style="right: 0;">${grand_margin_pct.toFixed(2)}%</td>
                    </tr>
                `);
			}

			// Detail Table Logic
			let total_rev = 0,
				total_cogs = 0,
				total_margin = 0;
			results.forEach((r, i) => {
				total_rev += flt(r.base_amount);
				total_cogs += flt(r.cogs);
				total_margin += flt(r.margin);
				let m_color = r.margin_pct > 20 ? "green" : r.margin_pct < 5 ? "red" : "";
				tbody_detail.append(`
                    <tr>
                        <td style="text-align: center;">${i + 1}</td>
                        <td><a href="/app/sales-invoice/${r.invoice_id}">${r.invoice_id}</a></td>
                        <td>${frappe.datetime.str_to_user(r.invoice_date)}</td>
                        <td>${r.customer_name}</td>
                        <td>${r.item_code}</td>
                        <td class="text-right">${flt(r.qty)}</td>
                        <td class="text-right">${format_currency_short(r.base_amount)}</td>
                        <td class="text-right">${format_currency_short(r.cogs)}</td>
                        <td class="text-right font-weight-bold">${format_currency_short(r.margin)}</td>
                        <td class="text-right"><span class="indicator-pill ${m_color}">${flt(r.margin_pct).toFixed(2)}%</span></td>
                    </tr>
                `);
			});

			if (results.length > 0) {
				tbody_detail.append(`
                    <tr class="sticky-total">
                        <td colspan="6" style="text-align: right;">Total</td>
                        <td class="text-right">${format_currency_short(total_rev)}</td>
                        <td class="text-right">${format_currency_short(total_cogs)}</td>
                        <td class="text-right">${format_currency_short(total_margin)}</td>
                        <td class="text-right">${((total_margin / total_rev) * 100 || 0).toFixed(2)}%</td>
                    </tr>
                `);
			}
		};

		// Hybrid Local Filters
		const apply_local_filters = () => {
			const c_val = (f_cust_ctrl.$input ? f_cust_ctrl.$input.val() : "")
				.toLowerCase()
				.trim();
			const s_val = (f_sp_ctrl.$input ? f_sp_ctrl.$input.val() : "").toLowerCase().trim();
			let filtered = data.results.filter((r) => {
				const c_match =
					!c_val ||
					(r.customer_name || "").toLowerCase().includes(c_val) ||
					(r.customer || "").toLowerCase().includes(c_val);
				const s_match = !s_val || (r.sales_person || "").toLowerCase().includes(s_val);
				return c_match && s_match;
			});
			render_filtered_view(filtered);
		};

		const f_cust_ctrl = frappe.ui.form.make_control({
			parent: card.find("#filter_customer_link"),
			df: {
				fieldtype: "Autocomplete",
				placeholder: "Filter Customer",
				options: Array.from(
					new Set(data.results.map((r) => r.customer_name || r.customer)),
				).sort(),
				on_change: () => apply_local_filters(),
			},
			render_input: true,
		});
		const f_sp_ctrl = frappe.ui.form.make_control({
			parent: card.find("#filter_sp_link"),
			df: {
				fieldtype: "Autocomplete",
				placeholder: "Filter Sales Person",
				options: Array.from(new Set(data.results.map((r) => r.sales_person))).sort(),
				on_change: () => apply_local_filters(),
			},
			render_input: true,
		});

		render_filtered_view(data.results);

		$("#export_month_btn, #export_detail_btn").on("click", function () {
			frappe.call({
				method: "renu_customization.renu_customization.page.gross_margin_dashboard.gross_margin_dashboard.export_to_excel",
				args: { filters: page.filter_group.get_values() },
				callback: function (r) {
					if (r.message) {
						const blob = b64toBlob(
							r.message.filecontent,
							"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						);
						const link = document.createElement("a");
						link.href = URL.createObjectURL(blob);
						link.download = r.message.filename;
						link.click();
					}
				},
			});
		});

		page.clear_menu();
		page.add_menu_item(__("Export to Excel"), () => $("#export_month_btn").click());
		page.add_menu_item(__("Export to PDF"), async () => {
			const report_date = frappe.datetime.now_datetime();
			const period = page.filter_group.get_values().fiscal_year || "All Time";

			const get_chart_png = (chart_id) => {
				return new Promise((resolve) => {
					const svg_el = document.querySelector(`#wrapper_${chart_id} svg`);
					if (!svg_el) return resolve("");
					try {
						const bbox = svg_el.getBoundingClientRect();
						const width = bbox.width || 800;
						const height = bbox.height || 450;
						const svg_data = new XMLSerializer().serializeToString(svg_el);
						const canvas = document.createElement("canvas");
						const ctx = canvas.getContext("2d");
						const img = new Image();
						img.onload = () => {
							canvas.width = width * 2;
							canvas.height = height * 2;
							ctx.fillStyle = "#ffffff";
							ctx.fillRect(0, 0, canvas.width, canvas.height);
							ctx.drawImage(img, 0, 0, width * 2, height * 2);
							resolve(canvas.toDataURL("image/png"));
						};
						img.src =
							"data:image/svg+xml;base64," +
							btoa(unescape(encodeURIComponent(svg_data)));
					} catch (e) {
						resolve("");
					}
				});
			};

			frappe.show_alert({ message: __("Preparing PDF..."), indicator: "blue" });
			const [png_trend, png1, png2, png3] = await Promise.all([
				get_chart_png("margin_trend"),
				get_chart_png("top_10_salesperson"),
				get_chart_png("top_10_customers"),
				get_chart_png("top_10_products"),
			]);

			const chart_h = (png, title) => {
				if (!png) return "";
				return `<div style="text-align: center; margin-bottom: 20px; page-break-inside: avoid;">
                    <h4 style="margin-bottom: 10px; font-size: 16px; color: #000;">${title}</h4>
                    <img src="${png}" style="width: 800px; height: auto; max-width: 100%; display: block; margin: 0 auto;">
                </div>`;
			};

			let html = `
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; background: #fff !important; }
                        .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2pt solid #000; padding-bottom: 12px; }
                        .kpi-wrapper { display: table; width: 100%; border-spacing: 12px; margin-bottom: 30px; }
                        .kpi-card { display: table-cell; padding: 15px; border: 1px solid #ddd; border-radius: 8px; width: 25%; text-align: center; }
                        .kpi-label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px; font-weight: 700; }
                        .kpi-value { font-size: 18px; font-weight: 800; color: #000; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 0.5pt solid #000; }
                        th, td { border: 0.5pt solid #000; padding: 6px 8px; font-size: 8pt; vertical-align: top; }
                        th { background-color: #f8f9fa; font-weight: bold; }
                        .text-right { text-align: right; }
                        .page-break { page-break-after: always; }
                    </style>
                </head>
                <body>
                    <div class="report-header">
                        <h1 style="margin:0;">Gross Margin Dashboard</h1>
                        <p>${period} | Generated: ${report_date}</p>
                    </div>
                    <div class="kpi-wrapper">
                        ${data.summary
							.map(
								(m) => `
                            <div class="kpi-card">
                                <div class="kpi-label">${m.label}</div>
                                <div class="kpi-value">${format_currency_short(m.value, m.fieldtype)}</div>
                            </div>
                        `,
							)
							.join("")}
                    </div>
                    <h3>Margin Analytics & Trends</h3>
                    ${chart_h(png_trend, "Monthly Revenue vs Margin")}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${chart_h(png1, "Top 10 Salesperson")}
                        ${chart_h(png2, "Top 10 Customers")}
                    </div>
                    ${chart_h(png3, "Top 10 Products by Margin")}
                    
                    <div class="page-break"></div>
                    <h3>Month-Wise Margin Summary</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>S.No.</th><th>Customer</th><th>Sales Person</th><th>Product</th>
                                ${months.map(m => `<th class="text-right">${m.key}</th>`).join("")}
                                <th class="text-right">Total Margin (M)</th>
                                <th class="text-right">Margin %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(() => {
                                let merged = {};
                                data.results.forEach(r => {
                                    let sp = r.sales_person || "-";
                                    let cust = r.customer_name || r.customer || "-";
                                    let key = sp + "|" + cust + "|" + r.item_code;
                                    if (!merged[key]) merged[key] = { sp, cust, prod: r.item_code, months: {}, total: 0, total_rev: 0 };
                                    let m_key = moment(r.invoice_date).format("MMM YYYY");
                                    merged[key].months[m_key] = (merged[key].months[m_key] || 0) + flt(r.margin);
                                    merged[key].total += flt(r.margin);
                                    merged[key].total_rev += flt(r.base_amount);
                                });
                                return Object.values(merged).sort((a,b) => b.total - a.total).slice(0, 50).map((r, i) => `
                                    <tr>
                                        <td>${i+1}</td><td>${r.cust}</td><td>${r.sp}</td><td>${r.prod}</td>
                                        ${months.map(m => `<td class="text-right">${format_currency_short(r.months[m.key] || 0)}</td>`).join("")}
                                        <td class="text-right">${format_currency_short(r.total)}</td>
                                        <td class="text-right">${((r.total / r.total_rev) * 100 || 0).toFixed(2)}%</td>
                                    </tr>
                                `).join("");
                            })()}
                        </tbody>
                    </table>

                    <div class="page-break"></div>
                    <h3>Detailed Gross Margin Report</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>S.No.</th><th>Invoice</th><th>Date</th><th>Customer</th><th>Item</th>
                                <th class="text-right">Qty</th><th class="text-right">Revenue (M)</th>
                                <th class="text-right">COGS (M)</th><th class="text-right">Margin (M)</th><th class="text-right">Margin %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.results.map((r, i) => `
                                <tr>
                                    <td>${i + 1}</td><td>${r.invoice_id}</td><td>${r.invoice_date}</td><td>${r.customer_name}</td><td>${r.item_code}</td>
                                    <td class="text-right">${flt(r.qty)}</td><td class="text-right">${format_currency_short(r.base_amount)}</td>
                                    <td class="text-right">${format_currency_short(r.cogs)}</td><td class="text-right">${format_currency_short(r.margin)}</td>
                                    <td class="text-right">${flt(r.margin_pct).toFixed(2)}%</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

			const method_url =
				"/api/method/renu_customization.renu_customization.page.gross_margin_dashboard.gross_margin_dashboard.export_to_pdf";
			const $form =
				$(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
                <input type="hidden" name="html" value="">
                <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
            </form>`).appendTo("body");
			$form.find('input[name="html"]').val(html);
			$form.submit();
			$form.remove();
		});
	}

	function b64toBlob(b64Data, contentType = "", sliceSize = 512) {
		const byteCharacters = atob(b64Data);
		const byteArrays = [];
		for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
			const slice = byteCharacters.slice(offset, offset + sliceSize);
			const byteNumbers = new Array(slice.length);
			for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
			const byteArray = new Uint8Array(byteNumbers);
			byteArrays.push(byteArray);
		}
		return new Blob(byteArrays, { type: contentType });
	}

	page.refresh();
};
