import { useEffect, useState, useCallback } from "react";
import { Activity, Shield, Users, Database, Zap } from "lucide-react";
import { api, type SystemStatus, type LogEntry } from "../services/api";

const KPICard = ({
  label,
  value,
  icon: Icon,
  variant = "default",
  animate = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  variant?: "default" | "danger" | "primary";
  animate?: boolean;
}) => {
  const variantClasses = {
    default: "border-border",
    danger: "border-blood/40",
    primary: "border-primary/30",
  };

  return (
    <div className={`glass-panel p-5 ${variantClasses[variant]} transition-gothic hover:border-primary/40`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`mt-2 font-mono text-3xl font-semibold tracking-tight ${animate ? "animate-pulse-slow" : ""} ${variant === "danger" ? "text-destructive-foreground" : "text-foreground"}`}>
            {value}
          </p>
        </div>
        <div className={`rounded-md p-2 ${variant === "danger" ? "bg-blood/20 text-destructive-foreground" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const RiskGauge = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-panel flex flex-col items-center justify-center p-5 border-blood/40 transition-gothic hover:border-primary/40">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">Risk Score</p>
      <div className="relative">
        <svg width="120" height="120" className="-rotate-90">
          <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={score > 70 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-gothic"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold ${score > 70 ? "text-destructive-foreground" : "text-primary"}`}>
          {score}
        </span>
      </div>
    </div>
  );
};

const SimulationButton = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (active) {
      // Attack Mode: Inject malicious logs every 500ms
      interval = setInterval(() => {
        api.injectLog(true).catch(console.error);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [active]);

  return (
    <button
      onClick={() => setActive(!active)}
      className={`glass-panel w-full py-4 px-6 font-serif text-sm uppercase tracking-[0.2em] transition-gothic cursor-pointer ${active
        ? "border-blood/60 bg-blood/20 text-destructive-foreground animate-pulse-blood"
        : "border-primary/30 text-primary hover:border-primary/60 hover:bg-primary/5"
        }`}
    >
      <div className="flex items-center justify-center gap-3">
        <Zap className={`h-4 w-4 ${active ? "text-destructive-foreground" : ""}`} />
        {active ? "⚠ SIMULATION ACTIVE" : "INITIATE SIMULATION"}
      </div>
    </button>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState<SystemStatus>({ ml_status: 'Idle', total_logs: 0, eps: 0, max_risk_score: 0 });
  const [events, setEvents] = useState<LogEntry[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const s = await api.getStats();
      setStats(s);
      // Fetch specifically critical/high risk logs 
      // (Backend doesn't support filter params perfectly yet, but gets recent logs)
      const l = await api.getLogs('', 5);
      setEvents(l);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="font-serif text-2xl tracking-wider text-foreground">SYSTEM STATUS</h1>
        <div className="mt-1 h-px w-24 bg-gradient-to-r from-primary/60 to-transparent" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Events / Sec" value={stats.eps} icon={Activity} variant="primary" animate />
        <RiskGauge score={Math.round(stats.max_risk_score)} />
        <KPICard label="Active Users" value={stats.ml_status === 'Training' ? '...' : 'Active'} icon={Users} />
        <KPICard label="Total Logs" value={stats.total_logs.toLocaleString()} icon={Database} />
      </div>

      <SimulationButton />

      {/* Recent Critical Events */}
      <div>
        <h2 className="mb-4 font-serif text-lg tracking-wider text-foreground">RECENT ACTIVITY</h2>
        <div className="space-y-2">
          {events.map((event, i) => (
            <div
              key={i}
              className="glass-panel flex items-center gap-4 px-4 py-3 border-blood/20 transition-gothic hover:border-blood/40"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="font-mono text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString()}</span>
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${event.is_malicious ? "bg-blood animate-pulse-blood" : "bg-primary"}`} />
              <div className="flex flex-col">
                <span className="font-mono text-sm text-foreground">{event.action} by {event.user_id}</span>
                <span className="font-mono text-xs text-muted-foreground">{event.resource_id} ({event.sourcetype})</span>
              </div>
            </div>
          ))}
          {events.length === 0 && <div className="text-muted-foreground font-mono text-sm">No activity detected.</div>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
