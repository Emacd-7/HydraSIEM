import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Network, Search, AlertTriangle, LogOut } from "lucide-react";
import { api } from "@/services/api";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/fusion-graph", icon: Network, label: "Fusion Graph" },
  { to: "/data-explorer", icon: Search, label: "Data Explorer" },
  { to: "/incidents", icon: AlertTriangle, label: "Incidents" },
];

const HydraSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center border-r border-border bg-secondary py-6 transition-gothic lg:w-56">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center">
        <div className="h-8 w-8 rounded-full bg-primary/20 ring-1 ring-primary/40 animate-pulse-amethyst" />
        <span className="mt-2 hidden font-serif text-xs tracking-[0.2em] text-muted-foreground lg:block">
          HYDRA
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 w-full px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-gothic ${isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
              <span className="hidden lg:inline">{item.label}</span>
              {isActive && (
                <div className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-primary glow-amethyst lg:block" />
              )}
            </RouterNavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-3 text-sm text-muted-foreground transition-gothic hover:text-foreground w-full justify-center lg:justify-start lg:px-5"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden lg:inline">Logout</span>
      </button>
    </aside>
  );
};

export default HydraSidebar;
