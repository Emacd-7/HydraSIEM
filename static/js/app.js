// Project Hydra Frontend Logic

// --- Configuration ---
const CONFIG = {
    POLL_INTERVAL: 3000, // 3 seconds
    GRAPH_WIDTH: 0, // Set dynamically
    GRAPH_HEIGHT: 0,
    COLORS: {
        RISK_LOW: '#10b981',   // Emerald 500
        RISK_MED: '#f59e0b',   // Amber 500
        RISK_HIGH: '#ef4444',  // Red 500
        RESOURCE: '#3b82f6',   // Blue 500
        BG: '#0f172a'
    }
};

// --- State ---
let state = {
    isSimulating: false,
    selectedUser: null,
    graphData: { nodes: [], links: [] },
    chartInstance: null
};

// --- DOM Elements ---
const els = {
    clock: document.getElementById('clock'),
    maxRisk: document.getElementById('max-risk-display'),
    totalUsers: document.getElementById('total-users-display'),
    mlStatus: document.getElementById('ml-status-display'),
    simBtn: document.getElementById('sim-btn'),
    graphContainer: document.getElementById('graph-container'),
    noSelection: document.getElementById('no-selection'),
    userDetails: document.getElementById('user-details'),
    detailUsername: document.getElementById('detail-username'),
    detailRiskBadge: document.getElementById('detail-risk-badge'),
    detailScore: document.getElementById('detail-score'),
    detailDivScore: document.getElementById('detail-div-score'),
    timeline: document.getElementById('activity-timeline'),
    // New Elements
    aiAnalyzeBtn: document.getElementById('ai-analyze-btn'),
    aiModal: document.getElementById('ai-modal'),
    aiReportContent: document.getElementById('ai-report-content'),
    hqlInput: document.getElementById('hql-input'),
    hqlRunBtn: document.getElementById('hql-run-btn'),
    hqlResults: document.getElementById('hql-results'),
    hqlStatus: document.getElementById('hql-status')
};

// --- Initialization ---
function init() {
    updateClock();
    setInterval(updateClock, 1000);

    initGraph();
    initChart();

    // Start Polling
    fetchStatus();
    setInterval(fetchStatus, CONFIG.POLL_INTERVAL);
    setInterval(fetchGraphData, CONFIG.POLL_INTERVAL);

    // Event Listeners
    els.simBtn.addEventListener('click', toggleSimulation);
    els.aiAnalyzeBtn.addEventListener('click', generateAIReport);
    els.hqlRunBtn.addEventListener('click', runHQL);

    window.addEventListener('resize', resizeGraph);
}

function updateClock() {
    const now = new Date();
    els.clock.innerText = now.toLocaleTimeString();
}

// --- Tab Management ---
window.switchTab = function (tabName) {
    // Hide all views
    ['monitor', 'hunter', 'intel'].forEach(t => {
        document.getElementById(`view-${t}`).classList.add('hidden');
        document.getElementById(`view-${t}`).classList.remove('flex');

        const btn = document.getElementById(`tab-${t}`);
        btn.classList.remove('text-cyan-400', 'border-b-2', 'border-cyan-400');
        btn.classList.add('text-slate-400');
    });

    // Show selected view
    document.getElementById(`view-${tabName}`).classList.remove('hidden');
    document.getElementById(`view-${tabName}`).classList.add('flex'); // or flex-col depending on layout

    // Highlight button
    const activeBtn = document.getElementById(`tab-${tabName}`);
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('text-cyan-400', 'border-b-2', 'border-cyan-400');

    if (tabName === 'monitor') resizeGraph();
};

// --- API Interaction ---

async function fetchStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();

        els.maxRisk.innerText = data.max_risk_score.toFixed(1);
        els.totalUsers.innerText = data.total_users;
        els.mlStatus.innerText = data.ml_status;

        // Dynamic coloring for risk
        if (data.max_risk_score > 70) els.maxRisk.className = "text-3xl font-bold text-red-500 mt-1 animate-pulse";
        else if (data.max_risk_score > 40) els.maxRisk.className = "text-3xl font-bold text-yellow-400 mt-1";
        else els.maxRisk.className = "text-3xl font-bold text-emerald-400 mt-1";

    } catch (e) {
        console.error("Status fetch failed", e);
    }
}

async function fetchGraphData() {
    try {
        const res = await fetch('/api/graph_data');
        const data = await res.json();
        updateGraph(data);
    } catch (e) {
        console.error("Graph fetch failed", e);
    }
}

async function fetchUserContext(userId) {
    try {
        const res = await fetch(`/api/user_context/${userId}`);
        const data = await res.json();
        renderUserContext(data);
    } catch (e) {
        console.error("User context fetch failed", e);
    }
}

async function toggleSimulation() {
    state.isSimulating = !state.isSimulating;
    els.simBtn.innerHTML = state.isSimulating
        ? '<span class="animate-spin">↻</span> STOP SIMULATION'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> START SIMULATION';

    els.simBtn.className = state.isSimulating
        ? "w-full h-full bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-lg transition-all flex items-center justify-center gap-2"
        : "w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2";

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

        // Randomly decide if malicious
        const isMalicious = Math.random() > 0.85;

        await fetch('/api/inject_log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ malicious: isMalicious })
        });

    }, 1000); // Inject every second
}

// --- Enterprise Features ---

async function generateAIReport() {
    if (!state.selectedUser) return;

    els.aiAnalyzeBtn.innerHTML = '<span class="animate-spin">↻</span> ANALYZING...';
    els.aiAnalyzeBtn.disabled = true;

    try {
        const res = await fetch('/api/analyze_incident', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.selectedUser })
        });
        const data = await res.json();

        // Render Report
        let html = `
            <div class="bg-slate-800 p-4 rounded border border-slate-700 mb-4">
                <div class="text-xs text-slate-400 uppercase mb-1">Severity</div>
                <div class="text-xl font-bold ${data.severity === 'Critical' ? 'text-red-500' : 'text-yellow-400'}">${data.severity}</div>
            </div>
            <div>
                <h4 class="font-bold text-white mb-2">Incident Narrative</h4>
                <p class="mb-4">${data.summary}</p>
            </div>
            <div>
                <h4 class="font-bold text-white mb-2">MITRE ATT&CK Mapping</h4>
                <div class="bg-slate-800 p-2 rounded font-mono text-xs text-cyan-400">${data.mitre_technique}</div>
            </div>
            <div class="mt-4">
                <h4 class="font-bold text-white mb-2">Recommended Actions</h4>
                <div class="bg-red-900/20 border border-red-500/30 p-3 rounded text-red-200">
                    ${data.recommendation}
                </div>
            </div>
        `;

        els.aiReportContent.innerHTML = html;
        els.aiModal.classList.remove('hidden');

    } catch (e) {
        console.error("AI Analysis failed", e);
        alert("Failed to generate report.");
    } finally {
        els.aiAnalyzeBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            GENERATE AI INCIDENT REPORT
        `;
        els.aiAnalyzeBtn.disabled = false;
    }
}

window.closeAIModal = function () {
    els.aiModal.classList.add('hidden');
};

async function runHQL() {
    const query = els.hqlInput.value;
    if (!query) return;

    els.hqlRunBtn.innerText = '...';
    els.hqlStatus.innerText = 'Executing...';

    try {
        const res = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });
        const data = await res.json();

        if (data.error) {
            els.hqlResults.innerHTML = `<span class="text-red-400">Error: ${data.error}</span>`;
            els.hqlStatus.innerText = 'Error';
        } else {
            els.hqlStatus.innerText = `Success (${data.count} rows)`;
            if (data.results.length === 0) {
                els.hqlResults.innerText = "No results found.";
            } else {
                // Render Table
                const headers = Object.keys(data.results[0]);
                let table = '<table class="w-full text-left border-collapse">';
                table += '<thead><tr>' + headers.map(h => `<th class="border-b border-slate-700 p-2 text-slate-400">${h}</th>`).join('') + '</tr></thead>';
                table += '<tbody>';
                data.results.forEach(row => {
                    table += '<tr class="hover:bg-slate-800/50">';
                    headers.forEach(h => {
                        table += `<td class="border-b border-slate-800 p-2 text-slate-300">${row[h]}</td>`;
                    });
                    table += '</tr>';
                });
                table += '</tbody></table>';
                els.hqlResults.innerHTML = table;
            }
        }

    } catch (e) {
        console.error("HQL failed", e);
        els.hqlStatus.innerText = 'Failed';
    } finally {
        els.hqlRunBtn.innerText = 'RUN';
    }
}

// --- D3.js Graph Visualization ---

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
        .force("link", d3.forceLink().id(d => d.id).distance(50))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(15));
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
    // Diffing logic handled by D3 join, but we need to be careful with object references
    // For simplicity, we'll merge data

    const nodes = data.nodes.map(d => Object.create(d));
    const links = data.links.map(d => Object.create(d));

    // Update Links
    link = g.selectAll(".link")
        .data(links, d => `${d.source}-${d.target}`);

    link.exit().remove();

    const linkEnter = link.enter().append("line")
        .attr("class", "link")
        .attr("stroke", "#475569")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => Math.sqrt(d.value));

    link = linkEnter.merge(link);

    // Update Nodes
    node = g.selectAll(".node")
        .data(nodes, d => d.id);

    node.exit().transition().duration(500).attr("r", 0).remove();

    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("click", (event, d) => {
            if (d.type === 'user') {
                selectUser(d.id);
            }
        });

    // Draw shapes based on type
    nodeEnter.each(function (d) {
        const el = d3.select(this);
        if (d.type === 'user') {
            el.append("circle").attr("r", 8);
        } else {
            el.append("rect")
                .attr("width", 14).attr("height", 14)
                .attr("x", -7).attr("y", -7); // Center rect
        }
        // Label
        el.append("text")
            .attr("dy", -12)
            .attr("text-anchor", "middle")
            .text(d.id)
            .attr("fill", "#94a3b8")
            .attr("font-size", "10px")
            .style("pointer-events", "none");
    });

    node = nodeEnter.merge(node);

    // Update styling dynamically
    node.select("circle")
        .attr("fill", d => {
            if (d.risk > 70) return CONFIG.COLORS.RISK_HIGH;
            if (d.risk > 30) return CONFIG.COLORS.RISK_MED;
            return CONFIG.COLORS.RISK_LOW;
        })
        .attr("stroke", d => d.id === state.selectedUser ? "#fff" : "none")
        .attr("stroke-width", 2);

    node.select("rect")
        .attr("fill", CONFIG.COLORS.RESOURCE);

    simulation.nodes(nodes).on("tick", ticked);
    simulation.force("link").links(links);
    simulation.alpha(0.1).restart(); // Gentle reheat
}

function ticked() {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("transform", d => `translate(${d.x},${d.y})`);
}

// Drag functions
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

// --- User Context & Charts ---

function selectUser(userId) {
    state.selectedUser = userId;
    fetchUserContext(userId);

    // UI Update
    els.noSelection.classList.add('hidden');
    els.userDetails.classList.remove('hidden');
    els.userDetails.classList.add('flex');
}

function renderUserContext(data) {
    els.detailUsername.innerText = data.user_id;
    els.detailScore.innerText = data.risk_score;
    els.detailDivScore.innerText = data.diversification_score;

    // Badge
    if (data.risk_score > 70) {
        els.detailRiskBadge.className = "px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400";
        els.detailRiskBadge.innerText = "CRITICAL";
    } else if (data.risk_score > 30) {
        els.detailRiskBadge.className = "px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400";
        els.detailRiskBadge.innerText = "WARNING";
    } else {
        els.detailRiskBadge.className = "px-2 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400";
        els.detailRiskBadge.innerText = "NORMAL";
    }

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

    // Chart
    updateChart(data.avg_volume, data.current_volume);
}

function initChart() {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    state.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Avg Vol', 'Current'],
            datasets: [{
                label: 'Data Volume',
                data: [0, 0],
                backgroundColor: ['#94a3b8', '#38bdf8'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

function updateChart(avg, current) {
    if (state.chartInstance) {
        state.chartInstance.data.datasets[0].data = [avg, current];
        state.chartInstance.update();
    }
}

// Start
init();
