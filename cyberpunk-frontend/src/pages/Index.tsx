import { useState, useEffect } from "react";
import { Users, FileText, AlertTriangle, Activity } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from "recharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { TypewriterText } from "@/components/dashboard/TypewriterText";
import { api, type SystemStatus } from "@/services/api";

const CHART_COLORS = [
  "hsl(187, 94%, 43%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(270, 70%, 60%)",
];

const EMPTY_VOLUME = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, "0")}:00`,
  events: 0,
  alerts: 0,
}));

export default function Dashboard() {
  const [stats, setStats] = useState<SystemStatus>({ ml_status: 'Idle', total_logs: 0, eps: 0, max_risk_score: 0 });
  const [dashData, setDashData] = useState<{
    event_volume: any[];
    top_sourcetypes: any[];
    top_risky_users: any[];
    simulation_running: boolean;
  }>({ event_volume: EMPTY_VOLUME, top_sourcetypes: [], top_risky_users: [], simulation_running: false });
  const [booted, setBooted] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Fetch Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statusData, dashStats, entities] = await Promise.all([
          api.getStats(),
          fetch('/api/dashboard_stats').then(r => r.json()),
          api.getEntities(),
        ]);
        setStats(statusData);
        setDashData({
          event_volume: dashStats.event_volume?.length ? dashStats.event_volume : EMPTY_VOLUME,
          top_sourcetypes: dashStats.top_sourcetypes || [],
          top_risky_users: dashStats.top_risky_users || [],
          simulation_running: entities.simulation_running,
        });
      } catch (e) { console.error(e); }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Boot sequence
  useEffect(() => {
    const timer = setTimeout(() => setBooted(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!booted) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <TypewriterText text="> HYDRA SIEM v4.2.0 — System Online" speed={40} onComplete={() => setTimeout(() => setShowContent(true), 500)} />
          {showContent && (
            <p className="text-xs text-muted-foreground animate-fade-in font-mono">Initializing threat detection modules...</p>
          )}
        </div>
      </div>
    );
  }

  const { event_volume, top_sourcetypes, top_risky_users, simulation_running } = dashData;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Threat Dashboard</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.3em]">Real-time Security Posture Overview</p>
        </div>
        {/* Sim status pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold ${simulation_running ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground border border-border'}`}>
          {simulation_running ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              SIM ACTIVE
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block"></span>
              SIM IDLE
            </>
          )}
        </div>
      </div>

      {/* Empty State Banner */}
      {stats.total_logs === 0 && !simulation_running && (
        <div className="glass-panel p-5 border-dashed border-primary/20 text-center">
          <p className="text-sm font-mono text-muted-foreground">
            No logs yet. Go to <span className="text-primary font-bold">Mission Control</span> → Add Users & Resources → <span className="text-primary font-bold">Start Simulation</span>.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={Object.keys(dashData.top_risky_users).length || stats.total_logs > 0 ? top_risky_users.length : 0} icon={Users} />
        <StatCard title="Total Logs" value={stats.total_logs} icon={FileText} />
        <StatCard title="Max Risk Score" value={Math.round(stats.max_risk_score)} icon={AlertTriangle} variant="danger" />
        <StatCard title="Events/sec" value={stats.eps} icon={Activity} animate variant={simulation_running ? "warning" : "default"} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Event Volume */}
        <div className="lg:col-span-2 glass-panel p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Event Volume (24h)</h3>
          {stats.total_logs === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground/40 font-mono border border-dashed border-border rounded">
              No events recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={event_volume}>
                <defs>
                  <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(187, 94%, 43%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(187, 94%, 43%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="hour" stroke="hsl(215, 20%, 55%)" fontSize={11} fontFamily="JetBrains Mono" />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={11} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(222, 47%, 9%)", border: "1px solid hsl(222, 30%, 20%)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 12 }}
                  labelStyle={{ color: "hsl(210, 40%, 92%)" }}
                />
                <Area type="monotone" dataKey="events" stroke="hsl(187, 94%, 43%)" fill="url(#gradCyan)" strokeWidth={2} />
                <Area type="monotone" dataKey="alerts" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.1} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Sourcetypes */}
        <div className="glass-panel p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Top Sourcetypes</h3>
          {top_sourcetypes.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground/40 font-mono border border-dashed border-border rounded">
              No data yet
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={top_sourcetypes} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                    {top_sourcetypes.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 9%)", border: "1px solid hsl(222, 30%, 20%)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {top_sourcetypes.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                    <span className="text-muted-foreground flex-1">{s.name}</span>
                    <span className="text-foreground">{s.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Risky Users */}
      <div className="glass-panel p-5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Top Risky Users</h3>
        {top_risky_users.length === 0 ? (
          <div className="py-8 flex items-center justify-center text-xs text-muted-foreground/40 font-mono border border-dashed border-border rounded">
            No users tracked yet. Run simulation to generate activity.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(100, top_risky_users.length * 36)}>
            <BarChart data={top_risky_users} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="hsl(215, 20%, 55%)" fontSize={11} fontFamily="JetBrains Mono" />
              <YAxis dataKey="name" type="category" stroke="hsl(215, 20%, 55%)" fontSize={11} fontFamily="JetBrains Mono" width={100} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 9%)", border: "1px solid hsl(222, 30%, 20%)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 12 }} />
              <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
                {top_risky_users.map((u, i) => (
                  <Cell key={i} fill={u.risk > 80 ? "hsl(0, 84%, 60%)" : u.risk > 50 ? "hsl(38, 92%, 50%)" : "hsl(187, 94%, 43%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
