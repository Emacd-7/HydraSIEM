# Project Hydra: Enterprise SIEM with Fusion Engine
# Backend: Python Flask + NetworkX + Scikit-Learn + TF-IDF/DBSCAN

from flask import Flask, jsonify, request, render_template, redirect, url_for, session, flash
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import DBSCAN
import networkx as nx
import random
import datetime
import threading
import time
import json
import requests
import functools
from fpdf import FPDF
from flask import send_file
import io
from normalization import LogNormalizer # Feature 1: CIM
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from authlib.integrations.flask_client import OAuth
import os
from dotenv import load_dotenv
import openai
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

load_dotenv()
openai.api_key = os.getenv('OPENAI_API_KEY')

# Allow HTTP for OAuth (Development Only)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

USER_DB_FILE = 'users.json'

def load_all_users():
    if os.path.exists(USER_DB_FILE):
        try:
            with open(USER_DB_FILE, 'r') as f:
                return json.load(f)
        except:
            return {'admin': {'password': 'admin', 'role': 'admin'}}
    return {'admin': {'password': 'admin', 'role': 'admin'}}

def save_all_users(users_dict):
    with open(USER_DB_FILE, 'w') as f:
        json.dump(users_dict, f)

SAVED_SEARCHES_FILE = 'saved_searches.json'

def load_saved_searches():
    if os.path.exists(SAVED_SEARCHES_FILE):
        try:
            with open(SAVED_SEARCHES_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_saved_searches(searches):
    with open(SAVED_SEARCHES_FILE, 'w') as f:
        json.dump(searches, f)

DASHBOARDS_FILE = 'dashboards.json'

def load_dashboards():
    if os.path.exists(DASHBOARDS_FILE):
        try:
            with open(DASHBOARDS_FILE, 'r') as f:
                return json.load(f)
        except: return []
    # Default Dashboard
    return [{
        'id': 'main_overview',
        'title': 'System Overview',
        'panels': [
            {'title': 'Recent Alerts', 'query': 'is_malicious=true | head 5', 'type': 'table', 'width': 'full'},
            {'title': 'Event Counts', 'query': 'stats count by sourcetype', 'type': 'chart', 'width': 'half'}
        ]
    }]

def save_dashboards(dashboards):
    with open(DASHBOARDS_FILE, 'w') as f:
        json.dump(dashboards, f)



app = Flask(__name__)

# --- Configuration ---
class Config:
    ANOMALY_THRESHOLD = -0.5 
    HISTORY_SIZE = 1000
    BASELINE_SIZE = 500
    HONEYPOT_PATHS = ['/finance/salary_list.xlsx', '/hr/employee_ssn.db', '/admin/passwords.txt']
    DISCORD_WEBHOOK_URL = "" # Add your webhook URL here
    SECRET_KEY = os.getenv('HYDRA_SECRET_KEY', 'hydra-super-secret-key-change-in-prod')
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
    # Mail config
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_USERNAME', 'noreply@hydra.siem')
    PASSWORD_RESET_SALT = 'hydra-password-reset-salt'


# --- Authentication Setup ---
app.secret_key = Config.SECRET_KEY
app.config['MAIL_SERVER'] = Config.MAIL_SERVER
app.config['MAIL_PORT'] = Config.MAIL_PORT
app.config['MAIL_USE_TLS'] = Config.MAIL_USE_TLS
app.config['MAIL_USERNAME'] = Config.MAIL_USERNAME
app.config['MAIL_PASSWORD'] = Config.MAIL_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = Config.MAIL_DEFAULT_SENDER
mail = Mail(app)
ts = URLSafeTimedSerializer(Config.SECRET_KEY)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.unauthorized_handler
def unauthorized():
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Unauthorized', 'message': 'Please login'}), 401
    return redirect(url_for('login'))

oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=Config.GOOGLE_CLIENT_ID,
    client_secret=Config.GOOGLE_CLIENT_SECRET,
    server_metadata_url=Config.GOOGLE_DISCOVERY_URL,
    client_kwargs={'scope': 'openid email profile'}
)

# Mock User Data (Now backed by JSON)
class User(UserMixin):
    def __init__(self, id, email=None, role='analyst'):
        self.id = id
        self.email = email
        self.role = role

users = load_all_users()

# Migration: Ensure all users have a role
if 'admin' not in users:
    users['admin'] = {'password': 'admin', 'role': 'admin', 'email': 'admin@hydra.local'}

for u in users:
    if 'role' not in users[u]:
        users[u]['role'] = 'analyst'
        if u == 'admin': users[u]['role'] = 'admin'
save_all_users(users)

@login_manager.user_loader
def load_user(user_id):
    if user_id in users:
        u_data = users[user_id]
        return User(user_id, email=u_data.get('email'), role=u_data.get('role', 'analyst'))
    return None

def role_required(role):
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated or current_user.role != role:
                return jsonify({'error': 'Access Denied: Insufficient Privileges'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# --- Auth Routes ---
@app.route('/login/google')
def google_login():
    redirect_uri = url_for('google_callback', _external=True)
    print(f"DEBUG: Redirecting to Google with callback URI: {redirect_uri}")
    return google.authorize_redirect(redirect_uri)

@app.route('/login/google/callback')
def google_callback():
    token = google.authorize_access_token()
    user_info = token.get('userinfo')
    
    if user_info:
        user_id = user_info['email'].split('@')[0] # Simple ID generation
        
        # In a real app, verify email domain or check DB
        user = User(user_id, user_info['email'])
        
        # Add to mock DB if new
        if user_id not in users:
            # Grant admin role to the primary user
            role = 'admin' if user_info['email'] == 'emaduddinkhajoor@gmail.com' else 'analyst'
            users[user_id] = {'password': 'oauth_user', 'email': user_info['email'], 'role': role}
            save_all_users(users)
        elif users[user_id].get('email') == 'emaduddinkhajoor@gmail.com' and users[user_id].get('role') != 'admin':
            # Ensure existing user is promoted if they match the admin email
            users[user_id]['role'] = 'admin'
            save_all_users(users)
            
        u_data = users[user_id]
        user = User(user_id, email=u_data.get('email'), role=u_data.get('role', 'analyst'))
        login_user(user)
        # Redirect back to Vite frontend
        return redirect('http://localhost:3000/')
    else:
        flash('Google Login Failed')
        return redirect('http://localhost:3000/login')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm = request.form['confirm_password']
        
        if password != confirm:
            flash('Passwords do not match')
            return render_template('register.html')
            
        if username in users:
            flash('Agent ID already exists')
            return render_template('register.html')
            
            
        # Create user
        users[username] = {'password': password, 'role': 'analyst'}
        save_all_users(users)
        
        flash('Registration Successful. Please Login.')
        return redirect(url_for('login'))
        
    return render_template('register.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json or {}
    identifier = data.get('username') or data.get('email')
    password = data.get('password')
    
    target_user_id = None
    if identifier in users:
        target_user_id = identifier
    else:
        for u_id, u_info in users.items():
            if u_info.get('email') == identifier:
                target_user_id = u_id
                break
    
    if target_user_id and users[target_user_id]['password'] == password:
        u_data = users[target_user_id]
        user = User(target_user_id, email=u_data.get('email'), role=u_data.get('role', 'analyst'))
        login_user(user)
        return jsonify({'status': 'success', 'user': target_user_id})
    return jsonify({'status': 'error', 'message': 'Invalid Credentials'}), 401

@app.route('/api/logout')
@login_required
def api_logout():
    logout_user()
    return jsonify({'status': 'success'})

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        data = request.form
        identifier = data.get('username') or data.get('email')
        password = data.get('password')
        
        target_user_id = None
        if identifier in users:
            target_user_id = identifier
        else:
            for u_id, u_info in users.items():
                if u_info.get('email') == identifier:
                    target_user_id = u_id
                    break
        
        if target_user_id and users[target_user_id]['password'] == password:
            u_data = users[target_user_id]
            user = User(target_user_id, email=u_data.get('email'), role=u_data.get('role', 'analyst'))
            login_user(user)
            return redirect(url_for('index'))
        else:
            flash('Access Denied: Invalid Credentials')
            
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# ---- Password Reset (Flask form flow) ----

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Flask form version: renders login.html which has the modal; handles API POST."""
    if request.method == 'GET':
        return redirect(url_for('login'))

    # Accept both form POST and JSON POST
    if request.is_json:
        data = request.get_json()
        email = (data or {}).get('email', '').strip().lower()
    else:
        email = request.form.get('email', '').strip().lower()

    # Always return 200 to prevent email enumeration
    target_uid = None
    for uid, udata in users.items():
        if udata.get('email', '').lower() == email:
            target_uid = uid
            break

    if target_uid and Config.MAIL_USERNAME:
        token = ts.dumps(email, salt=Config.PASSWORD_RESET_SALT)
        reset_url = f"http://localhost:3000/reset-password?token={token}"
        try:
            msg = Message(
                subject='🔐 Reset Your Hydra SIEM Password',
                recipients=[email],
                html=f"""
<div style="font-family:monospace;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:480px;margin:auto">
  <h1 style="color:#38bdf8;letter-spacing:2px">HYDRA<span style="color:#fff">SIEM</span></h1>
  <p style="color:#94a3b8;font-size:12px;letter-spacing:4px;text-transform:uppercase">ACCESS KEY RESET</p>
  <hr style="border-color:#334155;margin:20px 0">
  <p>A password reset was requested for your agent account.</p>
  <p>Click the button below to set a new access key. This link expires in <strong style="color:#38bdf8">30 minutes</strong>.</p>
  <div style="text-align:center;margin:32px 0">
    <a href="{reset_url}" style="background:linear-gradient(45deg,#0ea5e9,#38bdf8);color:#0f172a;padding:14px 28px;border-radius:6px;font-weight:bold;letter-spacing:2px;text-decoration:none;display:inline-block">RESET ACCESS KEY</a>
  </div>
  <p style="color:#475569;font-size:11px">If you didn't request this, ignore this email. Your password will not change.</p>
  <hr style="border-color:#334155;margin:20px 0">
  <p style="color:#475569;font-size:10px">UNAUTHORIZED ACCESS IS PROHIBITED — SYSTEM VERSION 2.0.4</p>
</div>
"""
            )
            mail.send(msg)
            print(f"[MAIL] Reset link sent to {email}")
        except Exception as e:
            print(f"[MAIL ERROR] {e}")

    if request.is_json:
        return jsonify({'status': 'ok', 'message': 'If that email is registered, a reset link has been dispatched.'})
    flash('If that email is registered, a reset link has been sent.')
    return redirect(url_for('login'))


@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """Flask form version of password reset."""
    try:
        email = ts.loads(token, salt=Config.PASSWORD_RESET_SALT, max_age=1800)  # 30 min
    except SignatureExpired:
        flash('This reset link has expired. Please request a new one.')
        return redirect(url_for('login'))
    except BadSignature:
        flash('Invalid reset link.')
        return redirect(url_for('login'))

    if request.method == 'POST':
        password = request.form.get('password', '')
        confirm = request.form.get('confirm_password', '')
        if password != confirm:
            flash('Passwords do not match.')
            return render_template('reset_password.html', token=token)
        if len(password) < 4:
            flash('Password must be at least 4 characters.')
            return render_template('reset_password.html', token=token)

        # Find the user by email and update
        for uid, udata in users.items():
            if udata.get('email', '').lower() == email.lower():
                users[uid]['password'] = password
                save_all_users(users)
                flash('Password updated successfully. Please login.')
                return redirect(url_for('login'))

        flash('Account not found.')
        return redirect(url_for('login'))

    return render_template('reset_password.html', token=token)


# ---- Password Reset JSON API (for React frontend) ----

@app.route('/api/forgot-password', methods=['POST'])
def api_forgot_password():
    return forgot_password()   # Reuse the same logic


@app.route('/api/reset-password', methods=['POST'])
def api_reset_password():
    data = request.get_json() or {}
    token = data.get('token', '')
    password = data.get('password', '')
    confirm = data.get('confirm_password', '')

    if password != confirm:
        return jsonify({'status': 'error', 'message': 'Passwords do not match.'}), 400
    if len(password) < 4:
        return jsonify({'status': 'error', 'message': 'Password must be at least 4 characters.'}), 400

    try:
        email = ts.loads(token, salt=Config.PASSWORD_RESET_SALT, max_age=1800)
    except SignatureExpired:
        return jsonify({'status': 'error', 'message': 'Reset link has expired.'}), 400
    except BadSignature:
        return jsonify({'status': 'error', 'message': 'Invalid reset token.'}), 400

    for uid, udata in users.items():
        if udata.get('email', '').lower() == email.lower():
            users[uid]['password'] = password
            save_all_users(users)
            return jsonify({'status': 'success', 'message': 'Password updated.'})

    return jsonify({'status': 'error', 'message': 'Account not found.'}), 404

# --- Module H: Performance Monitor ---

class PerformanceMonitor:
    """EPS & Latency Profiling"""
    _event_count = 0
    _last_tick = time.time()
    _eps = 0
    _latencies = {}
    
    @staticmethod
    def track_event():
        PerformanceMonitor._event_count += 1
        now = time.time()
        if now - PerformanceMonitor._last_tick >= 1.0:
            PerformanceMonitor._eps = PerformanceMonitor._event_count / (now - PerformanceMonitor._last_tick)
            PerformanceMonitor._event_count = 0
            PerformanceMonitor._last_tick = now
            
    @staticmethod
    def get_eps():
        # Force update if idle
        if time.time() - PerformanceMonitor._last_tick >= 1.0:
             PerformanceMonitor._eps = 0
        return int(PerformanceMonitor._eps)

    @staticmethod
    def measure_latency(name):
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                start = time.time()
                result = func(*args, **kwargs)
                duration = (time.time() - start) * 1000 # ms
                
                # Moving average
                prev = PerformanceMonitor._latencies.get(name, 0)
                if prev == 0:
                    PerformanceMonitor._latencies[name] = duration
                else:
                    PerformanceMonitor._latencies[name] = (prev * 0.9) + (duration * 0.1)
                    
                return result
            return wrapper
        return decorator

    @staticmethod
    def get_latencies():
        return {k: int(v) for k, v in PerformanceMonitor._latencies.items()}



# --- Module A: Core Data Structures & Context ---

class ContextDB:
    """Mock Context Database for HR Status and Resource Sensitivity"""
    @staticmethod
    @PerformanceMonitor.measure_latency("ContextDB Query")
    def get_context(user_id, resource_id):
        # Mock HR Status
        hr_status = 'Active'
        if user_id in ['User_5', 'User_12', 'User_8']:
            hr_status = 'Resignation Submitted'
        
        # Mock Resource Sensitivity
        sensitivity = 'Low'
        if 'DB' in str(resource_id) or 'Finance' in str(resource_id):
            sensitivity = 'High'
        if 'Public' in str(resource_id):
            sensitivity = 'Public'
            
        return {'hr_status': hr_status, 'sensitivity': sensitivity}

class Honeypot:
    """Decoy Service"""
    DECOYS = set(Config.HONEYPOT_PATHS)

    @staticmethod
    def check_access(event):
        resource = event.get('resource_id')
        if resource in Honeypot.DECOYS:
            return True, resource
        return False, None

    @staticmethod
    def add_decoy(path):
        Honeypot.DECOYS.add(path)
        
    @staticmethod
    def remove_decoy(path):
        if path in Honeypot.DECOYS:
            Honeypot.DECOYS.remove(path)

# --- Module F: Advanced Intelligence (OSINT, MITRE, Geo) ---

class ThreatIntel:
    """Mock OSINT / Threat Intelligence"""
    @staticmethod
    def check_ip(ip):
        # Feature 5: Threat Intel Management (TIM)
        # Mock AbuseIPDB check
        if ip.startswith("192.168"): return "Private IP (Safe)"
        
        # Simulate occasional threat intel hit
        # In a real app, this would be: requests.get(f'https://api.abuseipdb.com/api/v2/check?ipAddress={ip}')
        risk_roll = int(ip.split('.')[-1])
        if risk_roll > 200:
            return "MALICIOUS (Confidence: 90%) - Known Botnet"
        return "Clean"

class MitreMapper:
    """MITRE ATT&CK Mapping"""
    MAPPING = {
        'Login': 'T1078', # Valid Accounts
        'FileRead': 'T1005', # Data from Local System
        'FileWrite': 'T1005',
        'Upload': 'T1041', # Exfiltration Over C2 Channel
        'Download': 'T1105', # Ingress Tool Transfer
        'FileCopy': 'T1041', # Exfiltration
        'BruteForce': 'T1110'
    }
    @staticmethod
    def get_tags(action):
        return MitreMapper.MAPPING.get(action, 'T1565')

class GeoLocator:
    """Mock Geo-Location"""
    COUNTRIES = ['USA', 'China', 'Russia', 'Germany', 'Brazil', 'India', 'France', 'UK', 'Japan']
    @staticmethod
    def get_location(ip):
        return random.choice(GeoLocator.COUNTRIES)


# --- Module B: Alert Clustering Engine ---

class Clustering:
    """Alert Clustering using TF-IDF and DBSCAN"""
    
    @staticmethod
    def generate_mock_alerts(logs):
        # Convert logs to "Raw Alerts" for demonstration
        alerts = []
        for log in logs[-100:]: # Last 100 logs
            # Simulate alert text
            alert_text = f"Alert: {log['action']} detected on {log['resource_id']} by {log['user_id']}"
            if log.get('is_malicious'):
                alert_text += " - Suspicious Activity"
            alerts.append(alert_text)
        return alerts

    @staticmethod
    def analyze_alerts(alerts):
        if not alerts:
            return 0, 0, []
            
        # Vectorize
        vectorizer = TfidfVectorizer(stop_words='english')
        X = vectorizer.fit_transform(alerts)
        
        # DBSCAN
        dbscan = DBSCAN(eps=0.5, min_samples=2)
        labels = dbscan.fit_predict(X)
        
        # Stats
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        
        # Outliers (Noise)
        outliers = []
        for i, label in enumerate(labels):
            if label == -1:
                outliers.append(alerts[i])
                
        return len(alerts), n_clusters, outliers

# --- Module G: Response & Notification Engine ---

class ResponseEngine:
    """Automated Response & Notifications"""
    
    @staticmethod
    def block_entity(entity_id):
        with state.lock:
            if entity_id not in state.blocked_entities:
                state.blocked_entities.add(entity_id)
                print(f"[RESPONSE] Blocked entity: {entity_id}")
                ResponseEngine.send_notification(f"🚨 **CONTAINMENT ACTION**: Blocked User/IP `{entity_id}` due to high risk.")
                return True
        return False

    @staticmethod
    def send_notification(message):
        if not Config.DISCORD_WEBHOOK_URL:
            print(f"[NOTIFICATION] {message}")
            return
            
        try:
            payload = {"content": message}
            requests.post(Config.DISCORD_WEBHOOK_URL, json=payload)
        except Exception as e:
            print(f"[ERROR] Failed to send notification: {e}")


# --- Module C: UEBA Anomaly Engine ---

class UEBA:
    """Isolation Forest with Explainability"""
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_names = ['hour', 'data_volume']

    def _extract_features(self, df):
        if df.empty:
            return pd.DataFrame()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['hour'] = df['timestamp'].dt.hour
        return df[['hour', 'data_volume']]

    def train_baseline(self, logs):
        if len(logs) < Config.BASELINE_SIZE:
            return False
        
        df = pd.DataFrame(logs)
        features = self._extract_features(df)
        X = self.scaler.fit_transform(features)
        self.model.fit(X)
        self.is_trained = True
        return True

    def calculate_anomaly_score(self, user_id, latest_events):
        if not self.is_trained or not latest_events:
            return 0.0
        
        df = pd.DataFrame(latest_events)
        features = self._extract_features(df)
        
        if features.empty:
            return 0.0

        X = self.scaler.transform(features)
        scores = self.model.decision_function(X)
        avg_score = np.mean(scores)
        
        # Transform: -0.5 (bad) -> 100, 0.5 (good) -> 0
        risk = max(0, min(100, (0.2 - avg_score) * 100)) 
        return risk

    def get_feature_importance(self, latest_events):
        # heuristic explainability since IF doesn't provide direct feature importance
        if not latest_events:
            return {}
            
        df = pd.DataFrame(latest_events)
        # Simple heuristic: which feature deviates most from mean?
        # In a real system, we'd use SHAP. Here we mock it for speed/demo.
        
        vol_mean = df['data_volume'].mean()
        
        # Mock weights based on deviation
        vol_weight = 0.3
        if vol_mean > 1000: vol_weight = 0.8
        
        hour_weight = 1.0 - vol_weight
        
        return {
            'Data Volume': int(vol_weight * 100), 
            'Time of Day': int(hour_weight * 100)
        }

# --- Module D: Graph Processor ---

class GraphProcessor:
    """NetworkX Graph & Community Detection"""
    @PerformanceMonitor.measure_latency("Graph Build")
    def build_graph(self, logs, user_risks):
        G = nx.Graph()
        
        for log in logs[-500:]: 
            u = log['user_id']
            r = log['resource_id']
            
            # Check Honeypot
            is_decoy, _ = Honeypot.check_access(log)
            
            G.add_node(u, type='user', risk=user_risks.get(u, 0))
            G.add_node(r, type='resource', risk=0, is_decoy=is_decoy)
            
            if G.has_edge(u, r):
                G[u][r]['weight'] += 1
            else:
                G.add_edge(u, r, weight=1)
        
        # Community Detection
        users = [n for n, d in G.nodes(data=True) if d['type'] == 'user']
        if len(users) > 1:
            try:
                user_G = nx.bipartite.projected_graph(G, users)
                # Use built-in Louvain community detection
                communities = nx.community.louvain_communities(user_G)
                # Convert list of sets to node -> community_id mapping
                partition = {}
                for i, comm in enumerate(communities):
                    for node in comm:
                        partition[node] = i
                
                for node in G.nodes():
                    if node in partition:
                        G.nodes[node]['community'] = partition[node]
                    else:
                        G.nodes[node]['community'] = 0
            except:
                for node in G.nodes(): G.nodes[node]['community'] = 0
        
        return G

    def calculate_diversification(self, user_id, G):
        if user_id not in G: return 0
        
        # Simplified Diversification: Degree Centrality normalized
        deg = G.degree(user_id)
        return min(100, deg * 5)
        return min(100, deg * 5)

class AIEngine:
    """AI Analyst powered by OpenAI GPT-4"""
    @staticmethod
    def analyze_risk(user_id, risk_score, context, recent_logs):
        if not openai.api_key:
            return "AI Analyst: API Key missing. Please configure .env."
            
        try:
            # Summarize logs for prompt
            log_summary = "\n".join([f"- {l['timestamp']} {l['action']} ({l['resource_id']})" for l in recent_logs[-5:]])
            
            prompt = f"""
            You are a Tier 3 SOC Analyst. Analyze this user:
            User: {user_id}
            Risk Score: {int(risk_score)}/100
            HR Status: {context.get('hr_status', 'Active')}
            Sensitivity: {context.get('sensitivity', 'Low')}
            
            Recent Activity:
            {log_summary}
            
            Task:
            1. Explain WHY the risk is high/low.
            2. Recommend immediate Next Steps for the analyst.
            Keep it concise (max 3 sentences).
            """
            
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a concise, professional cybersecurity analyst."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"AI Analysis Failed: {str(e)}"

# --- Module E: Risk Fusion & Intelligence Core ---

class Fusion:
    """Risk Fusion Logic"""
    @staticmethod
    @staticmethod
    def aggregate_risk(user_id, ueba_score, div_score, context, logs):
        # Feature 2: Risk-Based Alerting (RBA)
        
        risk_score = 0.0
        
        # 1. Base UEBA Score (0-100)
        risk_score += max(0, ueba_score)
        
        # 2. Accumulate Risk from Recent Events (RBA Style)
        # Instead of just "is malicious", we sum up risk increments from normalized logs
        # This allows "Low and Slow" attacks to build up score.
        recent_risk_sum = 0
        for log in logs[-50:]:
             # Check if log is normalized, if not, do it on fly (safeguard)
             if 'risk_increment' not in log:
                 norm = LogNormalizer.normalize(log)
                 recent_risk_sum += norm['risk_increment']
             else:
                 recent_risk_sum += log['risk_increment']
                 
             # Feature 2b: Honeypot -> Instant RBA Spike (+50 is huge)
             hit, _ = Honeypot.check_access(log)
             if hit:
                 recent_risk_sum += 50

        # Normalize the accumulated sum to a 0-100 modifier
        # e.g. 5 failed logins (5*5=25) -> +25 risk
        risk_score += min(100, recent_risk_sum)

        # 3. Context Multipliers
        if context['hr_status'] == 'Resignation Submitted':
            risk_score *= 1.5
        if context['sensitivity'] == 'High':
            risk_score *= 1.2
            
        return min(100, risk_score)

    @staticmethod
    def get_response_recommendation(final_score, context):
        if final_score >= 90:
            return "CRITICAL: Suspend access immediately and initiate forensics."
        elif final_score >= 70:
            return "HIGH: Isolate user and review recent file transfers."
        elif final_score >= 50:
            return "MEDIUM: Monitor user activity closely."
        else:
            return "LOW: No action required."

# --- Log Simulator (Updated) ---

SYSTEMS_DB_FILE = 'systems.json'
USERS_SIM_FILE = 'users_sim.json'  # Simulated users (not auth users)

def load_sim_users():
    if os.path.exists(USERS_SIM_FILE):
        try:
            with open(USERS_SIM_FILE, 'r') as f:
                return json.load(f)
        except: return []
    return []

def save_sim_users(users_list):
    with open(USERS_SIM_FILE, 'w') as f:
        json.dump(users_list, f)

def load_sim_resources():
    if os.path.exists(SYSTEMS_DB_FILE):
        try:
            with open(SYSTEMS_DB_FILE, 'r') as f:
                return json.load(f)
        except: return []
    return []

def save_sim_resources(resources_list):
    with open(SYSTEMS_DB_FILE, 'w') as f:
        json.dump(resources_list, f)

class LogSimulator:
    USERS = []  # Populated from users_sim.json
    ACTIONS = ['Login', 'FileRead', 'FileWrite', 'Upload', 'Download']
    RESOURCES = []  # Populated from systems.json

    @staticmethod
    def load_resources():
        return load_sim_resources()
    
    @staticmethod
    def generate_ip():
        return f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

    
    @staticmethod
    def generate_event(user_id=None, malicious=False):
        user_id = user_id or random.choice(LogSimulator.USERS)
        
        # Check if blocked
        if user_id in state.blocked_entities:
            return None

        PerformanceMonitor.track_event()

        if malicious:
            action = 'FileCopy'
            honeypots = list(Honeypot.DECOYS) or ['HR_DB', 'Finance_Share']
            resource = random.choice(honeypots + (LogSimulator.RESOURCES or honeypots))
            volume = random.randint(500, 2000)
            hour = random.choice([1, 2, 3, 23])
        else:
            action = random.choice(LogSimulator.ACTIONS)
            resource = random.choice(LogSimulator.RESOURCES) if LogSimulator.RESOURCES else 'Unknown_Resource'

            volume = random.randint(10, 100)
            hour = random.randint(8, 18)

        timestamp = datetime.datetime.now().replace(hour=hour, minute=random.randint(0, 59))
        
        return {
            'timestamp': timestamp.isoformat(),
            'user_id': user_id,
            'action': action,
            'resource_id': resource,
            'data_volume': volume,
            'is_malicious': malicious,
            'source_ip': LogSimulator.generate_ip(),
            'sourcetype': 'access_combined' if action in ['Login', 'Download'] else 'win_event_log'
        }

    @staticmethod
    def run_scenario(scenario_type):
        """Generates a batch of logs representing a specific attack scenario"""
        logs = []
        user_id = random.choice(LogSimulator.USERS or ['User_Unknown'])
        target_ip = LogSimulator.generate_ip()
        
        if scenario_type == 'ransomware':
            # High volume file modifications
            for _ in range(15):
                logs.append({
                    'timestamp': datetime.datetime.now().isoformat(),
                    'user_id': user_id,
                    'action': 'FileWrite',
                    'resource_id': f"/shared/finance/invoice_{random.randint(1000,9999)}.encrypted",
                    'data_volume': random.randint(100, 500),
                    'is_malicious': True,
                    'source_ip': target_ip,
                    'sourcetype': 'win_event_log'
                })
        elif scenario_type == 'exfiltration':
            # Large data uploads
            for _ in range(5):
                logs.append({
                    'timestamp': datetime.datetime.now().isoformat(),
                    'user_id': user_id,
                    'action': 'Upload',
                    'resource_id': "External_Dropbox_API",
                    'data_volume': random.randint(50000, 1000000),
                    'is_malicious': True,
                    'source_ip': target_ip,
                    'sourcetype': 'firewall_log'
                })
        elif scenario_type == 'bruteforce':
            # Failed logins then success
            for _ in range(8):
                logs.append({
                    'timestamp': datetime.datetime.now().isoformat(),
                    'user_id': user_id,
                    'action': 'LoginFailed',
                    'resource_id': "Auth_Server",
                    'data_volume': 0,
                    'is_malicious': True,
                    'source_ip': target_ip,
                    'sourcetype': 'auth_log'
                })
            logs.append({
                'timestamp': datetime.datetime.now().isoformat(),
                'user_id': user_id,
                'action': 'Login',
                'resource_id': "Auth_Server",
                'data_volume': 0,
                'is_malicious': True,
                'source_ip': target_ip,
                'sourcetype': 'auth_log'
            })
            
        return logs

class SPLProcessor:
    """Simple Splunk Processing Language (SPL) Engine"""
    
    @staticmethod
    def execute(query, dataset):
        """Executes a piped query on a list of dicts"""
        if not query:
            return dataset
            
        # 1. Parse pipelines
        commands = [cmd.strip() for cmd in query.split('|')]
        results = dataset
        
        for cmd in commands:
            parts = cmd.split()
            op = parts[0].lower()
            args = parts[1:]
            
            if op == 'search':
                results = SPLProcessor._op_search(" ".join(args), results)
            elif op == 'stats':
                results = SPLProcessor._op_stats(args, results)
            elif op == 'sort':
                results = SPLProcessor._op_sort(args, results)
            elif op == 'head':
                results = SPLProcessor._op_head(args, results)
            elif op == 'table':
                results = SPLProcessor._op_table(args, results)
            elif op == 'rex':
                results = SPLProcessor._op_rex(args, results)
                
        return results

    @staticmethod
    def _op_search(term_str, data):
        """Basic keyword search"""
        filtered = []
        terms = term_str.lower().split()
        for item in data:
            json_str = json.dumps(item).lower()
            match = True
            for term in terms:
                if '=' in term:
                    k, v = term.split('=', 1)
                    if str(item.get(k)).lower() != v:
                        match = False; break
                elif term not in json_str:
                    match = False; break
            if match: filtered.append(item)
        return filtered

    @staticmethod
    def _op_stats(args, data):
        """
        Syntax: stats count by field
        Currently supports: count by <field>
        """
        if len(args) < 3 or args[0] != 'count' or args[1] != 'by':
            return data # Syntax error fallback
            
        field = args[2]
        counts = {}
        for item in data:
            val = item.get(field, 'null')
            counts[val] = counts.get(val, 0) + 1
            
        return [{'value': k, 'count': v} for k, v in counts.items()]

    @staticmethod
    def _op_sort(args, data):
        """Syntax: sort field or sort -field"""
        if not args: return data
        field = args[0]
        reverse = False
        if field.startswith('-'):
            field = field[1:]
            reverse = True
            
        # Try to cast to number for sorting if possible
        def get_val(x):
            v = x.get(field, '')
            try: return float(v)
            except: return str(v)
            
        return sorted(data, key=get_val, reverse=reverse)

    @staticmethod
    def _op_rex(args, data):
        """Syntax: rex field=<field> "<regex_pattern>" """
        # Re-join args to handle spaces in regex
        full_arg_str = " ".join(args)
        
        # Parse: field=X "pattern"
        # We need to capture the pattern which might contain spaces
        match = re.search(r'field=(?P<field>\S+)\s+(?P<quote>["\'])(?P<pattern>.*)(?P=quote)', full_arg_str)
        
        if not match:
             return data
             
        target_field = match.group('field')
        pattern = match.group('pattern')
        
        results = []
        for item in data:
            # CRITICAL: Shallow copy to avoid modifying global state (search-time only)
            new_item = item.copy()
            source_text = str(new_item.get(target_field,json.dumps(new_item))) # Default to full json if field missing? No, default to empty or specific field.
            if target_field == '_raw':
                source_text = json.dumps(item)

            try:
                # Apply Regex
                # We want named groups: (?P<name>...)
                # re.search finds the first match
                m = re.search(pattern, source_text)
                if m:
                     new_item.update(m.groupdict())
            except Exception as e:
                pass # Bad regex or no match
                
            results.append(new_item)
            
        return results

    @staticmethod
    def _op_head(args, data):
        """Syntax: head n"""
        try:
            n = int(args[0])
            return data[:n]
        except: return data

    @staticmethod
    def _op_table(args, data):
        """Syntax: table field1, field2"""
        fields = [f.replace(',', '') for f in args]
        results = []
        for item in data:
            row = {k: item.get(k, '') for k in fields}
            results.append(row)
        return results

# --- Global State ---

simulation_running = False
simulation_thread = None

class GlobalState:
    def __init__(self):
        self.logs = []
        self.users = {}  # Populated dynamically by entities
        self.blocked_entities = set()
        self.lock = threading.Lock()


state = GlobalState()
ueba_engine = UEBA()
graph_processor = GraphProcessor()

# --- Background Tasks ---

def simulation_loop():
    """Continuous log generation loop — runs only when started via /api/start_simulation"""
    global simulation_running
    print("[SIM] Simulation started.")
    while simulation_running:
        if LogSimulator.USERS and LogSimulator.RESOURCES:
            log = LogSimulator.generate_event()
            if log:
                with state.lock:
                    state.logs.append(log)
                    uid = log['user_id']
                    if uid not in state.users:
                        state.users[uid] = {'events': [], 'risk_score': 0}
                    state.users[uid]['events'].append(log)
                    # Re-train UEBA incrementally
                    if len(state.logs) >= Config.BASELINE_SIZE and not ueba_engine.is_trained:
                        ueba_engine.train_baseline(state.logs)
        time.sleep(1)  # Generate 1 event/sec
    print("[SIM] Simulation stopped.")

def init_app():
    """Load persisted entities on startup (but no log generation)"""
    LogSimulator.USERS = load_sim_users()
    LogSimulator.RESOURCES = load_sim_resources()
    for u in LogSimulator.USERS:
        if u not in state.users:
            state.users[u] = {'events': [], 'risk_score': 0}
    print(f"[INIT] Loaded {len(LogSimulator.USERS)} users, {len(LogSimulator.RESOURCES)} resources. System ready.")

threading.Thread(target=init_app, daemon=True).start()

# --- API Endpoints ---

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    with state.lock:
        max_risk = max([u['risk_score'] for u in state.users.values()]) if state.users else 0
        return jsonify({
            'total_users': len(state.users),
            'total_logs': len(state.logs),
            'max_risk_score': max_risk,
            'ml_status': 'Trained' if ueba_engine.is_trained else 'Training',
            'eps': PerformanceMonitor.get_eps(),
            'latencies': PerformanceMonitor.get_latencies()
        })

@app.route('/api/dashboard_stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    with state.lock:
        logs = list(state.logs)

    # --- Event Volume (per hour buckets, last 24h) ---
    from collections import defaultdict
    import datetime
    now = datetime.datetime.now()
    hourly = defaultdict(lambda: {'events': 0, 'alerts': 0})
    for l in logs:
        try:
            ts = datetime.datetime.fromisoformat(l['timestamp'])
            # Only include last 24h
            if (now - ts).total_seconds() <= 86400:
                hr = ts.strftime('%H:00')
                hourly[hr]['events'] += 1
                if l.get('is_malicious'):
                    hourly[hr]['alerts'] += 1
        except: pass

    # Fill all 24 hours even if empty
    event_volume = []
    for h in range(24):
        hr = f"{h:02d}:00"
        event_volume.append({'hour': hr, 'events': hourly[hr]['events'], 'alerts': hourly[hr]['alerts']})

    # --- Top Sourcetypes ---
    sourcetype_counts = defaultdict(int)
    for l in logs:
        st = l.get('sourcetype', 'unknown')
        sourcetype_counts[st] += 1
    total = sum(sourcetype_counts.values()) or 1
    top_sourcetypes = [
        {'name': k, 'value': round(v / total * 100)}
        for k, v in sorted(sourcetype_counts.items(), key=lambda x: -x[1])[:5]
    ]

    # --- Top Risky Users ---
    with state.lock:
        risky = [
            {'name': u, 'risk': round(d['risk_score'])}
            for u, d in state.users.items()
        ]
    risky.sort(key=lambda x: -x['risk'])
    top_risky = risky[:8]

    return jsonify({
        'event_volume': event_volume,
        'top_sourcetypes': top_sourcetypes,
        'top_risky_users': top_risky
    })


@app.route('/api/triage_summary', methods=['GET'])
@login_required
def triage_summary():
    with state.lock:
        # Calculate stats
        alerts = [l for l in state.logs if l.get('is_malicious')]
        total_alerts = len(alerts)
        
        # Identify outliers (High Risk Users)
        outliers = []
        for u, data in state.users.items():
            if data.get('risk_score', 0) > 80:
                outliers.append(f"{u}: Risk {int(data['risk_score'])}")
        
        # Simple clustering proxy (In real app, use DBSCAN results)
        unique_clusters = len(outliers) # simplified
        
        # Reduction Ratio
        ratio = 0
        if total_alerts > 0:
            ratio = (1 - (len(outliers) / total_alerts)) * 100
            
        return jsonify({
            'reduction_ratio': f"{int(ratio)}%",
            'total_alerts': total_alerts,
            'unique_clusters': unique_clusters,
            'outliers': outliers
        })

@app.route('/api/incidents', methods=['GET'])
@login_required
def get_incidents():
    with state.lock:
        incidents = []
        
        # 1. High Risk Users -> Generate Incidents
        for u, data in state.users.items():
            risk = data.get('risk_score', 0)
            if risk > 50:
                # Determine severity
                severity = 'low'
                status = 'open'
                if risk > 90: severity = 'critical'
                elif risk > 70: severity = 'high'
                elif risk > 50: severity = 'medium'
                
                # Check for recent events to map status
                recent = data['events'][-5:]
                last_event_time = recent[-1]['timestamp'] if recent else datetime.datetime.now().isoformat()
                
                incidents.append({
                    'id': f"INC-{u}-{int(risk)}",
                    'title': f"High Risk User Detected: {u}",
                    'severity': severity,
                    'status': status,
                    'user': u,
                    'timestamp': last_event_time,
                    'riskScore': int(risk)
                })
                
        # 2. Add specific Critical Alerts (e.g. Honeypot) as separate incidents
        # Filter for recent critical logs (last 50)
        critical_logs = [l for l in state.logs[-50:] if l.get('is_malicious') and l.get('resource_id') in Config.HONEYPOT_PATHS]
        
        for log in critical_logs:
             incidents.append({
                'id': f"ALRT-{log['user_id']}-{int(time.time())}",
                'title': f"Honeypot Triggered: {log['resource_id']}",
                'severity': 'critical',
                'status': 'investigating',
                'user': log['user_id'],
                'timestamp': log['timestamp'],
                'riskScore': 100
            })
            
        # Sort by latest
        incidents.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify(incidents)

@app.route('/api/inject_log', methods=['POST'])
@login_required
def inject_log():
    data = request.json or {}
    malicious = data.get('malicious', False)
    
    # Generate event
    log = LogSimulator.generate_event(malicious=malicious)
    
    if log:
        with state.lock:
            # Normalize
            cim_log = LogNormalizer.normalize(log)
            log.update(cim_log)
            
            state.logs.append(log)
            if log['user_id'] in state.users:
                state.users[log['user_id']]['events'].append(log)
        return jsonify({'status': 'success', 'message': 'Log injected'})
    else:
        return jsonify({'status': 'ignored', 'message': 'User blocked or no event'})

@app.route('/api/graph_data', methods=['GET'])
def get_graph_data():
    with state.lock:
        # 1. Calculate Risks & Fusion
        user_risks = {}
        for u in state.users:
            recent = state.users[u]['events'][-20:]
            
            # UEBA Score
            ueba_score = ueba_engine.calculate_anomaly_score(u, recent)
            
            # Context
            last_resource = recent[-1]['resource_id'] if recent else 'None'
            context = ContextDB.get_context(u, last_resource)
            
            # Diversification (Placeholder until graph built)
            div_score = 50 
            
            # Fusion Score
            final_score = Fusion.aggregate_risk(u, ueba_score, div_score, context, recent)
            
            state.users[u]['risk_score'] = final_score
            user_risks[u] = final_score

        # 2. Build Graph
        G = graph_processor.build_graph(state.logs, user_risks)
        
        # 3. Recalculate Diversification & Update Fusion
        for u in state.users:
            div = graph_processor.calculate_diversification(u, G)
            # Re-fuse with actual div score
            recent = state.users[u]['events'][-20:]
            last_resource = recent[-1]['resource_id'] if recent else 'None'
            context = ContextDB.get_context(u, last_resource)
            
            # Need to re-fetch UEBA score? No, it's same.
            ueba_score = ueba_engine.calculate_anomaly_score(u, recent)
            
            final_score = Fusion.aggregate_risk(u, ueba_score, div, context, recent)
            state.users[u]['risk_score'] = final_score
            user_risks[u] = final_score
            
            # Update graph node data
            if u in G.nodes:
                G.nodes[u]['risk'] = final_score

        # 4. Serialize
        nodes = []
        links = []
        
        for n, d in G.nodes(data=True):
            nodes.append({
                'id': n,
                'group': d.get('community', 0),
                'type': d.get('type'),
                'risk': d.get('risk', 0),
                'is_decoy': d.get('is_decoy', False)
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
        user_data = state.users.get(user_id)
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        recent = user_data['events'][-10:]
        last_resource = recent[-1]['resource_id'] if recent else 'None'
        
        # Context & Explainability
        context = ContextDB.get_context(user_id, last_resource)
        feature_imp = ueba_engine.get_feature_importance(recent)
        feature_imp = ueba_engine.get_feature_importance(recent)
        
        # AI Analyst Integration
        # recommendation = Fusion.get_response_recommendation(user_data['risk_score'], context)
        recommendation = AIEngine.analyze_risk(user_id, user_data['risk_score'], context, recent)
        
        # Advanced Intel
        last_ip = recent[-1].get('source_ip', '0.0.0.0') if recent else '0.0.0.0'
        threat_intel = ThreatIntel.check_ip(last_ip)
        geo = GeoLocator.get_location(last_ip)
        
        # Collect MITRE tags from recent unique actions
        mitre_tags = list(set([MitreMapper.get_tags(e['action']) for e in recent]))
        
        return jsonify({
            'user_id': user_id,
            'risk_score': user_data['risk_score'],
            'hr_status': context['hr_status'],
            'sensitivity': context['sensitivity'],
            'feature_importance': feature_imp,
            'recommendation': recommendation,
            'recent_events': recent,
            'last_ip': last_ip,
            'threat_intel': threat_intel,
            'geo_location': geo,
            'mitre_tags': mitre_tags,
            'is_blocked': user_id in state.blocked_entities
        })

@app.route('/api/logs', methods=['GET'])
@login_required
def get_logs():
    query = request.args.get('q', '')
    limit = int(request.args.get('limit', 100))
    
    with state.lock:
        # Default behavior: reverse chronological
        data = list(reversed(state.logs))
        
        if query:
            # Check if using SPL (pipes)
            if '|' in query:
                # Use SPL Engine
                # Implicit 'search' if first command has no pipe
                if not query.strip().startswith('|') and not query.strip().lower().startswith('search'):
                    query = 'search ' + query
                
                results = SPLProcessor.execute(query, data)
                
                # Check if results are a list of logs or table/stats
                # If just a search, apply limit
                if isinstance(results, list) and len(results) > 0 and 'timestamp' in results[0]:
                     pass # Allow full search results, or limit?
                
                # Apply hard limit to prevent overload
                if isinstance(results, list):
                    results = results[:limit]
                    
                return jsonify(results)
            else:
                # Legacy simple search
                results = SPLProcessor._op_search(query, data)
                return jsonify(results[:limit])
                
        return jsonify(data[:limit])

# --- Entity Management & Simulation Control ---

@app.route('/api/entities', methods=['GET'])
@login_required
def get_entities():
    return jsonify({
        'users': LogSimulator.USERS,
        'resources': LogSimulator.RESOURCES,
        'honeypots': list(Honeypot.DECOYS),
        'simulation_running': simulation_running
    })

@app.route('/api/add_user', methods=['POST'])
@login_required
@role_required('admin')
def api_add_user():
    data = request.json
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Missing name'}), 400
    if name in LogSimulator.USERS:
        return jsonify({'error': 'User already exists'}), 400
    LogSimulator.USERS.append(name)
    save_sim_users(LogSimulator.USERS)
    with state.lock:
        state.users[name] = {'events': [], 'risk_score': 0}
    return jsonify({'status': 'success', 'users': LogSimulator.USERS})

@app.route('/api/remove_user', methods=['POST'])
@login_required
@role_required('admin')
def api_remove_user():
    data = request.json
    name = data.get('name', '').strip()
    if name in LogSimulator.USERS:
        LogSimulator.USERS.remove(name)
        save_sim_users(LogSimulator.USERS)
    with state.lock:
        state.users.pop(name, None)
    return jsonify({'status': 'success', 'users': LogSimulator.USERS})

@app.route('/api/add_resource', methods=['POST'])
@login_required
@role_required('admin')
def api_add_resource():
    data = request.json
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Missing name'}), 400
    if name in LogSimulator.RESOURCES:
        return jsonify({'error': 'Resource already exists'}), 400
    LogSimulator.RESOURCES.append(name)
    save_sim_resources(LogSimulator.RESOURCES)
    return jsonify({'status': 'success', 'resources': LogSimulator.RESOURCES})

@app.route('/api/remove_resource', methods=['POST'])
@login_required
@role_required('admin')
def api_remove_resource():
    data = request.json
    name = data.get('name', '').strip()
    if name in LogSimulator.RESOURCES:
        LogSimulator.RESOURCES.remove(name)
        save_sim_resources(LogSimulator.RESOURCES)
    return jsonify({'status': 'success', 'resources': LogSimulator.RESOURCES})

@app.route('/api/add_honeypot', methods=['POST'])
@login_required
@role_required('admin')
def api_add_honeypot():
    data = request.json
    path = data.get('path', '').strip()
    if not path:
        return jsonify({'error': 'Missing path'}), 400
    Honeypot.add_decoy(path)
    # Also add as a resource so simulation can generate accesses against it
    if path not in LogSimulator.RESOURCES:
        LogSimulator.RESOURCES.append(path)
        save_sim_resources(LogSimulator.RESOURCES)
    return jsonify({'status': 'success', 'honeypots': list(Honeypot.DECOYS)})

@app.route('/api/start_simulation', methods=['POST'])
@login_required
@role_required('admin')
def start_simulation():
    global simulation_running, simulation_thread
    if simulation_running:
        return jsonify({'status': 'already_running'})
    if not LogSimulator.USERS:
        return jsonify({'error': 'Add at least one user before starting simulation'}), 400
    if not LogSimulator.RESOURCES:
        return jsonify({'error': 'Add at least one resource before starting simulation'}), 400
    simulation_running = True
    simulation_thread = threading.Thread(target=simulation_loop, daemon=True)
    simulation_thread.start()
    return jsonify({'status': 'started'})

@app.route('/api/stop_simulation', methods=['POST'])
@login_required
@role_required('admin')
def stop_simulation():
    global simulation_running
    simulation_running = False
    return jsonify({'status': 'stopped'})

@app.route('/api/saved_searches', methods=['GET', 'POST'])
@login_required
def handle_saved_searches():
    if request.method == 'GET':
        return jsonify(load_saved_searches())
    
    if request.method == 'POST':
        data = request.json
        name = data.get('name')
        query = data.get('query')
        
        if not name or not query:
            return jsonify({'error': 'Missing name or query'}), 400
            
        searches = load_saved_searches()
        new_search = {
            'id': str(len(searches) + 1),
            'name': name,
            'query': query,
            'owner': current_user.id,
            'timestamp': datetime.datetime.now().isoformat()
        }
        searches.append(new_search)
        save_saved_searches(searches)
        return jsonify({'status': 'success', 'search': new_search})

@app.route('/api/add_entity', methods=['POST'])
@login_required
@role_required('admin')
def add_entity():
    data = request.json
    entity_id = data.get('id')
    
    if not entity_id:
        return jsonify({'status': 'error', 'message': 'Missing ID'}), 400
        
    # Check duplicate
    if entity_id in LogSimulator.RESOURCES:
        return jsonify({'status': 'error', 'message': 'Already exists'}), 400
        
    LogSimulator.RESOURCES.append(entity_id)
    # Persist
    save_systems(LogSimulator.RESOURCES)
    
    # Inject an initial event so it shows up in the graph/logs
    with state.lock:
        state.logs.append({
            'timestamp': datetime.datetime.now().isoformat(),
            'user_id': 'system',
            'action': 'SystemOnline',
            'resource_id': entity_id,
            'data_volume': 0,
            'is_malicious': False,
            'source_ip': '127.0.0.1',
            'sourcetype': 'system_event'
        })
    return jsonify({'status': 'success', 'message': f'System {entity_id} added'})

@app.route('/api/clear_logs', methods=['POST'])
@login_required
@role_required('admin')
def clear_logs():
    with state.lock:
        state.logs = []
        state.users = {}
        # Reset graph if needed? 
        # For now just clearing logs and users is a "hard reset"
    return jsonify({'status': 'success', 'message': 'All logs cleared'})

@app.route('/api/saved_searches/<search_id>', methods=['DELETE'])
@login_required
def delete_saved_search(search_id):
    searches = load_saved_searches()
    # Only owner or admin can delete
    search = next((s for s in searches if s['id'] == search_id), None)
    if not search:
        return jsonify({'error': 'Not found'}), 404
        
    if search['owner'] != current_user.id and current_user.role != 'admin':
         return jsonify({'error': 'Access Denied'}), 403
         
    searches = [s for s in searches if s['id'] != search_id]
    save_saved_searches(searches)
    return jsonify({'status': 'success'})



@app.route('/api/simulate_scenario', methods=['POST'])
@login_required
def simulate_scenario():
    data = request.json
    scenario = data.get('scenario')
    
    logs = LogSimulator.run_scenario(scenario)
    
    with state.lock:
        for log in logs:
            cim_log = LogNormalizer.normalize(log)
            log.update(cim_log)
            state.logs.append(log)
            if log['user_id'] in state.users:
                state.users[log['user_id']]['events'].append(log)
                
    return jsonify({'status': 'success', 'count': len(logs), 'message': f'Executed {scenario}'})

@app.route('/api/block_entity', methods=['POST'])
@login_required
@role_required('admin')
def block_entity():
    data = request.json
    entity_id = data.get('entity_id')
    
    if ResponseEngine.block_entity(entity_id):
        return jsonify({'status': 'success', 'message': f'{entity_id} blocked'})
    else:
        return jsonify({'status': 'ignored', 'message': f'{entity_id} already blocked'})


@app.route('/api/decoy_management', methods=['POST'])
@login_required
@role_required('admin')
def manage_decoy():
    data = request.json
    action = data.get('action')
    path = data.get('path')
    
    if action == 'add':
        Honeypot.add_decoy(path)
    elif action == 'remove':
        Honeypot.remove_decoy(path)
        
    return jsonify({'status': 'success', 'decoys': list(Honeypot.DECOYS)})

@app.route('/api/dashboards', methods=['GET', 'POST'])
@login_required
def handle_dashboards():
    if request.method == 'GET':
        return jsonify(load_dashboards())
    
    if request.method == 'POST':
        data = request.json
        # Simple create/update logic
        dashboards = load_dashboards()
        
        # Check if ID exists, update if so
        existing = next((d for d in dashboards if d['id'] == data.get('id')), None)
        if existing:
            existing.update(data)
        else:
            if not data.get('id'):
                data['id'] = f"dash_{random.randint(1000,9999)}"
            dashboards.append(data)
            
        save_dashboards(dashboards)
        return jsonify({'status': 'success', 'dashboard': data})

# --- Feature 3: Automated Playbooks (SOAR) ---

@app.route('/api/soar/ping', methods=['POST'])
def soar_ping():
    target = request.json.get('target', 'unknown')
    # Simulate Ping
    time.sleep(1) # Fake Latency
    status = "UP" if random.random() > 0.1 else "DOWN"
    latency = random.randint(10, 150)
    return jsonify({'status': 'success', 'output': f'PING {target}: 56 data bytes\n64 bytes from {target}: icmp_seq=1 ttl=118 time={latency} ms\n\n--- {target} ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss, time 0ms'})

@app.route('/api/soar/whois', methods=['POST'])
def soar_whois():
    target = request.json.get('target', 'unknown')
    # Simulate WHOIS
    return jsonify({'status': 'success', 'output': f'Domain Name: {target}\nRegistry Domain ID: 123456789_DOMAIN_COM-VRSN\nRegistrar WHOIS Server: whois.markmonitor.com\nRegistrar URL: http://www.markmonitor.com\nUpdated Date: 2025-01-15T04:00:00Z\nCreation Date: 2010-01-15T04:00:00Z\nRegistry Expiry Date: 2030-01-15T04:00:00Z\nRegistrar: MarkMonitor Inc.\nRegistrar IANA ID: 292\nRegistrar Abuse Contact Email: abusecomplaints@markmonitor.com'})


@app.route('/api/export_report/<user_id>', methods=['GET'])
def export_report(user_id):
    with state.lock:
        user_data = state.users.get(user_id)
        if not user_data:
            return "User not found", 404
            
        recent = user_data['events'][-20:]
        last_resource = recent[-1]['resource_id'] if recent else 'None'
        context = ContextDB.get_context(user_id, last_resource)
        
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        
        # Header
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(200, 10, txt=f"Project Hydra: Incident Case Report", ln=1, align='C')
        pdf.ln(10)
        
        # User Details
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(200, 10, txt=f"Subject Entity: {user_id}", ln=1)
        
        pdf.set_font("Arial", size=10)
        pdf.cell(200, 8, txt=f"Risk Score: {int(user_data['risk_score'])}/100", ln=1)
        pdf.cell(200, 8, txt=f"HR Status: {context['hr_status']}", ln=1)
        pdf.cell(200, 8, txt=f"Sensitivity Level: {context['sensitivity']}", ln=1)
        pdf.ln(10)
        
        # Activity Log
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(200, 10, txt="Recent Suspicious Activity:", ln=1)
        pdf.set_font("Arial", size=9)
        
        for event in recent:
            mal_tag = "[SUSPICIOUS]" if event['is_malicious'] else "[NORMAL]"
            line = f"{event['timestamp']} | {event['action']} | {event['resource_id']} | {mal_tag}"
            pdf.cell(200, 6, txt=line, ln=1)
            
        pdf.ln(10)
        pdf.set_font("Arial", 'I', 8)
        pdf.cell(200, 10, txt="Generated by Project Hydra Fusion Engine", ln=1, align='C')
        
        # Output
        out = io.BytesIO()
        out.write(pdf.output(dest='S').encode('latin-1'))
        out.seek(0)
        
        return send_file(out, as_attachment=True, download_name=f"case_report_{user_id}.pdf", mimetype='application/pdf')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
