frappe.pages['ytd-profit-and-loss-'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Profit and Loss Dashboard',
		single_column: true
	});

	// Hide default header to use our custom dashboard header
	page.wrapper.find('.page-head .title').hide();

	// Initialize auto-refresh functionality
	frappe.require('/assets/renu_customization/js/dashboard_auto_refresh.js', () => {
		page.auto_refresh = new DashboardAutoRefresh(page, {
			storage_key: 'ytd_profit_and_loss_dashboard',
			default_interval: 300
		});
		page.auto_refresh.init();
	});

	// Load our HTML template
	page.main.html(frappe.render_template('ytd_profit_and_loss_'));

	let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);

	let refresh_timer = null;
	page.refresh = function () {
		if (refresh_timer) clearTimeout(refresh_timer);
		refresh_timer = setTimeout(() => {
			loadData();
		}, 50);
	};

	const filter_fields = [
		{
			fieldname: "fiscal_year",
			label: __("Fiscal Year"),
			fieldtype: "Link",
			placeholder: __("Select Fiscal Year"),
			options: "Fiscal Year",
		},
		{
			fieldname: "quarter",
			label: __("Quarter"),
			fieldtype: "Select",
			options: ["", "Qtr1", "Qtr2", "Qtr3", "Qtr4"],
		},
		{
			fieldname: "month",
			label: __("Month"),
			fieldtype: "Select",
			options: ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
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
		}
	];

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_parent,
		fields: filter_fields,
	});
	page.filter_group.make();

	// Set default fiscal year to current fiscal year
	frappe.call({
		method: 'frappe.client.get_value',
		args: {
			doctype: 'Fiscal Year',
			filters: {
				'year_start_date': ['<=', frappe.datetime.get_today()],
				'year_end_date': ['>=', frappe.datetime.get_today()]
			},
			fieldname: 'name'
		},
		callback: (r) => {
			if (r.message && r.message.name) {
				page.filter_group.fields_dict.fiscal_year.set_value(r.message.name);
				page.refresh();
			}
		}
	});

	$("<style>")
		.text(
			`
		.dashboard-filter-area {
			padding: 15px 20px 5px 20px !important;
			background-color: #f8fafc !important;
			border-bottom: 1px solid #e2e8f0 !important;
			margin: -15px -15px 20px -15px;
		}
		.dashboard-filter-area .form-section .section-body,
		.dashboard-filter-area .section-body,
		.dashboard-filter-area .form-column {
			display: block !important;
			width: 100% !important;
		}
		.dashboard-filter-area .form-column form {
			display: flex !important;
			flex-wrap: nowrap !important;
			gap: 10px !important;
			align-items: flex-end !important;
			width: 100% !important;
		}
		.dashboard-filter-area .frappe-control {
			margin-bottom: 10px !important;
			flex: 1 !important;
			min-width: 120px !important;
		}
		.dashboard-filter-area .frappe-control .form-group {
			margin-bottom: 0 !important;
			width: 100% !important;
		}
		.dashboard-filter-area .control-input,
		.dashboard-filter-area .awesomplete {
			width: 100% !important;
			max-width: 100% !important;
		}
		.dashboard-filter-area input,
		.dashboard-filter-area select {
			width: 100% !important;
			max-width: 100% !important;
			padding: 6px 12px !important;
			height: 30px !important;
		}
		.dashboard-filter-area label,
		.dashboard-filter-area .control-label {
			font-size: 10px !important;
			font-weight: 700 !important;
			color: #475569 !important;
			margin-bottom: 4px !important;
			display: block !important;
			text-align: center !important;
			white-space: nowrap !important;
			text-transform: uppercase !important;
		}
		.dashboard-filter-area .help-box,
		.dashboard-filter-area .description {
			display: none !important;
		}
		/* Fix: hide the duplicate text Frappe renders BELOW Link fields (control-value) */
		.dashboard-filter-area .control-value,
		.dashboard-filter-area .like-disabled-input,
		.dashboard-filter-area .control-input-wrapper > .control-value {
			display: none !important;
		}
		/* Fix: ensure the Link field input is properly visible and sized */
		.dashboard-filter-area .input-with-feedback {
			height: 30px !important;
			line-height: 30px !important;
			padding: 0 12px !important;
			font-size: 13px !important;
			color: #1e293b !important;
			display: block !important;
		}
		/* Fix: ensure control-input-wrapper does not collapse for Link fields */
		.dashboard-filter-area .control-input-wrapper {
			display: block !important;
		}
	`,
		)
		.appendTo(filter_parent);

	Object.keys(page.filter_group.fields_dict).forEach((key) => {
		let field = page.filter_group.fields_dict[key];
		field.on_change = () => page.refresh();
		field.df.on_change = () => page.refresh();

		if (field.$input) {
			field.$input.on("change input blur", () => {
				setTimeout(() => page.refresh(), 50);
			});
		}

		if (field.df.fieldtype === "Link") {
			field.on_change = function () {
				page.refresh();
			};
			field.set_input_change && field.set_input_change(() => page.refresh());
		}
	});

	filter_parent.on("change", "input, select", () => page.refresh());

	// Helper function to format numbers (Convert to Millions)
	const formatNumber = (num) => {
		if (num === null || num === undefined) return '-';
		return (parseFloat(num) / 1000000).toFixed(2);
	};

	// Helper function to format percentages
	const formatPct = (num) => {
		if (num === null || num === undefined) return '-';
		return parseFloat(num).toFixed(2) + '%';
	};

	const getVarClass = (num) => {
		if (num < 0) return 'text-negative';
		if (num > 0) return 'text-positive';
		return '';
	};

	const getArrowIcon = (num) => {
		if (num < 0) return '<i class="fa fa-arrow-down text-negative"></i>';
		if (num > 0) return '<i class="fa fa-arrow-up text-positive"></i>';
		return '-';
	};

	const renderCards = (cards) => {
		const container = $('#summary-cards-container');
		container.empty();

		const cardConfigs = [
			{ key: 'sales_growth', title: '1. SALES GROWTH', icon: 'fa-bar-chart', theme: 'card-theme-blue' },
			{ key: 'gross_margin', title: '2. GROSS MARGIN', icon: 'fa-pie-chart', theme: 'card-theme-green' },
			{ key: 'operating_margin', title: '3. OPERATING MARGIN', icon: 'fa-briefcase', theme: 'card-theme-purple' },
			{ key: 'working_capital', title: '4. WORKING CAPITAL', icon: 'fa-university', theme: 'card-theme-orange' },
			//{ key: 'wcts', title: '5. WORKING CAPITAL TURNS (WCTs)', icon: 'fa-repeat', theme: 'card-theme-teal' },
			// { key: 'dso', title: '5. DAYS SALES OUTSTANDING', icon: 'fa-clock', theme: 'card-theme-red' },
			// { key: 'dpo', title: '6. DAYS PAYABLES OUTSTANDING', icon: 'fa-clock', theme: 'card-theme-yellow' },
			// Hidden for now - uncomment to re-enable
			// { key: 'overall_pnl', title: 'OVERALL P&L', icon: 'fa-line-chart', theme: 'card-theme-dark' },
		];

		cardConfigs.forEach(config => {
			const data = cards[config.key];
			const isNegativeVar = data.variance < 0;
			const varClass = isNegativeVar ? 'negative' : 'positive';
			const varArrow = isNegativeVar ? 'fa-arrow-down' : 'fa-arrow-up';

			const cardHTML = `
				<div class="summary-card ${config.theme}">
					<div class="card-header">
						<div class="card-icon"><i class="fa ${config.icon}"></i></div>
						<div class="card-title">${config.title}</div>
					</div>
					<div class="card-body">
						<div class="card-metrics">
							<div class="metric-group text-center">
								<div class="metric-main">${formatNumber(data.ytd)}</div>
							</div>
							<div class="metric-group text-center">
								<div class="metric-label">PYD</div>
								<div class="metric-value">${formatNumber(data.pyd)}</div>
							</div>
							<div class="metric-group text-center">
								<div class="metric-label">VPY%</div>
								<div class="metric-value metric-var ${varClass}">
									${formatPct(data.variance)} <i class="fa ${varArrow}"></i>
								</div>
							</div>
						</div>
					</div>
				</div>
			`;
			container.append(cardHTML);
		});
	};

	const renderInsights = (insights) => {
		const container = $('#key-insights-list');
		container.empty();
		if (insights && insights.length > 0) {
			insights.forEach(insight => {
				container.append(`<li>${insight}</li>`);
			});
		} else {
			container.append(`<li>No insights available.</li>`);
		}
	};

	const renderTable = (tableData) => {
		const tbody = $('#detailed-table-body');
		tbody.empty();

		const icons = {
			'1. SALES GROWTH': 'fa-bar-chart',
			'2. GROSS MARGIN': 'fa-pie-chart',
			'3. OPERATING MARGIN': 'fa-briefcase',
			'4. WORKING CAPITAL': 'fa-university',
			'OVERALL P&L': 'fa-line-chart'
		};

		const bucket_colors = {
			'1. SALES GROWTH': '#1d4ed8',
			'2. GROSS MARGIN': '#047857',
			'3. OPERATING MARGIN': '#6d28d9',
			'4. WORKING CAPITAL': '#c2410c',
			'OVERALL P&L': '#1e3a8a'
		};

		tableData.forEach((group, index) => {
			const isFirst = index === 0;
			const rowCount = group.sources.length;

			group.sources.forEach((source, sIndex) => {
				const tr = $('<tr></tr>');

				if (sIndex === 0) {
					const color = bucket_colors[group.bucket] || '#1e3a8a';
					tr.append(`<td rowspan="${rowCount}" class="row-bucket" style="color: ${color} !important; font-weight: 900 !important; font-size: 16px !important;">
						<i class="fa ${icons[group.bucket]} bucket-icon"></i> ${group.bucket}
					</td>`);
				}

				const ytdVal = formatNumber(source.ytd_val);
				const ytdPct = formatPct(source.ytd_pct);
				const pydVal = formatNumber(source.pyd_val);
				const pydPct = formatPct(source.pyd_pct);

				let varVal = '-';
				if (source.var_val !== null && source.var_val !== undefined) {
					const varMil = parseFloat(source.var_val) / 1000000;
					if (varMil > 0) varVal = varMil.toFixed(2);
					else if (varMil === 0) varVal = '0.00';
					else varVal = '(' + Math.abs(varMil).toFixed(2) + ')';
				}

				const varPct = formatPct(source.var_pct);

				// Check if this is a percentage row or indented row
				const isPercentageRow = source.name === '%';
				const isIndented = source.is_indented === true;
				const sourceClass = isPercentageRow ? 'col-source percentage-row' : (isIndented ? 'col-source indented-row' : 'col-source');
				const sourceDisplay = source.name;

				tr.append(`<td class="${sourceClass}">${sourceDisplay}</td>`);

				if (isPercentageRow) {
					// For percentage rows, display the percentage values
					tr.append(`<td class="text-center">${Number(source.ytd_val).toFixed(2)}%</td>`);
					tr.append(`<td class="text-center">${Number(source.pyd_val).toFixed(2)}%</td>`);
				} else {
					// For regular rows, display formatted numbers
					tr.append(`<td class="text-center">${ytdVal}</td>`);
					tr.append(`<td class="text-center">${pydVal}</td>`);
				}

				// Calculate variance percentage for all rows: (YTD-PYD)/PYD*100
				let displayVar = '-';
				const yVal = parseFloat(source.ytd_val) || 0;
				const pVal = parseFloat(source.pyd_val) || 0;
				
				if (pVal !== 0) {
					const vPct = ((yVal - pVal) / Math.abs(pVal)) * 100;
					displayVar = vPct.toFixed(2) + '%';
				} else if (yVal !== 0) {
					displayVar = '100.00%';
				} else {
					displayVar = '0.00%';
				}
				
				tr.append(`<td class="text-center ${getVarClass(source.var_val)}">${displayVar}</td>`);

				// Trend column - Dynamic based on YTD vs PYD variance (Bi-directional)
				let trendHtml = '-';
				if (source.var_pct !== null && source.var_pct !== undefined) {
					const vPct = parseFloat(source.var_pct);
					const trendWidth = Math.min(Math.abs(vPct), 100);
					if (vPct >= 0) {
						trendHtml = `<div class="trend-bar-container">
							<div class="trend-bar-half left-half">
								<div class="trend-bar-fill pos" style="width: ${trendWidth}%;"></div>
							</div>
							<div class="trend-bar-divider"></div>
							<div class="trend-bar-half right-half"></div>
						</div>`;
					} else {
						trendHtml = `<div class="trend-bar-container">
							<div class="trend-bar-half left-half"></div>
							<div class="trend-bar-divider"></div>
							<div class="trend-bar-half right-half">
								<div class="trend-bar-fill neg" style="width: ${trendWidth}%;"></div>
							</div>
						</div>`;
					}
				}
				tr.append(`<td class="text-center">${trendHtml}</td>`);

				tbody.append(tr);
			});
		});
	};

	const renderCharts = (chartsData) => {
		if (typeof ApexCharts === 'undefined') {
			console.warn("ApexCharts not loaded.");
			return;
		}

		// Destroy existing chart instances to prevent overlap
		if (page._charts) {
			page._charts.forEach(c => {
				try { c.destroy(); } catch (e) { /* ignore */ }
			});
		}
		page._charts = [];

		// Clear chart containers
		['#chart-revenue-trend', '#chart-gross-margin', '#chart-working-capital'].forEach(sel => {
			const el = document.querySelector(sel);
			if (el) el.innerHTML = '';
		});

		// Revenue Trend Chart
		const revenueChart = new ApexCharts(document.querySelector("#chart-revenue-trend"), {
			series: [
				{ name: 'YTD', data: chartsData.revenue_trend.ytd.map(v => v / 1000000) },
				{ name: 'PYD', data: chartsData.revenue_trend.pyd.map(v => v / 1000000) }
			],
			chart: { type: 'bar', height: 180, toolbar: { show: false } },
			plotOptions: { bar: { horizontal: false, columnWidth: '50%', endingShape: 'rounded' } },
			dataLabels: { enabled: false },
			stroke: { show: true, width: 2, colors: ['transparent'] },
			xaxis: { categories: chartsData.revenue_trend.labels },
			yaxis: {
				labels: {
					formatter: function (val) {
						return val.toFixed(2);
					}
				}
			},
			tooltip: {
				y: {
					formatter: function (val) {
						return val.toFixed(2);
					}
				}
			},
			fill: { opacity: 1 },
			colors: ['#1d4ed8', '#94a3b8'],
			legend: { position: 'top', horizontalAlign: 'right' }
		});
		revenueChart.render();
		page._charts.push(revenueChart);

		// Gross Margin Trend Chart
		const gmChart = new ApexCharts(document.querySelector("#chart-gross-margin"), {
			series: [{ name: 'YTD GM %', data: chartsData.gross_margin_trend.ytd_gm }, { name: 'PYD GM %', data: chartsData.gross_margin_trend.pyd_gm }],
			chart: { type: 'line', height: 180, toolbar: { show: false } },
			stroke: { width: [3, 3], curve: 'straight' },
			xaxis: { categories: chartsData.gross_margin_trend.labels },
			yaxis: {
				labels: {
					formatter: function (val) {
						return val.toFixed(2) + '%';
					}
				}
			},
			tooltip: {
				y: {
					formatter: function (val) {
						return val.toFixed(2) + '%';
					}
				}
			},
			colors: ['#10b981', '#64748b'],
			markers: { size: 4 },
			legend: { position: 'top', horizontalAlign: 'left' }
		});
		gmChart.render();
		page._charts.push(gmChart);

		// Hidden for now - uncomment to re-enable
		// Waterfall Chart
		// const waterfallChart = new ApexCharts(document.querySelector("#chart-waterfall"), {
		// 	series: [{ name: 'Waterfall', data: chartsData.waterfall.values.map((v, i) => ({ x: chartsData.waterfall.labels[i], y: v / 1000000 })) }],
		// 	chart: { type: 'bar', height: 180, toolbar: { show: false } },
		// 	plotOptions: { bar: { colors: { ranges: [{ from: -1000, to: -0.01, color: '#dc2626' }, { from: 0.01, to: 1000, color: '#1d4ed8' }] } } },
		// 	dataLabels: { enabled: true, formatter: function (val) { return parseFloat(val).toFixed(2); }, offsetY: -20, style: { fontSize: '10px', colors: ["#304758"] } },
		// 	xaxis: { type: 'category' },
		// });
		// waterfallChart.render();
		// page._charts.push(waterfallChart);

		// Working Capital Chart
		const wcChart = new ApexCharts(document.querySelector("#chart-working-capital"), {
			series: [
				{ name: 'YTD', data: chartsData.working_capital.ytd.map(v => v / 1000000) },
				{ name: 'PYD', data: chartsData.working_capital.pyd.map(v => v / 1000000) }
			],
			chart: { type: 'bar', height: 180, toolbar: { show: false } },
			plotOptions: { bar: { horizontal: false, columnWidth: '50%' } },
			dataLabels: { enabled: false },
			xaxis: { categories: chartsData.working_capital.labels },
			yaxis: {
				labels: {
					formatter: function (val) {
						return val.toFixed(2);
					}
				}
			},
			tooltip: {
				y: {
					formatter: function (val) {
						return val.toFixed(2);
					}
				}
			},
			colors: ['#f97316', '#94a3b8'],
			legend: { position: 'top', horizontalAlign: 'right' }
		});
		wcChart.render();
		page._charts.push(wcChart);
	};

	// Export to PDF Function
	const export_pdf = async () => {
		if (!page.dashboard_data) {
			frappe.show_alert({ message: __("No data available for PDF export"), indicator: "red" });
			return;
		}

		frappe.show_alert({ message: __("Generating PDF Report..."), indicator: "blue" });

		const report_date = moment().format('YYYY-MM-DD HH:mm');
		const data = page.dashboard_data;

		// Convert chart to PNG
		const get_chart_png = (selector) => {
			const container = document.querySelector(selector);
			if (!container) return null;
			const svg = container.querySelector('svg');
			if (!svg) return null;

			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			const svg_data = new XMLSerializer().serializeToString(svg);
			const img = new Image();

			return new Promise((resolve) => {
				img.onload = () => {
					canvas.width = img.width * 2;
					canvas.height = img.height * 2;
					context.fillStyle = 'white';
					context.fillRect(0, 0, canvas.width, canvas.height);
					context.drawImage(img, 0, 0, canvas.width, canvas.height);
					resolve(canvas.toDataURL('image/png'));
				};
				img.onerror = () => resolve(null);
				img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg_data)));
			});
		};

		// Get chart images
		const revenue_png = await get_chart_png('#chart-revenue-trend');
		const gm_png = await get_chart_png('#chart-gross-margin');
		const wc_png = await get_chart_png('#chart-working-capital');

		// Build KPI cards HTML
		const cardConfigs = {
			'sales_growth': { title: '1. SALES GROWTH', theme: 'card-theme-blue' },
			'gross_margin': { title: '2. GROSS MARGIN', theme: 'card-theme-green' },
			'operating_margin': { title: '3. OPERATING MARGIN', theme: 'card-theme-purple' },
			'working_capital': { title: '4. WORKING CAPITAL', theme: 'card-theme-orange' }
		};

		const kpi_html = Object.entries(data.summary_cards)
			.filter(([key]) => Object.keys(cardConfigs).includes(key))
			.map(([key, card]) => {
			const config = cardConfigs[key];
			const value = formatNumber(card.ytd);
			const pyd = formatNumber(card.pyd);
			const variance = card.variance.toFixed(2);
			const isNegativeVar = card.variance < 0;
			const varColor = isNegativeVar ? '#dc2626' : '#16a34a';
			const varArrow = isNegativeVar ? '&#8595;' : '&#8593;';

			return `<div class="summary-card ${config.theme}">
				<div class="card-header">
					<div class="card-title">${config.title}</div>
				</div>
				<div class="card-body">
					<div class="card-metrics">
						<div class="metric-group text-center" style="width: 40%;">
							<div class="metric-main">${value}</div>
						</div>
						<div class="metric-group text-center" style="width: 30%;">
							<div class="metric-label">PYD</div>
							<div class="metric-value">${pyd}</div>
						</div>
						<div class="metric-group text-center" style="width: 30%;">
							<div class="metric-label">VPY%</div>
							<div class="metric-value metric-var" style="color: ${varColor};">
								${variance}% <span style="font-size:12px;">${varArrow}</span>
							</div>
						</div>
					</div>
				</div>
			</div>`;
		}).join('');

		// Build table rows
		const bucket_colors_pdf = {
			'1. SALES GROWTH': '#1d4ed8',
			'2. GROSS MARGIN': '#047857',
			'3. OPERATING MARGIN': '#6d28d9',
			'4. WORKING CAPITAL': '#c2410c',
			'OVERALL P&L': '#1e3a8a'
		};

		const table_rows = data.table_data.map(group => {
			const rowCount = group.sources.length;
			return group.sources.map((src, i) => {
				const isPercentageRow = src.name === '%';
				const ytdVal = isPercentageRow ? Number(src.ytd_val).toFixed(2) + '%' : formatNumber(src.ytd_val);
				const pydVal = isPercentageRow ? Number(src.pyd_val).toFixed(2) + '%' : formatNumber(src.pyd_val);

				// Calculate variance percentage for all rows: (YTD-PYD)/PYD*100
				let varVal = '-';
				const yValPdf = parseFloat(src.ytd_val) || 0;
				const pValPdf = parseFloat(src.pyd_val) || 0;
				
				if (pValPdf !== 0) {
					const vPctPdf = ((yValPdf - pValPdf) / Math.abs(pValPdf)) * 100;
					varVal = vPctPdf.toFixed(2) + '%';
				} else if (yValPdf !== 0) {
					varVal = '100.00%';
				} else {
					varVal = '0.00%';
				}
				
				const isNegativeVar = parseFloat(varVal) < 0;
				const varColor = isNegativeVar ? '#dc2626' : '#16a34a';

				// Trend bar for PDF (Bi-directional)
				let trendHtmlPdf = '-';
				if (src.var_pct !== null && src.var_pct !== undefined) {
					const vPct = parseFloat(src.var_pct);
					const trendWidth = Math.min(Math.abs(vPct), 100);
					if (vPct >= 0) {
						trendHtmlPdf = `<div style="width: 60px; height: 10px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin: 0 auto; display: flex; position: relative;">
							<div style="width: 50%; height: 100%; display: flex; justify-content: flex-end;">
								<div style="width: ${trendWidth}%; height: 100%; background: #16a34a; border-radius: 2px 0 0 2px;"></div>
							</div>
							<div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #94a3b8; z-index: 2; transform: translateX(-50%);"></div>
							<div style="width: 50%; height: 100%;"></div>
						</div>`;
					} else {
						trendHtmlPdf = `<div style="width: 60px; height: 10px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin: 0 auto; display: flex; position: relative;">
							<div style="width: 50%; height: 100%;"></div>
							<div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #94a3b8; z-index: 2; transform: translateX(-50%);"></div>
							<div style="width: 50%; height: 100%; display: flex; justify-content: flex-start;">
								<div style="width: ${trendWidth}%; height: 100%; background: #dc2626; border-radius: 0 2px 2px 0;"></div>
							</div>
						</div>`;
					}
				}

				const bucket_color = bucket_colors_pdf[group.bucket] || '#1e3a8a';
				const bucket_cell = i === 0 ? `<td rowspan="${rowCount}" style="font-weight: 900; font-size: 12px; color: ${bucket_color}; background: #f1f5f9; vertical-align: top;">${group.bucket}</td>` : '';

				const paddingLeft = src.is_indented ? 'padding-left: 20px;' : (isPercentageRow ? 'padding-left: 20px; font-weight: bold;' : '');

				return `<tr>
				${bucket_cell}
				<td style="${paddingLeft}">${src.name}</td>
				<td style="text-align: center;">${ytdVal}</td>
				<td style="text-align: center;">${pydVal}</td>
				<td style="text-align: center; color: ${varColor}; font-weight: bold;">${varVal}</td>
				<td style="text-align: center;">${trendHtmlPdf}</td>
			</tr>`;
			}).join('');
		}).join('');

		// Chart images HTML
		const charts_html = `
		<div style="display: table; width: 100%; margin: 30px 0;">
			<div style="display: table-cell; width: 50%; padding-right: 15px;">
				<h4 style="text-align: center; margin: 0 0 10px; font-size: 12px;">REVENUE (SALES) TREND</h4>
				${revenue_png ? `<img src="${revenue_png}" style="width: 100%; max-height: 200px; object-fit: contain;">` : '<p>Chart not available</p>'}
			</div>
			<div style="display: table-cell; width: 50%; padding-left: 15px;">
				<h4 style="text-align: center; margin: 0 0 10px; font-size: 12px;">GROSS MARGIN TREND (%)</h4>
				${gm_png ? `<img src="${gm_png}" style="width: 100%; max-height: 200px; object-fit: contain;">` : '<p>Chart not available</p>'}
			</div>
		</div>
		<div style="display: table; width: 100%; margin: 30px 0;">
			<div style="display: table-cell; width: 50%; padding-right: 15px;">
				<h4 style="text-align: center; margin: 0 0 10px; font-size: 12px;">WORKING CAPITAL ANALYSIS</h4>
				${wc_png ? `<img src="${wc_png}" style="width: 100%; max-height: 200px; object-fit: contain;">` : '<p>Chart not available</p>'}
			</div>
			<div style="display: table-cell; width: 50%; padding-left: 15px;"></div>
		</div>
	`;

		// Build insights HTML
		const insights_html = data.insights && data.insights.length > 0 
			? data.insights.map(i => `<li style="margin-bottom: 5px;">${i}</li>`).join('') 
			: '<li>No insights available.</li>';

		const footer_html = `
		<div style="display: table; width: 100%; margin-top: 30px;">
			<div style="display: table-cell; width: 60%; padding-right: 20px; vertical-align: top;">
				<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px;">
					<h4 style="margin: 0 0 10px 0; font-size: 12px; color: #166534; text-transform: uppercase;">KEY INSIGHTS</h4>
					<ul style="margin: 0; padding-left: 20px; font-size: 11px; color: #14532d; line-height: 1.6;">
						${insights_html}
					</ul>
				</div>
			</div>
			<div style="display: table-cell; width: 40%; vertical-align: top;">
				<div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
					<h4 style="margin: 0 0 15px 0; font-size: 12px; color: #475569; text-transform: uppercase;">VARIANCE LEGEND</h4>
					<div style="font-size: 11px; color: #334155; font-weight: 500;">
						<div style="margin-bottom: 8px;"><span style="display:inline-block; width:12px; height:12px; background:#16a34a; margin-right:8px; vertical-align:middle; border-radius:2px;"></span> Favourable (Increase)</div>
						<div style="margin-bottom: 8px;"><span style="display:inline-block; width:12px; height:12px; background:#dc2626; margin-right:8px; vertical-align:middle; border-radius:2px;"></span> Unfavourable (Decrease)</div>
						<div><span style="display:inline-block; width:12px; height:12px; background:#94a3b8; margin-right:8px; vertical-align:middle; border-radius:2px;"></span> No Change</div>
					</div>
				</div>
			</div>
		</div>`;

		const html = `
		<html>
		<head>
			<style>
				body { font-family: 'Helvetica', sans-serif; padding: 0; margin: 0; color: #1e293b; background: #fff; }
				@page { size: landscape; margin: 10mm; }
				.header { text-align: center; border-bottom: 3px solid #ef4444; padding-bottom: 15px; margin-bottom: 25px; }
				.summary-cards { display: table; width: 100%; border-collapse: separate; border-spacing: 15px; margin-bottom: 25px; table-layout: fixed; margin-left: -15px; margin-right: -15px; }
				.summary-card { display: table-cell; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; overflow: hidden; vertical-align: top; }
				.card-header { padding: 10px; color: white; font-weight: bold; font-size: 14px; text-align: center; }
				.card-body { padding: 15px 10px; }
				.card-metrics { display: table; width: 100%; table-layout: fixed; }
				.metric-group { display: table-cell; text-align: center; vertical-align: middle; }
				.metric-main { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 5px; }
				.metric-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 3px; }
				.metric-value { font-size: 14px; font-weight: 700; color: #334155; }
				.card-theme-blue .card-header { background: #1d4ed8; }
				.card-theme-green .card-header { background: #047857; }
				.card-theme-purple .card-header { background: #6d28d9; }
				.card-theme-orange .card-header { background: #c2410c; }
				.card-theme-dark .card-header { background: #1e3a8a; }
				table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 20px; }
				th, td { padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
				th { background: #1e3a8a; color: white; font-weight: 700; text-transform: uppercase; }
				h4 { margin: 0; font-size: 12px; font-weight: 700; }
			</style>
		</head>
		<body>
			<div class="header">
				<h1 style="margin: 0;">PROFIT & LOSS DASHBOARD</h1>
				<p style="font-size: 10px; color: #999; margin: 5px 0 0;">Generated: ${report_date}</p>
			</div>
			<div class="summary-cards">
				${kpi_html}
			</div>
			<h3 style="color: #334155; text-transform: uppercase; font-size: 14px; margin: 30px 0 10px;">Detailed Analysis (Million INR)</h3>
			<table>
				<thead>
					<tr>
						<th>BUCKET</th>
						<th>SOURCES OF PROFIT & LOSS</th>
						<th>YTD</th>
						<th>PYD</th>
						<th>VARIANCE (YTD vs PYD)</th>
						<th>TREND (YTD vs PYD)</th>
					</tr>
				</thead>
				<tbody>
					${table_rows}
				</tbody>
			</table>
			${charts_html}
			${footer_html}
		</body>
		</html>
	`;

		const method_url = '/api/method/renu_customization.renu_customization.page.ytd_profit_and_loss_.ytd_profit_and_loss_.export_to_pdf';
		const $form = $(`
		<form action="${method_url}" method="POST" target="_blank" style="display:none;">
			<input type="hidden" name="html" value="">
			<input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
		</form>`).appendTo('body');

		$form.find('input[name="html"]').val(html);
		$form.submit();
		$form.remove();

		frappe.show_alert({ message: __("PDF generated successfully!"), indicator: "green" });
	};

	page.add_menu_item(__('Export to PDF'), () => export_pdf());
	console.log('Export to PDF menu added');


	const loadData = () => {
		let filters = page.filter_group ? page.filter_group.get_values() : {};
		frappe.call({
			method: 'renu_customization.renu_customization.page.ytd_profit_and_loss_.ytd_profit_and_loss_.get_dashboard_data',
			args: {
				company: frappe.defaults.get_user_default("Company"),
				filters: filters
			},
			callback: function (r) {
				if (r.message) {
					// Store data for PDF export
					page.dashboard_data = r.message;

					renderCards(r.message.summary_cards);
					renderTable(r.message.table_data);
					renderInsights(r.message.insights);

					// Load apex charts script if not loaded
					if (typeof ApexCharts === 'undefined') {
						$.getScript('https://cdn.jsdelivr.net/npm/apexcharts', function () {
							renderCharts(r.message.charts);
						});
					} else {
						renderCharts(r.message.charts);
					}
				}
			}
		});
	};

	loadData();
	// Add Export to PDF menu after data is loaded
	page.add_menu_item(__('Export to PDF'), () => export_pdf());
	console.log('Export to PDF menu added after loadData');
};