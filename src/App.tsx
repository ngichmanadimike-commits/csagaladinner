import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";

// Public pages
import Index from "@/pages/Index";
import Lookup from "@/pages/Lookup";
import NotFound from "@/pages/NotFound";
import TicketPage from "@/pages/TicketPage";

// Auth pages
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";

// Admin pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminTickets from "@/pages/admin/AdminTickets";
import AdminRegistrations from "@/pages/admin/AdminRegistrations";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminDonations from "@/pages/admin/AdminDonations";
import AdminCodes from "@/pages/admin/AdminCodes";
import AdminPackages from "@/pages/admin/AdminPackages";
import AdminPromotions from "@/pages/admin/AdminPromotions";
import AdminSponsorships from "@/pages/admin/AdminSponsorships";
import AdminInquiries from "@/pages/admin/AdminInquiries";
import AdminPartners from "@/pages/admin/AdminPartners";
import AdminSpeakers from "@/pages/admin/AdminSpeakers";
import AdminDocuments from "@/pages/admin/AdminDocuments";
import AdminEventConfig from "@/pages/admin/AdminEventConfig";
import AdminContent from "@/pages/admin/AdminContent";
import AdminGallery from "@/pages/admin/AdminGallery";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminActivity from "@/pages/admin/AdminActivity";
import AdminDangerZone from "@/pages/admin/AdminDangerZone";
import Gallery from "@/pages/Gallery";
import EventInsights from "@/pages/EventInsights";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/insights" element={<EventInsights />} />
          <Route path="/ticket/:ticket_number" element={<TicketPage />} />
          <Route path="/app/ticket/:ticket_number" element={<TicketPage />} />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/registrations" element={<AdminRegistrations />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/donations" element={<AdminDonations />} />
          <Route path="/admin/codes" element={<AdminCodes />} />
          <Route path="/admin/packages" element={<AdminPackages />} />
          <Route path="/admin/promotions" element={<AdminPromotions />} />
          <Route path="/admin/sponsorships" element={<AdminSponsorships />} />
          <Route path="/admin/inquiries" element={<AdminInquiries />} />
          <Route path="/admin/partners" element={<AdminPartners />} />
          <Route path="/admin/speakers" element={<AdminSpeakers />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/admin/event" element={<AdminEventConfig />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="/admin/gallery" element={<AdminGallery />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/activity" element={<AdminActivity />} />
          <Route path="/admin/danger-zone" element={<AdminDangerZone />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
// Add this import alongside the other admin imports
import AdminQRScanner from "@/pages/admin/AdminQRScanner";

// Add this route alongside the other /admin routes
<Route path="/admin/qr-scanner" element={<AdminQRScanner />} />
