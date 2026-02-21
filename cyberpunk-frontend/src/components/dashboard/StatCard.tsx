import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "danger" | "warning";
  animate?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, variant = "default", animate }: StatCardProps) {
  const variantStyles = {
    default: "border-primary/20 hover:border-primary/40",
    danger: "border-destructive/30 hover:border-destructive/50 glow-red",
    warning: "border-warning/30 hover:border-warning/50",
  };

  return (
    <div className={`stat-card ${variantStyles[variant]} ${animate ? "animate-counter-tick" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{title}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-mono font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</span>
        {trend && <span className="text-xs text-success mb-1">{trend}</span>}
      </div>
    </div>
  );
}
