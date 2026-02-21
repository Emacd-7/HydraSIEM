// Mock data for the SIEM dashboard

export const dashboardStats = {
  totalUsers: 1284,
  totalLogs: 2_847_391,
  maxRiskScore: 94,
  eps: 347,
};

export const eventVolumeData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, "0")}:00`,
  events: Math.floor(Math.random() * 5000 + 1000),
  alerts: Math.floor(Math.random() * 200 + 20),
}));

export const topSourcetypes = [
  { name: "access_combined", value: 34 },
  { name: "syslog", value: 22 },
  { name: "wineventlog", value: 18 },
  { name: "firewall", value: 14 },
  { name: "dns_query", value: 12 },
];

export const riskyUsers = [
  { name: "jsmith", risk: 94, department: "Finance" },
  { name: "admin_root", risk: 87, department: "IT" },
  { name: "klee", risk: 76, department: "Engineering" },
  { name: "mjones", risk: 68, department: "HR" },
  { name: "dbrown", risk: 55, department: "Marketing" },
  { name: "awhite", risk: 42, department: "Sales" },
];

export const incidents = [
  { id: "INC-001", title: "Brute Force Detected", severity: "critical", user: "jsmith", timestamp: "2024-01-15T14:23:00Z", status: "open", riskScore: 94 },
  { id: "INC-002", title: "Lateral Movement Suspected", severity: "high", user: "admin_root", timestamp: "2024-01-15T13:45:00Z", status: "investigating", riskScore: 87 },
  { id: "INC-003", title: "Data Exfiltration Alert", severity: "critical", user: "klee", timestamp: "2024-01-15T12:30:00Z", status: "open", riskScore: 76 },
  { id: "INC-004", title: "Privilege Escalation", severity: "medium", user: "mjones", timestamp: "2024-01-15T11:15:00Z", status: "resolved", riskScore: 68 },
  { id: "INC-005", title: "Anomalous DNS Queries", severity: "low", user: "dbrown", timestamp: "2024-01-15T10:00:00Z", status: "resolved", riskScore: 55 },
  { id: "INC-006", title: "Honeypot Triggered", severity: "critical", user: "unknown", timestamp: "2024-01-15T09:30:00Z", status: "open", riskScore: 99 },
];

export const sampleLogs = [
  { _time: "2024-01-15T14:23:01Z", sourcetype: "access_combined", host: "web-01", source: "/var/log/httpd/access.log", _raw: '192.168.1.105 - jsmith [15/Jan/2024:14:23:01 +0000] "POST /api/login HTTP/1.1" 401 342' },
  { _time: "2024-01-15T14:23:02Z", sourcetype: "syslog", host: "fw-01", source: "/var/log/syslog", _raw: 'Jan 15 14:23:02 fw-01 kernel: [UFW BLOCK] IN=eth0 SRC=10.0.0.55 DST=192.168.1.1 PROTO=TCP DPT=22' },
  { _time: "2024-01-15T14:23:03Z", sourcetype: "wineventlog", host: "dc-01", source: "WinEventLog:Security", _raw: 'EventCode=4625 An account failed to log on. Subject: Security ID: NULL SID Account Name: admin_root' },
  { _time: "2024-01-15T14:23:04Z", sourcetype: "dns_query", host: "dns-01", source: "/var/log/named/query.log", _raw: 'client 192.168.1.200#52341: query: suspicious-domain.xyz IN A +' },
  { _time: "2024-01-15T14:23:05Z", sourcetype: "firewall", host: "fw-01", source: "/var/log/firewall", _raw: 'DENY TCP 10.0.0.55:44231 -> 192.168.1.1:445 (SMB)' },
];

export const graphNodes = [
  { id: "jsmith", label: "jsmith", type: "user", risk: 94 },
  { id: "admin_root", label: "admin_root", type: "user", risk: 87 },
  { id: "klee", label: "klee", type: "user", risk: 76 },
  { id: "mjones", label: "mjones", type: "user", risk: 68 },
  { id: "dbrown", label: "dbrown", type: "user", risk: 55 },
  { id: "web-01", label: "web-01", type: "system", risk: 30 },
  { id: "fw-01", label: "fw-01", type: "system", risk: 45 },
  { id: "dc-01", label: "dc-01", type: "system", risk: 80 },
  { id: "dns-01", label: "dns-01", type: "system", risk: 25 },
  { id: "db-01", label: "db-01", type: "system", risk: 60 },
];

export const graphLinks = [
  { source: "jsmith", target: "web-01" },
  { source: "jsmith", target: "dc-01" },
  { source: "admin_root", target: "dc-01" },
  { source: "admin_root", target: "fw-01" },
  { source: "admin_root", target: "db-01" },
  { source: "klee", target: "db-01" },
  { source: "klee", target: "dns-01" },
  { source: "mjones", target: "web-01" },
  { source: "dbrown", target: "dns-01" },
];

export const savedSearches = [
  { name: "Failed Logins", query: 'sourcetype=access_combined status=401 | stats count by user' },
  { name: "Firewall Blocks", query: 'sourcetype=firewall action=DENY | stats count by src_ip' },
  { name: "DNS Anomalies", query: 'sourcetype=dns_query | rare domain limit=10' },
  { name: "Top Talkers", query: 'sourcetype=* | stats count by host | sort -count | head 10' },
];
