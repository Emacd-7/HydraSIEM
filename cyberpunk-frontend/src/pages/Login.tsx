
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Lock, User, ShieldCheck, X, KeyRound, UserPlus, Building2 } from "lucide-react";

const Login = () => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await api.login(identifier, password);
            toast({
                title: "Authentication Successful",
                description: "Initializing neural link...",
            });
            // Route based on role returned from server
            if (res.role === 'company') {
                navigate("/company-dashboard");
            } else {
                navigate("/");
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Access Denied",
                description: "Invalid credentials or unauthorized terminal.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = "http://localhost:5000/login/google";
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        try {
            await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail }),
            });
        } catch (_) {
            // Silently show success to prevent email enumeration
        } finally {
            setForgotLoading(false);
            setForgotSent(true);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--primary)_0%,_transparent_70%)] opacity-5 pointer-events-none" />

            <div className="w-full max-w-[400px] glass-panel p-8 relative z-10 animate-fade-in">
                <div className="flex justify-center mb-8">
                    <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-center mb-2 text-foreground tracking-tighter">HYDRA SIEM</h1>
                <p className="text-xs text-center text-muted-foreground font-mono mb-8 uppercase tracking-widest">Quantum Encryption Terminal</p>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Username or Email"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                className="w-full bg-background/50 border border-input px-10 py-3 rounded-md text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="password"
                                placeholder="Security Cipher"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-background/50 border border-input px-10 py-3 rounded-md text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
                            />
                        </div>

                        {/* Forgot Password link */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => { setShowForgot(true); setForgotSent(false); setForgotEmail(""); }}
                                className="text-[11px] text-muted-foreground hover:text-primary font-mono transition-colors uppercase tracking-wider"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-md font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 font-mono tracking-widest"
                    >
                        {isLoading ? "VIRTUALIZING..." : "AUTHENTICATE"}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground font-mono">External Protocol</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full border border-input bg-background/50 hover:bg-accent py-3 rounded-md font-medium transition-all flex items-center justify-center gap-3 font-mono text-sm group"
                >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    LINK GOOGLE ID
                </button>

                {/* Register options */}
                <div className="mt-6 space-y-2">
                    <p className="text-[10px] text-center text-muted-foreground font-mono uppercase tracking-widest mb-3">New to Hydra?</p>
                    <button
                        type="button"
                        onClick={() => navigate("/register/company")}
                        className="w-full border border-primary/30 bg-primary/5 hover:bg-primary/10 py-2.5 rounded-md font-mono text-sm text-primary transition-all flex items-center justify-center gap-2 group"
                    >
                        <Building2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Register as Company
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/register/user")}
                        className="w-full border border-border bg-background/30 hover:bg-accent py-2.5 rounded-md font-mono text-sm text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2 group"
                    >
                        <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Register as User
                    </button>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm glass-panel p-8 relative animate-fade-in">
                        <button
                            onClick={() => setShowForgot(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex justify-center mb-6">
                            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                                <KeyRound className="w-8 h-8 text-primary" />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-center text-foreground mb-1 tracking-tight">Reset Access Key</h2>
                        <p className="text-xs text-center text-muted-foreground font-mono mb-6 uppercase tracking-widest">
                            Enter your registered email
                        </p>

                        {forgotSent ? (
                            <div className="text-center space-y-4">
                                <div className="p-4 rounded-md border border-primary/30 bg-primary/5 text-sm text-primary font-mono">
                                    ✓ If that email is registered, a reset link has been dispatched.
                                </div>
                                <button
                                    onClick={() => setShowForgot(false)}
                                    className="w-full py-3 rounded-md border border-input bg-background/50 hover:bg-accent text-foreground font-mono text-sm transition-all"
                                >
                                    Return to Terminal
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        placeholder="agent@hydra.siem"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        required
                                        className="w-full bg-background/50 border border-input px-10 py-3 rounded-md text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-md font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 font-mono tracking-widest"
                                >
                                    {forgotLoading ? "DISPATCHING..." : "SEND RESET LINK"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <Toaster />
        </div>
    );
};

export default Login;
