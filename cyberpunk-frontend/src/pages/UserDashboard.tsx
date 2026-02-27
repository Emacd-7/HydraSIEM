import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { User, FileText, File, LogOut, Eye, Lock, ShieldAlert, RefreshCw } from "lucide-react";

type FileMeta = {
    file_id: string;
    original_name: string;
    uploaded_at: string;
    size_bytes: number;
    classification?: 'open' | 'classified';
};

// Module-scope: prevents re-mount on re-render
const FileRow = ({
    file, onOpen
}: {
    file: FileMeta;
    onOpen: (f: FileMeta) => void;
}) => {
    const isClassified = file.classification === 'classified';
    return (
        <div className="px-5 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
            <div className="p-2 rounded bg-secondary/40 border border-border">
                {file.original_name.endsWith('.pdf')
                    ? <File className="h-4 w-4 text-red-400" />
                    : <FileText className="h-4 w-4 text-green-400" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-medium text-foreground truncate">{file.original_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {new Date(file.uploaded_at).toLocaleString()}
                </p>
            </div>

            {/* Classification badge */}
            {isClassified ? (
                <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
                    <ShieldAlert className="h-3 w-3" /> Classified
                </span>
            ) : (
                <span className="flex items-center gap-1 text-[10px] text-green-400 font-mono bg-green-400/10 px-2 py-1 rounded border border-green-400/20">
                    <Eye className="h-3 w-3" /> Shareable
                </span>
            )}

            <button
                onClick={() => onOpen(file)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono hover:bg-primary/20 transition-all"
            >
                <Eye className="h-3.5 w-3.5" /> Open
            </button>
        </div>
    );
};

export default function UserDashboard() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [files, setFiles] = useState<FileMeta[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFiles = useCallback(async () => {
        try {
            const data = await api.getCompanyFiles();
            setFiles(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
        const interval = setInterval(fetchFiles, 15000);
        return () => clearInterval(interval);
    }, [fetchFiles]);

    const handleOpen = (file: FileMeta) => {
        navigate(`/view-file/${encodeURIComponent(file.file_id)}`, {
            state: {
                original_name: file.original_name,
                classification: file.classification ?? 'classified',
            }
        });
    };

    const handleLogout = async () => {
        await api.logout();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Top Nav */}
            <header className="border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-foreground font-mono">User Portal</h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Hydra DLP Platform</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchFiles} className="p-2 rounded hover:bg-secondary transition-colors text-muted-foreground">
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 rounded border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                    >
                        <LogOut className="h-3.5 w-3.5" /> Sign Out
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                <div className="glass-panel p-4 border-primary/20 bg-primary/3">
                    <p className="text-[11px] text-muted-foreground font-mono">
                        🔒 <span className="text-primary font-bold">DLP Policy Active:</span> Files marked as <span className="text-red-400 font-bold">Classified</span> cannot be downloaded, screenshot, or shared.
                        Violations are logged and your access may be blocked by the admin.
                    </p>
                </div>

                <div className="glass-panel">
                    <div className="px-5 py-4 border-b border-border">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-primary" />
                            Files Assigned to You
                            <span className="ml-auto bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold">{files.length}</span>
                        </h2>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground text-xs font-mono animate-pulse">Loading your files...</div>
                    ) : files.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                            <p className="text-xs text-muted-foreground font-mono">No files have been assigned to you yet. Contact your admin.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {files.map((f) => (
                                <FileRow key={f.file_id} file={f} onOpen={handleOpen} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Toaster />
        </div>
    );
}
