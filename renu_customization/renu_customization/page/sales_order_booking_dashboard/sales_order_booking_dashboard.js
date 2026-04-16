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
		if (page.container) page.container.css("opacity", "0.6");

		frappe.call({
			method: "renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard.get_dashboard_data",
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
			fieldname: "fiscal_year",
			label: __("Fiscal Year"),
			fieldtype: "Link",
			options: "Fiscal Year",
			placeholder: __("Select Year"),
		},
		{ fieldtype: "Column Break" },
		{
			label: __("Customer"),
			fieldname: "customer",
			fieldtype: "Link",
			options: "Customer",
			placeholder: __("Select Customer"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "customer_group",
			label: __("Customer Group"),
			fieldtype: "Link",
			options: "Customer Group",
			placeholder: __("Select Group"),
		},
		{ fieldtype: "Column Break" },
		{
			label: __("Product (Item)"),
			fieldname: "item_code",
			fieldtype: "Link",
			options: "Item",
			placeholder: __("Select Item"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "item_group",
			label: __("Product Group"),
			fieldtype: "Link",
			options: "Item Group",
			placeholder: __("Select Product Group"),
		},
		{ fieldtype: "Section Break" },
		{
			label: __("Sales Person"),
			fieldname: "sales_person",
			fieldtype: "Link",
			options: "Sales Person",
			placeholder: __("Select Sales Person"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "territory",
			label: __("Territory"),
			fieldtype: "Link",
			options: "Territory",
			placeholder: __("Select Territory"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "MultiSelect",
			options: [
				"Draft",
				"To Deliver and Bill",
				"To Deliver",
				"To Bill",
				"Completed",
				"Closed",
				"Cancelled",
			],
			placeholder: __("Select Statuses"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "dom_exp",
			label: __("Type"),
			fieldtype: "Select",
			options: ["", "Domestic", "Export"],
			placeholder: __("Select Type"),
		},
		{
			fieldname: "invoice_type",
			label: __("Invoice Type"),
			fieldtype: "Link",
			options: "Sales Invoice Type",
			placeholder: __("Select Invoice Type"),
		},
	];

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_parent,
		fields: filter_fields,
	});
	page.filter_group.make();

	Object.keys(page.filter_group.fields_dict).forEach((key) => {
		let field = page.filter_group.fields_dict[key];
		if (!["Column Break", "Section Break"].includes(field.df.fieldtype)) {
			field.on_change = () => page.refresh();
			if (field.$input) {
				field.$input.on("change input blur", () => {
					setTimeout(() => page.refresh(), 50);
				});
			}
		}
	});

	filter_parent.addClass("border-bottom").css({
		"background-color": "#fff",
		"margin-bottom": "0",
	});

	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        .page-head .title-text, .page-head .breadcrumb-text { color: #1a1a1a !important; font-weight: 700 !important; }
		.page-title { color: #000 !important; }
        .page-head { border-bottom: 1px solid #ddd !important; background: #fff !important; color: #000 }
        .dashboard-content { padding: 20px; background: #fff; min-height: 100vh; }
        .summary-wrapper { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .summary-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 12px; 
            padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .summary-card .label { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .summary-card .value { font-size: 24px; font-weight: 700; color: #000; }
        .summary-card .indicator { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
        .bg-blue { background-color: #3498db; }
        .bg-green { background-color: #2ecc71; }
        .bg-orange { background-color: #e67e22; }
        .bg-purple { background-color: #9b59b6; }
        .charts-row { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .chart-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 8px; 
            padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); min-height: 400px; width: 100%; margin-bottom: 20px;
        }
        .chart-card .title { font-size: 16px; font-weight: 600; color: #000; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .table-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 8px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 30px; width: 100%; overflow: hidden;
        }
        .export-btn { 
            font-size: 11px; cursor: pointer; color: #6c757d; font-weight: 500; 
            padding: 4px 12px; border-radius: 4px; transition: all 0.2s; border: 1px solid transparent;
            display: inline-block;
        }
        .export-btn:hover { 
            color: #2b6cb0 !important; background: #ebf8ff !important; border-color: #bee3f8 !important; 
        }
        .table-card .header { padding: 15px 24px; border-bottom: 1px solid var(--border-color); font-weight: 600; color: #1a1a1a; display: flex; justify-content: space-between; align-items: center; }
        .table-actions { display: flex; gap: 12px; align-items: center; }
        .table-container { overflow: auto; width: 100%; max-height: 500px; }
        .dashboard-table { width: 100%; border-collapse: collapse; }
        .dashboard-table th { background: #f1f3f5; padding: 12px 14px; text-align: left; font-size: 11px; color: #555; position: sticky; top: 0; z-index: 5; border-bottom: 1px solid #dee2e6; }
        .dashboard-table td { padding: 12px 14px; border-top: 1px solid var(--border-color); font-size: 13px; color: #333; }
        .month-col { text-align: right !important; min-width: 100px; }
        .total-col { text-align: right !important; font-weight: 700; min-width: 120px; background: #f8f9fa !important; border-left: 1px solid #dee2e6; }
        .indicator-pill { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .indicator-pill.green { background: #e6fffa; color: #047481; border: 1px solid #b2f5ea; }
        .indicator-pill.blue { background: #ebf8ff; color: #2b6cb0; border: 1px solid #bee3f8; }
        .indicator-pill.orange { background: #fffaf0; color: #9c4221; border: 1px solid #feebc8; }
        .indicator-pill.red { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; }
        .indicator-pill.gray { background: #f7fafc; color: #4a5568; border: 1px solid #edf2f7; }

        .dashboard-table tr.sticky-total td { 
            position: sticky; bottom: 0; background: #f1f3f5 !important; border-top: 1px solid #dee2e6; 
            z-index: 4; font-weight: 700; color: #333;
        }
        .dashboard-table tr.sticky-total td.total-col { z-index: 7; background: #e9ecef !important; }

        .hybrid-filter-container { display: flex; gap: 10px; align-items: center; }
        .hybrid-filter-container .frappe-control { margin-bottom: 0 !important; width: 180px; }
        .hybrid-filter-container .form-group { margin-bottom: 0 !important; }
        .hybrid-filter-container input { height: 28px; font-size: 12px; background: #f8f9fa; border: 1px solid #dee2e6; }
    </style>`).appendTo(page.main);

	function render_dashboard(data) {
		page.container.empty();
		if (!data.results || data.results.length === 0) {
			$(
				`<div class="text-center text-muted" style="padding: 100px 0;"><div>${__("No data found for the selected filters")}</div></div>`,
			).appendTo(page.container);
			return;
		}

		// 1. Summary
		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach((metric) => {
			$(`
                <div class="summary-card">
                    <div class="label"><span class="indicator bg-${metric.indicator.toLowerCase()}"></span>${metric.label}</div>
                    <div class="value">${format_currency_short(metric.value, metric.fieldtype)}</div>
                </div>
            `).appendTo(summary_row);
		});

		// 2. Charts
		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		const chart_config = {
			top_10_salesperson: { field: "sales_person", title: "Salesperson" },
			top_10_customers: { field: "customer_name", title: "Customer" },
			top_10_products: { field: "item_code", title: "Product" },
		};

		Object.keys(data.charts).forEach((chart_id) => {
			let chart_obj = data.charts[chart_id];
			if (!chart_obj.data.labels || chart_obj.data.labels.length === 0) return;

			$(`
                <div class="chart-card">
                    <div class="title"><span>${chart_obj.title}</span></div>
                    <div id="wrapper_${chart_id}" style="min-height: 300px;"></div>
                </div>
            `).appendTo(charts_row);

			setTimeout(() => {
				new frappe.Chart(`#wrapper_${chart_id}`, {
					data: chart_obj.data,
					type: "donut",
					height: 300,
					colors: chart_obj.colors,
					tooltipOptions: { formatTooltipY: (d) => format_currency_short(d) },
				});
			}, 100);
		});

		// Tables Content Container
		let tables_container = $('<div class="tables-view"></div>').appendTo(page.container);

		// Pre-calculate stable months across all results for consistent columns
		let all_months_map = {};
		let months = [];
		data.results.forEach((row) => {
			let date = row.so_date;
			let m_key = moment(date).format("MMM YYYY");
			let m_sort = moment(date).format("YYYYMM");
			if (!all_months_map[m_key]) {
				all_months_map[m_key] = m_sort;
				months.push({ key: m_key, sort: m_sort });
			}
		});
		months.sort((a, b) => a.sort - b.sort);

		let tables_html = $(`
            <div class="table-card" style="margin-top: 24px; overflow: visible;">
                <div class="header" style="overflow: visible; position: relative; z-index: 10;">
                    <span>${__("Month-Wise Order Value")}</span>
                    <div class="table-actions">
                        <div class="hybrid-filter-container">
                            <div id="filter_customer_link"></div>
                            <div id="filter_sp_link"></div>
                            <div id="filter_product_link"></div>
                        </div>
                        <span class="export-btn" id="export_month_table">Export</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="min-width: 200px;">Customer</th>
                                <th style="min-width: 150px;">Sales Person</th>
                                <th style="min-width: 200px;">Product</th>
                                ${months.map((m) => `<th class="month-col">${m.key}</th>`).join("")}
                                <th class="total-col">Total</th>
                            </tr>
                        </thead>
                        <tbody id="so_month_body"></tbody>
                    </table>
                </div>
            </div>

            <div class="table-card" style="margin-top: 24px;">
                <div class="header">
                    <span>${__("Sales Orders List")}</span>
                    <div class="table-actions">
                        <span id="so_count" style="font-size: 12px; font-weight: 400;"></span>
                        <span class="export-btn" id="export_list_table">Export</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="min-width: 140px;">Order ID</th>
                                <th style="min-width: 110px;">Date</th>
                                <th style="min-width: 100px;">Status</th>
                                <th style="min-width: 180px;">Customer</th>
                                <th style="min-width: 150px;">Item</th>
                                <th style="min-width: 140px;">Sales Person</th>
                                <th style="min-width: 100px; text-align: right;">Qty</th>
                                <th style="min-width: 160px; text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody id="so_list_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(tables_container);

		const render_filtered_view = (filtered_data) => {
			let tbody_month = tables_container.find("#so_month_body");
			let tbody_list = tables_container.find("#so_list_body");
			tbody_month.empty();
			tbody_list.empty();

			let merged_data = {};
			filtered_data.forEach((row) => {
				let sp = row.sales_person || "-";
				let cust = row.customer_name || "-";
				let prod = row.item_name || row.item_code || "-";
				let amt = flt(row["total_net_amount_(inr)"] || row.po_total);
				let m_key = moment(row.so_date).format("MMM YYYY");
				let key = sp + "|" + cust + "|" + prod;
				if (!merged_data[key]) merged_data[key] = { sp, cust, prod, months: {}, total: 0 };
				merged_data[key].months[m_key] = (merged_data[key].months[m_key] || 0) + amt;
				merged_data[key].total += amt;
			});

			let summary_list = Object.values(merged_data).sort((a, b) => b.total - a.total);
			let total_month_amts = {};
			let summary_grand_total = 0;

			if (summary_list.length === 0) {
				tbody_month.append(`<tr><td colspan="${4 + months.length}" class="text-center text-muted" style="padding: 20px;">No data matching filters</td></tr>`);
			} else {
				summary_list.forEach((row) => {
					summary_grand_total += row.total;
					let cells = months
						.map((m) => {
							let val = row.months[m.key] || 0;
							total_month_amts[m.key] = (total_month_amts[m.key] || 0) + val;
							return `<td class="month-col">${format_currency_short(val)}</td>`;
						})
						.join("");
					tbody_month.append(`
                    <tr>
                        <td>${row.cust}</td>
                        <td>${row.sp}</td>
                        <td>${row.prod}</td>
                        ${cells}
                        <td class="total-col">${format_currency_short(row.total)}</td>
                    </tr>
                `);
				});

				let footer_cells = months
					.map(
						(m) =>
							`<td class="month-col" style="font-weight: 700;">${format_currency_short(total_month_amts[m.key] || 0)}</td>`,
					)
					.join("");
				tbody_month.append(`
                    <tr class="sticky-total">
                        <td colspan="3" style="text-align: right; font-weight: 700;">Grand Total</td>
                        ${footer_cells}
                        <td class="total-col">${format_currency_short(summary_grand_total)}</td>
                    </tr>
                `);
			}

			// 4. Detailed List
			tables_container.find("#so_count").text(`Showing ${filtered_data.length} orders`);
			let total_qty = 0,
				total_amt = 0;

			if (filtered_data.length === 0) {
				tbody_list.append(`<tr><td colspan="8" class="text-center text-muted" style="padding: 20px;">No data matching filters</td></tr>`);
			} else {
				filtered_data.forEach((row) => {
					let status_color = "gray";
					if (["Completed", "Closed"].includes(row.status)) status_color = "green";
					if (["Draft"].includes(row.status)) status_color = "blue";
					if (["To Deliver", "To Bill"].includes(row.status)) status_color = "orange";
					if (["Cancelled"].includes(row.status)) status_color = "red";

					let qty = flt(row.order_quantity || row.po_qty);
					let amt = flt(row["total_net_amount_(inr)"] || row.po_total);
					total_qty += qty;
					total_amt += amt;

					tbody_list.append(`
                    <tr>
                        <td><a href="/app/sales-order/${row.so_no}">${row.so_no}</a></td>
                        <td>${frappe.datetime.str_to_user(row.so_date)}</td>
                        <td><span class="indicator-pill ${status_color}">${row.status}</span></td>
                        <td>${row.customer_name}</td>
                        <td>${row.item_code}</td>
                        <td>${row.sales_person || "-"}</td>
                        <td style="text-align: right;">${frappe.format(qty, { fieldtype: "Float" })}</td>
                        <td style="text-align: right; font-weight: 600;">${format_currency_short(amt)}</td>
                    </tr>
                `);
				});

				tbody_list.append(`
                    <tr class="sticky-total">
                        <td colspan="6" style="text-align: right; font-weight: 700;">Grand Total</td>
                        <td style="text-align: right; font-weight: 700;">${frappe.format(total_qty, { fieldtype: "Float" })}</td>
                        <td style="text-align: right; font-weight: 700; border-left: 1px solid #dee2e6;">${format_currency_short(total_amt)}</td>
                    </tr>
                `);
			}
		};

		// Capture local variables in helpers before they are lost
		tables_container.find("#export_month_table").on("click", () => {
			let html = `<html><head><meta charset="utf-8"></head><body><h3>Month-Wise Order Value</h3><table border="1">`;
			html += tables_container.find("#so_month_body").closest("table").html();
			html += `</table></body></html>`;
			const blob = new Blob([html], { type: "application/vnd.ms-excel" });
			const url = window.URL.createObjectURL(blob);
			const btn = document.createElement("a");
			btn.href = url;
			btn.download = `Month_Wise_Orders_${moment().format("YYYY-MM-DD")}.xls`;
			btn.click();
		});

		tables_container.find("#export_list_table").on("click", () => {
			let html = `<html><head><meta charset="utf-8"></head><body><h3>Sales Orders List</h3><table border="1">`;
			html += tables_container.find("#so_list_body").closest("table").html();
			html += `</table></body></html>`;
			const blob = new Blob([html], { type: "application/vnd.ms-excel" });
			const url = window.URL.createObjectURL(blob);
			const btn = document.createElement("a");
			btn.href = url;
			btn.download = `Sales_Orders_List_${moment().format("YYYY-MM-DD")}.xls`;
			btn.click();
		});

		// Hybrid Filter Logic
		const apply_local_filters = () => {
			const c_val = (f_cust_ctrl.$input ? f_cust_ctrl.$input.val() || "" : "").toLowerCase().trim();
			const s_val = (f_sp_ctrl.$input ? f_sp_ctrl.$input.val() || "" : "").toLowerCase().trim();
			const i_val = (f_item_ctrl.$input ? f_item_ctrl.$input.val() || "" : "").toLowerCase().trim();

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
				let control_input = parent.find('.control-input');
				control_input.css("position", "relative");
				ctrl.$input.css({"padding-right": "24px"});
				
				let clear_btn = $('<span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #adb5bd; font-size: 16px; font-weight: 600; display: none; line-height: 1; user-select: none;">&times;</span>')
					.appendTo(control_input);

				ctrl.$input.on("input change awesomplete-selectcomplete", function() {
					if ($(this).val()) {
						clear_btn.show();
					} else {
						clear_btn.hide();
					}
				});

				clear_btn.on("click", function() {
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

		// Initial table render
		render_filtered_view(data.results);
		init_hybrid_ui();
	}

	function format_currency_short(num, fieldtype) {
		if (!num && num !== 0) return "0.00";
		let suffix = "";
		let value = num;
		if (num >= 10000000) {
			value = num / 10000000;
			suffix = " Cr";
		} else if (num >= 100000) {
			value = num / 100000;
			suffix = " L";
		} else if (num >= 1000) {
			value = num / 1000;
			suffix = " K";
		}
		return (
			value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
			suffix
		);
	}

	// Double Export Menus
	page.add_menu_item(__("Export to PDF"), async () => {
		frappe.show_alert({ message: __("Preparing Order PDF..."), indicator: "blue" });
		const get_png = async (id) => {
			const svg = document.querySelector(`#wrapper_${id} svg`);
			if (!svg) return "";
			return new Promise((res) => {
				const bbox = svg.getBoundingClientRect();
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				const img = new Image();
				img.onload = () => {
					canvas.width = bbox.width * 2;
					canvas.height = bbox.height * 2;
					ctx.fillStyle = "#ffffff";
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
					res(canvas.toDataURL("image/png"));
				};
				img.src =
					"data:image/svg+xml;base64," +
					btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));
			});
		};
		const [p1, p2, p3] = await Promise.all([
			get_png("top_10_salesperson"),
			get_png("top_10_customers"),
			get_png("top_10_products"),
		]);

		const chart_h = (p, t) =>
			`<div style="page-break-inside: avoid; text-align:center; margin-bottom: 20px;"><h4 style="text-transform:uppercase;">${t}</h4><img src="${p}" style="width:850px; height:auto;"></div>`;
			
		const chart_t = (chart_key, title) => {
			if (!page.dashboard_data || !page.dashboard_data.charts[chart_key]) return "";
			let c_data = page.dashboard_data.charts[chart_key].data;
			if (!c_data.labels || !c_data.labels.length) return "";
			let total_val = c_data.datasets[0].values.reduce((a, b) => a + b, 0);
			let html = `<div style="page-break-inside: avoid; margin-bottom: 40px;"><h4 style="margin-bottom: 10px; color: #333;">${title} Data</h4><table><thead><tr><th style="text-align:left">${title.replace("Top 10 ", "").replace(" by Order Value", "")}</th><th style="text-align:right; width: 120px;">Amount</th><th style="text-align:right; width: 80px;">Share %</th></tr></thead><tbody>`;
			c_data.labels.forEach((label, idx) => {
				let val = c_data.datasets[0].values[idx];
				let share = total_val > 0 ? ((val / total_val) * 100).toFixed(2) + '%' : '0%';
				html += `<tr><td>${label}</td><td style="text-align:right">${format_currency_short(val)}</td><td style="text-align:right">${share}</td></tr>`;
			});
			html += `</tbody></table></div>`;
			return html;
		};

		let html = `<html><head><style>
			body { font-family: sans-serif; padding: 20px; }
			.header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
			table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
			th, td { border: 1px solid #ddd; padding: 6px 8px; }
			th { background: #f8f9fa; font-weight: bold; }
			h3 { margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
		</style></head><body>
			<div class="header"><h1>Sales Order Booking Dashboard</h1></div>
			${chart_h(p1, "Salesperson Order Value")}
			${chart_t("top_10_salesperson", "Top 10 Salesperson by Order Value")}
			
			${chart_h(p2, "Customer Order Value")}
			${chart_t("top_10_customers", "Top 10 Customers by Order Value")}
			
			${chart_h(p3, "Product Order Value")}
			${chart_t("top_10_products", "Top 10 Products by Order Value")}
			
			<h3>Month-Wise Order Value</h3>
			<table>${page.container.find("#so_month_body").closest("table").html()}</table>
			
			<h3>Sales Order Details</h3>
			<table>${page.container.find("#so_list_body").closest("table").html()}</table>
		</body></html>`;

		const method =
			"renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard.export_to_pdf";
		$(
			`<form action="/api/method/${method}" method="POST" target="_blank"><input type="hidden" name="html" value=""><input type="hidden" name="csrf_token" value="${frappe.csrf_token}"></form>`,
		)
			.appendTo("body")
			.find('input[name="html"]')
			.val(html)
			.closest("form")
			.submit()
			.remove();
	});

	page.add_menu_item(__("Export to Excel"), () => {
		frappe.call({
			method: "renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard.export_to_excel",
			args: { filters: page.filter_group.get_values() },
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
	});

	setTimeout(() => page.refresh(), 100);
};
