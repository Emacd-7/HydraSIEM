import { useState, useEffect } from "react";
import { Search, Clock, Play, BookOpen, Save, Trash2 } from "lucide-react";
import { api, type LogEntry } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";

export default function DataExplorer() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LogEntry[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Initial fetch
    api.getLogs().then(setResults).catch(console.error);
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      const searches = await api.getSavedSearches();
      setSavedSearches(searches);
    } catch (e) {
      console.error("Failed to fetch saved searches", e);
    }
  };

  const handleSearch = async () => {
    try {
      const logs = await api.getLogs(query);
      setResults(logs);
    } catch (e) {
      console.error(e);
      toast({
        title: "Search Failed",
        description: "Verify your query syntax (e.g., pipe commands).",
        variant: "destructive",
      });
    }
  };

  const handleSaveSearch = async () => {
    if (!query) return;
    const name = prompt("Enter a name for this search:");
    if (!name) return;

    try {
      await api.saveSearch(name, query);
      toast({
        title: "Search Saved",
        description: `"${name}" is now available in your terminal.`,
      });
      fetchSavedSearches();
    } catch (e) {
      toast({
        title: "Save Failed",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSearch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteSearch(id);
      fetchSavedSearches();
      toast({ title: "Search Deleted" });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in relative z-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Data Explorer</h1>
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-secondary/30 px-2 py-1 rounded border border-border">
          Hydra-QL Engine v2.1
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar flex items-center gap-3 p-1 glass-panel border-primary/20 bg-background/40">
        <div className="flex items-center gap-2 flex-1 px-3">
          <Search className="h-4 w-4 text-primary animate-pulse" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder='sourcetype=access_combined | stats count by status'
            className="flex-1 bg-transparent outline-none font-mono text-sm text-foreground placeholder:text-muted-foreground/50 py-3"
          />
        </div>
        <div className="flex gap-2 pr-2">
          <button
            onClick={handleSaveSearch}
            title="Save Search"
            className="p-2 rounded bg-secondary/50 text-muted-foreground hover:text-primary transition-colors border border-transparent hover:border-primary/20"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all font-mono tracking-tighter shadow-[0_0_15px_rgba(var(--primary),0.3)]"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> EXECUTE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-4">
        {/* Saved Searches */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
            <BookOpen className="h-3 w-3 text-primary" /> Memory Banks
          </h3>
          <div className="space-y-1.5">
            {savedSearches.length === 0 && (
              <div className="text-[10px] font-mono text-muted-foreground/40 px-3 py-4 border border-dashed border-border rounded">
                No saved protocols found.
              </div>
            )}
            {savedSearches.map((s) => (
              <div
                key={s.id}
                onClick={() => { setQuery(s.query); }}
                className="group w-full flex items-center justify-between px-3 py-2.5 rounded bg-secondary/20 border border-transparent hover:border-primary/30 hover:bg-secondary/40 cursor-pointer transition-all"
              >
                <div className="space-y-0.5 overflow-hidden">
                  <div className="text-xs font-bold text-foreground/80 truncate group-hover:text-primary transition-colors">{s.name}</div>
                  <div className="text-[9px] font-mono text-muted-foreground truncate opacity-60 uppercase">{s.query.substring(0, 30)}...</div>
                </div>
                <button
                  onClick={(e) => handleDeleteSearch(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                Detection Status: <span className="text-primary">Normal</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest border-l border-border pl-4">
                Found: <span className="text-foreground">{results.length}</span> packets
              </span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 glass-panel border-dashed opacity-50">
                <Search className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">No data matching filters</p>
              </div>
            )}
            {results.map((log, i) => (
              <div key={i} className="glass-panel p-4 space-y-3 hover:border-primary/40 transition-all group relative border-l-2 border-l-transparent hover:border-l-primary shadow-sm bg-card/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded">
                      <Clock className="h-3 w-3 text-primary/70" />
                      <span>{log.timestamp}</span>
                    </div>
                    <span className="px-2 py-1 rounded bg-secondary text-foreground/80 font-bold border border-border">{log.sourcetype}</span>
                    <span className="text-primary/60">{log.source_ip}</span>
                  </div>
                  {log.is_malicious && (
                    <div className="text-[9px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded border border-destructive/20 uppercase tracking-tighter">
                      Threat Detected
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all leading-relaxed bg-background/20 p-3 rounded border border-border/50 group-hover:bg-background/40 transition-colors">
                      <span className="text-primary/80 font-bold">EVENT_DATA: </span>
                      {log.action} by {log.user_id} on {log.resource_id} {log.message || ""}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
