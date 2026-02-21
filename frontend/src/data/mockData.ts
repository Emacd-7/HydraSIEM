// Mock data for the SIEM dashboard

export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  sourcetype: string;
  severity: 'info' | 'warning' | 'critical' | 'error';
  message: string;
  user?: string;
  ip?: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'server' | 'user' | 'firewall' | 'database' | 'endpoint';
  riskLevel: number; // 0-100
  x: number;
  y: number;
  connections: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  riskScore: number;
  lastActive: string;
  department: string;
  recentLogs: LogEntry[];
  aiInsight: string;
}

export const mockLogs: LogEntry[] = [
  { id: 'log-001', timestamp: '2026-02-15T14:23:01Z', source: '10.0.1.45', sourcetype: 'access_combined', severity: 'info', message: 'GET /api/users HTTP/1.1 200 OK', user: 'jsmith', ip: '10.0.1.45' },
  { id: 'log-002', timestamp: '2026-02-15T14:23:04Z', source: '10.0.2.12', sourcetype: 'syslog', severity: 'warning', message: 'Failed SSH login attempt - user: root, attempts: 3', user: 'unknown', ip: '192.168.1.100' },
  { id: 'log-003', timestamp: '2026-02-15T14:23:07Z', source: 'fw-01', sourcetype: 'firewall', severity: 'critical', message: 'BLOCKED: Outbound connection to known C2 server 45.33.32.156:443', ip: '45.33.32.156' },
  { id: 'log-004', timestamp: '2026-02-15T14:23:09Z', source: '10.0.1.20', sourcetype: 'access_combined', severity: 'info', message: 'POST /api/auth/login HTTP/1.1 200 OK', user: 'amorgan', ip: '10.0.1.20' },
  { id: 'log-005', timestamp: '2026-02-15T14:23:12Z', source: 'db-primary', sourcetype: 'mysql_audit', severity: 'error', message: 'Privilege escalation detected: user "temp_admin" granted SUPER privilege', user: 'temp_admin', ip: '10.0.3.5' },
  { id: 'log-006', timestamp: '2026-02-15T14:23:15Z', source: '10.0.1.78', sourcetype: 'winlog', severity: 'warning', message: 'PowerShell execution policy bypassed - encoded command detected', user: 'jdoe', ip: '10.0.1.78' },
  { id: 'log-007', timestamp: '2026-02-15T14:23:18Z', source: 'proxy-01', sourcetype: 'squid', severity: 'info', message: 'CONNECT accounts.google.com:443 HTTP/1.1 200 Connection established', user: 'mchen', ip: '10.0.1.33' },
  { id: 'log-008', timestamp: '2026-02-15T14:23:21Z', source: '10.0.2.55', sourcetype: 'syslog', severity: 'critical', message: 'Ransomware signature detected in file: invoice_q4.pdf.exe', user: 'rjones', ip: '10.0.2.55' },
  { id: 'log-009', timestamp: '2026-02-15T14:23:24Z', source: 'ids-01', sourcetype: 'snort', severity: 'warning', message: 'ALERT [1:2024917:1] ET TROJAN Win32/Emotet CnC Activity', ip: '10.0.1.92' },
  { id: 'log-010', timestamp: '2026-02-15T14:23:27Z', source: '10.0.1.10', sourcetype: 'access_combined', severity: 'info', message: 'GET /dashboard HTTP/1.1 304 Not Modified', user: 'admin', ip: '10.0.1.10' },
  { id: 'log-011', timestamp: '2026-02-15T14:23:30Z', source: 'vpn-gw', sourcetype: 'openvpn', severity: 'warning', message: 'TLS handshake failed from 203.0.113.42 - certificate expired', ip: '203.0.113.42' },
  { id: 'log-012', timestamp: '2026-02-15T14:23:33Z', source: '10.0.3.15', sourcetype: 'mysql_audit', severity: 'error', message: 'DROP TABLE users; -- SQL injection attempt blocked', user: 'webapp', ip: '10.0.3.15' },
  { id: 'log-013', timestamp: '2026-02-15T14:23:36Z', source: 'mail-01', sourcetype: 'postfix', severity: 'info', message: 'Delivered: message-id=<abc123@corp.local> to=<jsmith@corp.local>', user: 'jsmith', ip: '10.0.4.1' },
  { id: 'log-014', timestamp: '2026-02-15T14:23:39Z', source: '10.0.1.45', sourcetype: 'access_combined', severity: 'critical', message: 'Data exfiltration detected: 2.3GB transferred to external IP in 4 minutes', user: 'jsmith', ip: '10.0.1.45' },
  { id: 'log-015', timestamp: '2026-02-15T14:23:42Z', source: 'ad-dc01', sourcetype: 'winlog', severity: 'error', message: 'Account lockout: user "svc_backup" after 10 failed attempts from 10.0.2.99', user: 'svc_backup', ip: '10.0.2.99' },
];

export const mockNodes: NetworkNode[] = [
  { id: 'node-fw', label: 'Firewall-01', type: 'firewall', riskLevel: 15, x: 400, y: 80, connections: ['node-srv1', 'node-srv2', 'node-proxy'] },
  { id: 'node-srv1', label: 'Web-Server', type: 'server', riskLevel: 45, x: 200, y: 200, connections: ['node-fw', 'node-db1', 'node-ep1'] },
  { id: 'node-srv2', label: 'App-Server', type: 'server', riskLevel: 30, x: 600, y: 200, connections: ['node-fw', 'node-db1', 'node-ep3'] },
  { id: 'node-db1', label: 'DB-Primary', type: 'database', riskLevel: 85, x: 400, y: 320, connections: ['node-srv1', 'node-srv2'] },
  { id: 'node-proxy', label: 'Proxy-01', type: 'server', riskLevel: 20, x: 700, y: 100, connections: ['node-fw', 'node-ep2'] },
  { id: 'node-ep1', label: 'J.Smith-WS', type: 'user', riskLevel: 92, x: 100, y: 350, connections: ['node-srv1'] },
  { id: 'node-ep2', label: 'M.Chen-WS', type: 'user', riskLevel: 10, x: 750, y: 250, connections: ['node-proxy'] },
  { id: 'node-ep3', label: 'R.Jones-WS', type: 'user', riskLevel: 78, x: 550, y: 380, connections: ['node-srv2'] },
  { id: 'node-ep4', label: 'A.Morgan-WS', type: 'user', riskLevel: 5, x: 300, y: 420, connections: ['node-srv1'] },
];

export const mockUsers: UserProfile[] = [
  {
    id: 'user-001',
    name: 'John Smith',
    role: 'Software Engineer',
    riskScore: 92,
    lastActive: '2026-02-15T14:23:42Z',
    department: 'Engineering',
    recentLogs: mockLogs.filter(l => l.user === 'jsmith'),
    aiInsight: 'HIGH RISK — Subject has exhibited anomalous data transfer patterns. A 2.3GB exfiltration event was detected at 14:23:39, correlating with prior reconnaissance activity on /api/users. Behavioral deviation from 30-day baseline: +340%. Recommend immediate credential revocation and forensic workstation imaging.',
  },
  {
    id: 'user-002',
    name: 'Rachel Jones',
    role: 'Marketing Analyst',
    riskScore: 78,
    lastActive: '2026-02-15T14:23:21Z',
    department: 'Marketing',
    recentLogs: mockLogs.filter(l => l.user === 'rjones'),
    aiInsight: 'ELEVATED RISK — Ransomware signature (invoice_q4.pdf.exe) was detected on this endpoint. The file matches known Emotet dropper patterns. The user may be a phishing victim rather than a malicious actor. Recommend endpoint isolation and user interview.',
  },
  {
    id: 'user-003',
    name: 'Michelle Chen',
    role: 'Product Manager',
    riskScore: 10,
    lastActive: '2026-02-15T14:23:18Z',
    department: 'Product',
    recentLogs: mockLogs.filter(l => l.user === 'mchen'),
    aiInsight: 'LOW RISK — Normal browsing and communication patterns observed. No anomalies detected in the last 30 days. All accessed resources are within expected scope.',
  },
];

export const getNodeById = (id: string): NetworkNode | undefined => mockNodes.find(n => n.id === id);
export const getUserByNodeId = (nodeId: string): UserProfile | undefined => {
  const node = getNodeById(nodeId);
  if (!node || node.type !== 'user') return undefined;
  const nameMap: Record<string, string> = {
    'node-ep1': 'user-001',
    'node-ep2': 'user-003',
    'node-ep3': 'user-002',
  };
  return mockUsers.find(u => u.id === nameMap[nodeId]);
};
