import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Server, UserPlus, Shield, Play, Square,
  Cpu, Database, AlertTriangle, RefreshCw, Target,
  Building2, FileText, File, ShieldAlert, ShieldCheck, Lock, Unlock, Eye,
} from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

type EntityState = {
  users: string[];
  resources: string[];
  honeypots: string[];
  simulation_running: boolean;
};

type FileMeta = {
  file_id: string;
  original_name: string;
  uploaded_at: string;
  size_bytes: number;
  classification?: 'open' | 'classified';
  allowed_users: string[];
  company_id?: string;
  company_name?: string;
};

type Company = {
  name: string;
  description: string;
  registered_at: string;
  users: string[];
  files: FileMeta[];
};

// --- Sub-components at module scope to prevent focus loss on re-render ---

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

// ─── Company Panel ─────────────────────────────────────────────────────────────
const CompanyPanel = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Record<string, Company>>({});
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [assignInputs, setAssignInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await api.getCompanies();
      setCompanies(data);
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const company = selectedCompany ? companies[selectedCompany] : null;

  // Assign / Revoke user to file
  const handleAssign = async (fileId: string, userId: string, action: 'grant' | 'revoke') => {
    if (!selectedCompany || !userId.trim()) return;
    try {
      await api.assignFile(selectedCompany, fileId, userId.trim(), action);
      toast({ title: action === 'grant' ? `Access granted to ${userId}` : `Access revoked from ${userId}` });
      await fetchCompanies();
      setAssignInputs(prev => ({ ...prev, [fileId]: '' }));
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Set file classification
  const handleClassify = async (fileId: string, classification: 'open' | 'classified') => {
    if (!selectedCompany) return;
    try {
      await api.setClassification(selectedCompany, fileId, classification);
      toast({ title: `File set to "${classification}"` });
      await fetchCompanies();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Block / Unblock user
  const handleBlock = async (userId: string, action: 'block' | 'unblock') => {
    try {
      await api.blockUser(userId, action);
      toast({ title: action === 'block' ? `${userId} blocked` : `${userId} unblocked` });
      await fetchCompanies();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const formatBytes = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  if (loading) return <div className="p-8 text-center text-muted-foreground text-xs font-mono animate-pulse">Loading companies...</div>;

  const companyIds = Object.keys(companies);

  if (companyIds.length === 0) return (
    <div className="p-8 text-center">
      <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-xs text-muted-foreground font-mono">No companies registered yet.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Company selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {companyIds.map(cid => (
          <button
            key={cid}
            onClick={() => setSelectedCompany(cid === selectedCompany ? null : cid)}
            className={`text-left p-4 glass-panel border transition-all hover:border-primary/50 ${selectedCompany === cid ? 'border-primary bg-primary/5' : 'border-border'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold font-mono text-foreground">{cid}</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono truncate">{companies[cid].name}</p>
            <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground font-mono">
              <span>{companies[cid].users?.length ?? 0} users</span>
              <span>·</span>
              <span>{companies[cid].files?.length ?? 0} files</span>
            </div>
          </button>
        ))}
      </div>

      {/* Drill-down: selected company */}
      {selectedCompany && company && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground font-mono">{company.name}</h2>
            <span className="text-[10px] text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded">{selectedCompany}</span>
          </div>

          {/* ── Files Panel ─────────────────────────────────────────────── */}
          <div className="glass-panel">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" /> Files
                <span className="ml-auto bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold">{company.files?.length ?? 0}</span>
              </h3>
            </div>

            {(!company.files || company.files.length === 0) && (
              <div className="p-5 text-center text-muted-foreground text-xs font-mono">No files uploaded yet.</div>
            )}

            <div className="divide-y divide-border">
              {company.files?.map(f => (
                <div key={f.file_id} className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-secondary/40 border border-border">
                      {f.original_name.endsWith('.pdf')
                        ? <File className="h-3.5 w-3.5 text-red-400" />
                        : <FileText className="h-3.5 w-3.5 text-green-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-medium text-foreground truncate">{f.original_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{formatBytes(f.size_bytes)} · {new Date(f.uploaded_at).toLocaleString()}</p>
                    </div>

                    {/* Classification toggle */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleClassify(f.file_id, 'open')}
                        title="Mark as Shareable"
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-all border ${f.classification === 'open' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-secondary/30 text-muted-foreground border-border hover:border-green-500/30 hover:text-green-400'}`}
                      >
                        <Eye className="h-3 w-3" /> Open
                      </button>
                      <button
                        onClick={() => handleClassify(f.file_id, 'classified')}
                        title="Mark as Classified (DLP Active)"
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-all border ${f.classification !== 'open' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-secondary/30 text-muted-foreground border-border hover:border-red-500/30 hover:text-red-400'}`}
                      >
                        <Lock className="h-3 w-3" /> Classified
                      </button>
                    </div>
                  </div>

                  {/* Assigned users list */}
                  <div className="pl-9 space-y-2">
                    <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wider">Assigned Users:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.allowed_users?.length === 0 && (
                        <span className="text-[10px] text-muted-foreground/40 font-mono italic">None assigned</span>
                      )}
                      {f.allowed_users?.map(uid => (
                        <span key={uid} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-mono">
                          {uid}
                          <button
                            onClick={() => handleAssign(f.file_id, uid, 'revoke')}
                            className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                            title="Revoke access"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    {/* Assign new user input */}
                    <div className="flex gap-2 mt-1">
                      <input
                        value={assignInputs[f.file_id] ?? ''}
                        onChange={e => setAssignInputs(prev => ({ ...prev, [f.file_id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAssign(f.file_id, assignInputs[f.file_id] ?? '', 'grant')}
                        placeholder="User ID (e.g. USR_QUANTAURA_001)"
                        className="flex-1 bg-secondary/50 border border-border rounded px-3 py-1.5 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50"
                      />
                      <button
                        onClick={() => handleAssign(f.file_id, assignInputs[f.file_id] ?? '', 'grant')}
                        disabled={!assignInputs[f.file_id]?.trim()}
                        className="px-3 py-1.5 rounded bg-primary/20 text-primary text-[11px] font-mono hover:bg-primary/30 transition-colors disabled:opacity-40 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Grant
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Users Panel ─────────────────────────────────────────────── */}
          <div className="glass-panel">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5 text-primary" /> Company Users
                <span className="ml-auto bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold">{company.users?.length ?? 0}</span>
              </h3>
            </div>
            {(!company.users || company.users.length === 0) && (
              <div className="p-5 text-center text-muted-foreground text-xs font-mono">No users registered under this company.</div>
            )}
            <div className="divide-y divide-border">
              {company.users?.map(uid => (
                <div key={uid} className="px-5 py-3 flex items-center gap-3">
                  <Cpu className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="flex-1 text-xs font-mono text-foreground">{uid}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBlock(uid, 'unblock')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all"
                    >
                      <ShieldCheck className="h-3 w-3" /> Unblock
                    </button>
                    <button
                      onClick={() => handleBlock(uid, 'block')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <ShieldAlert className="h-3 w-3" /> Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function Admin() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'mission' | 'companies'>('mission');
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
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.3em]">Entity Management & Company Administration</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="p-2 rounded hover:bg-secondary transition-colors text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
          </button>
          {tab === 'mission' && (
            <button
              onClick={simToggle}
              disabled={loading === "sim"}
              className={`flex items-center gap-2 px-5 py-2.5 rounded font-bold text-sm font-mono transition-all shadow-lg ${entities.simulation_running
                ? "bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30 shadow-destructive/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30"
                }`}
            >
              {entities.simulation_running ? (<><Square className="h-4 w-4 fill-current" /> STOP SIM</>) : (<><Play className="h-4 w-4 fill-current" /> START SIM</>)}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg w-fit border border-border">
        <button
          onClick={() => setTab('mission')}
          className={`px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-2 ${tab === 'mission' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Cpu className="h-3.5 w-3.5" /> Mission Control
        </button>
        <button
          onClick={() => setTab('companies')}
          className={`px-4 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-2 ${tab === 'companies' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Building2 className="h-3.5 w-3.5" /> Companies
        </button>
      </div>

      {/* ── Tab: Mission Control ─────────────────────────────────────── */}
      {tab === 'mission' && (
        <>
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
                onRemove={() => toast({ title: "Remove via backend config" })}
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
        </>
      )}

      {/* ── Tab: Companies ───────────────────────────────────────────── */}
      {tab === 'companies' && <CompanyPanel />}
    </div>
  );
}
