# 🐉 DATA HYDRA SIEM (Fusion Engine)

**Welcome to Project Hydra.**
This is a next-generation **Security Information and Event Management (SIEM)** system, designed to detect, analyze, and visualize cyber threats in real-time. It mimics the core capabilities of enterprise tools like **Splunk** but with a modern, fusion-engine architecture.

---

## 🏗️ Architecture: How It Works

Imagine a "Building Security System" for a digital city.
1.  **Sensors (Data Inputs)**: We collect logs from Servers, Firewalls, and Databases.
2.  **The Brain (Fusion Engine)**: We don't just look for "bad passwords". We combine:
    *   **UEBA (User Behavior)**: "Is Dave extracting 50GB of data at 3 AM?" (Anomaly Detection).
    *   **Graph Analysis**: "Is Dave connecting to a server that connects to a known Russian botnet?"
    *   **Threat Intel**: "Is this IP address a known attacker?"
3.  **The Dashboard (Visuals)**: A command center for Analysts to see alerts and take action.

---

## 🚀 Features

### 1. 🕵️‍♀️ Role-Based Access Control (RBAC)
*Security starts with us.*
- **Admin**: The "God Mode". Can add systems, block users, and run simulations.
- **Analyst**: The investigators. Can search logs, view graphs, and save queries.
- *Try it*: Login as `admin`/`admin` vs customized user.

### 2. 🧠 Fusion Analysis & Graph
*Connecting the dots.*
- We build a dynamic 3D graph of Users and Resources.
- **Red Nodes**: High Risk. **Blue Nodes**: Resources. **Orange Nodes**: Honeypots (Traps).
- **Cluster Analysis**: We use ML (DBSCAN) to group 1,000 alerts into 5 meaningful incidents.

### 3. 🔦 Splunk-like Knowledge Objects
*Power Tools for Analysts.*
- **Saved Searches**: Don't retype complex queries. Save them (e.g., "High Risk Web Traffic") and recall them instantly.
- **Sourcetypes**: The system automatically tags logs (e.g., `win_event_log`, `firewall_log`) so you know what you're looking at.

### 4. ⚔️ Breach Simulation "War Room"
*Test your defenses.*
- **Ransomware**: Simulates a crypto-locker attack (rapid file encryption).
- **Exfiltration**: Simulates an insider stealing data (large uploads).
- **Brute Force**: Simulates a password guessing attack.
- *Visuals*: Watch the dashboard light up as the simulation runs!

### 5. 🔌 Data Inputs
*Expand your scope.*
- Admins can "Add Data" to register new systems (e.g., "Finance-Server-01") into the monitoring loop.

---

## 📖 User Guide

### Getting Started
1.  **Start Server**: `python hydra_analyzer.py`
2.  **Login**: Access `http://localhost:5000`. Login with Google or register a new account.

### The Workflow
1.  **Monitor**: Watch the "Overview" dashboard for high-level stats.
2.  **Triage**: Go to "Incidents". If you see a spike:
    *   Run a **Simulation** (e.g., Ransomware) to see how the system reacts.
3.  **Investigate**:
    *   Go to **Fusion Graph**. Click on a Red Node.
    *   See the "Why?" (Feature Importance: "High Data Volume at 3 AM").
4.  **Hunt**:
    *   Go to **Log Search**.
    *   Run a query like `sourcetype=firewall_log`.
    *   Save it for later.
5.  **Respond**:
    *   As Admin, click **BLOCK ENTITY** to lock them out.

---

## 🛠️ Tech Stack
- **Backend**: Python (Flask, NetworkX, Scikit-Learn, Pandas)
- **Frontend**: HTML5, TailwindCSS, D3.js (Graph), Chart.js
- **Auth**: Google OAuth 2.0, Flask-Login

---

*Project Hydra: Seeing the unseen.*
