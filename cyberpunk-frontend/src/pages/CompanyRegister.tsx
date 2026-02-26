import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ShieldCheck, Lock, Hash, FileText, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// IMPORTANT: Defined at module scope to prevent re-mounting on every keystroke
const Field = ({
    icon: Icon, name, placeholder, type = "text", value, onChange
}: {
    icon: any; name: string; placeholder: string; type?: string;
    value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
    <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
            name={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required
            className="w-full bg-background/50 border border-input px-10 py-3 rounded-md text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
        />
    </div>
);

export default function CompanyRegister() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [form, setForm] = useState({
        company_id: "",
        company_name: "",
        description: "",
        email: "",
        password: "",
        confirm: "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    };

    const ch = handleChange as (e: React.ChangeEvent<HTMLInputElement>) => void;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirm) {
            toast({ title: "Passwords do not match", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/register/company", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_id: form.company_id.toUpperCase(),
                    company_name: form.company_name,
                    description: form.description,
                    email: form.email,
                    password: form.password,
                }),
            });
            const data = await res.json();
            if (data.status === "success") {
                toast({ title: "Company Registered!", description: "You can now log in with your company ID." });
                setTimeout(() => navigate("/login"), 1500);
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
                {/* Back */}
                <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary font-mono uppercase tracking-wider mb-6 transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" /> Back to Login
                </button>

                <div className="flex justify-center mb-6">
                    <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                        <Building2 className="w-8 h-8 text-primary" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center mb-1 text-foreground tracking-tighter">Register Company</h1>
                <p className="text-[10px] text-center text-muted-foreground font-mono mb-8 uppercase tracking-widest">
                    Create a Company Account on Hydra
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field icon={Hash} name="company_id" placeholder="Company ID (e.g. ACMECORP) — must be unique" value={form.company_id} onChange={ch} />
                    <Field icon={Building2} name="company_name" placeholder="Full Company Name" value={form.company_name} onChange={ch} />
                    <Field icon={FileText} name="description" placeholder="Brief description (optional)" value={form.description} onChange={ch} />
                    <Field icon={ShieldCheck} name="email" placeholder="Admin Email" type="email" value={form.email} onChange={ch} />
                    <Field icon={Lock} name="password" placeholder="Password" type="password" value={form.password} onChange={ch} />
                    <Field icon={Lock} name="confirm" placeholder="Confirm Password" type="password" value={form.confirm} onChange={ch} />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-md font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 font-mono tracking-widest mt-2"
                    >
                        {loading ? "REGISTERING..." : "REGISTER COMPANY"}
                    </button>
                </form>

                <p className="text-[10px] text-center text-muted-foreground font-mono mt-6">
                    Already have an account?{" "}
                    <button onClick={() => navigate("/login")} className="text-primary hover:underline font-bold uppercase">
                        Sign In
                    </button>
                </p>
            </div>
            <Toaster />
        </div>
    );
}
