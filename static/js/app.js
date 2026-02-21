// Project Hydra: Fusion Engine Frontend Logic

// --- Configuration ---
const CONFIG = {
    POLL_INTERVAL: 3000,
    COLORS: {
        RISK_LOW: '#10b981',   // Emerald 500
        RISK_MED: '#f59e0b',   // Amber 500
        RISK_HIGH: '#ef4444',  // Red 500
        RESOURCE: '#3b82f6',   // Blue 500
        HONEYPOT: '#f97316',   // Orange 500
        BG: '#0f172a'
    }
};

// --- State ---
let state = {
    isSimulating: false,
    selectedUser: null,
    graphData: { nodes: [], links: [] },
    currentTab: 'triage'
};

// --- DOM Elements ---
const els = {
    clock: document.getElementById('clock'),
    mlStatus: document.getElementById('ml-status-display'),
    perfEps: document.getElementById('perf-eps'),
    perfLatency: document.getElementById('perf-latency'),
    simBtn: document.getElementById('sim-btn'),


    // Triage View
    reductionRatio: document.getElementById('reduction-ratio'),
    totalAlerts: document.getElementById('total-alerts'),
    uniqueClusters: document.getElementById('unique-clusters'),
    outlierList: document.getElementById('outlier-list'),

    // Graph View
    graphContainer: document.getElementById('graph-container'),
    noSelection: document.getElementById('no-selection'),
    userDetails: document.getElementById('user-details'),

    // Details Panel
    detailUsername: document.getElementById('detail-username'),
    detailHrStatus: document.getElementById('detail-hr-status'),
    detailRiskBadge: document.getElementById('detail-risk-badge'),
    detailScore: document.getElementById('detail-score'),
    detailSensitivity: document.getElementById('detail-sensitivity'),

    // Advanced Intel
    detailIp: document.getElementById('detail-ip'),
    detailGeo: document.getElementById('detail-geo'),
    detailThreatSource: document.getElementById('detail-threat-source'),
    detailThreatBar: document.getElementById('detail-threat-bar'),
    detailThreatScore: document.getElementById('detail-threat-score'),
    detailMitreTags: document.getElementById('detail-mitre-tags'),

    // Response
    btnBlockUser: document.getElementById('btn-block-user'),
    msgBlocked: document.getElementById('msg-blocked'),

    featureChart: document.getElementById('feature-importance-chart'),
    soarRec: document.getElementById('soar-rec'),
    timeline: document.getElementById('activity-timeline'),

    // Banner
    honeypotBanner: document.getElementById('honeypot-banner')
};

// --- Initialization ---
function init() {
    updateClock();
    setInterval(updateClock, 1000);

    initGraph();
    initChart();

    // Start Polling
    fetchStatus();
    fetchTriageSummary();
    setInterval(fetchStatus, CONFIG.POLL_INTERVAL);
    setInterval(fetchGraphData, CONFIG.POLL_INTERVAL);
    setInterval(fetchGraphData, CONFIG.POLL_INTERVAL);
    setInterval(fetchTriageSummary, CONFIG.POLL_INTERVAL);

    // Initial fetch
    fetchSavedSearches();
    fetchDashboards(); // Load dashboards
    fetchLogs(); // Loads initial logs

    // Event Listeners

    // Event Listeners
    els.simBtn.addEventListener('click', toggleSimulation);
    window.addEventListener('resize', resizeGraph);

    // Initial Tab
    switchTab('triage');
}

function updateClock() {
    const now = new Date();
    els.clock.innerText = now.toLocaleTimeString();
}

// --- Tab Management ---
window.switchTab = function (tabName) {
    state.currentTab = tabName;

    // Update Title
    const titles = {
        'overview': 'Security Overview',
        'triage': 'Incident Management',
        'monitor': 'Fusion Graph Investigation',
        'logs': 'Data Search'
    };
    document.getElementById('page-title').innerText = titles[tabName] || 'Dashboard';

    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('flex');
    });

    // Remove active class from nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Show selected
    const view = document.getElementById(`view-${tabName}`);
    view.classList.remove('hidden');
    if (tabName !== 'monitor') view.classList.add('flex'); // Monitor handles its own layout

    // Highlight nav
    document.getElementById(`nav-${tabName}`).classList.add('active');

    if (tabName === 'monitor') resizeGraph();
    if (tabName === 'logs') renderLogs();
};

// --- Dashboard Chart (ChartJS) ---
let chartInstance = null;
function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                label: 'Events per Minute',
                data: Array(20).fill(0),
                borderColor: '#06b6d4', // Cyan
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#334155' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateChart(eps) {
    if (!chartInstance) return;
    const data = chartInstance.data.datasets[0].data;
    data.shift();
    data.push(eps * 60); // Approx events per minute
    chartInstance.update('none'); // Perf opt
}

// --- Log Search View ---
async function fetchLogs(query = '') {
    try {
        // Show loading state?
        const res = await fetch(`/api/logs?q=${encodeURIComponent(query)}`);
        if (res.ok) {
            const logs = await res.json();
            renderLogs(logs);
        } else {
            console.error("Fetch logs failed:", res.status);
        }
    } catch (e) { console.error(e); }
}

function renderLogs(logs) {
    if (!logs || !Array.isArray(logs)) {
        // console.warn("renderLogs expected array, got:", logs);
        return;
    }
    const tbody = document.getElementById('log-table-body');
    const thead = document.querySelector('#log-table thead tr');
    let html = '';

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">No results found</td></tr>';
        return;
    }

    // Detect if this is a standard log or a custom SPL table/stats
    // Standard logs have 'timestamp', 'action', 'sourcetype' etc.
    // If it's a stats result, keys might be different.
    const sample = logs[0];
    const isStandard = 'timestamp' in sample && 'action' in sample;

    if (isStandard) {
        // Restore Standard Headers if needed
        thead.innerHTML = `
            <th class="p-3 border-b border-slate-700 w-10">#</th>
            <th class="p-3 border-b border-slate-700 w-48">Time</th>
            <th class="p-3 border-b border-slate-700 w-32">SourceType</th>
            <th class="p-3 border-b border-slate-700">Event Raw Text</th>
        `;

        logs.forEach((log, i) => {
            const type = log.is_malicious ? 'ALERT' : 'INFO';
            const color = log.is_malicious ? 'text-red-400' : 'text-slate-400';
            const sourcetype = log.sourcetype || 'unknown';

            html += `
                <tr class="table-row-hover transition-colors border-b border-slate-800 font-mono text-xs">
                    <td class="p-3 text-slate-500">${i + 1}</td>
                    <td class="p-3 text-cyan-500 whitespace-nowrap">${new Date(log.timestamp).toLocaleString()}</td>
                    <td class="p-3 text-amber-500 cursor-pointer hover:underline" onclick="setLogSearch('sourcetype=${sourcetype}')">${sourcetype}</td>
                    <td class="p-3 ${color} break-all">
                        <span class="font-bold">[${type}]</span> 
                        action=${log.action} 
                        src_ip=${log.source_ip} 
                        user=${log.user_id} 
                        resource=${log.resource_id}
                    </td>
                </tr>
            `;
        });
    } else {
        // Dynamic Table for SPL Results (stats/table)
        const keys = Object.keys(sample);

        // Generate Headers
        let headersHtml = `<th class="p-3 border-b border-slate-700 w-10">#</th>`;
        keys.forEach(k => {
            headersHtml += `<th class="p-3 border-b border-slate-700 capitalize">${k}</th>`;
        });
        thead.innerHTML = headersHtml;

        // Generate Rows
        logs.forEach((row, i) => {
            html += `<tr class="table-row-hover transition-colors border-b border-slate-800 font-mono text-xs">`;
            html += `<td class="p-3 text-slate-500">${i + 1}</td>`;
            keys.forEach(k => {
                let val = row[k];
                if (typeof val === 'object') val = JSON.stringify(val);
                html += `<td class="p-3 text-slate-300 break-all">${val}</td>`;
            });
            html += `</tr>`;
        });
    }

    tbody.innerHTML = html;
}

// Search Bar Logic
document.querySelector('#view-logs button.bg-green-600').onclick = () => {
    const query = document.querySelector('#view-logs input').value;
    fetchLogs(query);
};

function setLogSearch(query) {
    document.querySelector('#view-logs input').value = query;
    fetchLogs(query);
}

// --- Knowledge Objects: Saved Searches ---
async function fetchSavedSearches() {
    try {
        const res = await fetch('/api/saved_searches');
        const searches = await res.json();
        const select = document.getElementById('saved-searches-dropdown');

        // Keep first option
        select.innerHTML = '<option value="">Saved Searches...</option>';

        searches.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.dataset.query = s.query;
            opt.innerText = s.name;
            select.appendChild(opt);
        });

        // Store in state if needed
        state.savedSearches = searches;
    } catch (e) { console.error(e); }
}

function loadSavedSearch(id) {
    if (!id) return;
    const search = state.savedSearches.find(s => s.id === id);
    if (search) {
        setLogSearch(search.query);
    }
}

async function saveCurrentSearch() {
    const query = document.querySelector('#view-logs input').value;
    if (!query) return alert("Enter a query first");

    const name = prompt("Name this search:");
    if (!name) return;

    try {
        const res = await fetch('/api/saved_searches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, query })
        });
        const data = await res.json();
        if (data.status === 'success') {
            alert("Search Saved!");
            fetchSavedSearches();
        }
    } catch (e) { console.error(e); }
}

// --- API Interaction ---

async function fetchStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const eps = data.eps || 0;

        els.mlStatus.innerText = data.ml_status;
        document.getElementById('dash-total-events').innerText = data.total_logs;

        // Performance (Update chart)
        updateChart(eps);

    } catch (e) { console.error(e); }
}

async function fetchTriageSummary() {
    if (state.currentTab !== 'triage') return; // Optimize

    try {
        const res = await fetch('/api/triage_summary');
        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        els.reductionRatio.innerText = data.reduction_ratio;
        els.totalAlerts.innerText = data.total_alerts;
        els.uniqueClusters.innerText = data.unique_clusters;

        // Render Outliers
        els.outlierList.innerHTML = '';
        if (data.outliers.length === 0) {
            els.outlierList.innerHTML = '<div class="text-slate-500 text-center mt-4">No high priority outliers.</div>';
        } else {
            data.outliers.forEach(alert => {
                const div = document.createElement('div');
                div.className = "p-3 rounded bg-slate-800/50 border-l-4 border-red-500 text-xs text-slate-300 font-mono";
                div.innerText = alert;
                els.outlierList.appendChild(div);
            });
        }
    } catch (e) { console.error(e); }
}

async function fetchGraphData() {
    try {
        const res = await fetch('/api/graph_data');
        if (res.status === 401) {
            window.location.href = '/login'; // Redirect to login on 401
            return;
        }
        const data = await res.json();
        updateGraph(data);

        // Check for Honeypot Access (Critical Risk)
        const critical = data.nodes.some(n => n.risk > 98);
        if (critical) {
            els.honeypotBanner.classList.remove('hidden');
        } else {
            els.honeypotBanner.classList.add('hidden');
        }

    } catch (e) { console.error(e); }
}

async function fetchUserContext(userId) {
    try {
        const res = await fetch(`/api/user_context/${userId}`);
        if (!res.ok) {
            // Handle 404 or error quietly
            // document.getElementById('user-details').innerHTML = '<div class="p-4 text-red-500">User not found</div>';
            return;
        }
        const data = await res.json();
        renderUserContext(data);
    } catch (e) { console.error(e); }
}

async function toggleSimulation() {
    state.isSimulating = !state.isSimulating;
    els.simBtn.innerHTML = state.isSimulating
        ? '<span class="animate-spin">↻</span> STOP SIMULATION'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> START SIMULATION';

    els.simBtn.className = state.isSimulating
        ? "w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-lg transition-all flex items-center justify-center gap-2"
        : "w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2";

    if (state.isSimulating) {
        startInjectionLoop();
    }
}

let injectionInterval;
function startInjectionLoop() {
    if (injectionInterval) clearInterval(injectionInterval);
    injectionInterval = setInterval(async () => {
        if (!state.isSimulating) {
            clearInterval(injectionInterval);
            return;
        }
        // Random injection logic handled by backend simulator mostly, 
        // but we trigger it here to ensure activity.
        await fetch('/api/inject_log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ malicious: Math.random() > 0.8 })
        });
    }, 200); // 5 EPS for visibility
}

window.injectMalicious = async function () {
    await fetch('/api/inject_log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ malicious: true })
    });
    fetchTriageSummary(); // Refresh immediately
};

window.injectHoneypot = async function () {
    // We need to simulate a honeypot access. 
    // The backend random generator does this occasionally, but let's force it if possible.
    // Since /api/inject_log uses random resource, we might need to call it multiple times 
    // or just wait. For now, we'll just rely on the random chance or add a specific param if needed.
    // Let's just inject malicious and hope it hits a decoy (it has a chance).
    // Actually, let's just inject a few times.
    for (let i = 0; i < 5; i++) injectMalicious();
};

window.runScenario = async function (e, type) {
    // Visual feedback
    const originalText = e.target.innerText;
    e.target.innerText = "EXECUTING...";
    e.target.disabled = true;

    try {
        const res = await fetch('/api/simulate_scenario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario: type })
        });
        const data = await res.json();

        // Show banner/alert
        alert(`SCENARIO EXECUTED: ${data.message}`);
        fetchTriageSummary();
        fetchLogs(); // Refresh logs to show new attack data

    } catch (e) { console.error(e); }

    e.target.innerText = originalText;
    e.target.disabled = false;
};

window.blockCurrentUser = async function () {
    if (!state.selectedUser) return;

    if (!confirm(`Are you sure you want to BLOCK ${state.selectedUser}? This will isolate the user.`)) return;

    try {
        const res = await fetch('/api/block_entity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity_id: state.selectedUser })
        });
        const data = await res.json();

        if (data.status === 'success' || data.status === 'ignored') {
            // Refresh context to show blocked status
            fetchUserContext(state.selectedUser);
        }
    } catch (e) { console.error(e); }
};

// --- Feature 3: Automated Playbooks (SOAR) ---
window.runSoar = async function (action) {
    if (!state.selectedUser) return;

    const consoleEl = document.getElementById('soar-console');
    consoleEl.classList.remove('hidden');
    consoleEl.textContent = `> Running playbook: ${action}...\n`;

    // Determine target based on selected user context (mock logic)
    // In real app, we'd grab the associated IP from the user details
    const target = (action === 'whois') ? 'Suspicious-ISP.net' : '192.168.1.105';

    try {
        const res = await fetch(`/api/soar/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: target })
        });
        const data = await res.json();

        consoleEl.textContent += `> Execution complete.\n\n${data.output}`;
        consoleEl.scrollTop = consoleEl.scrollHeight;

    } catch (e) {
        consoleEl.textContent += `> Error: ${e.message}`;
    }
};

window.exportReport = function () {
    if (!state.selectedUser) return;
    window.location.href = `/api/export_report/${state.selectedUser}`;
};

// --- Feature 4: Visual SPL Search ---
window.setSearch = function (query) {
    document.getElementById('graph-search').value = query;
    applyGraphFilter(query);
};

window.handleGraphSearch = function (e) {
    if (e.key === 'Enter') {
        applyGraphFilter(e.target.value);
    }
};

window.handleGraphSearchClick = function () {
    const query = document.getElementById('graph-search').value;
    applyGraphFilter(query);
};

function applyGraphFilter(query) {
    if (!node) return;

    const term = query.toLowerCase().trim();
    if (!term) {
        // Reset
        node.style('opacity', 1);
        link.style('opacity', 0.6);
        return;
    }

    // Parse simplified SPL
    // supported: user:name, risk>50, severity:high

    let targetId = null;
    let minRisk = 0;

    if (term.startsWith('user:')) {
        targetId = term.split(':')[1];
    } else if (term.includes('risk>')) {
        minRisk = parseInt(term.split('>')[1]);
    }

    // Apply Highlight
    node.style('opacity', d => {
        if (targetId && d.id.toLowerCase().includes(targetId)) return 1;
        if (minRisk > 0 && d.risk > minRisk) return 1;
        if (!targetId && minRisk === 0 && d.id.toLowerCase().includes(term)) return 1; // Generic search
        return 0.1; // Dim others
    });

    link.style('opacity', d => {
        // Only show links connected to visible nodes
        // Simplified check: if source or target is highlighted, show link
        // We'd need to re-evaluate node opacity here, but for now just dim all links unless precise match
        return 0.1;
    });
}

window.promptAddEntity = async function () {
    const name = prompt("Enter Entity Name (e.g. User_Alpha):");
    if (!name) return;

    try {
        const res = await fetch('/api/add_entity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: name })
        });
        const data = await res.json();
        if (data.status === 'success') {
            // alert(`Added ${name}`);
            fetchTriageSummary();
            fetchGraphData(); // Update graph
            fetchLogs(); // Update logs
            alert(`System ${name} added! It should appear in the graph shortly.`);
        } else {
            alert(data.message);
        }
    } catch (e) { console.error(e); }
};


// --- Splunk v2: Dashboards ---

async function fetchDashboards() {
    try {
        const res = await fetch('/api/dashboards');
        const dashboards = await res.json();

        state.dashboards = dashboards;

        const select = document.getElementById('dashboard-select');
        select.innerHTML = '';

        dashboards.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.innerText = d.title;
            select.appendChild(opt);
        });

        // Load first one
        if (dashboards.length > 0) loadDashboard(dashboards[0].id);

    } catch (e) { console.error(e); }
}

async function loadDashboard(id) {
    const dashboard = state.dashboards.find(d => d.id === id);
    if (!dashboard) return;

    state.currentDashboard = dashboard;
    const grid = document.getElementById('dashboard-grid');
    grid.innerHTML = ''; // Clear existing

    // Render Panels
    for (const panel of dashboard.panels) {
        await renderPanel(panel, grid);
    }
}

async function renderPanel(panel, container) {
    // 1. Create Card
    const card = document.createElement('div');
    const widthClass = panel.width === 'full' ? 'col-span-2' : 'col-span-1';
    card.className = `bg-slate-800/50 border border-slate-700 rounded flex flex-col overflow-hidden h-64 ${widthClass}`;

    card.innerHTML = `
        <div class="px-4 py-2 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
            <h3 class="font-bold text-slate-300 text-sm">${panel.title}</h3>
            <span class="text-xs text-slate-500 font-mono">${panel.type}</span>
        </div>
        <div class="flex-1 overflow-auto p-4 relative" id="panel-content-${Math.random().toString(36).substr(2, 9)}">
            <div class="absolute inset-0 flex items-center justify-center text-slate-600 animate-pulse">Loading...</div>
        </div>
    `;
    container.appendChild(card);

    const contentDiv = card.querySelector('div[id^="panel-content"]');

    // 2. Fetch Data
    try {
        const res = await fetch(`/api/logs?q=${encodeURIComponent(panel.query)}&limit=50`);
        const data = await res.json();
        contentDiv.innerHTML = ''; // Clear loading

        if (panel.type === 'table') {
            renderPanelTable(data, contentDiv);
        } else if (panel.type === 'single') {
            renderPanelSingle(data, contentDiv);
        } else if (panel.type === 'chart') {
            renderPanelChart(data, contentDiv);
        }
    } catch (e) {
        contentDiv.innerHTML = `<div class="text-red-500 text-xs p-2">Error: ${e.message}</div>`;
    }
}

function renderPanelTable(data, container) {
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="text-slate-500 text-center mt-10">No results</div>';
        return;
    }
    const keys = Object.keys(data[0]);
    let html = '<table class="w-full text-left text-xs border-collapse">';
    // Header
    html += '<thead><tr class="text-slate-500 border-b border-slate-700">';
    keys.forEach(k => html += `<th class="p-2">${k}</th>`);
    html += '</tr></thead><tbody>';
    // Rows
    data.forEach(row => {
        html += '<tr class="border-b border-slate-800 hover:bg-slate-700/30">';
        keys.forEach(k => {
            let val = row[k];
            if (typeof val === 'object') val = JSON.stringify(val);
            html += `<td class="p-2 text-slate-300 break-all">${val}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = `<div class="overflow-auto h-full">${html}</div>`;
}

function renderPanelSingle(data, container) {
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="text-4xl font-bold text-slate-500 text-center mt-10">0</div>';
        return;
    }
    // Assuming first key of first row
    const val = Object.values(data[0])[0];
    container.innerHTML = `<div class="flex items-center justify-center h-full text-5xl font-bold text-cyan-400">${val}</div>`;
}

function renderPanelChart(data, container) {
    if (!data || data.length === 0) return;

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Expecting stats: [{value: 'x', count: 10}] or similar
    // Auto-detect label/data keys
    const keys = Object.keys(data[0]);
    const labelKey = keys[0]; // e.g. "value"
    const dataKey = keys[1];  // e.g. "count"

    const labels = data.map(d => d[labelKey]);
    const values = data.map(d => d[dataKey]);

    new Chart(canvas, {
        type: 'bar', // Default to bar
        data: {
            labels: labels,
            datasets: [{
                label: dataKey,
                data: values,
                backgroundColor: 'rgba(6, 182, 212, 0.5)',
                borderColor: '#06b6d4',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#334155' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

window.promptCreateDashboard = async function () {
    const title = prompt("New Dashboard Title:");
    if (!title) return;

    const newDash = {
        title: title,
        panels: [] // Start empty
    };

    try {
        const res = await fetch('/api/dashboards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDash)
        });
        const data = await res.json();
        if (data.status === 'success') {
            fetchDashboards();
            alert("Dashboard created! (Edit features coming soon)");
        }
    } catch (e) { console.error(e); }
};

let simulation, svg, g, link, node;

function initGraph() {
    const container = els.graphContainer;
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg = d3.select("#graph-container").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", (event) => {
            g.attr("transform", event.transform);
        }));

    g = svg.append("g");

    simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(100)) // Increase distance
        .force("charge", d3.forceManyBody().strength(-400)) // Increase repulsion
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(30)); // Prevent overlap
}

function resizeGraph() {
    const container = els.graphContainer;
    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.attr("width", width).attr("height", height);
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart();
}

function updateGraph(data) {
    const nodes = data.nodes.map(d => Object.create(d));
    // Filter low weight links to reduce clutter (e.g. weight < 2)
    // For now, let's just show top 80% to clean it up
    const links = data.links.filter(l => l.value > 1).map(d => Object.create(d));

    // Links
    link = g.selectAll(".link").data(links, d => `${d.source}-${d.target}`);
    link.exit().remove();
    const linkEnter = link.enter().append("line")
        .attr("class", "link")
        .attr("stroke", "#475569")
        .attr("stroke-opacity", 0.4) // Lower opacity for subtlety
        .attr("stroke-width", d => Math.sqrt(d.value));
    link = linkEnter.merge(link);

    // Nodes
    node = g.selectAll(".node").data(nodes, d => d.id);
    node.exit().transition().duration(500).attr("r", 0).remove();

    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("click", (event, d) => {
            if (d.type === 'user') selectUser(d.id);
        })
        .on("mouseover", function (event, d) {
            d3.select(this).select("text").transition().duration(200).style("opacity", 1);
            d3.select(this).select("circle").attr("stroke", "#fff").attr("stroke-width", 3);
        })
        .on("mouseout", function (event, d) {
            // Keep label if high risk or selected
            if (d.risk < 70 && d.id !== state.selectedUser) {
                d3.select(this).select("text").transition().duration(200).style("opacity", 0);
            }
            d3.select(this).select("circle").attr("stroke", d.id === state.selectedUser ? "#fff" : "none").attr("stroke-width", 2);
        });

    // Draw shapes
    nodeEnter.each(function (d) {
        const el = d3.select(this);
        if (d.type === 'user') {
            // Size based on risk (min 8, max 20)
            const r = 8 + (d.risk / 100) * 12;
            el.append("circle").attr("r", r);

            // Pulse effect for high risk
            if (d.risk > 80) {
                el.append("circle")
                    .attr("r", r)
                    .attr("class", "animate-ping opacity-75")
                    .attr("fill", CONFIG.COLORS.RISK_HIGH);
            }
        } else {
            // Resource
            el.append("rect")
                .attr("width", 12).attr("height", 12)
                .attr("x", -6).attr("y", -6);
        }

        // Label (Hidden by default unless high risk)
        el.append("text")
            .attr("dy", -15)
            .attr("text-anchor", "middle")
            .text(d.id)
            .attr("fill", "#e2e8f0")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .style("pointer-events", "none")
            .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)")
            .style("opacity", d.risk > 70 ? 1 : 0); // Only show high risk labels by default
    });

    node = nodeEnter.merge(node);

    // Styling
    node.select("circle")
        .attr("fill", d => {
            if (d.risk > 90) return CONFIG.COLORS.RISK_HIGH;
            if (d.risk > 50) return CONFIG.COLORS.RISK_MED;
            return CONFIG.COLORS.RISK_LOW;
        })
        .attr("stroke", d => d.id === state.selectedUser ? "#fff" : "none")
        .attr("stroke-width", 2)
        // Add glow for high risk
        .attr("filter", d => d.risk > 80 ? "drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))" : "none");

    node.select("rect")
        .attr("fill", d => d.is_decoy ? CONFIG.COLORS.HONEYPOT : CONFIG.COLORS.RESOURCE)
        .attr("stroke", d => d.is_decoy ? "#ef4444" : "none")
        .attr("stroke-width", d => d.is_decoy ? 2 : 0);

    simulation.nodes(nodes).on("tick", ticked);
    simulation.force("link").links(links);
    simulation.alpha(0.1).restart();
}

function ticked() {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
}

// Drag
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}
function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}
function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// --- Intelligence Panel ---

function selectUser(userId) {
    state.selectedUser = userId;
    fetchUserContext(userId);

    els.noSelection.classList.add('hidden');
    els.userDetails.classList.remove('hidden');
    els.userDetails.classList.add('flex');
}

function renderUserContext(data) {
    els.detailUsername.innerText = data.user_id;
    els.detailHrStatus.innerText = `HR: ${data.hr_status}`;
    els.detailScore.innerText = Math.round(data.risk_score);
    els.detailSensitivity.innerText = data.sensitivity;

    // Badge
    if (data.risk_score > 90) {
        els.detailRiskBadge.className = "px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400";
        els.detailRiskBadge.innerText = "CRITICAL";
    } else if (data.risk_score > 50) {
        els.detailRiskBadge.className = "px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400";
        els.detailRiskBadge.innerText = "HIGH";
    }

    // Advanced Intel

    // Advanced Intel
    els.detailIp.innerText = data.last_ip || '0.0.0.0';
    els.detailGeo.innerText = data.geo_location || 'Unknown';

    if (data.threat_intel) {
        const score = data.threat_intel.score;
        els.detailThreatScore.innerText = `${score}/100`;
        els.detailThreatSource.innerText = `Source: ${data.threat_intel.source}`;
        els.detailThreatBar.style.width = `${score}%`;
        els.detailThreatBar.className = score > 80 ? "h-full bg-red-500" : "h-full bg-emerald-500";
    }

    els.detailMitreTags.innerHTML = '';
    if (data.mitre_tags) {
        data.mitre_tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = "px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30";
            span.innerText = tag;
            els.detailMitreTags.appendChild(span);
        });
    }

    // Response Actions
    if (data.is_blocked) {
        els.btnBlockUser.classList.add('hidden');
        els.msgBlocked.classList.remove('hidden');
    } else {
        els.btnBlockUser.classList.remove('hidden');
        els.msgBlocked.classList.add('hidden');
    }

    // Feature Importance Chart
    els.featureChart.innerHTML = '';
    for (const [feature, weight] of Object.entries(data.feature_importance)) {
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>${feature}</span>
                <span>${weight}%</span>
            </div>
            <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-cyan-500" style="width: ${weight}%"></div>
            </div>
        `;
        els.featureChart.appendChild(div);
    }

    // SOAR Rec
    els.soarRec.innerText = data.recommendation;
    els.soarRec.className = "p-3 rounded border text-sm italic " +
        (data.risk_score > 90 ? "bg-red-900/20 border-red-500/30 text-red-200" :
            data.risk_score > 50 ? "bg-yellow-900/20 border-yellow-500/30 text-yellow-200" :
                "bg-slate-800 border-slate-600 text-slate-300");

    // Timeline
    els.timeline.innerHTML = '';
    data.recent_events.slice().reverse().forEach(e => {
        const div = document.createElement('div');
        div.className = "p-2 rounded bg-slate-800/40 border-l-2 " + (e.is_malicious ? "border-red-500" : "border-slate-600");
        div.innerHTML = `
            <div class="flex justify-between text-[10px] text-slate-400">
                <span>${new Date(e.timestamp).toLocaleTimeString()}</span>
                <span>${e.action}</span>
            </div>
            <div class="text-xs text-slate-200 truncate">${e.resource_id}</div>
        `;
        els.timeline.appendChild(div);
    });
}

// Start
init();
