import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import EventInsights from "./pages/EventInsights.tsx";
import Gallery from "./pages/Gallery.tsx";
import Login from "./pages/Login.tsx";
import AdminOverview from "./pages/admin/AdminOverview.tsx";
import AdminPayments from "./pages/admin/AdminPayments.tsx";
import AdminRegistrations from "./pages/admin/AdminRegistrations.tsx";
import AdminEventConfig from "./pages/admin/AdminEventConfig.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminContent from "./pages/admin/AdminContent.tsx";
import AdminGallery from "./pages/admin/AdminGallery.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/event-insights" element={<EventInsights />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/registrations" element={<AdminRegistrations />} />
            <Route path="/admin/event" element={<AdminEventConfig />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/content" element={<AdminContent />} />
            <Route path="/admin/gallery" element={<AdminGallery />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
