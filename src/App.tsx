import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";

// Public pages (eagerly loaded)
import Index from "@/pages/Index";
import Lookup from "@/pages/Lookup";
import NotFound from "@/pages/NotFound";
import TicketPage from "@/pages/TicketPage";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";

// Admin + non-critical pages (lazily loaded — reduces homepage bundle size)
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminTickets = lazy(() => import("@/pages/admin/AdminTickets"));
const AdminRegistrations = lazy(() => import("@/pages/admin/AdminRegistrations"));
const AdminPayments = lazy(() => import("@/pages/admin/AdminPayments"));
const AdminDonations = lazy(() => import("@/pages/admin/AdminDonations"));
const AdminCodes = lazy(() => import("@/pages/admin/AdminCodes"));
const AdminPackages = lazy(() => import("@/pages/admin/AdminPackages"));
const AdminPromotions = lazy(() => import("@/pages/admin/AdminPromotions"));
const AdminSponsorships = lazy(() => import("@/pages/admin/AdminSponsorships"));
const AdminInquiries = lazy(() => import("@/pages/admin/AdminInquiries"));
const AdminPartners = lazy(() => import("@/pages/admin/AdminPartners"));
const AdminSpeakers = lazy(() => import("@/pages/admin/AdminSpeakers"));
const AdminDocuments = lazy(() => import("@/pages/admin/AdminDocuments"));
const AdminEventConfig = lazy(() => import("@/pages/admin/AdminEventConfig"));
const AdminContent = lazy(() => import("@/pages/admin/AdminContent"));
const AdminGallery = lazy(() => import("@/pages/admin/AdminGallery"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminActivity = lazy(() => import("@/pages/admin/AdminActivity"));
const AdminDangerZone = lazy(() => import("@/pages/admin/AdminDangerZone"));
const AdminQRScanner = lazy(() => import("@/pages/admin/AdminQRScanner"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const EventInsights = lazy(() => import("@/pages/EventInsights"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors />
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/admin/qr-scanner" element={<AdminQRScanner />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
