
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
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Login failed');
        }
        return res.json();
    },

    logout: async () => {
        await fetch('/api/logout');
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
        return data;
    },

    getUserContext: async (userId: string) => {
        const res = await fetch(`/api/user_context/${userId}`);
        if (!res.ok) throw new Error('User not found');
        return res.json();
    },

    getIncidents: async () => {
        const res = await fetch('/api/incidents');
        if (!res.ok) throw new Error('Failed to fetch incidents');
        return res.json();
    },

    // Admin APIs
    addEntity: async (id: string) => {
        const res = await fetch('/api/add_entity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        return res.json();
    },

    clearLogs: async () => {
        const res = await fetch('/api/clear_logs', { method: 'POST' });
        return res.json();
    },

    // Saved Search APIs
    getSavedSearches: async () => {
        const res = await fetch('/api/saved_searches');
        if (!res.ok) throw new Error('Failed to fetch saved searches');
        return res.json();
    },

    saveSearch: async (name: string, query: string) => {
        const res = await fetch('/api/saved_searches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, query })
        });
        return res.json();
    },

    deleteSearch: async (id: string) => {
        const res = await fetch(`/api/saved_searches/${id}`, { method: 'DELETE' });
        return res.json();
    },

    // Entity Management APIs
    getEntities: async () => {
        const res = await fetch('/api/entities');
        if (!res.ok) throw new Error('Failed to fetch entities');
        return res.json();
    },

    addUser: async (name: string) => {
        const res = await fetch('/api/add_user', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
        return res.json();
    },

    removeUser: async (name: string) => {
        const res = await fetch('/api/remove_user', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return res.json();
    },

    addResource: async (name: string) => {
        const res = await fetch('/api/add_resource', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
        return res.json();
    },

    removeResource: async (name: string) => {
        const res = await fetch('/api/remove_resource', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return res.json();
    },

    addHoneypot: async (path: string) => {
        const res = await fetch('/api/add_honeypot', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
        return res.json();
    },

    startSimulation: async () => {
        const res = await fetch('/api/start_simulation', { method: 'POST' });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to start'); }
        return res.json();
    },

    stopSimulation: async () => {
        const res = await fetch('/api/stop_simulation', { method: 'POST' });
        return res.json();
    },

    // --- Company File Management ---
    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/company/upload', { method: 'POST', body: formData });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Upload failed'); }
        return res.json();
    },

    getCompanyFiles: async (companyId?: string) => {
        const url = companyId ? `/api/company/files?company_id=${companyId}` : '/api/company/files';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch files');
        return res.json();
    },

    blockUser: async (userId: string, action: 'block' | 'unblock') => {
        const res = await fetch('/api/admin/block_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, action }),
        });
        return res.json();
    },

    assignFile: async (companyId: string, fileId: string, userId: string, action: 'grant' | 'revoke') => {
        const res = await fetch('/api/admin/assign_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_id: companyId, file_id: fileId, user_id: userId, action }),
        });
        return res.json();
    },

    logSecurityEvent: async (eventType: string, fileId: string) => {
        await fetch('/api/admin/log_security_event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: eventType, file_id: fileId }),
        });
    },

    getCompanies: async () => {
        const res = await fetch('/api/companies');
        if (!res.ok) throw new Error('Failed to fetch companies');
        return res.json();
    },
};
