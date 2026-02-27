import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import FusionGraph from "./pages/FusionGraph";
import DataExplorer from "./pages/DataExplorer";
import Incidents from "./pages/Incidents";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import CompanyRegister from "./pages/CompanyRegister";
import UserRegister from "./pages/UserRegister";
import CompanyDashboard from "./pages/CompanyDashboard";
import UserDashboard from "./pages/UserDashboard";
import FileViewer from "./pages/FileViewer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register/company" element={<CompanyRegister />} />
          <Route path="/register/user" element={<UserRegister />} />
          <Route path="/company-dashboard" element={<CompanyDashboard />} />
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/view-file/:fileId" element={<FileViewer />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/fusion-graph" element={<FusionGraph />} />
            <Route path="/data-explorer" element={<DataExplorer />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
