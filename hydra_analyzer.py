import json
import time
import random
import datetime
import threading
import numpy as np
import pandas as pd
import networkx as nx
from flask import Flask, jsonify, request, render_template
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import community.community_louvain as community_louvain # requires python-louvain

app = Flask(__name__)

# --- Configuration ---
CONFIG = {
    'ANOMALY_THRESHOLD': -0.6, # Threshold for "High Risk"
    'BASELINE_SIZE': 500,
    'SIMULATION_SPEED': 1.0
}

# --- Global State ---
class GlobalState:
    def __init__(self):
        self.logs = []
        self.users = {} # user_id -> UserProfile
        self.graph = None
        self.ml_model = None
        self.is_simulating = False
        self.lock = threading.Lock()

state = GlobalState()

# --- Data Structures ---

class LogSimulator:
    ACTIONS = ['Login', 'FileCopy', 'WebVisit', 'AppAccess', 'DBQuery']
    RESOURCES = ['Server_A', 'Server_B', 'HR_DB', 'Finance_Share', 'Ext_Website', 'Intranet', 'Workstation_1']
    USERS = [f'User_{i}' for i in range(1, 21)]

    @staticmethod
    def generate_event(user_id=None, malicious=False):
        user_id = user_id or random.choice(LogSimulator.USERS)
        
        if malicious:
            # Malicious behavior: High volume, unusual time, sensitive resource
            action = 'FileCopy'
            resource = 'HR_DB' if random.random() > 0.5 else 'Finance_Share'
            volume = random.randint(500, 2000) # High volume
            hour = random.choice([1, 2, 3, 23]) # Night time
        else:
            # Normal behavior
            action = random.choice(LogSimulator.ACTIONS)
            resource = random.choice(LogSimulator.RESOURCES)
            volume = random.randint(10, 100)
            hour = random.randint(8, 18) # Work hours

        timestamp = datetime.datetime.now().replace(hour=hour, minute=random.randint(0, 59))
        
        return {
            'timestamp': timestamp.isoformat(),
            'user_id': user_id,
            'action': action,
            'resource_id': resource,
            'data_volume': volume,
            'is_malicious': malicious
        }

    @staticmethod
    def ingest_log(event):
        with state.lock:
            state.logs.append(event)
            # Keep log size manageable for this demo
            if len(state.logs) > 2000:
                state.logs.pop(0)
            
            # Update User Profile (Simplified online update)
            user_id = event['user_id']
            if user_id not in state.users:
                state.users[user_id] = {'events': [], 'risk_score': 0.0, 'diversification_score': 0.0}
            state.users[user_id]['events'].append(event)

class MLModel:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False

    def train_baseline(self, logs):
        if not logs:
            return
        
        df = pd.DataFrame(logs)
        features = self._extract_features(df)
        
        if features.empty:
            return

        X = self.scaler.fit_transform(features)
        self.model.fit(X)
        self.is_trained = True
        print("ML Model Trained on {} logs".format(len(logs)))

    def calculate_risk(self, user_id, latest_events):
        if not self.is_trained or not latest_events:
            return 0.0
        
        df = pd.DataFrame(latest_events)
        features = self._extract_features(df)
        
        if features.empty:
            return 0.0

        X = self.scaler.transform(features)
        scores = self.model.decision_function(X)
        # Invert score: lower is more anomalous. 
        # Normalize roughly to 0-100 for display, where 100 is high risk.
        # Decision function: positive (normal) to negative (anomalous).
        avg_score = np.mean(scores)
        
        # Transform: -0.5 (bad) -> 100, 0.5 (good) -> 0
        risk = max(0, min(100, (0.2 - avg_score) * 100)) 
        return risk

    def _extract_features(self, df):
        # Simple feature engineering
        if df.empty:
            return pd.DataFrame()
        
        # Convert timestamp
        df['dt'] = pd.to_datetime(df['timestamp'])
        df['hour'] = df['dt'].dt.hour
        
        # Aggregations per user (but here we might be processing a single user's stream or batch)
        # For training, we group by user. For scoring, we take the batch.
        # To keep it simple for this single-file demo, we'll treat each event as a data point 
        # or small batches. Let's aggregate by user if multiple users present.
        
        # Actually, for IF, we usually want features per time window. 
        # Let's just use raw event features for simplicity: Hour, Volume.
        # In a real system, we'd aggregate.
        features = df[['hour', 'data_volume']].copy()
        return features

class GraphProcessor:
    def build_graph(self, logs, user_risks):
        G = nx.Graph()
        
        # Add nodes and edges
        for log in logs[-500:]: # Use recent logs for the graph
            u = log['user_id']
            r = log['resource_id']
            G.add_node(u, type='user', risk=user_risks.get(u, 0))
            G.add_node(r, type='resource', risk=0)
            
            if G.has_edge(u, r):
                G[u][r]['weight'] += 1
            else:
                G.add_edge(u, r, weight=1)
        
        # Community Detection (Project to User-User graph)
        # Bipartite projection
        users = [n for n, d in G.nodes(data=True) if d['type'] == 'user']
        if len(users) > 1:
            try:
                # Simple projection: users connected if they share a resource
                user_G = nx.bipartite.projected_graph(G, users)
                partition = community_louvain.best_partition(user_G)
                
                # Assign communities back to original graph
                for node in G.nodes():
                    if node in partition:
                        G.nodes[node]['community'] = partition[node]
                    else:
                        G.nodes[node]['community'] = -1
            except Exception as e:
                print(f"Graph projection failed: {e}")
                for node in G.nodes():
                    G.nodes[node]['community'] = 0
        
        return G

    def calculate_diversification(self, user_id, graph):
        if not graph or user_id not in graph:
            return 0.0
        
        # Diversification: Ratio of edges to nodes outside own community vs inside
        user_comm = graph.nodes[user_id].get('community')
        if user_comm is None:
            return 0.0
            
        neighbors = list(graph.neighbors(user_id))
        if not neighbors:
            return 0.0
            
        # Resources don't strictly have communities in this projection method unless we propagate labels.
        # For this metric, let's look at the 'implied' community of resources (majority vote of connected users)
        # OR simpler: just check if the user connects to resources that are primarily accessed by OTHER communities.
        
        # Simplified Metric: 
        # 1. Get all users connected to my resources.
        # 2. Count how many are in different communities.
        
        external_connections = 0
        total_connections = 0
        
        for res in neighbors:
            res_neighbors = list(graph.neighbors(res))
            for other_user in res_neighbors:
                if other_user == user_id: continue
                other_comm = graph.nodes[other_user].get('community')
                if other_comm != user_comm:
                    external_connections += 1
                total_connections += 1
        
        if total_connections == 0:
            return 0.0
            
        return external_connections / total_connections

# --- Initialization ---
ml_model = MLModel()
graph_processor = GraphProcessor()

# Pre-populate some data
print("Generating baseline data...")
baseline_logs = []
for _ in range(CONFIG['BASELINE_SIZE']):
    baseline_logs.append(LogSimulator.generate_event(malicious=False))
state.logs.extend(baseline_logs)
ml_model.train_baseline(baseline_logs)
print("Initialization complete.")

# --- Routes ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    max_risk = 0
    with state.lock:
        for u, data in state.users.items():
            max_risk = max(max_risk, data['risk_score'])
            
    return jsonify({
        'max_risk_score': round(max_risk, 1),
        'total_users': len(state.users),
        'ml_status': 'Trained' if ml_model.is_trained else 'Training',
        'log_count': len(state.logs)
    })

@app.route('/api/graph_data', methods=['GET'])
def get_graph_data():
    with state.lock:
        # Rebuild graph periodically or on demand. For now, on demand.
        # Calculate risks first
        user_risks = {}
        for u in state.users:
            # Recalculate risk based on recent events
            recent = state.users[u]['events'][-20:] # Last 20 events
            risk = ml_model.calculate_risk(u, recent)
            state.users[u]['risk_score'] = risk
            user_risks[u] = risk

        G = graph_processor.build_graph(state.logs, user_risks)
        
        # Calculate diversification for all users
        for u in state.users:
            div = graph_processor.calculate_diversification(u, G)
            state.users[u]['diversification_score'] = div

        # Convert to JSON for D3
        nodes = []
        links = []
        
        for n, d in G.nodes(data=True):
            nodes.append({
                'id': n,
                'group': d.get('community', 0),
                'type': d.get('type'),
                'risk': d.get('risk', 0)
            })
            
        for u, v, d in G.edges(data=True):
            links.append({
                'source': u,
                'target': v,
                'value': d.get('weight', 1)
            })
            
        return jsonify({'nodes': nodes, 'links': links})

@app.route('/api/user_context/<user_id>', methods=['GET'])
def get_user_context(user_id):
    with state.lock:
        if user_id not in state.users:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = state.users[user_id]
        events = user_data['events'][-10:] # Last 10
        
        # Calculate simple stats for charts
        volumes = [e['data_volume'] for e in user_data['events']]
        avg_vol = sum(volumes) / len(volumes) if volumes else 0
        last_vol = events[-1]['data_volume'] if events else 0
        
        return jsonify({
            'user_id': user_id,
            'risk_score': round(user_data['risk_score'], 1),
            'diversification_score': round(user_data['diversification_score'], 2),
            'avg_volume': round(avg_vol, 1),
            'current_volume': last_vol,
            'recent_events': events
        })

@app.route('/api/inject_log', methods=['POST'])
def inject_log():
    # Simulate a log injection
    is_malicious = request.json.get('malicious', False)
    user_id = request.json.get('user_id')
    
    event = LogSimulator.generate_event(user_id=user_id, malicious=is_malicious)
    LogSimulator.ingest_log(event)
    
    return jsonify({'status': 'success', 'event': event})

# --- Enterprise Features ---

class AIAnalyst:
    @staticmethod
    def analyze(user_id, risk_score, recent_events):
        # Simulated GenAI Analysis
        # In a real scenario, this would call an LLM API
        
        if risk_score < 30:
            return {
                "summary": f"User {user_id} is exhibiting normal behavior.",
                "recommendation": "No action required.",
                "severity": "Low"
            }
            
        anomalies = [e for e in recent_events if e.get('is_malicious')]
        resource_counts = {}
        for e in recent_events:
            r = e['resource_id']
            resource_counts[r] = resource_counts.get(r, 0) + 1
            
        top_resource = max(resource_counts, key=resource_counts.get) if resource_counts else "None"
        
        if anomalies:
            narrative = (
                f"**CRITICAL ALERT**: User **{user_id}** has triggered {len(anomalies)} high-fidelity anomaly alerts. "
                f"Detected suspicious access patterns targeting **{top_resource}** during non-standard hours. "
                "The activity profile matches the **'Insider Threat: Data Exfiltration'** playbook."
            )
            rec = "IMMEDIATE ACTION: Isolate endpoint, revoke credentials, and initiate forensic timeline analysis."
            severity = "Critical"
        else:
            narrative = (
                f"**WARNING**: User **{user_id}** is showing elevated risk ({risk_score:.1f}). "
                f"Unusual volume of access to **{top_resource}** detected. "
                "Behavior deviates from the established baseline by 2.4 standard deviations."
            )
            rec = "Monitor closely. Request user justification for recent high-volume access."
            severity = "High"
            
        return {
            "summary": narrative,
            "recommendation": rec,
            "severity": severity,
            "mitre_technique": "T1078 - Valid Accounts" if not anomalies else "T1048 - Exfiltration Over Alternative Protocol"
        }

class HQLEngine:
    @staticmethod
    def execute_query(query):
        # Simple SQL-like parser for the log buffer
        # Supports: SELECT * FROM logs WHERE key = 'value'
        
        try:
            tokens = query.strip().split()
            if not tokens or tokens[0].upper() != 'SELECT':
                return {'error': 'Invalid syntax. Only SELECT supported.'}
                
            # Parse WHERE clause (very basic)
            filters = {}
            if 'WHERE' in [t.upper() for t in tokens]:
                where_idx = [t.upper() for t in tokens].index('WHERE')
                conditions = tokens[where_idx+1:]
                # Expect: key = value
                # Handle simple "key = value" or "key='value'"
                # This is a hacky parser for demo purposes
                cond_str = " ".join(conditions)
                parts = cond_str.split('=')
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().strip("'").strip('"')
                    filters[key] = val
            
            results = []
            with state.lock:
                # Search in recent logs
                for log in state.logs[-1000:]: # Search last 1000
                    match = True
                    for k, v in filters.items():
                        # Handle basic type conversion for comparison
                        log_val = str(log.get(k, ''))
                        if log_val != v:
                            match = False
                            break
                    if match:
                        results.append(log)
                        
            return {'results': results[:50], 'count': len(results)} # Limit to 50
            
        except Exception as e:
            return {'error': str(e)}

@app.route('/api/analyze_incident', methods=['POST'])
def analyze_incident():
    user_id = request.json.get('user_id')
    with state.lock:
        if user_id not in state.users:
            return jsonify({'error': 'User not found'}), 404
        
        data = state.users[user_id]
        analysis = AIAnalyst.analyze(user_id, data['risk_score'], data['events'][-20:])
        return jsonify(analysis)

@app.route('/api/query', methods=['POST'])
def run_query():
    query = request.json.get('query')
    result = HQLEngine.execute_query(query)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
