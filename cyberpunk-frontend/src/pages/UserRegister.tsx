import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, ShieldCheck, Lock, ArrowLeft, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// IMPORTANT: Defined at module scope to prevent re-mounting on every keystroke
const Field = ({
    icon: Icon, name, placeholder, type = "text", value, onChange, required = true
}: {
    icon: any; name: string; placeholder: string; type?: string;
    value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}) => (
    <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
            name={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full bg-background/50 border border-input px-10 py-3 rounded-md text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
        />
    </div>
);

export default function UserRegister() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [form, setForm] = useState({
        full_name: "",
        company_id: "",
        email: "",
        password: "",
        confirm: "",
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ user_id: string; company: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirm) {
            toast({ title: "Passwords do not match", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/register/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: form.full_name,
                    company_id: form.company_id.toUpperCase(),
                    email: form.email,
                    password: form.password,
                }),
            });
            const data = await res.json();
            if (data.status === "success") {
                setResult({ user_id: data.user_id, company: data.company });
            } else {
                toast({ title: "Registration Failed", description: data.message, variant: "destructive" });
            }
        } catch {
            toast({ title: "Network Error", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--primary)_0%,_transparent_70%)] opacity-5 pointer-events-none" />

            <div className="w-full max-w-[440px] glass-panel p-8 relative z-10 animate-fade-in">
                <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary font-mono uppercase tracking-wider mb-6 transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" /> Back to Login
                </button>

                <div className="flex justify-center mb-6">
                    <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                        <User className="w-8 h-8 text-primary" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center mb-1 text-foreground tracking-tighter">Register as User</h1>
                <p className="text-[10px] text-center text-muted-foreground font-mono mb-8 uppercase tracking-widest">
                    Join your company on Hydra
                </p>

                {result ? (
                    <div className="space-y-5 text-center">
                        <div className="p-5 rounded-lg border border-primary/30 bg-primary/5">
                            <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-3" />
                            <p className="text-sm font-bold text-foreground mb-1">Registration Complete!</p>
                            <p className="text-xs text-muted-foreground font-mono mb-4">
                                You've been added to <span className="text-primary font-bold">{result.company}</span>
                            </p>

                            {/* User ID — LOGIN credential */}
                            <div className="border-2 border-primary/40 rounded-md p-4 bg-background/60 space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Your Login ID</p>
                                <p className="text-xl font-black font-mono text-primary tracking-wide">{result.user_id}</p>
                                <p className="text-[11px] text-yellow-400 font-mono font-bold mt-2">
                                    ⚠️ Use this as your USERNAME to log in — NOT your full name
                                </p>
                            </div>

                            <div className="mt-3 text-[10px] text-muted-foreground font-mono bg-secondary/30 rounded px-3 py-2">
                                Login at <span className="text-primary">localhost:3000/login</span> using:<br />
                                Username: <span className="text-foreground font-bold">{result.user_id}</span><br />
                                Password: <span className="text-foreground font-bold">the password you just set</span>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate("/login")}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-md font-bold transition-all font-mono tracking-widest"
                        >
                            GO TO LOGIN
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Field icon={User} name="full_name" placeholder="Full Name" value={form.full_name} onChange={handleChange} />
                        <Field icon={Building2} name="company_id" placeholder="Company ID (ask your company admin)" value={form.company_id} onChange={handleChange} />
                        <Field icon={ShieldCheck} name="email" placeholder="Work Email (optional)" type="email" value={form.email} onChange={handleChange} required={false} />
                        <Field icon={Lock} name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} />
                        <Field icon={Lock} name="confirm" placeholder="Confirm Password" type="password" value={form.confirm} onChange={handleChange} />

                        <p className="text-[10px] text-muted-foreground font-mono px-1">
                            ℹ️ You will be automatically assigned a unique User ID by the system.
                        </p>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-md font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 font-mono tracking-widest"
                        >
                            {loading ? "REGISTERING..." : "REGISTER"}
                        </button>
                    </form>
                )}
            </div>
            <Toaster />
        </div>
    );
}
