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
import Lookup from "./pages/Lookup.tsx";
import AdminOverview from "./pages/admin/AdminOverview.tsx";
import AdminPayments from "./pages/admin/AdminPayments.tsx";
import AdminRegistrations from "./pages/admin/AdminRegistrations.tsx";
import AdminEventConfig from "./pages/admin/AdminEventConfig.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminContent from "./pages/admin/AdminContent.tsx";
import AdminGallery from "./pages/admin/AdminGallery.tsx";
import AdminPartners from "./pages/admin/AdminPartners.tsx";
import AdminSponsorships from "./pages/admin/AdminSponsorships.tsx";
import AdminInquiries from "./pages/admin/AdminInquiries.tsx";
import AdminDocuments from "./pages/admin/AdminDocuments.tsx";
import AdminSpeakers from "./pages/admin/AdminSpeakers.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminPackages from "./pages/admin/AdminPackages.tsx";
import AdminActivity from "./pages/admin/AdminActivity.tsx";
import AdminCodes from "./pages/admin/AdminCodes.tsx";
import AdminPromotions from "./pages/admin/AdminPromotions.tsx";
import AdminDangerZone from "./pages/admin/AdminDangerZone.tsx";
import AdminTickets from "./pages/admin/AdminTickets.tsx";
import TicketPage from "./pages/TicketPage.tsx";
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
            <Route path="/lookup" element={<Lookup />} />
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/registrations" element={<AdminRegistrations />} />
            <Route path="/admin/event" element={<AdminEventConfig />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/content" element={<AdminContent />} />
            <Route path="/admin/gallery" element={<AdminGallery />} />
            <Route path="/admin/partners" element={<AdminPartners />} />
            <Route path="/admin/sponsorships" element={<AdminSponsorships />} />
            <Route path="/admin/inquiries" element={<AdminInquiries />} />
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/speakers" element={<AdminSpeakers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/packages" element={<AdminPackages />} />
            <Route path="/admin/codes" element={<AdminCodes />} />
            <Route path="/admin/activity" element={<AdminActivity />} />
            <Route path="/admin/promotions" element={<AdminPromotions />} />
            <Route path="/admin/danger-zone" element={<AdminDangerZone />} />
            <Route path="/admin/tickets" element={<AdminTickets />} />
            <Route path="/ticket/:ticket_number" element={<TicketPage />} />
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
