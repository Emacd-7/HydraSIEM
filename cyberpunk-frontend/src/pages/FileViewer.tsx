import { useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { ArrowLeft, ShieldAlert, Eye, Download, Lock } from "lucide-react";

type ViewerState = {
    original_name: string;
    classification: 'open' | 'classified';
};

export default function FileViewer() {
    const { fileId } = useParams<{ fileId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const overlayRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const decodedFileId = decodeURIComponent(fileId ?? "");

    const state = (location.state as ViewerState) ?? {
        original_name: decodedFileId,
        classification: 'classified',
    };

    const isClassified = state.classification === 'classified';
    const fileUrl = `/api/files/${encodeURIComponent(decodedFileId)}/view`;

    // ── DLP: Log a security event to the backend ──────────────────────────────
    const logEvent = useCallback((eventType: string) => {
        api.logSecurityEvent(eventType, decodedFileId).catch(() => { });
    }, [decodedFileId]);

    // ── DLP: Show black overlay for 3 seconds, log the attempt ────────────────
    const triggerBlackout = useCallback((reason: string) => {
        logEvent(reason);
        if (!overlayRef.current) return;
        overlayRef.current.style.display = 'flex';
        setTimeout(() => {
            if (overlayRef.current) overlayRef.current.style.display = 'none';
        }, 3000);
    }, [logEvent]);

    useEffect(() => {
        if (!isClassified) return; // No protections on 'open' files

        // ── PrintScreen detection — fires on BOTH keydown AND keyup ──────────
        // Chrome/Brave only fires keyup for PrintScreen; keydown covers Ctrl+P/Ctrl+S
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && (e.key === 'p' || e.key === 's')) {
                e.preventDefault();
                triggerBlackout('PrintOrSaveAttempt');
            }
        };

        // Most browsers fire keyup (not keydown) for the PrintScreen key
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'PrintScreen' || e.keyCode === 44) {
                triggerBlackout('PrintScreenAttempt');
                // Try to clear clipboard that was just written
                try { navigator.clipboard.writeText(''); } catch { }
            }
        };

        // ── Tab / Window visibility change ────────────────────────────────────
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                logEvent('TabSwitchDetected');
            }
        };

        // ── Context menu — blocks right-click on parent page (not inside iframe) ──
        const blockContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            logEvent('RightClickAttempt');
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('visibilitychange', handleVisibility);
        document.addEventListener('contextmenu', blockContextMenu);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('visibilitychange', handleVisibility);
            document.removeEventListener('contextmenu', blockContextMenu);
        };
    }, [isClassified, triggerBlackout, logEvent]);

    const isPDF = state.original_name.toLowerCase().endsWith('.pdf');
    const isCSV = state.original_name.toLowerCase().endsWith('.csv');

    return (
        <div
            className="min-h-screen bg-background flex flex-col"
            style={isClassified ? { userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties : {}}
        >
            {/* ── DLP Black Overlay (shown on PrintScreen) ─────────────────────── */}
            {isClassified && (
                <div
                    ref={overlayRef}
                    style={{ display: 'none' }}
                    className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center gap-4"
                >
                    <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse" />
                    <p className="text-white text-2xl font-black font-mono tracking-widest">ACCESS VIOLATION</p>
                    <p className="text-red-400 text-sm font-mono">Screenshot attempt detected and logged.</p>
                    <p className="text-muted-foreground text-xs font-mono">Your admin has been notified. Access may be revoked.</p>
                </div>
            )}

            {/* ── Header ──────────────────────────────────────────────────────────── */}
            <header className="border-b border-border px-6 py-3 flex items-center gap-4 shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary font-mono uppercase tracking-wider transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" /> Back
                </button>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium text-foreground truncate">{state.original_name}</p>
                </div>

                {/* Classification badge */}
                {isClassified ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-red-400 font-mono bg-red-400/10 px-3 py-1.5 rounded border border-red-400/20">
                        <Lock className="h-3 w-3" /> Classified — DLP Active
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-mono bg-green-400/10 px-3 py-1.5 rounded border border-green-400/20">
                        <Eye className="h-3 w-3" /> Shareable
                    </span>
                )}

                {/* Download only for open files */}
                {!isClassified && (
                    <a
                        href={fileUrl}
                        download={state.original_name}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono hover:bg-primary/20 transition-all"
                    >
                        <Download className="h-3.5 w-3.5" /> Download
                    </a>
                )}
            </header>

            {/* ── File Viewer Area ─────────────────────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden">

                {/* Watermark — only for classified files */}
                {isClassified && (
                    <div
                        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
                        aria-hidden="true"
                    >
                        {/* Repeating diagonal watermark grid */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 80px,
                  rgba(255,255,255,0.03) 80px,
                  rgba(255,255,255,0.03) 81px
                )`,
                            }}
                        />
                        {/* Centre watermark text */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%) rotate(-30deg)',
                                fontSize: '1.1rem',
                                fontFamily: 'monospace',
                                color: 'rgba(255,80,80,0.15)',
                                fontWeight: 900,
                                whiteSpace: 'nowrap',
                                userSelect: 'none',
                                pointerEvents: 'none',
                                letterSpacing: '0.2em',
                            }}
                        >
                            🔒 HYDRA CLASSIFIED · {new Date().toLocaleString()}
                        </div>
                        {/* Corner watermarks */}
                        {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
                            <span
                                key={i}
                                className={`absolute ${pos} text-[10px] font-mono text-red-500/20 pointer-events-none select-none`}
                            >
                                CLASSIFIED
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Right-click interceptor — sits above the iframe for classified files ── */}
                {/* The browser's native PDF viewer can't be reached with document-level listeners. */}
                {/* This transparent div sits on top and catches contextmenu before it reaches the iframe. */}
                {isClassified && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 50,
                            background: 'transparent',
                            cursor: 'default',
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            logEvent('RightClickAttempt');
                        }}
                        onMouseDown={(e) => {
                            // Block right mouse button (button === 2) drag at mousedown
                            if (e.button === 2) e.preventDefault();
                        }}
                    />
                )}

                {/* PDF Viewer */}
                {isPDF && (
                    <iframe
                        ref={iframeRef}
                        src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                        className="w-full h-full border-none"
                        style={{ height: 'calc(100vh - 57px)' }}
                        title={state.original_name}
                    />
                )}

                {/* CSV / text fallback */}
                {isCSV && (
                    <iframe
                        src={fileUrl}
                        className="w-full border-none"
                        style={{ height: 'calc(100vh - 57px)' }}
                        title={state.original_name}
                    />
                )}

                {/* Unknown type fallback */}
                {!isPDF && !isCSV && (
                    <div className="p-8 text-center text-muted-foreground font-mono text-xs">
                        Preview not available. {!isClassified && <a href={fileUrl} className="text-primary underline" download>Download file</a>}
                    </div>
                )}
            </div>
        </div>
    );
}
