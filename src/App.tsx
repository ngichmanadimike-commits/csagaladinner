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
import Login from "./pages/Login";
import Lookup from "./pages/Lookup";
import Gallery from "./pages/Gallery";
import EventInsights from "./pages/EventInsights";
import ResetPassword from "./pages/ResetPassword";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminEventConfig from "./pages/admin/AdminEventConfig";
import AdminRegistrations from "./pages/admin/AdminRegistrations";
import AdminPartnerPackages from "./pages/admin/AdminPartnerPackages";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminSponsorships from "./pages/admin/AdminSponsorships";
import AdminPromotions from "./pages/admin/AdminPromotions";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminContent from "./pages/admin/AdminContent";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminCodes from "./pages/admin/AdminCodes";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminDonations from "./pages/admin/AdminDonations";
import AdminInquiries from "./pages/admin/AdminInquiries";
import AdminQRScanner from "./pages/admin/AdminQRScanner";
import AdminSpeakers from "./pages/admin/AdminSpeakers";
import AdminDangerZone from "./pages/admin/AdminDangerZone";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/ticket/:ticket_number" element={<TicketPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/insights" element={<EventInsights />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminOverview />} />
          <Route path="/admin/event-config" element={<AdminEventConfig />} />
          <Route path="/admin/registrations" element={<AdminRegistrations />} />
          <Route path="/admin/partner-packages" element={<AdminPartnerPackages />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/packages" element={<AdminPackages />} />
          <Route path="/admin/partners" element={<AdminPartners />} />
          <Route path="/admin/sponsorships" element={<AdminSponsorships />} />
          <Route path="/admin/promotions" element={<AdminPromotions />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/gallery" element={<AdminGallery />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/activity" element={<AdminActivity />} />
          <Route path="/admin/codes" element={<AdminCodes />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/admin/donations" element={<AdminDonations />} />
          <Route path="/admin/inquiries" element={<AdminInquiries />} />
          <Route path="/admin/qr-scanner" element={<AdminQRScanner />} />
          <Route path="/admin/speakers" element={<AdminSpeakers />} />
          <Route path="/admin/danger-zone" element={<AdminDangerZone />} />

          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
