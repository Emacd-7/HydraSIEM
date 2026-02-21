
export interface SystemStatus {
    ml_status: string;
    total_logs: number;
    eps: number;
    max_risk_score: number;
}

export interface LogEntry {
    timestamp: string;
    action: string;
    source_ip: string;
    user_id: string;
    resource_id: string;
    is_malicious: boolean;
    sourcetype: string;
    severity?: 'critical' | 'error' | 'warning' | 'info'; // Frontend mapped
    message?: string; // Frontend mapped
}

export const api = {
    login: async (username: string, password: string) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const res = await fetch('/login', {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Login failed');
        return res.json(); // Backend might return html or json, but usually simple 200/401
    },

    logout: async () => {
        await fetch('/logout');
    },

    getStats: async (): Promise<SystemStatus> => {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error('Failed to fetch status');
        return res.json();
    },

    getLogs: async (query: string = '', limit: number = 50): Promise<LogEntry[]> => {
        const res = await fetch(`/api/logs?q=${encodeURIComponent(query)}&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch logs');
        return res.json();
    },

    injectLog: async (malicious: boolean): Promise<any> => {
        const res = await fetch('/api/inject_log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ malicious }),
        });
        return res.json();
    },

    // Graph APIs
    getGraphData: async () => {
        const res = await fetch('/api/graph_data');
        if (!res.ok) throw new Error('Failed to fetch graph data');
        const data = await res.json();
        // Transform or pass through
        return data;
    },

    getUserContext: async (userId: string) => {
        const res = await fetch(`/api/user_context/${userId}`);
        if (!res.ok) throw new Error('User not found');
        return res.json();
    }
};
