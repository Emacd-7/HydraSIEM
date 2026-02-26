import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Lock, ShieldCheck, CheckCircle2 } from "lucide-react";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        if (!token) {
            toast({ title: "Invalid Link", description: "No reset token found in the URL.", variant: "destructive" });
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
            return;
        }
        if (password.length < 4) {
            toast({ title: "Too Short", description: "Password must be at least 4 characters.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password, confirm_password: confirm }),
            });
            const data = await res.json();
            if (res.ok && data.status === "success") {
                setSuccess(true);
                setTimeout(() => navigate("/login"), 3000);
            } else {
                toast({ title: "Reset Failed", description: data.message || "Something went wrong.", variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Network Error", description: "Could not reach the server.", variant: "destructive" });
        } finally {
            setIsLoading(false);
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
                <p className="text-xs text-center text-muted-foreground font-mono mb-8 uppercase tracking-widest">
                    Reset Access Key
                </p>

                {success ? (
                    <div className="text-center space-y-6">
                        <div className="flex justify-center">
                            <CheckCircle2 className="w-16 h-16 text-primary animate-pulse" />
                        </div>
                        <div className="p-4 rounded-md border border-primary/30 bg-primary/5 text-sm text-primary font-mono">
                            ✓ Password updated successfully.<br />
                            <span className="text-muted-foreground text-xs">Redirecting to login...</span>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-background/50 border border-input px-10 py-3 rounded-md text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                className="w-full bg-background/50 border border-input px-10 py-3 rounded-md text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !token}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-md font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 font-mono tracking-widest"
                        >
                            {isLoading ? "UPDATING..." : "SET NEW ACCESS KEY"}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="text-xs text-muted-foreground hover:text-primary font-mono transition-colors uppercase tracking-wider"
                            >
                                Cancel — Return to Terminal
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <Toaster />
        </div>
    );
};

export default ResetPassword;
