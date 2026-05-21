import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TicketPage from "./pages/TicketPage";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEventConfig from "./pages/admin/AdminEventConfig";
import AdminRegistrations from "./pages/admin/AdminRegistrations";
import AdminPartnerPackages from "./pages/admin/AdminPartnerPackages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route
            path="/ticket/:ticket_number"
            element={<TicketPage />}
          />

          {/* Admin Routes */}
          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />

          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/event-config"
            element={<AdminEventConfig />}
          />

          <Route
            path="/admin/registrations"
            element={<AdminRegistrations />}
          />

          <Route
            path="/admin/partner-packages"
            element={<AdminPartnerPackages />}
          />

          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
