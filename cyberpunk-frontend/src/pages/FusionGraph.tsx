import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { X, User, Server, Target, RefreshCw, Info } from "lucide-react";
import { api } from "@/services/api";

function riskColor(risk: number) {
  if (risk > 80) return "hsl(0, 84%, 60%)";
  if (risk > 50) return "hsl(38, 92%, 50%)";
  return "hsl(187, 94%, 43%)";
}

// Legend items with SVG shape previews
const LEGEND = [
  {
    label: "User",
    type: "user",
    shape: (color: string) => (
      <svg width={20} height={20}>
        <circle cx={10} cy={10} r={9} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2} />
      </svg>
    ),
    color: "hsl(187, 94%, 43%)",
    icon: User,
  },
  {
    label: "Resource",
    type: "system",
    shape: (color: string) => (
      <svg width={20} height={20}>
        <rect x={1} y={1} width={18} height={18} rx={4} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />
      </svg>
    ),
    color: "hsl(187, 94%, 43%)",
    icon: Server,
  },
  {
    label: "Honeypot",
    type: "honeypot",
    shape: (color: string) => (
      <svg width={20} height={20}>
        <polygon points="10,1 19,19 1,19" fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />
      </svg>
    ),
    color: "hsl(0, 84%, 60%)",
    icon: Target,
  },
];

const RISK_LEGEND = [
  { label: "High Risk", color: "hsl(0, 84%, 60%)" },
  { label: "Medium", color: "hsl(38, 92%, 50%)" },
  { label: "Safe", color: "hsl(187, 94%, 43%)" },
];

export default function FusionGraph() {
  const [selected, setSelected] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [honeypots, setHoneypots] = useState<string[]>([]);

  // Persistent position map: node id -> {x, y}
  // This prevents nodes from jumping on every 5-second re-poll
  const positionMap = useRef<Record<string, { x: number; y: number }>>({});

  const fetchGraph = useCallback(async () => {
    try {
      const [graphData, entities] = await Promise.all([
        api.getGraphData(),
        api.getEntities(),
      ]);
      setNodes(graphData.nodes);
      setLinks(graphData.links);
      setHoneypots(entities.honeypots || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 5000);
    return () => clearInterval(interval);
  }, [fetchGraph]);

  // Determine node type including honeypot distinction
  const getNodeType = (node: any) => {
    if (node.type === "user") return "user";
    if (honeypots.includes(node.id)) return "honeypot";
    return "system";
  };

  // Assign positions stably: existing nodes keep their coords, new nodes get placed on the ring
  const positions = useMemo(() => {
    const cx = 400, cy = 300;
    // Gather new nodes that don't yet have a position
    const newUsers = nodes.filter((n: any) => n.type === "user" && !positionMap.current[n.id]);
    const newResources = nodes.filter((n: any) => n.type !== "user" && !positionMap.current[n.id]);

    // Assign positions on the ring only for NEW nodes
    newUsers.forEach((n: any, i: number) => {
      const existingCount = Object.keys(positionMap.current).filter(id => nodes.find((nd: any) => nd.id === id && nd.type === "user")).length;
      const angle = ((existingCount + i) / Math.max(newUsers.length + existingCount, 1)) * Math.PI * 2;
      positionMap.current[n.id] = { x: cx + Math.cos(angle) * 140, y: cy + Math.sin(angle) * 140 };
    });
    newResources.forEach((n: any, i: number) => {
      const existingCount = Object.keys(positionMap.current).filter(id => nodes.find((nd: any) => nd.id === id && nd.type !== "user")).length;
      const angle = ((existingCount + i) / Math.max(newResources.length + existingCount, 1)) * Math.PI * 2;
      positionMap.current[n.id] = { x: cx + Math.cos(angle) * 250, y: cy + Math.sin(angle) * 250 };
    });

    return nodes.map((n: any) => ({ ...n, ...positionMap.current[n.id] }));
  }, [nodes]);

  const getPos = (id: string) => positions.find((p) => p.id === id);

  const handleNodeClick = async (node: any) => {
    if (node.type === "user") {
      setSelected({ ...node, _loading: true });
      setLoadingCtx(true);
      try {
        const ctx = await api.getUserContext(node.id);
        setSelected({ ...node, ...ctx });
      } catch {
        setSelected(node);
      } finally {
        setLoadingCtx(false);
      }
    } else {
      setSelected(node);
    }
  };

  // Render node shape based on type
  const renderNode = (node: any) => {
    const t = getNodeType(node);
    const c = riskColor(node.risk ?? 0);
    const isSelected = selected?.id === node.id;
    const strokeW = isSelected ? 3 : 2;
    const glowFilter = isSelected ? `drop-shadow(0 0 6px ${c})` : undefined;

    if (t === "user") {
      return <circle cx={node.x} cy={node.y} r={22} fill={c} fillOpacity={0.2} stroke={c} strokeWidth={strokeW} style={{ filter: glowFilter }} />;
    } else if (t === "honeypot") {
      // Triangle for honeypot
      const s = 22;
      return <polygon
        points={`${node.x},${node.y - s} ${node.x + s * 0.9},${node.y + s * 0.6} ${node.x - s * 0.9},${node.y + s * 0.6}`}
        fill={c} fillOpacity={0.2} stroke={c} strokeWidth={strokeW}
        style={{ filter: glowFilter }}
      />;
    } else {
      // Square for resource
      return <rect x={node.x - 20} y={node.y - 20} width={40} height={40} rx={6} fill={c} fillOpacity={0.15} stroke={c} strokeWidth={strokeW} style={{ filter: glowFilter }} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-muted-foreground">Building graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in h-[calc(100vh-0px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fusion Graph</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.3em]">Entity Relationship Visualization</p>
        </div>
        <button onClick={fetchGraph} className="p-2 rounded hover:bg-secondary transition-colors text-muted-foreground" title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Legend Bar */}
      <div className="flex items-center gap-6 px-4 py-2.5 glass-panel border-border/50 rounded-lg flex-wrap">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 shrink-0">Legend</span>
        <div className="flex items-center gap-5 flex-wrap">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              {l.shape(l.color)}
              <span className="text-foreground/70">{l.label}</span>
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4">
          {RISK_LEGEND.map((r) => (
            <span key={r.label} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 glass-panel relative overflow-hidden">
        {nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
            <Info className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-sm font-bold">No entities to display</h3>
              <p className="text-xs font-mono text-muted-foreground mt-1">Add users & resources in Mission Control, then run simulation.</p>
            </div>
          </div>
        ) : (
          <svg width="100%" height="100%" viewBox="0 0 800 600" className="select-none">
            {/* Links */}
            {links.map((link: any, i: number) => {
              const s = getPos(link.source);
              const t = getPos(link.target);
              if (!s || !t) return null;
              return (
                <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke="hsl(222, 30%, 25%)" strokeWidth={1.5} opacity={0.6} />
              );
            })}

            {/* Nodes */}
            {positions.map((node: any) => (
              <g key={node.id} onClick={() => handleNodeClick(node)} className="cursor-pointer group">
                {renderNode(node)}
                {/* Icon inside node */}
                <text x={node.x} y={node.y + 4} textAnchor="middle"
                  fill={riskColor(node.risk ?? 0)} fontSize={12} fontFamily="sans-serif" opacity={0.8}>
                  {getNodeType(node) === "user" ? "👤" : getNodeType(node) === "honeypot" ? "⚠" : "🖥"}
                </text>
                {/* Label below */}
                <text x={node.x} y={node.y + 40} textAnchor="middle"
                  fill="hsl(215, 20%, 70%)" fontSize={10} fontFamily="JetBrains Mono">
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        )}

        {/* Side Panel */}
        {selected && (
          <div className="absolute top-4 right-4 w-80 glass-panel p-5 space-y-5 animate-in slide-in-from-right-4 duration-200 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {getNodeType(selected) === "user" ? <User className="h-4 w-4 text-primary" /> :
                  getNodeType(selected) === "honeypot" ? <Target className="h-4 w-4 text-destructive" /> :
                    <Server className="h-4 w-4 text-primary" />}
                <div>
                  {/* Entity name as given in Admin */}
                  <div className="font-mono font-bold text-foreground text-sm">{selected.label || selected.id}</div>
                  <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest capitalize">{getNodeType(selected)}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingCtx ? (
              <div className="flex items-center gap-2 py-4 text-xs font-mono text-muted-foreground">
                <div className="h-4 w-4 border border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                Fetching telemetry...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Risk Score */}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Risk Score</span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${selected.risk ?? 0}%`, backgroundColor: riskColor(selected.risk ?? 0) }} />
                    </div>
                    <span className="font-mono text-sm font-black w-8 text-right" style={{ color: riskColor(selected.risk ?? 0) }}>
                      {Math.round(selected.risk ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Connections */}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Connections</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {links
                      .filter((l: any) => l.source === selected.id || l.target === selected.id)
                      .map((l: any, i: number) => {
                        const otherId = l.source === selected.id ? l.target : l.source;
                        const other = nodes.find((n: any) => n.id === otherId);
                        return (
                          <span key={i} className="px-2 py-0.5 bg-secondary/50 rounded text-[10px] font-mono border border-border">
                            {other?.label || otherId}
                          </span>
                        );
                      })}
                    {links.filter((l: any) => l.source === selected.id || l.target === selected.id).length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">No connections yet</span>
                    )}
                  </div>
                </div>

                {/* User-specific: AI context */}
                {selected.type === "user" && selected.recommendation && (
                  <div className="p-3 rounded border border-primary/20 bg-primary/5">
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider block mb-1">AI Assessment</span>
                    <p className="text-xs italic text-foreground/80 leading-relaxed">"{selected.recommendation}"</p>
                  </div>
                )}

                {/* Honeypot warning */}
                {getNodeType(selected) === "honeypot" && (
                  <div className="p-3 rounded border border-destructive/30 bg-destructive/5">
                    <span className="text-[10px] text-destructive font-bold uppercase tracking-wider block mb-1">⚠ Decoy Active</span>
                    <p className="text-xs text-muted-foreground">Any access to this path triggers a critical alert.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
