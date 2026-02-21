import { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import { X, Shield, Clock, FileText } from "lucide-react";

// Types matching Frontend requirements
interface NetworkNode {
  id: string;
  label: string;
  type: string;
  riskLevel: number;
  x: number;
  y: number;
  connections: string[];
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
  riskScore: number;
  lastActive: string;
  department: string;
  recentLogs: any[];
  aiInsight: string;
}

const nodeColors: Record<string, { safe: string; risk: string }> = {
  server: { safe: "hsl(274, 72%, 55%)", risk: "hsl(0, 52%, 40%)" },
  user: { safe: "hsl(274, 72%, 55%)", risk: "hsl(0, 52%, 40%)" },
  firewall: { safe: "hsl(200, 60%, 50%)", risk: "hsl(0, 52%, 40%)" },
  database: { safe: "hsl(274, 72%, 55%)", risk: "hsl(0, 52%, 40%)" },
  endpoint: { safe: "hsl(274, 72%, 55%)", risk: "hsl(0, 52%, 40%)" },
};

const getNodeColor = (node: NetworkNode) => {
  const palette = nodeColors[node.type] || nodeColors.server;
  return node.riskLevel > 60 ? palette.risk : palette.safe;
};

const UserContextPanel = ({ user, onClose }: { user: UserProfile; onClose: () => void }) => {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (user.riskScore / 100) * circumference;

  return (
    <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-md border-l border-border bg-secondary/95 backdrop-blur-xl animate-slide-in-right overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">The Grimoire</p>
            <h2 className="mt-1 font-serif text-xl tracking-wider text-foreground">{user.name}</h2>
            <p className="font-mono text-xs text-muted-foreground">{user.role} · {user.department}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-gothic hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Risk Gauge */}
        <div className="flex flex-col items-center glass-panel p-6 border-blood/30">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
            <Shield className="inline h-3 w-3 mr-1" /> Threat Assessment
          </p>
          <svg width="100" height="100" className="-rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={user.riskScore > 70 ? "hsl(0, 52%, 40%)" : "hsl(274, 72%, 55%)"}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-gothic"
            />
          </svg>
          <span className={`-mt-16 mb-10 font-mono text-2xl font-bold ${user.riskScore > 70 ? "text-destructive-foreground" : "text-primary"}`}>
            {user.riskScore}
          </span>
        </div>

        {/* AI Insight */}
        <div className="glass-panel p-4 border-primary/20">
          <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">
            <FileText className="inline h-3 w-3 mr-1" /> AI Analyst Insight
          </p>
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">{user.aiInsight}</p>
        </div>

        {/* Recent Logs */}
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
            <Clock className="inline h-3 w-3 mr-1" /> Recent Activity
          </p>
          <div className="space-y-2">
            {user.recentLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="glass-panel px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${log.severity === 'critical' ? 'bg-blood' : log.severity === 'error' ? 'bg-blood/60' : 'bg-primary/40'}`} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-foreground/80 truncate">{log.message}</p>
              </div>
            ))}
            {user.recentLogs.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground">No recent activity logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FusionGraph = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const [nodes, setNodes] = useState<NetworkNode[]>([]);

  // Fetch Graph Data
  useEffect(() => {
    api.getGraphData().then(data => {
      // Map API nodes to Visual Nodes
      // We need to assign random positions as backend doesn't provide layout yet
      const width = dimensions.width || 800;
      const height = dimensions.height || 500;

      const mappedNodes: NetworkNode[] = data.nodes.map((n: any) => ({
        id: n.id,
        label: n.id,
        type: n.type || 'endpoint',
        riskLevel: n.risk,
        x: Math.random() * (width - 100) + 50,
        y: Math.random() * (height - 100) + 50,
        connections: [] // We'll fill this from links
      }));

      // Map links to connections
      data.links.forEach((l: any) => {
        const sourceNode = mappedNodes.find(n => n.id === l.source);
        if (sourceNode) sourceNode.connections.push(l.target);
      });

      setNodes(mappedNodes);
    }).catch(console.error);
  }, [dimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale handled by using nodes relative to canvas size, 
    // but if we generated random coords based on width/height we might need to be careful with resizing.
    // For now, let's just draw 1:1 since we generated coords based on current dims.

    let animFrame: number;
    let time = 0;

    const draw = () => {
      time += 0.01;
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw connections
      nodes.forEach((node) => {
        node.connections.forEach((connId) => {
          const target = nodes.find((n) => n.id === connId);
          if (!target) return;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = "rgba(157, 78, 221, 0.12)";
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });

      // Draw nodes
      nodes.forEach((node) => {
        const x = node.x;
        const y = node.y;
        const color = getNodeColor(node);
        const isHovered = hoveredNode === node.id;
        const baseRadius = isHovered ? 14 : 10;
        const pulseRadius = node.riskLevel > 60 ? baseRadius + Math.sin(time * 3) * 4 : baseRadius;

        // Glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius * 3);
        glow.addColorStop(0, color.replace(")", ", 0.3)").replace("hsl", "hsla"));
        glow.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isHovered ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)";
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = "rgba(229, 231, 235, 0.7)";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(node.label, x, y + pulseRadius + 16);
      });

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, [dimensions, hoveredNode, nodes]);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const node of nodes) {
      const dx = mx - node.x;
      const dy = my - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        // Fetch Real User Context
        try {
          const context = await api.getUserContext(node.id);
          const userProfile: UserProfile = {
            id: context.user_id,
            name: context.user_id,
            role: context.sensitivity || 'User',
            riskScore: context.risk_score,
            lastActive: new Date().toISOString(),
            department: context.hr_status || 'Unknown',
            recentLogs: context.recent_events.map((e: any) => ({
              id: 'unknown',
              timestamp: e.timestamp,
              message: e.action,
              severity: e.severity || 'info'
            })),
            aiInsight: context.recommendation
          };
          setSelectedUser(userProfile);
        } catch (err) {
          console.error("Failed to fetch context", err);
        }
        return;
      }
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: string | null = null;
    for (const node of nodes) {
      const dx = mx - node.x;
      const dy = my - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        found = node.id;
        canvas.style.cursor = "pointer";
        break;
      }
    }
    if (!found) canvas.style.cursor = "default";
    setHoveredNode(found);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-serif text-2xl tracking-wider text-foreground">FUSION GRAPH</h1>
        <div className="mt-1 h-px w-24 bg-gradient-to-r from-primary/60 to-transparent" />
        <p className="mt-2 font-mono text-xs text-muted-foreground">Network topology · Click user nodes to inspect</p>
      </div>

      <div ref={containerRef} className="glass-panel relative overflow-hidden" style={{ height: "60vh" }}>
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
        />
        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex gap-4 font-mono text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Safe</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blood" /> High Risk</span>
        </div>
      </div>

      {selectedUser && <UserContextPanel user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
};

export default FusionGraph;
