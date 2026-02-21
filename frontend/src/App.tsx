import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HydraSidebar from "@/components/HydraSidebar";
import Dashboard from "@/pages/Dashboard";
import FusionGraph from "@/pages/FusionGraph";
import DataExplorer from "@/pages/DataExplorer";
import Incidents from "@/pages/Incidents";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen w-full">
          <HydraSidebar />
          <main className="flex-1 pl-16 lg:pl-56">
            <div className="mx-auto max-w-6xl px-6 py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/fusion-graph" element={<FusionGraph />} />
                <Route path="/data-explorer" element={<DataExplorer />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
