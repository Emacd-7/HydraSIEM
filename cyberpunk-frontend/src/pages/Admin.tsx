import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Server, UserPlus, Shield, Play, Square,
  Cpu, Database, AlertTriangle, RefreshCw, Target,
} from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

type EntityState = {
  users: string[];
  resources: string[];
  honeypots: string[];
  simulation_running: boolean;
};

// --- Sub-components defined at module scope to prevent focus loss on re-render ---

const EntityList = ({ items, onRemove, icon: Icon, emptyMsg }: {
  items: string[], onRemove: (n: string) => void, icon: any, emptyMsg: string
}) => (
  <div className="space-y-1.5 min-h-[60px]">
    {items.length === 0 && (
      <p className="text-[10px] font-mono text-muted-foreground/40 px-3 py-4 border border-dashed border-border rounded text-center">{emptyMsg}</p>
    )}
    {items.map((item) => (
      <div key={item} className="flex items-center justify-between px-3 py-2 rounded bg-secondary/30 border border-border group">
        <span className="flex items-center gap-2 text-xs font-mono">
          <Icon className="h-3.5 w-3.5 text-primary" /> {item}
        </span>
        <button onClick={() => onRemove(item)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    ))}
  </div>
);

const AddInput = ({ value, onChange, onAdd, placeholder, disabled }: any) => (
  <div className="flex gap-2">
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onAdd()}
      disabled={disabled}
      placeholder={placeholder}
      className="flex-1 bg-secondary/50 border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 disabled:opacity-50"
    />
    <button
      onClick={onAdd}
      disabled={disabled || !value.trim()}
      className="px-3 py-2 rounded bg-primary/20 text-primary text-xs font-mono hover:bg-primary/30 transition-colors flex items-center gap-1 disabled:opacity-40"
    >
      <Plus className="h-3.5 w-3.5" /> Add
    </button>
  </div>
);


export default function Admin() {
  const { toast } = useToast();
  const [entities, setEntities] = useState<EntityState>({
    users: [], resources: [], honeypots: [], simulation_running: false
  });
  const [newUser, setNewUser] = useState("");
  const [newResource, setNewResource] = useState("");
  const [newHoneypot, setNewHoneypot] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getEntities();
      setEntities(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handle = async (action: () => Promise<any>, successMsg: string) => {
    try {
      await action();
      toast({ title: successMsg });
      await refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const simToggle = async () => {
    setLoading("sim");
    if (entities.simulation_running) {
      await handle(() => api.stopSimulation(), "Simulation Stopped");
    } else {
      await handle(() => api.startSimulation(), "Simulation Started! Logs are being generated.");
    }
    setLoading(null);
  };



  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mission Control</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.3em]">Entity Management & Simulation Engine</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="p-2 rounded hover:bg-secondary transition-colors text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
          </button>
          {/* Master Sim Toggle */}
          <button
            onClick={simToggle}
            disabled={loading === "sim"}
            className={`flex items-center gap-2 px-5 py-2.5 rounded font-bold text-sm font-mono transition-all shadow-lg ${entities.simulation_running
              ? "bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30 shadow-destructive/20"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30"
              }`}
          >
            {entities.simulation_running ? (
              <><Square className="h-4 w-4 fill-current" /> STOP SIM</>
            ) : (
              <><Play className="h-4 w-4 fill-current" /> START SIM</>
            )}
          </button>
        </div>
      </div>

      {/* Simulation Status Banner */}
      {entities.simulation_running && (
        <div className="glass-panel p-4 border-primary/40 bg-primary/5 flex items-center gap-3 animate-pulse-subtle">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
          <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
            Simulation Active — Generating logs across {entities.users.length} users & {entities.resources.length} resources
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <UserPlus className="h-3.5 w-3.5 text-primary" /> Simulated Users
            <span className="ml-auto bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold">{entities.users.length}</span>
          </h3>
          <AddInput
            value={newUser} onChange={setNewUser} placeholder="e.g. Alice, jsmith..."
            onAdd={() => handle(async () => { await api.addUser(newUser); setNewUser(""); }, `User "${newUser}" added`)}
          />
          <EntityList
            items={entities.users} icon={Cpu} emptyMsg="No users. Add one above."
            onRemove={(n) => handle(() => api.removeUser(n), `User "${n}" removed`)}
          />
        </div>

        {/* Resources */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-primary" /> Resources
            <span className="ml-auto bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold">{entities.resources.length}</span>
          </h3>
          <AddInput
            value={newResource} onChange={setNewResource} placeholder="e.g. Server_A, DB_Finance..."
            onAdd={() => handle(async () => { await api.addResource(newResource); setNewResource(""); }, `Resource "${newResource}" added`)}
          />
          <EntityList
            items={entities.resources} icon={Database} emptyMsg="No resources. Add one above."
            onRemove={(n) => handle(() => api.removeResource(n), `Resource "${n}" removed`)}
          />
        </div>

        {/* Honeypots */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-destructive" /> Honeypots
            <span className="ml-auto bg-destructive/10 text-destructive px-1.5 py-0.5 rounded text-[9px] font-bold">{entities.honeypots.length}</span>
          </h3>
          <AddInput
            value={newHoneypot} onChange={setNewHoneypot} placeholder="e.g. /admin/passwords.txt..."
            onAdd={() => handle(async () => { await api.addHoneypot(newHoneypot); setNewHoneypot(""); }, `Honeypot "${newHoneypot}" deployed`)}
          />
          <EntityList
            items={entities.honeypots} icon={Shield} emptyMsg="No honeypots. Add decoy paths."
            onRemove={(n) => toast({ title: "Remove via backend config" })}
          />
          <p className="text-[9px] text-muted-foreground/50 italic">Accessing a honeypot path auto-triggers a Critical alert.</p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel p-5 space-y-3 border-destructive/20">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Danger Zone
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handle(async () => {
              if (confirm("This will permanently delete ALL logs. Are you sure?")) {
                await api.clearLogs();
              }
            }, "All logs cleared")}
            className="px-4 py-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono hover:bg-destructive/20 transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear All Logs
          </button>
          <p className="text-[10px] text-muted-foreground/50">This deletes all in-memory logs. Entities are preserved.</p>
        </div>
      </div>
    </div>
  );
}
