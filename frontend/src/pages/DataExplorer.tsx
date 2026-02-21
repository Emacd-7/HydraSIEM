import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { api, type LogEntry } from "../services/api";

const severityColors: Record<string, string> = {
  info: "text-primary/60",
  warning: "text-yellow-500/80",
  error: "text-destructive-foreground",
  critical: "text-destructive-foreground font-semibold",
};

const highlightLog = (message: string) => {
  // Highlight keys and values with syntax coloring
  return message
    .replace(/(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT)/g, '<span class="text-primary">$1</span>')
    .replace(/(HTTP\/\d\.\d)/g, '<span class="text-muted-foreground">$1</span>')
    .replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?)/g, '<span class="text-primary">$1</span>')
    .replace(/(BLOCKED|ALERT|CRITICAL|DROP|FAILED|detected)/gi, '<span class="text-destructive-foreground">$1</span>')
    .replace(/(200|304)/g, '<span class="text-green-500/80">$1</span>')
    .replace(/(user:\s*"?\w+"?)/gi, '<span class="text-primary/80">$1</span>');
};

const DataExplorer = () => {
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchLogs = async (q: string) => {
    try {
      const data = await api.getLogs(q);
      setLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs("");
  }, []);

  const handleSearch = () => {
    fetchLogs(query);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-serif text-2xl tracking-wider text-foreground">DATA EXPLORER</h1>
        <div className="mt-1 h-px w-24 bg-gradient-to-r from-primary/60 to-transparent" />
      </div>

      {/* Search Bar */}
      <div className="glass-panel flex items-center gap-3 px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder='sourcetype=access_combined | stats count'
          className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
        <button
          onClick={handleSearch}
          className="rounded-md bg-primary/10 px-4 py-1.5 font-mono text-xs text-primary transition-gothic hover:bg-primary/20"
        >
          Search
        </button>
      </div>

      {/* Results count */}
      <p className="font-mono text-xs text-muted-foreground">
        {logs.length} events found
      </p>

      {/* Log Table */}
      <div className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-[100px_70px_90px_80px_1fr] gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
          <span>Time</span>
          <span>Severity</span>
          <span>Source</span>
          <span>User</span>
          <span>Message</span>
        </div>

        {/* Rows */}
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-px">
          {logs.map((log, i) => (
            <div
              key={i}
              className="grid grid-cols-[100px_70px_90px_80px_1fr] gap-2 px-3 py-2 font-mono text-xs transition-gothic hover:bg-muted/50 rounded"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className="text-muted-foreground">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={log.is_malicious ? severityColors.critical : severityColors.info}>
                {log.is_malicious ? 'ALERT' : 'INFO'}
              </span>
              <span className="text-primary/70 truncate">{log.source_ip}</span>
              <span className="text-foreground/60 truncate">{log.user_id || "—"}</span>
              <span
                className="text-foreground/80 truncate"
                dangerouslySetInnerHTML={{ __html: highlightLog(`${log.action} ${log.resource_id}`) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataExplorer;
