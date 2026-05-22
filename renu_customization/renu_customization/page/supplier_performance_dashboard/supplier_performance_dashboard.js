frappe.pages["supplier_performance_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Supplier Performance Dashboard"),
		single_column: true,
	});

	window.cur_page = page;
	page.set_primary_action(__("Refresh"), () => page.refresh());

    page.add_menu_item(__("Export to Excel"), () => export_data_excel("all"));
    page.add_menu_item(__("Export to PDF"), () => export_pdf_full());

	let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);

	let refresh_timer = null;
	page.refresh = function () {
		if (refresh_timer) clearTimeout(refresh_timer);
		refresh_timer = setTimeout(() => {
			perform_refresh();
		}, 100);
	};

	function perform_refresh() {
		let filters = page.filter_group.get_values();
		
		// Show loading indicator
		if (page.container.is(":empty") || page.container.find(".summary-wrapper").length === 0) {
			page.container.html(
				'<div class="text-center" style="padding: 100px 0;"><i class="fa fa-refresh fa-spin fa-2x text-muted"></i><div class="mt-2 text-muted">Loading Supplier Performance Data...</div></div>'
			);
		} else {
			page.container.css("opacity", "0.6");
		}

		frappe.call({
			method: "renu_customization.renu_customization.page.supplier_performance_dashboard.supplier_performance_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				page.container.css("opacity", "1");
				if (r.message) {
					page.dashboard_data = r.message;
					render_dashboard(r.message);
				}
			},
			error(r) {
				page.container.css("opacity", "1");
				page.container.html(
					`<div class="text-center text-muted" style="padding: 100px 0;">${__(
						"Failed to load dashboard data"
					)}</div>`
				);
				frappe.msgprint(r.message || __("Failed to load dashboard data"));
			},
		});
	}

	const filter_fields = [
		{ fieldname: "fiscal_year", label: __("Fiscal Year"), fieldtype: "Link", options: "Fiscal Year", placeholder: __("Select Year") },
		{ fieldname: "from_date", label: __("From Date"), fieldtype: "Date" },
		{ fieldname: "to_date", label: __("To Date"), fieldtype: "Date" },
		{ fieldname: "company", label: __("Company"), fieldtype: "Link", options: "Company", default: frappe.defaults.get_user_default("Company") },
		{ fieldname: "supplier_group", label: __("Supplier Group"), fieldtype: "Link", options: "Supplier Group", placeholder: __("Select Supplier Group") },
		{ fieldname: "supplier", label: __("Supplier"), fieldtype: "Link", options: "Supplier", placeholder: __("Select Supplier") },
		{ fieldname: "purchase_order", label: __("PO Details"), fieldtype: "Link", options: "Purchase Order", placeholder: __("Select PO") },
	];

	$("<style>")
		.text(`
		.dashboard-filter-area { padding: 15px 20px 5px 20px !important; background-color: var(--bg-color) !important; border-bottom: 1px solid var(--border-color) !important; }
		.dashboard-filter-area .form-column form { display: flex !important; flex-wrap: wrap !important; gap: 15px !important; align-items: flex-end !important; }
		.dashboard-filter-area .frappe-control { margin-bottom: 10px !important; width: calc(25% - 12px) !important; }
		.dashboard-filter-area .control-label { font-size: 12px !important; font-weight: 600 !important; color: var(--text-muted) !important; margin-bottom: 6px !important; display: block !important; }
	`).appendTo(filter_parent);

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_parent,
		fields: filter_fields,
		on_change: () => page.refresh()
	});
	page.filter_group.make();

	page.filter_group.fields_dict.supplier.get_query = function() {
		let supplier_group = page.filter_group.get_value("supplier_group");
		if (supplier_group) {
			return {
				filters: {
					"supplier_group": supplier_group
				}
			};
		}
	};

	page.filter_group.fields_dict.purchase_order.get_query = function() {
		return {
			filters: {
				docstatus: 1,
				status: ["not in", ["Cancelled", "Draft"]]
			}
		};
	};

    Object.keys(page.filter_group.fields_dict).forEach(key => {
        let f = page.filter_group.fields_dict[key];
        if (f.$input) f.$input.on("change input blur", () => page.refresh());
    });

	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .dashboard-content { padding: 20px; background: var(--bg-color); min-height: 100vh; font-family: 'Inter', sans-serif; color: var(--text-color); width: 100% !important; }
        .summary-wrapper { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 16px; margin-bottom: 24px; }
        .summary-card { background: var(--card-bg) !important; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; border-left: 5px solid #cbd5e1; }
        .summary-card.blue { border-left-color: #3b82f6; }
        .summary-card.green { border-left-color: #10b981; }
        .summary-card.red { border-left-color: #ef4444; }
        .summary-card.orange { border-left-color: #f59e0b; }
        .summary-card .label { font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
        .summary-card .value { font-size: 20px; font-weight: 800; color: var(--text-color); }
        .charts-row { display: grid !important; grid-template-columns: 1fr !important; gap: 24px; margin-bottom: 24px; width: 100%; }
        .chart-card { background: var(--card-bg) !important; border-radius: 12px; padding: 24px; border: 1px solid var(--border-color); width: 100%; }
        .chart-card .title { font-size: 15px; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; color: var(--text-color); text-align: center; }
        .table-card { background: var(--card-bg) !important; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 24px; overflow: hidden; }
        .table-card .header { padding: 15px 24px; border-bottom: 1px solid var(--border-color); font-weight: 700; display: flex; justify-content: space-between; align-items: center; color: var(--text-color); }
        .export-btn { padding: 4px 12px; font-size: 11px; font-weight: 600; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; transition: all 0.2s; color: var(--text-color); }
        .export-btn:hover { background: var(--border-color); }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
        .dashboard-table.orders-table {
            --ot-sno: 52px;
            --ot-id: 172px;
            --ot-party: 228px;
            --ot-item-code: 142px;
            --ot-item-name: 228px;
            --ot-date: 112px;
            --ot-date-actual: 172px;
            --ot-days: 92px;
            --ot-status: 212px;
            --ot-pct: 80px;
            --ot-qty: 98px;
            --ot-amt: 138px;
            table-layout: fixed;
            min-width: 100%;
        }
        .dashboard-table.orders-table.due-table { width: 1997px; }
        .dashboard-table.orders-table.detailed-table { width: 1716px; }
        .dashboard-table th { background: var(--bg-color); padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 10; height: 42px; box-sizing: border-box; }
        .dashboard-table.orders-table th { text-transform: none; font-size: 12px; letter-spacing: 0; white-space: nowrap; }
        .dashboard-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-size: 13px; color: var(--text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; height: 48px; box-sizing: border-box; line-height: 22px; vertical-align: middle; }
        .month-table {
            --mt-sno: 60px;
            --mt-party: 250px;
            --mt-amt: 120px;
            table-layout: fixed;
            min-width: 100%;
        }
        .month-table .col-sno { width: var(--mt-sno); min-width: var(--mt-sno); max-width: var(--mt-sno); text-align: center; position: sticky; left: 0; background: var(--card-bg) !important; z-index: 5; border-right: 1px solid var(--border-color); }
        .month-table .col-supplier { width: var(--mt-party); min-width: var(--mt-party); max-width: var(--mt-party); position: sticky; left: var(--mt-sno); background: var(--card-bg) !important; z-index: 5; border-right: 2px solid var(--border-color); box-shadow: 2px 0 5px rgba(0,0,0,0.06); }
        .month-table th.col-sno { left: 0; z-index: 25 !important; }
        .month-table th.col-supplier { left: var(--mt-sno); z-index: 25 !important; }
        .month-table .col-amt { width: var(--mt-amt); min-width: var(--mt-amt); max-width: var(--mt-amt); text-align: right !important; }
        .month-table th.col-amt { text-align: right !important; }
        .month-table tfoot { position: sticky; bottom: 0; z-index: 10; border-top: 2px solid var(--border-color); }
        .month-table tfoot td { background: var(--bg-color) !important; font-weight: 800; height: 46px; box-sizing: border-box; }
        .month-table tfoot td.col-sno { position: sticky; left: 0; bottom: 0; z-index: 13; }
        .month-table tfoot td.col-supplier { position: sticky; left: var(--mt-sno); bottom: 0; z-index: 13; border-right: 2px solid var(--border-color); box-shadow: 2px 0 5px rgba(0,0,0,0.06); text-align: right; white-space: nowrap; }
        .orders-table .col-sno { width: var(--ot-sno); min-width: var(--ot-sno); max-width: var(--ot-sno); text-align: center; position: sticky; left: 0; background: var(--card-bg) !important; z-index: 5; border-right: 1px solid var(--border-color); }
        .orders-table .col-id { width: var(--ot-id); min-width: var(--ot-id); max-width: var(--ot-id); font-weight: 600; position: sticky; left: var(--ot-sno); background: var(--card-bg) !important; z-index: 5; }
        .orders-table .col-supplier { width: var(--ot-party); min-width: var(--ot-party); max-width: var(--ot-party); position: sticky; left: calc(var(--ot-sno) + var(--ot-id)); background: var(--card-bg) !important; z-index: 5; border-right: 2px solid var(--border-color); box-shadow: 2px 0 5px rgba(0,0,0,0.06); }
        .orders-table th.col-sno { left: 0; z-index: 25 !important; }
        .orders-table th.col-id { left: var(--ot-sno); z-index: 25 !important; }
        .orders-table th.col-supplier { left: calc(var(--ot-sno) + var(--ot-id)); z-index: 25 !important; }
        .orders-table .col-item-code { width: var(--ot-item-code); min-width: var(--ot-item-code); max-width: var(--ot-item-code); }
        .orders-table .col-item-name { width: var(--ot-item-name); min-width: var(--ot-item-name); max-width: var(--ot-item-name); }
        .orders-table .col-date { width: var(--ot-date); min-width: var(--ot-date); max-width: var(--ot-date); }
        .orders-table .col-date-actual { width: var(--ot-date-actual); min-width: var(--ot-date-actual); max-width: var(--ot-date-actual); }
        .orders-table .col-days { width: var(--ot-days); min-width: var(--ot-days); max-width: var(--ot-days); }
        .orders-table .col-status { width: var(--ot-status); min-width: var(--ot-status); max-width: var(--ot-status); }
        .orders-table .col-pct { width: var(--ot-pct); min-width: var(--ot-pct); max-width: var(--ot-pct); }
        .orders-table .col-qty { width: var(--ot-qty); min-width: var(--ot-qty); max-width: var(--ot-qty); }
        .orders-table .col-amt { width: var(--ot-amt); min-width: var(--ot-amt); max-width: var(--ot-amt); }
        .col-sno { width: 52px; min-width: 52px; max-width: 52px; text-align: center; }
        .col-id { width: 172px; min-width: 172px; max-width: 172px; font-weight: 600; }
        .col-supplier { width: 228px; min-width: 228px; max-width: 228px; }
        .col-item-code { width: 142px; min-width: 142px; max-width: 142px; }
        .col-item-name { width: 228px; min-width: 228px; max-width: 228px; }
        .col-date { width: 112px; min-width: 112px; max-width: 112px; }
        .col-date-actual { width: 172px; min-width: 172px; max-width: 172px; }
        .dashboard-table.orders-table td.col-date-actual { white-space: normal; line-height: 1.35; overflow: visible; text-overflow: clip; }
        .col-days { width: 92px; min-width: 92px; max-width: 92px; text-align: center !important; }
        .col-status { width: 212px; min-width: 212px; max-width: 212px; }
        .col-pct { width: 80px; min-width: 80px; max-width: 80px; text-align: center !important; }
        .col-qty { width: 98px; min-width: 98px; max-width: 98px; text-align: right !important; }
        .col-amt { width: 138px; min-width: 138px; max-width: 138px; text-align: right !important; }
        th.col-qty, th.col-amt { text-align: right !important; }
        .dashboard-table.orders-table .col-status { overflow: visible; text-overflow: clip; }
        .dashboard-table.orders-table .col-status .indicator-pill { max-width: none; white-space: nowrap; overflow: visible; display: inline-block; vertical-align: middle; }
        .dashboard-table.orders-table td.col-amt,
        .dashboard-table.orders-table th.col-amt { overflow: visible; text-overflow: clip; white-space: nowrap; }
        .dashboard-table.orders-table tfoot td { overflow: visible; text-overflow: clip; }
        th.col-days, th.col-pct { text-align: center !important; }
        .dashboard-table tfoot { position: sticky; bottom: 0; z-index: 10; border-top: 2px solid var(--border-color); }
        .dashboard-table tfoot td { padding: 12px 16px; font-weight: 800; font-size: 14px; color: var(--text-color); height: 46px; box-sizing: border-box; background: var(--bg-color) !important; }
        .orders-table tfoot td.col-sno { position: sticky; left: 0; bottom: 0; z-index: 13; }
        .orders-table tfoot td.col-id { position: sticky; left: var(--ot-sno); bottom: 0; z-index: 13; }
        .orders-table tfoot td.col-supplier { position: sticky; left: calc(var(--ot-sno) + var(--ot-id)); bottom: 0; z-index: 13; border-right: 2px solid var(--border-color); box-shadow: 2px 0 5px rgba(0,0,0,0.06); }
        .orders-table tfoot td.tfoot-label { text-align: right; white-space: nowrap; overflow: visible; text-overflow: clip; padding-right: 16px; }
        .orders-table tfoot td.col-amt { text-align: right; z-index: 11; font-size: 14px; white-space: nowrap; }
        .dashboard-table-scroll { overflow: auto; max-height: calc(42px + (48px * 20) + 46px); width: 100%; -webkit-overflow-scrolling: touch; }
        .delivery-actual { color: #166534; font-weight: 700; }
        .chart-body { display: flex; flex-direction: column; width: 100%; }
        .chart-wrapper { width: 100%; min-height: 300px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 8px 0; }
        .chart-wrapper .dashboard-chart-img { width: 280px; height: 280px; max-width: 100%; display: block; margin: 0 auto; object-fit: contain; }
        .chart-card .custom-legend { display: grid !important; }
        
        /* Status Badges */
        .indicator-pill { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .indicator-pill.completed { background: #dcfce7; color: #166534; }
        .indicator-pill.closed { background: #f1f5f9; color: #475569; }
        .indicator-pill.on-hold { background: #fef3c7; color: #92400e; }
        .indicator-pill.to-receive-and-bill { background: #dbeafe; color: #1e40af; }
        .indicator-pill.to-receive { background: #e0f2fe; color: #0369a1; }
        .indicator-pill.to-bill { background: #fae8ff; color: #86198f; }
        .indicator-pill.cancelled { background: #fee2e2; color: #991b1b; }
        
        /* Percent Badge colors */
        .pct-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
        .pct-badge.full { background: #10b981; color: white; }
        .pct-badge.partial { background: #f59e0b; color: white; }
        .pct-badge.none { background: #f1f5f9; color: #64748b; }
        
        /* Grid Legends */
        .custom-legend { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid var(--border-color); }
        [data-theme="dark"] .custom-legend { background: var(--control-bg); }
        .legend-item { display: flex; align-items: flex-start; gap: 8px; }
        .legend-item .dot { width: 10px; height: 10px; border-radius: 3px; margin-top: 4px; flex-shrink: 0; }
        .legend-info { display: flex; flex-direction: column; gap: 2px; }
        .legend-label { font-size: 12px; font-weight: 700; color: var(--text-color); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
        .legend-value { font-size: 11px; color: var(--text-muted); font-weight: 500; }
        .graph-legend, .chart-legend { display: none !important; }
    </style>`).appendTo(page.main);

	const is_delivery_completed = (row) => {
		const qty = flt(row.qty);
		const received = flt(row.received_qty);
		return (qty > 0 && received >= qty) || flt(row.per_delivered) >= 100
			|| ["Completed", "Closed"].includes(row.status);
	};

	const format_expected_cell = (row) => {
		return row.schedule_date ? frappe.datetime.str_to_user(row.schedule_date) : "-";
	};

	const get_actual_delivery_dates = (row) => {
		let dates = row.actual_delivery_dates;
		if (typeof dates === "string") {
			dates = dates.split(",").map((d) => d.trim()).filter(Boolean);
		}
		if (!dates || !dates.length) {
			if (row.actual_delivery_time) {
				return [row.actual_delivery_time];
			}
			return [];
		}
		return dates;
	};

	const format_actual_dates_display = (row) => {
		const dates = get_actual_delivery_dates(row);
		if (!dates.length) {
			return "-";
		}
		return dates.map((d) => frappe.datetime.str_to_user(d)).join(", ");
	};

	const format_actual_cell = (row) => {
		const display = format_actual_dates_display(row);
		if (display === "-") {
			return "-";
		}
		return `<span class="delivery-actual">${display}</span>`;
	};

	const format_actual_text = (row) => format_actual_dates_display(row);

	const get_actual_sort_date = (row) => {
		const dates = get_actual_delivery_dates(row);
		if (!dates.length) {
			return new Date(0);
		}
		return new Date(dates[dates.length - 1]);
	};

	const ORDER_COL = {
		sno: __("S.No."),
		po_no: __("PO No"),
		supplier: __("Supplier"),
		item_code: __("Item Code"),
		item_name: __("Item Name"),
		po_date: __("PO Date"),
		expected_delivery: __("Expected Delivery"),
		actual_delivery: __("Actual Delivery"),
		days_left: __("Days Left"),
		status: __("Status"),
		pct_received: __("% Received"),
		pct_billed: __("% Billed"),
		order_qty: __("Order Qty"),
		received_qty: __("Received Qty"),
		pending_qty: __("Pending Qty"),
		amount: __("Amount"),
		net_total: __("Net Total"),
	};

	const format_qty = (val) => {
		const n = flt(val);
		return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
	};

	const ORDERS_COLGROUP_16 = `
		<colgroup>
			<col style="width:52px"><col style="width:172px"><col style="width:228px">
			<col style="width:142px"><col style="width:228px">
			<col style="width:112px"><col style="width:112px"><col style="width:172px">
			<col style="width:92px"><col style="width:212px">
			<col style="width:80px"><col style="width:80px">
			<col style="width:98px"><col style="width:98px"><col style="width:98px">
			<col style="width:138px">
		</colgroup>`;

	const ORDERS_COLGROUP_12 = `
		<colgroup>
			<col style="width:52px"><col style="width:172px"><col style="width:228px">
			<col style="width:142px"><col style="width:228px">
			<col style="width:112px"><col style="width:112px"><col style="width:172px">
			<col style="width:212px"><col style="width:80px"><col style="width:80px">
			<col style="width:138px">
		</colgroup>`;

	const build_orders_footer_16 = (label, amount_cell_id) => `
		<tfoot>
			<tr>
				<td class="col-sno"></td>
				<td class="col-id"></td>
				<td class="col-supplier tfoot-label">${label}</td>
				<td class="col-item-code"></td>
				<td class="col-item-name"></td>
				<td class="col-date"></td>
				<td class="col-date"></td>
				<td class="col-date-actual"></td>
				<td class="col-days"></td>
				<td class="col-status"></td>
				<td class="col-pct"></td>
				<td class="col-pct"></td>
				<td class="col-qty"></td>
				<td class="col-qty"></td>
				<td class="col-qty"></td>
				<td class="col-amt" id="${amount_cell_id}">₹ 0.00 M</td>
			</tr>
		</tfoot>`;

	const build_orders_footer_12 = (label, amount_cell_id) => `
		<tfoot>
			<tr>
				<td class="col-sno"></td>
				<td class="col-id"></td>
				<td class="col-supplier tfoot-label">${label}</td>
				<td class="col-item-code"></td>
				<td class="col-item-name"></td>
				<td class="col-date"></td>
				<td class="col-date"></td>
				<td class="col-date-actual"></td>
				<td class="col-status"></td>
				<td class="col-pct"></td>
				<td class="col-pct"></td>
				<td class="col-amt" id="${amount_cell_id}">₹ 0.00 M</td>
			</tr>
		</tfoot>`;

	const download_base64_file = (fileinfo, mime_type) => {
		if (!fileinfo || !fileinfo.filecontent) {
			frappe.msgprint(__("Export failed. No file was returned."));
			return;
		}
		const byteCharacters = atob(fileinfo.filecontent);
		const byteNumbers = new Array(byteCharacters.length);
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i);
		}
		const blob = new Blob([new Uint8Array(byteNumbers)], { type: mime_type });
		const link = document.createElement("a");
		link.href = window.URL.createObjectURL(blob);
		link.download = fileinfo.filename;
		link.click();
		window.URL.revokeObjectURL(link.href);
	};

	const build_donut_chart_png = (chart_obj, size = 320) => {
		const values = (chart_obj?.data?.datasets || [{}])[0]?.values || [];
		const colors = chart_obj?.colors || ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#06b6d4"];
		const total = values.reduce((a, b) => a + flt(b), 0);
		if (!total) {
			return null;
		}
		const canvas = document.createElement("canvas");
		const px = size * 2;
		canvas.width = px;
		canvas.height = px;
		const ctx = canvas.getContext("2d");
		const cx = px / 2;
		const cy = px / 2;
		const outer = px * 0.38;
		const inner = px * 0.24;
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, px, px);
		let start = -Math.PI / 2;
		values.forEach((val, i) => {
			const slice = (flt(val) / total) * Math.PI * 2;
			ctx.beginPath();
			ctx.arc(cx, cy, outer, start, start + slice);
			ctx.arc(cx, cy, inner, start + slice, start, true);
			ctx.closePath();
			ctx.fillStyle = colors[i % colors.length];
			ctx.fill();
			start += slice;
		});
		return canvas.toDataURL("image/png");
	};

	const render_chart_legend = ($legend, chart_obj) => {
		$legend.empty();
		const labels = chart_obj.data?.labels || [];
		const values = (chart_obj.data?.datasets || [{}])[0]?.values || [];
		const colors = chart_obj.colors || [];
		const total = values.reduce((a, b) => a + flt(b), 0);
		labels.forEach((label, i) => {
			const val = flt(values[i]);
			const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
			const color = colors[i % colors.length];
			const display_val = chart_obj.is_currency
				? "₹ " + (val / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " M"
				: val;
			$legend.append(`
				<div class="legend-item">
					<div class="dot" style="background: ${color}"></div>
					<div class="legend-info">
						<div class="legend-label">${label}</div>
						<div class="legend-value">${display_val} (${pct}%)</div>
					</div>
				</div>
			`);
		});
	};

	const render_donut_chart = (chart_id, chart_obj, $wrapper, $legend) => {
		const dataUrl = build_donut_chart_png(chart_obj, 280);
		$wrapper.empty();
		if (dataUrl) {
			$('<img>', { src: dataUrl, class: "dashboard-chart-img", alt: chart_obj.title || chart_id }).appendTo($wrapper);
		} else {
			$wrapper.append(`<p class="text-muted text-center">${__("No chart data")}</p>`);
		}
		page.chart_instances[chart_id] = { dataUrl, chart_obj };
		render_chart_legend($legend, chart_obj);
	};

	const capture_charts_for_pdf = async (charts) => {
		const images = {};
		for (const chart_id of Object.keys(charts || {})) {
			images[chart_id] = build_donut_chart_png(charts[chart_id], 420);
		}
		return images;
	};

	const build_pdf_chart_legend_html = (c_obj) => {
		const labels = c_obj.data.labels || [];
		const values = c_obj.data.datasets[0].values || [];
		const colors = c_obj.colors || [];
		const total = values.reduce((a, b) => a + flt(b), 0);
		let legend_html = '<div class="pdf-legend">';
		for (let i = 0; i < labels.length; i += 4) {
			legend_html += '<div class="pdf-legend-row">';
			for (let j = 0; j < 4; j++) {
				if (labels[i + j]) {
					const val = values[i + j];
					const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
					const display_val = c_obj.is_currency
						? "₹ " + (val / 1000000).toFixed(2) + " M"
						: val;
					legend_html += `
						<div class="pdf-legend-item">
							<span class="legend-dot" style="background:${colors[(i + j) % colors.length]}"></span>
							<span class="legend-text">
								<span class="legend-name">${labels[i + j]}</span>
								<span class="legend-val">${display_val} (${pct}%)</span>
							</span>
						</div>`;
				}
			}
			legend_html += "</div>";
		}
		legend_html += "</div>";
		return legend_html;
	};

	const build_pdf_charts_section_html = (charts, chart_images) => {
		return Object.keys(charts || {})
			.map((cid) => {
				const c_obj = charts[cid];
				const title = c_obj.title || cid.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
				const img_src = chart_images[cid];
				return `
					<div class="chart-row">
						<div class="chart-title">${title}</div>
						<div class="chart-img-wrap">
							${img_src
								? `<img src="${img_src}" class="chart-img" alt="${title}">`
								: "<p class=\"chart-missing\">Chart unavailable</p>"}
						</div>
						${build_pdf_chart_legend_html(c_obj)}
					</div>`;
			})
			.join("");
	};

	const export_data_excel = (export_type = "all") => {
		frappe.show_alert({ message: __("Preparing Excel export..."), indicator: "blue" });
		frappe.call({
			method: "renu_customization.renu_customization.page.supplier_performance_dashboard.supplier_performance_dashboard.export_to_excel",
			args: {
				filters: page.filter_group.get_values(),
				export_type: export_type,
			},
			callback(r) {
				if (r.message) {
					download_base64_file(
						r.message,
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					);
					frappe.show_alert({ message: __("Excel downloaded"), indicator: "green" });
				}
			},
			error(r) {
				frappe.msgprint(r.message || __("Excel export failed"));
			},
		});
	};

	const PDF_COL_WIDTHS = {
		"col-sno": "3%",
		"col-id": "8%",
		"col-supplier": "11%",
		"col-item-code": "8%",
		"col-item-name": "13%",
		"col-date": "6%",
		"col-date-actual": "8%",
		"col-days": "5%",
		"col-status": "9%",
		"col-pct": "4%",
		"col-qty": "4%",
		"col-amt": "7%",
	};

	const clone_table_html_for_pdf = ($table) => {
		if (!$table || !$table.length) {
			return "";
		}
		const $clone = $table.clone();
		$clone.addClass("export-pdf-table");
		$clone.removeAttr("style").css({ width: "100%" });
		$clone.find("a").each(function () {
			const text = $(this).text();
			$(this).replaceWith(document.createTextNode(text));
		});
		$clone.find("i.fa").remove();
		$clone.find(".indicator-pill, .pct-badge, .delivery-actual").each(function () {
			$(this).replaceWith($(this).text());
		});

		const $colgroup = $("<colgroup></colgroup>");
		$clone.find("thead tr").first().find("th").each(function () {
			const col_class = [...this.classList].find((c) => c.startsWith("col-")) || "col-date";
			const width = PDF_COL_WIDTHS[col_class] || "5%";
			$colgroup.append(`<col style="width:${width}">`);
		});
		$clone.find("colgroup").remove();
		if ($colgroup.children().length) {
			$clone.prepend($colgroup);
		}

		// wkhtmltopdf often drops <tfoot> on long tables — append footer rows to tbody
		const $tbody = $clone.find("tbody");
		$clone.find("tfoot tr").each(function () {
			const $row = $(this).clone().addClass("pdf-total-row");
			$row.find("td, th").css({ "font-weight": "800", "background": "#e2e8f0" });
			$tbody.append($row);
		});
		$clone.find("tfoot").remove();

		return $clone[0].outerHTML;
	};

	function render_dashboard(data) {
		page.container.empty();
		if (!data.results || data.results.length === 0) {
			$(`<div class="text-center text-muted" style="padding: 100px 0;">${__("No data found")}</div>`).appendTo(page.container);
			return;
		}

		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach((m) => {
			let indicator = (m.indicator || "blue").toLowerCase();
			let val = m.fieldtype === "Currency" 
                ? "₹ " + (flt(m.value) / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " M"
                : m.value;
			$(`
                <div class="summary-card ${indicator}">
                    <div class="label">${m.label}</div>
                    <div class="value">${val}</div>
                </div>
            `).appendTo(summary_row);
		});

		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
        page.chart_instances = {};
		Object.keys(data.charts || {}).forEach((chart_id) => {
			let chart_obj = data.charts[chart_id];
            let title = chart_obj.title || chart_id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
			$(`
				<div class="chart-card">
					<div class="title">${title}</div>
					<div class="chart-body">
						<div id="wrapper_${chart_id}" class="chart-wrapper"></div>
						<div class="custom-legend" id="legend_${chart_id}"></div>
					</div>
				</div>
			`).appendTo(charts_row);

			const $wrapper = $(`#wrapper_${chart_id}`);
			const $legend = $(`#legend_${chart_id}`);
			render_donut_chart(chart_id, chart_obj, $wrapper, $legend);
		});

		// 1. Month-Wise Booking Breakdown
		let months = data.months || [];
		const month_table_width = 60 + 250 + months.length * 120 + 120;
		const month_colgroup = `
			<colgroup>
				<col style="width:60px"><col style="width:250px">
				${months.map(() => '<col style="width:120px">').join("")}
				<col style="width:120px">
			</colgroup>`;
		let month_table_card = $(`
            <div class="table-card">
                <div class="header">
					<span>${__("Month-Wise Booking Breakdown")}</span>
					<div class="export-options">
						<button class="export-btn" id="export_month_excel_btn">
							<i class="fa fa-file-excel-o"></i> ${__("Excel")}
						</button>
					</div>
				</div>
                <div class="dashboard-table-scroll" style="max-height: 500px;">
                    <table class="dashboard-table month-table" id="month_wise_table" style="width:${month_table_width}px;">
                        ${month_colgroup}
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-supplier sortable-header" data-table="month" data-field="supplier" style="cursor: pointer; user-select: none;">Supplier <i class="fa fa-sort text-muted ml-1"></i></th>
                                ${months.map(m => `<th class="col-amt sortable-header" data-table="month" data-field="${m.key}" style="cursor: pointer; user-select: none;">${m.key} <i class="fa fa-sort text-muted ml-1"></i></th>`).join("")}
                                <th class="col-amt sortable-header" data-table="month" data-field="total" style="font-weight: 800; cursor: pointer; user-select: none;">Total (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="month_wise_body"></tbody>
                        <tfoot>
                            <tr>
                                <td class="col-sno"></td>
                                <td class="col-supplier">${__("GRAND TOTAL")}</td>
                                ${months.map(m => `<td class="col-amt" id="total_${m.sort}">0.00 M</td>`).join("")}
                                <td class="col-amt" id="grand_total_all">0.00 M</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let month_tbody = month_table_card.find("#month_wise_body");
		
		// 2. ORDERS DUE IN NEXT 15 DAYS Table
		let due_table_card = $(`
            <div class="table-card" style="margin-top: 24px;">
                <div class="header">
					<span>${__("Orders Due in Next 15 Days")}</span>
					<div class="export-options">
						<button class="export-btn" id="export_due_excel_btn">
							<i class="fa fa-file-excel-o"></i> ${__("Excel")}
						</button>
					</div>
				</div>
                <div class="dashboard-table-scroll">
                    <table class="dashboard-table orders-table due-table" id="due_15_days_table">
                        ${ORDERS_COLGROUP_16}
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-id sortable-header" data-table="due" data-field="name" style="cursor: pointer; user-select: none;">${ORDER_COL.po_no} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-supplier sortable-header" data-table="due" data-field="supplier" style="cursor: pointer; user-select: none;">${ORDER_COL.supplier} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-item-code sortable-header" data-table="due" data-field="item_code" style="cursor: pointer; user-select: none;">${ORDER_COL.item_code} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-item-name sortable-header" data-table="due" data-field="item_name" style="cursor: pointer; user-select: none;">${ORDER_COL.item_name} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date sortable-header" data-table="due" data-field="transaction_date" style="cursor: pointer; user-select: none;">${ORDER_COL.po_date} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date sortable-header" data-table="due" data-field="schedule_date" style="cursor: pointer; user-select: none;">${ORDER_COL.expected_delivery} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date-actual sortable-header" data-table="due" data-field="actual_delivery_time" style="cursor: pointer; user-select: none;">${ORDER_COL.actual_delivery} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-days sortable-header" data-table="due" data-field="due_days" style="cursor: pointer; user-select: none;">${ORDER_COL.days_left} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-status sortable-header" data-table="due" data-field="status" style="cursor: pointer; user-select: none;">${ORDER_COL.status} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-pct sortable-header" data-table="due" data-field="per_delivered" style="cursor: pointer; user-select: none;">${ORDER_COL.pct_received} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-pct sortable-header" data-table="due" data-field="per_billed" style="cursor: pointer; user-select: none;">${ORDER_COL.pct_billed} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-qty sortable-header" data-table="due" data-field="qty" style="cursor: pointer; user-select: none;">${ORDER_COL.order_qty} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-qty sortable-header" data-table="due" data-field="received_qty" style="cursor: pointer; user-select: none;">${ORDER_COL.received_qty} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-qty sortable-header" data-table="due" data-field="pending_qty" style="cursor: pointer; user-select: none;">${ORDER_COL.pending_qty} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-table="due" data-field="net_total" style="cursor: pointer; user-select: none;">${ORDER_COL.amount} <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="due_body"></tbody>
                        ${build_orders_footer_16(__("TOTAL DUE VALUE"), "total_due_value")}
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let due_tbody = due_table_card.find("#due_body");
		
		// 3. Detailed Supplier Orders List Table
		let table_card = $(`
            <div class="table-card" style="margin-top: 24px;">
                <div class="header">
					<span>${__("Detailed Supplier Orders List")}</span>
					<div class="export-options">
						<button class="export-btn" id="export_excel_btn">
							<i class="fa fa-file-excel-o"></i> ${__("Excel")}
						</button>
						<button class="export-btn" id="export_pdf_btn">
							<i class="fa fa-file-pdf-o"></i> ${__("PDF")}
						</button>
					</div>
				</div>
                <div class="dashboard-table-scroll">
                    <table class="dashboard-table orders-table detailed-table" id="detailed_orders_table">
                        ${ORDERS_COLGROUP_12}
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-id sortable-header" data-table="detailed" data-field="name" style="cursor: pointer; user-select: none;">${ORDER_COL.po_no} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-supplier sortable-header" data-table="detailed" data-field="supplier" style="cursor: pointer; user-select: none;">${ORDER_COL.supplier} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-item-code sortable-header" data-table="detailed" data-field="item_code" style="cursor: pointer; user-select: none;">${ORDER_COL.item_code} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-item-name sortable-header" data-table="detailed" data-field="item_name" style="cursor: pointer; user-select: none;">${ORDER_COL.item_name} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date sortable-header" data-table="detailed" data-field="transaction_date" style="cursor: pointer; user-select: none;">${ORDER_COL.po_date} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date sortable-header" data-table="detailed" data-field="schedule_date" style="cursor: pointer; user-select: none;">${ORDER_COL.expected_delivery} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date-actual sortable-header" data-table="detailed" data-field="actual_delivery_time" style="cursor: pointer; user-select: none;">${ORDER_COL.actual_delivery} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-status sortable-header" data-table="detailed" data-field="status" style="cursor: pointer; user-select: none;">${ORDER_COL.status} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-pct sortable-header" data-table="detailed" data-field="per_delivered" style="cursor: pointer; user-select: none;">${ORDER_COL.pct_received} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-pct sortable-header" data-table="detailed" data-field="per_billed" style="cursor: pointer; user-select: none;">${ORDER_COL.pct_billed} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-table="detailed" data-field="net_total" style="cursor: pointer; user-select: none;">${ORDER_COL.net_total} <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="po_list_body"></tbody>
                        ${build_orders_footer_12(__("TOTAL BOOKED VALUE"), "total_booked_value")}
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let tbody = table_card.find("#po_list_body");

		page.export_tables = {
			month: month_table_card.find("table"),
			due: due_table_card.find("table"),
			detailed: table_card.find("table"),
		};

		// State variables for sorting
		let month_sort = { field: "total", asc: false };
		let due_sort = { field: "due_days", asc: true };
		let detailed_sort = { field: "transaction_date", asc: false };

		const render_month_table = () => {
			let sorted_data = [...(data.month_wise_supplier || [])];
			sorted_data.sort((a, b) => {
				let val_a, val_b;
				if (month_sort.field === "supplier") {
					val_a = a.supplier || "";
					val_b = b.supplier || "";
					return month_sort.asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
				} else if (month_sort.field === "total") {
					val_a = flt(a.total);
					val_b = flt(b.total);
				} else {
					val_a = flt(a.months[month_sort.field]);
					val_b = flt(b.months[month_sort.field]);
				}
				return month_sort.asc ? val_a - val_b : val_b - val_a;
			});

			month_tbody.empty();
			let month_totals = {};
			let grand_total_all = 0;

			sorted_data.forEach((row, idx) => {
				let row_total = row.total || 0;
				grand_total_all += row_total;
				let row_html = `
					<tr>
						<td class="col-sno">${idx + 1}</td>
						<td class="col-supplier" title="${row.supplier}">${row.supplier}</td>
						${months.map(m => {
							let val = row.months[m.key] || 0;
							month_totals[m.sort] = (month_totals[m.sort] || 0) + val;
							return `<td class="col-amt">₹ ${(val / 1000000).toFixed(2)} M</td>`;
						}).join("")}
						<td class="col-amt" style="font-weight: 700;">₹ ${(row_total / 1000000).toFixed(2)} M</td>
					</tr>
				`;
				month_tbody.append(row_html);
			});

			months.forEach(m => {
				month_table_card.find(`#total_${m.sort}`).text(`₹ ${( (month_totals[m.sort] || 0) / 1000000).toFixed(2)} M`);
			});
			month_table_card.find("#grand_total_all").text(`₹ ${(grand_total_all / 1000000).toFixed(2)} M`);
		};

		const render_due_table = () => {
			let sorted_data = [...(data.due_next_15_days || [])];
			sorted_data.sort((a, b) => {
				let val_a = a[due_sort.field];
				let val_b = b[due_sort.field];
				
				if (["name", "supplier", "status", "item_code", "item_name"].includes(due_sort.field)) {
					val_a = val_a || "";
					val_b = val_b || "";
					return due_sort.asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
				} else if (due_sort.field === "transaction_date") {
					val_a = val_a ? new Date(val_a) : new Date(0);
					val_b = val_b ? new Date(val_b) : new Date(0);
				} else if (due_sort.field === "schedule_date") {
					val_a = a.schedule_date ? new Date(a.schedule_date) : new Date(0);
					val_b = b.schedule_date ? new Date(b.schedule_date) : new Date(0);
				} else if (due_sort.field === "actual_delivery_time") {
					val_a = get_actual_sort_date(a);
					val_b = get_actual_sort_date(b);
				} else {
					val_a = flt(val_a);
					val_b = flt(val_b);
				}
				return due_sort.asc ? val_a - val_b : val_b - val_a;
			});

			due_tbody.empty();
			let due_total_val = 0;

			sorted_data.forEach((row, idx) => {
				due_total_val += flt(row.net_total);
				let days_class = row.due_days <= 3 ? "text-danger font-weight-bold" : (row.due_days <= 7 ? "text-warning" : "");
				let rec_class = row.per_delivered >= 100 ? "full" : (row.per_delivered > 0 ? "partial" : "none");
				let bill_class = row.per_billed >= 100 ? "full" : (row.per_billed > 0 ? "partial" : "none");
                let status_slug = (row.status || '').toLowerCase().replace(/ /g, '-');
				const pending_qty = flt(row.pending_qty != null ? row.pending_qty : (flt(row.qty) - flt(row.received_qty)));

				due_tbody.append(`
					<tr>
						<td class="col-sno">${idx + 1}</td>
						<td class="col-id"><a href="/app/purchase-order/${row.name}">${row.name}</a></td>
						<td class="col-supplier" title="${row.supplier}">${row.supplier}</td>
						<td class="col-item-code">${row.item_code || '-'}</td>
						<td class="col-item-name" title="${row.item_name}">${row.item_name || '-'}</td>
						<td class="col-date">${frappe.datetime.str_to_user(row.transaction_date)}</td>
						<td class="col-date" style="font-weight: 600;">${format_expected_cell(row)}</td>
						<td class="col-date-actual">${format_actual_cell(row)}</td>
						<td class="col-days ${days_class}">${row.due_days} ${__("Days")}</td>
						<td class="col-status"><span class="indicator-pill ${status_slug}">${row.status}</span></td>
						<td class="col-pct"><span class="pct-badge ${rec_class}">${Math.round(row.per_delivered)}%</span></td>
						<td class="col-pct"><span class="pct-badge ${bill_class}">${Math.round(row.per_billed)}%</span></td>
						<td class="col-qty">${format_qty(row.qty)}</td>
						<td class="col-qty">${format_qty(row.received_qty)}</td>
						<td class="col-qty" style="font-weight: 600;">${format_qty(pending_qty)}</td>
						<td class="col-amt" style="font-weight: 700;">₹ ${(flt(row.net_total) / 1000000).toFixed(2)} M</td>
					</tr>
				`);
			});
			due_table_card.find("#total_due_value").text(`₹ ${(due_total_val / 1000000).toFixed(2)} M`);
		};

		const render_detailed_table = () => {
			let sorted_data = [...(data.results || [])];
			sorted_data.sort((a, b) => {
				let val_a = a[detailed_sort.field];
				let val_b = b[detailed_sort.field];
				
				if (["name", "supplier", "status", "item_code", "item_name"].includes(detailed_sort.field)) {
					val_a = val_a || "";
					val_b = val_b || "";
					return detailed_sort.asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
				} else if (detailed_sort.field === "transaction_date") {
					val_a = val_a ? new Date(val_a) : new Date(0);
					val_b = val_b ? new Date(val_b) : new Date(0);
				} else if (detailed_sort.field === "schedule_date") {
					val_a = a.schedule_date ? new Date(a.schedule_date) : new Date(0);
					val_b = b.schedule_date ? new Date(b.schedule_date) : new Date(0);
				} else if (detailed_sort.field === "actual_delivery_time") {
					val_a = get_actual_sort_date(a);
					val_b = get_actual_sort_date(b);
				} else {
					val_a = flt(val_a);
					val_b = flt(val_b);
				}
				return detailed_sort.asc ? val_a - val_b : val_b - val_a;
			});

			tbody.empty();
			sorted_data.forEach((row, idx) => {
				let rec_class = row.per_delivered >= 100 ? "full" : (row.per_delivered > 0 ? "partial" : "none");
				let bill_class = row.per_billed >= 100 ? "full" : (row.per_billed > 0 ? "partial" : "none");
                let status_slug = (row.status || '').toLowerCase().replace(/ /g, '-');

				tbody.append(`
					<tr>
						<td class="col-sno">${idx + 1}</td>
						<td class="col-id"><a href="/app/purchase-order/${row.name}">${row.name}</a></td>
						<td class="col-supplier" title="${row.supplier}">${row.supplier}</td>
						<td class="col-item-code">${row.item_code || '-'}</td>
						<td class="col-item-name" title="${row.item_name}">${row.item_name || '-'}</td>
						<td class="col-date">${frappe.datetime.str_to_user(row.transaction_date)}</td>
						<td class="col-date" style="font-weight: 600;">${format_expected_cell(row)}</td>
						<td class="col-date-actual">${format_actual_cell(row)}</td>
						<td class="col-status"><span class="indicator-pill ${status_slug}">${row.status}</span></td>
						<td class="col-pct"><span class="pct-badge ${rec_class}">${Math.round(row.per_delivered)}%</span></td>
						<td class="col-pct"><span class="pct-badge ${bill_class}">${Math.round(row.per_billed)}%</span></td>
						<td class="col-amt" style="font-weight: 700;">₹ ${(flt(row.net_total) / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M</td>
					</tr>
				`);
			});

			let total_val = sorted_data.reduce((acc, row) => acc + flt(row.net_total), 0);
			table_card.find("#total_booked_value").text(`₹ ${(total_val / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`);
		};

		// Initial render of all tables
		render_month_table();
		render_due_table();
		render_detailed_table();

		// Header clicks for real-time sort toggling
		page.container.on("click", ".sortable-header", function () {
			const table_type = $(this).data("table");
			const field = $(this).data("field");
			
			if (table_type === "month") {
				if (month_sort.field === field) {
					month_sort.asc = !month_sort.asc;
				} else {
					month_sort.field = field;
					month_sort.asc = true;
				}
				
				// Reset icons
				month_table_card.find(".sortable-header i").removeClass("fa-sort-asc fa-sort-desc").addClass("fa-sort text-muted");
				month_table_card.find(".sortable-header").removeClass("sorted-asc sorted-desc");
				
				// Update active
				if (month_sort.asc) {
					$(this).addClass("sorted-asc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-asc");
				} else {
					$(this).addClass("sorted-desc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-desc");
				}
				
				render_month_table();
			} else if (table_type === "due") {
				if (due_sort.field === field) {
					due_sort.asc = !due_sort.asc;
				} else {
					due_sort.field = field;
					due_sort.asc = true;
				}
				
				// Reset icons
				due_table_card.find(".sortable-header i").removeClass("fa-sort-asc fa-sort-desc").addClass("fa-sort text-muted");
				due_table_card.find(".sortable-header").removeClass("sorted-asc sorted-desc");
				
				// Update active
				if (due_sort.asc) {
					$(this).addClass("sorted-asc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-asc");
				} else {
					$(this).addClass("sorted-desc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-desc");
				}
				
				render_due_table();
			} else if (table_type === "detailed") {
				if (detailed_sort.field === field) {
					detailed_sort.asc = !detailed_sort.asc;
				} else {
					detailed_sort.field = field;
					detailed_sort.asc = true;
				}
				
				// Reset icons
				table_card.find(".sortable-header i").removeClass("fa-sort-asc fa-sort-desc").addClass("fa-sort text-muted");
				table_card.find(".sortable-header").removeClass("sorted-asc sorted-desc");
				
				// Update active
				if (detailed_sort.asc) {
					$(this).addClass("sorted-asc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-asc");
				} else {
					$(this).addClass("sorted-desc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-desc");
				}
				
				render_detailed_table();
			}
		});

		month_table_card.find("#export_month_excel_btn").on("click", () => export_data_excel("summary"));
		due_table_card.find("#export_due_excel_btn").on("click", () => export_data_excel("due"));
		table_card.find("#export_excel_btn").on("click", () => export_data_excel("detail"));
		table_card.find("#export_pdf_btn").on("click", () => export_pdf_full());
	}

    async function export_pdf_full() {
        frappe.show_alert({ message: __("Preparing PDF export..."), indicator: "blue" });

        const data = page.dashboard_data;
        if (
            !data ||
            (
                !(data.results || []).length &&
                !(data.due_next_15_days || []).length &&
                !(data.month_wise_supplier || []).length
            )
        ) {
            frappe.msgprint(__("No data to export. Refresh the dashboard and try again."));
            return;
        }

        const chart_images = await capture_charts_for_pdf(data.charts);

        const report_date = frappe.datetime.global_date_format(frappe.datetime.now_date());
        const filters = page.filter_group.get_values();
        const period = `${frappe.datetime.str_to_user(filters.from_date || '')} to ${frappe.datetime.str_to_user(filters.to_date || '')}`;

        const kpi_border_color = (indicator) => {
            const colors = { green: "#10b981", red: "#ef4444", orange: "#f59e0b", blue: "#3b82f6" };
            return colors[(indicator || "blue").toLowerCase()] || colors.blue;
        };

        const month_table_html = clone_table_html_for_pdf(page.export_tables?.month);
        const due_table_html = clone_table_html_for_pdf(page.export_tables?.due);
        const detailed_table_html = clone_table_html_for_pdf(page.export_tables?.detailed);

        let html = `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #1e293b; background: #fff; }
                    @page { size: A4 landscape; margin: 10mm; }
                    .report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }
                    .report-title { margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; }
                    .kpi-row { display: table; width: 100%; border-spacing: 10px; margin-bottom: 25px; }
                    .kpi-card { display: table-cell; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; background: #f8fafc; text-align: center; border-left: 5px solid #3b82f6; }
                    .kpi-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
                    .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; }
                    .section-title { font-size: 14px; font-weight: 700; color: #3b82f6; margin: 25px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; }
                    .chart-section { width: 100%; margin-bottom: 24px; }
                    .chart-row { display: block; width: 100%; margin-bottom: 22px; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; page-break-inside: avoid; }
                    .chart-title { font-weight: 800; margin-bottom: 12px; font-size: 12px; text-align: center; color: #1e293b; text-transform: uppercase; }
                    .chart-img-wrap { text-align: center; margin-bottom: 12px; min-height: 220px; width: 100%; }
                    .chart-img { width: 420px; max-width: 100%; height: auto; display: inline-block; }
                    .chart-missing { text-align: center; color: #94a3b8; font-size: 11px; }
                    .pdf-legend { width: 100%; margin-top: 8px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
                    .pdf-legend-row { display: block; width: 100%; overflow: hidden; margin-bottom: 6px; }
                    .pdf-legend-item { display: inline-block; width: 24%; vertical-align: top; font-size: 7px; padding: 2px 4px; box-sizing: border-box; }
                    .legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
                    .legend-text { display: inline-block; vertical-align: middle; line-height: 1.25; max-width: calc(100% - 14px); }
                    .legend-name { font-weight: 700; color: #1e293b; display: block; }
                    .legend-val { color: #64748b; font-size: 6.5px; display: block; }

                    table.export-pdf-table { width: 100%; border-collapse: collapse; font-size: 7px; margin-bottom: 20px; table-layout: fixed; page-break-inside: auto; }
                    .export-pdf-table th, .export-pdf-table td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; vertical-align: top; }
                    .export-pdf-table th { background: #f1f5f9 !important; font-weight: 700; color: #475569; text-transform: none; font-size: 6.5px; }
                    .export-pdf-table thead { display: table-header-group; }
                    .export-pdf-table tfoot { display: table-row-group; }
                    .export-pdf-table .col-sno { text-align: center; }
                    .export-pdf-table .col-id { word-break: break-all; }
                    .export-pdf-table .col-supplier { white-space: normal; line-height: 1.2; }
                    .export-pdf-table .col-item-code { word-break: break-all; }
                    .export-pdf-table .col-item-name { white-space: normal; line-height: 1.25; }
                    .export-pdf-table .col-date, .export-pdf-table .col-date-actual { white-space: nowrap; font-size: 6.5px; }
                    .export-pdf-table .col-days, .export-pdf-table .col-pct, .export-pdf-table .col-qty { text-align: center; white-space: nowrap; }
                    .export-pdf-table .col-amt { text-align: right; white-space: nowrap; }
                    .export-pdf-table .col-status { white-space: normal; line-height: 1.2; font-size: 6px; }
                    .export-pdf-table .pdf-total-row td { background: #e2e8f0 !important; font-weight: 800 !important; border-top: 2px solid #94a3b8 !important; }
                    .text-danger { color: #ef4444 !important; }
                    .page-break { page-break-after: always; }
                </style>
            </head>
            <body>
                <div class="report-header">
                    <h1 class="report-title">Supplier Performance Report</h1>
                    <p style="font-size: 12px; color: #64748b;">Period: ${period} | Generated: ${report_date}</p>
                </div>

                <div class="kpi-row">
                    ${data.summary.map(m => `
                        <div class="kpi-card" style="border-left-color: ${kpi_border_color(m.indicator)}">
                            <div class="kpi-label">${m.label}</div>
                            <div class="kpi-value">${m.fieldtype === 'Currency' ? '₹ ' + (flt(m.value) / 1000000).toFixed(2) + ' M' : m.value}</div>
                        </div>
                    `).join('')}
                </div>

                <h3 class="section-title">Visual Analytics</h3>
                <div class="chart-section">
                ${build_pdf_charts_section_html(data.charts, chart_images)}
                </div>

                <div class="page-break"></div>
                <h3 class="section-title">Month-Wise Booking Breakdown </h3>
                ${month_table_html || "<p>No data</p>"}

                <div class="page-break"></div>
                <h3 class="section-title">Orders Due in Next 15 Days </h3>
                ${due_table_html || "<p>No data</p>"}

                <div class="page-break"></div>
                <h3 class="section-title">Detailed Orders List </h3>
                ${detailed_table_html || "<p>No data</p>"}
            </body>
            </html>
        `;

        frappe.call({
            method: "renu_customization.renu_customization.page.supplier_performance_dashboard.supplier_performance_dashboard.export_to_pdf",
            args: { html: html },
            callback(r) {
                if (r.message) {
                    download_base64_file(r.message, "application/pdf");
                    frappe.show_alert({ message: __("PDF downloaded"), indicator: "green" });
                }
            },
            error(r) {
                frappe.msgprint(r.message || __("PDF export failed"));
            },
        });
    }

	// Set default Fiscal Year and trigger initial load
	const init_fiscal_year_and_refresh = () => {
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
				if (r.message) {
					page.filter_group.set_value("fiscal_year", r.message.name);
				}
			},
			always() {
				setTimeout(() => {
					page.refresh();
					setTimeout(() => page.refresh(), 500);
				}, 300);
			},
		});
	};

	if (renu_customization.dashboard_fiscal_year && renu_customization.dashboard_fiscal_year.init) {
		renu_customization.dashboard_fiscal_year.init(page, { refresh_delay: 300 });
	} else {
		init_fiscal_year_and_refresh();
	}
};
