import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
    Building2, Upload, FileText, File, LogOut,
    CheckCircle, Clock, AlertCircle, RefreshCw
} from "lucide-react";

type FileMeta = {
    file_id: string;
    original_name: string;
    uploaded_at: string;
    size_bytes: number;
    allowed_users: string[];
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
}

export default function CompanyDashboard() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [files, setFiles] = useState<FileMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

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

    const handleUpload = async (file: File) => {
        if (!file) return;
        const allowed = ['application/pdf', 'text/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'];
        if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|csv|xlsx|xls)$/i)) {
            toast({ title: "Invalid file type", description: "Only PDF, CSV, and XLSX are allowed.", variant: "destructive" });
            return;
        }
        setUploading(true);
        try {
            const res = await api.uploadFile(file);
            toast({ title: "File Uploaded", description: `"${res.original_name}" is now secured on Hydra.` });
            await fetchFiles();
        } catch (e: any) {
            toast({ title: "Upload Failed", description: e.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const handleLogout = async () => {
        await api.logout();
        navigate("/login");
    };

    const fileIcon = (name: string) => {
        if (name.endsWith('.pdf')) return <File className="h-4 w-4 text-red-400" />;
        if (name.endsWith('.csv')) return <FileText className="h-4 w-4 text-green-400" />;
        return <FileText className="h-4 w-4 text-blue-400" />;
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Top Nav */}
            <header className="border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-foreground font-mono">Company Portal</h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Hydra DLP Platform</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchFiles} className="p-2 rounded hover:bg-secondary transition-colors text-muted-foreground" title="Refresh">
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

            <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                {/* Upload Zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`glass-panel p-10 flex flex-col items-center justify-center gap-4 cursor-pointer border-2 border-dashed transition-all ${dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-secondary/20'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
                    />
                    <div className={`p-4 rounded-full border ${dragOver ? 'border-primary bg-primary/20' : 'border-border bg-secondary/30'} transition-all`}>
                        <Upload className={`h-8 w-8 ${dragOver ? 'text-primary' : 'text-muted-foreground'} transition-colors`} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-foreground font-mono">
                            {uploading ? 'Uploading...' : 'Drop file here or click to upload'}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-1">
                            Supports PDF, CSV, XLSX · Max 50 MB · Files are secured by Hydra DLP
                        </p>
                    </div>
                    {uploading && (
                        <div className="flex items-center gap-2 text-primary text-xs font-mono animate-pulse">
                            <Clock className="h-4 w-4" /> Encrypting and storing...
                        </div>
                    )}
                </div>

                {/* Files List */}
                <div className="glass-panel">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Secured Files
                            <span className="ml-auto bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold">{files.length}</span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground text-xs font-mono animate-pulse">Loading files...</div>
                    ) : files.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                            <p className="text-xs text-muted-foreground font-mono">No files uploaded yet. Upload your first file above.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {files.map((f) => (
                                <div key={f.file_id} className="px-5 py-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                                    <div className="p-2 rounded bg-secondary/40 border border-border">
                                        {fileIcon(f.original_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-mono font-medium text-foreground truncate">{f.original_name}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-3 mt-0.5">
                                            <span>{formatBytes(f.size_bytes)}</span>
                                            <span>·</span>
                                            <span>Uploaded {formatDate(f.uploaded_at)}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {f.allowed_users.length > 0 ? (
                                            <span className="flex items-center gap-1 text-[10px] text-green-400 font-mono bg-green-400/10 px-2 py-1 rounded border border-green-400/20">
                                                <CheckCircle className="h-3 w-3" /> {f.allowed_users.length} user{f.allowed_users.length !== 1 ? 's' : ''} assigned
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground/50 font-mono bg-secondary/30 px-2 py-1 rounded border border-border">
                                                Pending assignment by admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="glass-panel p-5 border-primary/20 bg-primary/3">
                    <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                        🔒 <span className="text-primary font-bold">How Hydra DLP works:</span> After uploading, the Hydra admin reviews and assigns specific files to users in your company.
                        Users can only <span className="font-bold text-foreground">view</span> assigned files — they cannot download, copy, screenshot, or share them.
                        Any violation is instantly logged and their access is blocked.
                    </p>
                </div>
            </main>
            <Toaster />
        </div>
    );
}
