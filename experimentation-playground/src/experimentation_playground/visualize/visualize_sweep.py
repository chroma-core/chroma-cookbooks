import json
import os
import webbrowser
from pathlib import Path
from typing import Union

def visualize_sweep(sweep_dir: Union[str, Path], output_file: str = "sweep_visualization.html"):
    """
    Generates a standalone HTML file to visualize the results of a sweep.

    Args:
        sweep_dir: Directory containing the sweep result JSON files.
        output_file: Path where the HTML file will be saved.
    """
    sweep_dir = Path(sweep_dir)

    # Load all JSON files from the directory
    json_files = sorted(list(sweep_dir.glob("*.json")))

    if not json_files:
        raise ValueError(f"No JSON files found in {sweep_dir}")

    # Load all data
    all_data = []
    for json_file in json_files:
        with open(json_file, 'r') as f:
            data = json.load(f)
            all_data.append({
                'filename': json_file.name,
                'data': data
            })

    # Extract metrics for overview
    overview_data = []
    for item in all_data:
        results = item['data'].get('results', {})
        run_id = results.get('run_id', item['filename'])
        metrics = results.get('metrics', {})

        overview_data.append({
            'run_id': run_id,
            'recall_1': metrics.get('Recall@1', 0),
            'recall_5': metrics.get('Recall@5', 0),
            'recall_10': metrics.get('Recall@10', 0)
        })

    html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweep Visualization</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
    <style>
        :root {
            --bg-color: #f8f9fa;
            --card-bg: #ffffff;
            --text-primary: #212529;
            --text-secondary: #6c757d;
            --border-color: #dee2e6;
            --success-color: #d1e7dd;
            --success-text: #0f5132;
            --failure-color: #f8d7da;
            --failure-text: #842029;
            --highlight-border: #198754;
            --highlight-bg: #e8f5e9;
            --tab-active: #495057;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            line-height: 1.5;
            margin: 0;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .tabs {
            display: flex;
            gap: 5px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--border-color);
            flex-wrap: wrap;
        }

        .tab {
            padding: 12px 20px;
            background: transparent;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            opacity: 0.6;
            color: var(--text-primary);
        }

        .tab:hover {
            opacity: 0.8;
        }

        .tab.active {
            opacity: 1;
            border-bottom-color: var(--tab-active);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .overview-section {
            background: var(--card-bg);
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            display: flex;
            gap: 10px;
            align-items: center;
            justify-content: center;
        }

        .chart-selector {
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-width: 120px;
        }

        .chart-selector button {
            padding: 10px 20px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .chart-selector button.active {
            background: var(--tab-active);
            color: white;
            border-color: var(--tab-active);
        }

        .chart-selector button:hover {
            background: #e9ecef;
        }

        .chart-container {
            display: flex;
        }

        .chart-wrapper {
            background: white;
            padding: 20px;
            border-radius: 8px;
            display: none;
            width: 800px;
        }

        .chart-wrapper.active {
            display: block;
        }

        .chart-title {
            font-size: 1.1em;
            font-weight: 500;
            margin-bottom: 15px;
            text-align: center;
        }

        canvas {
            height: 500px !important;
        }

        /* Reuse styles from visualize_run.py */
        .header-section {
            background: var(--card-bg);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            margin-bottom: 20px;
        }

        h1, h2, h3 {
            margin-top: 0;
            font-weight: 500;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 10px;
        }

        .metric-card {
            background: var(--bg-color);
            padding: 10px;
            border-radius: 6px;
            text-align: center;
        }

        .metric-value {
            font-size: 0.95em;
            font-weight: bold;
        }

        .metric-card .metric-label {
            font-size: 0.8em;
        }

        .config-details {
            background: var(--bg-color);
            padding: 15px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 0.9em;
        }

        .config-item {
            margin-bottom: 8px;
            display: flex;
            gap: 10px;
        }

        .config-key {
            font-weight: 600;
            color: var(--text-secondary);
            min-width: 150px;
        }

        .config-value {
            color: var(--text-primary);
        }

        .controls {
            margin: 20px 0;
            display: flex;
            gap: 10px;
            align-items: center;
            background: var(--card-bg);
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        select, button {
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 14px;
        }

        .log-item {
            background: var(--card-bg);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid transparent;
        }

        .log-header {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 15px;
            margin-bottom: 15px;
        }

        .query-info {
            margin-bottom: 10px;
        }

        .query-label {
            font-weight: bold;
            color: var(--text-secondary);
            font-size: 0.9em;
            text-transform: uppercase;
        }

        .query-text {
            font-size: 1.1em;
            margin: 5px 0 15px 0;
            background: var(--bg-color);
            padding: 10px;
            border-radius: 4px;
        }

        .recall-badges {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }

        .badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 500;
        }

        .badge-success { background: var(--success-color); color: var(--success-text); }
        .badge-fail { background: var(--failure-color); color: var(--failure-text); }

        .results-comparison {
            display: flex;
            gap: 20px;
        }

        .result-column {
            flex: 1;
            min-width: 0;
        }

        .column-header {
            font-weight: 500;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid var(--border-color);
        }

        .results-toggle-container {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px;
            background: var(--bg-color);
            border-radius: 6px;
        }

        .results-toggle-label {
            font-weight: 500;
            margin-right: 10px;
        }

        .doc-card-wrapper {
            border: 1px solid var(--border-color);
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 6px;
            font-size: 0.9em;
            position: relative;
        }

        .doc-card-wrapper.expected {
            border-color: var(--highlight-border);
            background-color: var(--highlight-bg);
            border-width: 2px;
        }

        .doc-card-wrapper.expected::after {
            content: "EXPECTED";
            position: absolute;
            top: -10px;
            right: 10px;
            background: var(--highlight-border);
            color: white;
            font-size: 0.7em;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
        }

        .doc-card {
            display: flex;
            align-items: flex-start;
        }

        .doc-number {
            display: inline-block;
            background: var(--text-secondary);
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            text-align: center;
            line-height: 24px;
            font-size: 0.75em;
            font-weight: bold;
            margin-right: 8px;
            flex-shrink: 0;
        }

        .doc-card-content {
            flex: 1;
        }

        .doc-id {
            font-family: monospace;
            color: var(--text-secondary);
            font-size: 0.85em;
            margin-bottom: 5px;
        }

        .doc-content {
            white-space: pre-wrap;
            max-height: 150px;
            overflow-y: auto;
        }

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
            margin-left: 10px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .3s;
            border-radius: 24px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: #495057;
        }

        input:checked + .slider:before {
            transform: translateX(26px);
        }

        .toggle-label {
            font-size: 0.85em;
            margin-left: 5px;
            color: var(--text-secondary);
        }

        .retrieved-content {
            display: none;
        }

        .filter-icon {
            margin-right: 6px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="tabs" id="tabs-container">
            <!-- Tabs will be generated here -->
        </div>

        <div id="tab-contents">
            <!-- Tab contents will be generated here -->
        </div>
    </div>

    <script>
        // Inject data from Python
        const allData = __ALL_DATA_PLACEHOLDER__;
        const overviewData = __OVERVIEW_DATA_PLACEHOLDER__;

        let charts = {};

        function initializeTabs() {
            const tabsContainer = document.getElementById('tabs-container');
            const tabContents = document.getElementById('tab-contents');

            // Create Overview tab
            const overviewTab = document.createElement('div');
            overviewTab.className = 'tab active';
            overviewTab.textContent = 'Overview';
            overviewTab.onclick = () => switchTab('overview');
            tabsContainer.appendChild(overviewTab);

            // Create overview content
            const overviewContent = document.createElement('div');
            overviewContent.id = 'tab-overview';
            overviewContent.className = 'tab-content active';
            overviewContent.innerHTML = renderOverview();
            tabContents.appendChild(overviewContent);

            // Create tabs for each run
            allData.forEach((item, idx) => {
                const runId = item.data.results?.run_id || item.filename;

                const tab = document.createElement('div');
                tab.className = 'tab';
                tab.textContent = runId;
                tab.onclick = () => switchTab(`run-${idx}`);
                tabsContainer.appendChild(tab);

                const content = document.createElement('div');
                content.id = `tab-run-${idx}`;
                content.className = 'tab-content';
                content.innerHTML = renderRunContent(item.data, idx);
                tabContents.appendChild(content);
            });

            // Initialize charts after a short delay to ensure DOM is ready
            setTimeout(() => {
                createCharts();
            }, 100);
        }

        function switchTab(tabId) {
            // Update tab active state
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');

            // Update content active state
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => content.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
        }

        function renderOverview() {
            return `
                <div class="overview-section">
                    <div class="chart-container">
                        <div class="chart-wrapper active" id="chart-wrapper-recall-1">
                            <canvas id="chart-recall-1"></canvas>
                        </div>
                        <div class="chart-wrapper" id="chart-wrapper-recall-5">
                            <canvas id="chart-recall-5"></canvas>
                        </div>
                        <div class="chart-wrapper" id="chart-wrapper-recall-10">
                            <canvas id="chart-recall-10"></canvas>
                        </div>
                    </div>
                    <div class="chart-selector">
                        <button class="active" onclick="switchChart('recall-1')">Recall@1</button>
                        <button onclick="switchChart('recall-5')">Recall@5</button>
                        <button onclick="switchChart('recall-10')">Recall@10</button>
                    </div>
                </div>
            `;
        }

        function switchChart(chartId) {
            // Update button active state
            const buttons = document.querySelectorAll('.chart-selector button');
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            // Update chart wrapper active state
            const wrappers = document.querySelectorAll('.chart-wrapper');
            wrappers.forEach(wrapper => wrapper.classList.remove('active'));
            document.getElementById(`chart-wrapper-${chartId}`).classList.add('active');
        }

        function createCharts() {
            const labels = overviewData.map(d => d.run_id);
            const recall1Data = overviewData.map(d => d.recall_1);
            const recall5Data = overviewData.map(d => d.recall_5);
            const recall10Data = overviewData.map(d => d.recall_10);

            const chartConfig = (data, label) => ({
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: label,
                        data: data,
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }]
                },
                plugins: [ChartDataLabels],
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 1.1,
                            ticks: {
                                callback: function(value) {
                                    if (value > 1) return '';
                                    return (value * 100).toFixed(0) + '%';
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return (context.parsed.y * 100).toFixed(2) + '%';
                                }
                            }
                        },
                        datalabels: {
                            display: true,
                            anchor: 'end',
                            align: 'top',
                            formatter: function(value) {
                                return (value * 100).toFixed(1) + '%';
                            },
                            font: {
                                weight: 'normal',
                                size: 12
                            },
                            color: '#000'
                        }
                    }
                }
            });

            // Destroy existing charts if they exist
            Object.values(charts).forEach(chart => chart.destroy());
            charts = {};

            // Create new charts
            const ctx1 = document.getElementById('chart-recall-1');
            const ctx5 = document.getElementById('chart-recall-5');
            const ctx10 = document.getElementById('chart-recall-10');

            if (ctx1) charts.recall1 = new Chart(ctx1, chartConfig(recall1Data, 'Recall@1'));
            if (ctx5) charts.recall5 = new Chart(ctx5, chartConfig(recall5Data, 'Recall@5'));
            if (ctx10) charts.recall10 = new Chart(ctx10, chartConfig(recall10Data, 'Recall@10'));
        }

        function renderRunContent(data, runIdx) {
            const results = data.results || {};
            const logs = data.log || {};
            const config = results.config || {};
            const configKeys = ['embed_method', 'rewrite_method', 'rerank_method', 'collection', 'data_dir'];

            return `
                <div class="header-section">
                    <h3>Metrics</h3>
                    <div class="metrics-grid">
                        ${Object.entries(results.metrics || {}).map(([key, value]) => `
                            <div class="metric-card">
                                <div class="metric-label">${key}</div>
                                <div class="metric-value">${typeof value === 'number' ? value.toFixed(4) : value}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 20px;">
                        <h3>Configuration</h3>
                        <div class="config-details">
                            ${configKeys.map(key => {
                                const value = config[key] !== undefined && config[key] !== null ? config[key] : 'None';
                                return `
                                    <div class="config-item">
                                        <div class="config-key">${key}:</div>
                                        <div class="config-value">${value}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <div class="controls">
                    <label>
                        <strong>
                            <i class="fas fa-filter filter-icon"></i>
                            Filter:
                        </strong>
                    </label>
                    <select id="recall-k-filter-${runIdx}" onchange="updateStatusFilter(${runIdx})">
                        <option value="all">All</option>
                        <option value="1">Recall@1</option>
                        <option value="5">Recall@5</option>
                        <option value="10">Recall@10</option>
                    </select>

                    <select id="status-filter-${runIdx}" onchange="updateView(${runIdx})" disabled>
                        <option value="all">All</option>
                        <option value="success">Success</option>
                        <option value="fail">Failure</option>
                    </select>

                    <span id="count-display-${runIdx}" style="margin-left: auto; color: var(--text-secondary);"></span>
                </div>

                <div id="logs-list-${runIdx}"></div>
            `;
        }

        function updateStatusFilter(runIdx) {
            const recallKValue = document.getElementById(`recall-k-filter-${runIdx}`).value;
            const statusFilter = document.getElementById(`status-filter-${runIdx}`);

            if (recallKValue === 'all') {
                statusFilter.disabled = true;
                statusFilter.value = 'all';
            } else {
                statusFilter.disabled = false;
            }

            updateView(runIdx);
        }

        function updateView(runIdx) {
            const data = allData[runIdx].data;
            const logs = data.log || {};
            const logArray = Object.entries(logs).map(([id, logData]) => ({ id, ...logData }));

            const recallKValue = document.getElementById(`recall-k-filter-${runIdx}`).value;
            const statusValue = document.getElementById(`status-filter-${runIdx}`).value;
            const container = document.getElementById(`logs-list-${runIdx}`);
            const countDisplay = document.getElementById(`count-display-${runIdx}`);

            const filteredLogs = logArray.filter(log => {
                if (recallKValue === 'all') return true;

                const key = `Recall@${recallKValue}`;
                const isSuccess = log.recall && log.recall[key];

                if (statusValue === 'all') {
                    return true;
                }
                return statusValue === 'success' ? isSuccess : !isSuccess;
            });

            countDisplay.innerText = `Showing ${filteredLogs.length} of ${logArray.length} logs`;

            container.innerHTML = filteredLogs.map((log, idx) => {
                const expectedId = log.expected_doc_id;
                const resultsToggleId = `results-${runIdx}-${idx}`;
                const resultsCheckboxId = `results-checkbox-${runIdx}-${idx}`;

                const renderDocs = (docs, title) => {
                    if (!docs || docs.length === 0) return '';
                    return `
                        <div class="result-column">
                            <div class="column-header">${title}</div>
                            <div>
                                ${docs.map((doc, docIdx) => `
                                    <div class="doc-card-wrapper ${doc.doc_id === expectedId ? 'expected' : ''}">
                                        <div class="doc-card">
                                            <span class="doc-number">${docIdx + 1}</span>
                                            <div class="doc-card-content">
                                                <div class="doc-id">${doc.doc_id}</div>
                                                <div class="doc-content">${escapeHtml(doc.content)}</div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                };

                const recallOrder = ['Recall@1', 'Recall@5', 'Recall@10'];
                const recallBadges = recallOrder
                    .filter(k => log.recall && k in log.recall)
                    .map(k => {
                        const v = log.recall[k];
                        return `<span class="badge ${v ? 'badge-success' : 'badge-fail'}">${k}: ${v ? 'Pass' : 'Fail'}</span>`;
                    }).join('');

                return `
                    <div class="log-item">
                        <div class="log-header">
                            <div class="query-info">
                                <div class="query-label">Original Query</div>
                                <div class="query-text">${escapeHtml(log.original_query)}</div>
                            </div>

                            ${log.rewritten_query ? `
                                <div class="query-info">
                                    <div class="query-label">Rewritten Query</div>
                                    <div class="query-text">${escapeHtml(log.rewritten_query)}</div>
                                </div>
                            ` : ''}

                            <div class="recall-badges">
                                ${recallBadges}
                            </div>
                        </div>

                        <div class="results-toggle-container">
                            <span class="results-toggle-label">Show Results</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="${resultsCheckboxId}" onchange="toggleResults('${resultsToggleId}', '${resultsCheckboxId}')">
                                <span class="slider"></span>
                            </label>
                            <span class="toggle-label" id="label-${resultsCheckboxId}">Show</span>
                        </div>

                        <div class="results-comparison retrieved-content" id="${resultsToggleId}">
                            ${renderDocs(log.retrieved_results, 'Retrieved Results')}
                            ${renderDocs(log.reranked_results, 'Reranked Results')}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function toggleResults(contentId, checkboxId) {
            const element = document.getElementById(contentId);
            const checkbox = document.getElementById(checkboxId);
            const label = document.getElementById(`label-${checkboxId}`);

            if (element && checkbox && label) {
                if (checkbox.checked) {
                    element.style.display = 'flex';
                    label.textContent = 'Hide';
                } else {
                    element.style.display = 'none';
                    label.textContent = 'Show';
                }
            }
        }

        function escapeHtml(text) {
            if (!text) return '';
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        // Initialize on load
        initializeTabs();

        // Initialize views for all runs
        allData.forEach((item, idx) => {
            updateView(idx);
        });
    </script>
</body>
</html>
    """

    # Replace placeholders
    html_content = html_template.replace('__ALL_DATA_PLACEHOLDER__', json.dumps(all_data))
    html_content = html_content.replace('__OVERVIEW_DATA_PLACEHOLDER__', json.dumps(overview_data))

    # Get absolute path for the output file
    abs_output_file = os.path.abspath(output_file)

    with open(abs_output_file, 'w') as f:
        f.write(html_content)

    print(f"Sweep visualization saved to {abs_output_file}")

    # Auto-open in browser
    webbrowser.open(f'file://{abs_output_file}')
