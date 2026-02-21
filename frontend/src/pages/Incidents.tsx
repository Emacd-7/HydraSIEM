import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

const incidents = [
  {
    id: "INC-2026-0042",
    title: "Data Exfiltration — J.Smith Workstation",
    severity: "critical",
    status: "open",
    time: "14:23:39",
    description: "2.3GB transferred to external IP 45.33.32.156 within 4 minutes. Correlates with prior API reconnaissance.",
  },
  {
    id: "INC-2026-0041",
    title: "Ransomware Detection — R.Jones Endpoint",
    severity: "critical",
    status: "investigating",
    time: "14:23:21",
    description: "File invoice_q4.pdf.exe matches known Emotet dropper signatures. Endpoint isolation recommended.",
  },
  {
    id: "INC-2026-0040",
    title: "C2 Communication Blocked",
    severity: "high",
    status: "mitigated",
    time: "14:23:07",
    description: "Firewall FW-01 blocked outbound connection to known command-and-control server.",
  },
  {
    id: "INC-2026-0039",
    title: "Privilege Escalation — temp_admin",
    severity: "high",
    status: "open",
    time: "14:23:05",
    description: "User temp_admin was granted SUPER privilege on DB-Primary. Unauthorized change detected.",
  },
  {
    id: "INC-2026-0038",
    title: "Brute Force Attempt — svc_backup",
    severity: "medium",
    status: "mitigated",
    time: "14:22:50",
    description: "10 failed login attempts from 10.0.2.99. Account locked automatically.",
  },
];

const statusIcons: Record<string, React.ReactNode> = {
  open: <AlertTriangle className="h-4 w-4 text-destructive-foreground" />,
  investigating: <Clock className="h-4 w-4 text-muted-foreground" />,
  mitigated: <CheckCircle className="h-4 w-4 text-primary/60" />,
};

const severityBadge: Record<string, string> = {
  critical: "bg-blood/30 text-destructive-foreground border-blood/40",
  high: "bg-blood/15 text-destructive-foreground/80 border-blood/20",
  medium: "bg-primary/10 text-primary border-primary/20",
};

const Incidents = () => (
  <div className="space-y-6 animate-fade-up">
    <div>
      <h1 className="font-serif text-2xl tracking-wider text-foreground">INCIDENTS</h1>
      <div className="mt-1 h-px w-24 bg-gradient-to-r from-primary/60 to-transparent" />
      <p className="mt-2 font-mono text-xs text-muted-foreground">{incidents.filter(i => i.status === 'open').length} open · {incidents.length} total</p>
    </div>

    <div className="space-y-3">
      {incidents.map((inc, i) => (
        <div
          key={inc.id}
          className="glass-panel p-4 transition-gothic hover:border-primary/30 cursor-pointer"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {statusIcons[inc.status]}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{inc.id}</span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${severityBadge[inc.severity]}`}>
                    {inc.severity}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {inc.status}
                  </span>
                </div>
                <h3 className="mt-1 font-serif text-sm tracking-wide text-foreground">{inc.title}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground leading-relaxed">{inc.description}</p>
              </div>
            </div>
            <span className="font-mono text-xs text-muted-foreground flex-shrink-0">{inc.time}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Incidents;
