import { Play, Square } from "lucide-react";

interface SimulationButtonProps {
  active: boolean;
  onToggle: () => void;
}

export function SimulationButton({ active, onToggle }: SimulationButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 px-6 py-3 rounded-lg font-mono font-semibold text-sm uppercase tracking-wider transition-all duration-300 ${
        active
          ? "bg-destructive/20 text-destructive border border-destructive/50 animate-pulse-glow"
          : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 glow-cyan"
      }`}
    >
      {active ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {active ? "Stop Simulation" : "Start Simulation"}
    </button>
  );
}
