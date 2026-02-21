import { useState, useEffect } from "react";
import { AlertTriangle, Clock, User, ChevronRight, Brain, Globe, Shield, Activity, X } from "lucide-react";
import { api } from "@/services/api";

const severityStyles: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-destructive/10 text-destructive/80 border-destructive/20",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-primary/10 text-primary border-primary/30",
};

const statusStyles: Record<string, string> = {
  open: "text-destructive",
  investigating: "text-warning",
  resolved: "text-success",
};

export default function Incidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [incidentDetails, setIncidentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const data = await api.getIncidents();
        setIncidents(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  const handleIncidentClick = async (incident: any) => {
    setSelectedIncident(incident);
    setLoadingDetails(true);
    try {
      const details = await api.getUserContext(incident.user);
      setIncidentDetails(details);
    } catch (e) {
      console.error(e);
      setIncidentDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading && incidents.length === 0) {
    return <div className="p-6 text-mono text-muted-foreground">Loading Operations Center...</div>;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Incident Command</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.3em]">Neural Triage Interface // v4.0</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="px-3 py-1.5 rounded bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            {incidents.filter((i) => i.status === "open").length} Critical
          </div>
          <div className="px-3 py-1.5 rounded bg-warning/10 border border-warning/30 text-warning">
            {incidents.filter((i) => i.status === "investigating").length} Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Incident List */}
        <div className="space-y-3">
          {incidents.length === 0 ? (
            <div className="glass-panel p-12 text-center text-muted-foreground font-mono border-dashed opacity-40">
              No active threats detected. Network status: SECURE.
            </div>
          ) : (
            incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => handleIncidentClick(inc)}
                className={`glass-panel p-4 flex items-center gap-4 transition-all cursor-pointer group hover:bg-secondary/20 ${selectedIncident?.id === inc.id ? 'border-primary shadow-[0_0_15px_rgba(var(--primary),0.1)] bg-secondary/30' : 'hover:border-primary/30'}`}
              >
                <div className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider border ${severityStyles[inc.severity]}`}>
                  {inc.severity}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm tracking-tight">{inc.title}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-mono uppercase tracking-widest opacity-70">
                    <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" />{inc.user}</span>
                    <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{new Date(inc.timestamp).toLocaleTimeString()}</span>
                    <span className={`${statusStyles[inc.status]}`}>● {inc.status}</span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xl font-black leading-none" style={{ color: inc.riskScore > 80 ? "hsl(0, 84%, 60%)" : inc.riskScore > 50 ? "hsl(38, 92%, 50%)" : "hsl(187, 94%, 43%)" }}>
                      {inc.riskScore}
                    </div>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">LVL</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground group-hover:text-primary transition-all ${selectedIncident?.id === inc.id ? 'rotate-90 text-primary' : ''}`} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Incident Details Panel */}
        <div className="sticky top-6">
          {selectedIncident ? (
            <div className="glass-panel p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Incident Details
                  </h2>
                  <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">{selectedIncident.id}</p>
                </div>
                <button onClick={() => setSelectedIncident(null)} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-mono text-muted-foreground uppercase animate-pulse">Running Neural Analysis...</p>
                </div>
              ) : incidentDetails ? (
                <div className="space-y-6">
                  {/* AI Recommendation */}
                  <div className="p-4 rounded border border-primary/20 bg-primary/5 space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                      <Brain className="h-4 w-4" /> AI Analyst Recommendation
                    </div>
                    <p className="text-sm text-foreground/90 italic leading-relaxed font-serif">
                      "{incidentDetails.recommendation}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-secondary/30 rounded border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground font-mono mb-1">HR Status</div>
                      <div className="text-sm font-bold capitalize">{incidentDetails.hr_status}</div>
                    </div>
                    <div className="p-3 bg-secondary/30 rounded border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground font-mono mb-1">Sensitivity</div>
                      <div className="text-sm font-bold capitalize">{incidentDetails.sensitivity}</div>
                    </div>
                  </div>

                  {/* Threat Intel */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Globe className="h-3 w-3" /> External Intelligence
                    </div>
                    <div className="p-3 bg-background/50 rounded border border-border flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground font-mono">Source IP: <span className="text-foreground">{incidentDetails.last_ip}</span></div>
                        <div className={`text-xs font-bold ${incidentDetails.threat_intel?.status === 'malicious' ? 'text-destructive' : 'text-success'}`}>
                          {incidentDetails.threat_intel?.status?.toUpperCase() || 'CLEAN'}
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">
                        {incidentDetails.geo || 'Unknown Origin'}
                      </div>
                    </div>
                  </div>

                  {/* MITRE Tags */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Activity className="h-3 w-3" /> MITRE ATT&CK Framework
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {incidentDetails.mitre_tags?.map((tag: string) => (
                        <span key={tag} className="px-2 py-1 rounded-sm bg-secondary text-[10px] font-mono uppercase border border-border/50 text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                      {(!incidentDetails.mitre_tags || incidentDetails.mitre_tags.length === 0) && (
                        <span className="text-[10px] text-muted-foreground italic">No tactical patterns identified.</span>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity Mini-feed */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Telemetry</div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {incidentDetails.recent_events?.map((ev: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded bg-secondary/20 border border-border text-[11px] font-mono flex gap-3">
                          <span className="text-primary opacity-60 shrink-0">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span className="text-foreground/80 truncate">{ev.action} on {ev.resource_id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-xs italic">
                  Data stream disconnected.
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-12 h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 border-dashed">
              <div className="p-4 rounded-full bg-secondary/50">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Awaiting Selection</h3>
                <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">Select an active incident to initialize telemetry.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
