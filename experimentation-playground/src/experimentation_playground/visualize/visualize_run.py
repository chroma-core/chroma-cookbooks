import json
import os
import webbrowser
from typing import Union, Dict, Any

def visualize_run(input_data: Union[str, Dict[str, Any]], output_file: str = "visualization.html"):
    """
    Generates a standalone HTML file to visualize the results of a run.
    
    Args:
        input_data: Filepath to the results JSON or the results dictionary itself.
        output_file: Path where the HTML file will be saved.
    """
    if isinstance(input_data, str):
        with open(input_data, 'r') as f:
            data = json.load(f)
    else:
        data = input_data

    html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Run Visualization</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
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
            min-width: 0; /* Prevents overflow */
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

        .doc-card {
            display: flex;
            align-items: flex-start;
        }

        .doc-card-content {
            flex: 1;
        }
    </style>
</head>
<body>
    <div id="app" class="container">
        <!-- Content will be rendered here -->
    </div>

    <script>
        // Inject data from Python
        const rawData = __DATA_PLACEHOLDER__;

        // Helper to safely access nested properties
        const results = rawData.results || {};
        const logs = rawData.log || {};
        const logArray = Object.entries(logs).map(([id, data]) => ({ id, ...data }));

        function render() {
            const app = document.getElementById('app');
            
            // --- Header Section ---
            const config = results.config || {};
            const configKeys = ['embed_method', 'rewrite_method', 'rerank_method', 'collection', 'data_dir'];

            const headerHtml = `
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
            `;

            // --- Controls Section ---
            const controlsHtml = `
                <div class="controls">
                    <label>
                        <strong>
                            <i class="fas fa-filter filter-icon"></i>
                            Filter:
                        </strong>
                    </label>
                    <select id="recall-k-filter" onchange="updateStatusFilter()">
                        <option value="all">All</option>
                        <option value="1">Recall@1</option>
                        <option value="5">Recall@5</option>
                        <option value="10">Recall@10</option>
                    </select>

                    <select id="status-filter" onchange="updateView()" disabled>
                        <option value="all">All</option>
                        <option value="success">Success</option>
                        <option value="fail">Failure</option>
                    </select>

                    <span id="count-display" style="margin-left: auto; color: var(--text-secondary);"></span>
                </div>
            `;

            // --- Logs Section ---
            const logsContainer = `<div id="logs-list"></div>`;

            app.innerHTML = headerHtml + controlsHtml + logsContainer;
            updateView();
        }

        function updateStatusFilter() {
            const recallKValue = document.getElementById('recall-k-filter').value;
            const statusFilter = document.getElementById('status-filter');

            if (recallKValue === 'all') {
                statusFilter.disabled = true;
                statusFilter.value = 'all';
            } else {
                statusFilter.disabled = false;
            }

            updateView();
        }

        function updateView() {
            const recallKValue = document.getElementById('recall-k-filter').value;
            const statusValue = document.getElementById('status-filter').value;
            const container = document.getElementById('logs-list');
            const countDisplay = document.getElementById('count-display');

            const filteredLogs = logArray.filter(log => {
                if (recallKValue === 'all') return true;

                const key = `Recall@${recallKValue}`;
                const isSuccess = log.recall && log.recall[key];

                if (statusValue === 'all') {
                    return true; // Show all when status filter is "all"
                }
                return statusValue === 'success' ? isSuccess : !isSuccess;
            });

            countDisplay.innerText = `Showing ${filteredLogs.length} of ${logArray.length} logs`;

            container.innerHTML = filteredLogs.map((log, idx) => {
                const expectedId = log.expected_doc_id;
                const resultsToggleId = `results-${idx}`;
                const resultsCheckboxId = `results-checkbox-${idx}`;

                // Helper to render doc list
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

                // Sort recall badges by k value (1, 5, 10)
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

        // Initial render
        render();
    </script>
</body>
</html>
    """

    html_content = html_template.replace('__DATA_PLACEHOLDER__', json.dumps(data))

    # Get absolute path for the output file
    abs_output_file = os.path.abspath(output_file)

    with open(abs_output_file, 'w') as f:
        f.write(html_content)

    print(f"Visualization saved to {abs_output_file}")

    # Auto-open in browser
    webbrowser.open(f'file://{abs_output_file}')

