import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

import Index from "@/pages/Index";
import Lookup from "@/pages/Lookup";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import AdminLogin from "@/pages/admin/AdminLogin";

const TicketPage = lazy(() => import("@/pages/TicketPage"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const EventInsights = lazy(() => import("@/pages/EventInsights"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminTickets = lazy(() => import("@/pages/admin/AdminTickets"));
const AdminRegistrations = lazy(() => import("@/pages/admin/AdminRegistrations"));
const AdminPayments = lazy(() => import("@/pages/admin/AdminPayments"));
const AdminDonations = lazy(() => import("@/pages/admin/AdminDonations"));
const AdminCodes = lazy(() => import("@/pages/admin/AdminCodes"));
const AdminPackages = lazy(() => import("@/pages/admin/AdminPackages"));
const AdminPartnerPackages = lazy(() => import("@/pages/admin/AdminPartnerPackages"));
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

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster richColors />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/lookup" element={<Lookup />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/insights" element={<EventInsights />} />
                <Route path="/ticket/:ticket_number" element={<TicketPage />} />
                <Route path="/app/ticket/:ticket_number" element={<TicketPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<ProtectedRoute><AdminOverview /></ProtectedRoute>} />
                <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/tickets" element={<ProtectedRoute><AdminTickets /></ProtectedRoute>} />
                <Route path="/admin/registrations" element={<ProtectedRoute><AdminRegistrations /></ProtectedRoute>} />
                <Route path="/admin/payments" element={<ProtectedRoute><AdminPayments /></ProtectedRoute>} />
                <Route path="/admin/donations" element={<ProtectedRoute><AdminDonations /></ProtectedRoute>} />
                <Route path="/admin/codes" element={<ProtectedRoute><AdminCodes /></ProtectedRoute>} />
                <Route path="/admin/packages" element={<ProtectedRoute><AdminPackages /></ProtectedRoute>} />
                <Route path="/admin/partner-packages" element={<ProtectedRoute><AdminPartnerPackages /></ProtectedRoute>} />
                <Route path="/admin/promotions" element={<ProtectedRoute><AdminPromotions /></ProtectedRoute>} />
                <Route path="/admin/sponsorships" element={<ProtectedRoute><AdminSponsorships /></ProtectedRoute>} />
                <Route path="/admin/inquiries" element={<ProtectedRoute><AdminInquiries /></ProtectedRoute>} />
                <Route path="/admin/partners" element={<ProtectedRoute><AdminPartners /></ProtectedRoute>} />
                <Route path="/admin/speakers" element={<ProtectedRoute><AdminSpeakers /></ProtectedRoute>} />
                <Route path="/admin/documents" element={<ProtectedRoute><AdminDocuments /></ProtectedRoute>} />
                <Route path="/admin/event" element={<ProtectedRoute><AdminEventConfig /></ProtectedRoute>} />
                <Route path="/admin/event-config" element={<Navigate to="/admin/event" replace />} />
                <Route path="/admin/content" element={<ProtectedRoute><AdminContent /></ProtectedRoute>} />
                <Route path="/admin/gallery" element={<ProtectedRoute><AdminGallery /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/activity" element={<ProtectedRoute><AdminActivity /></ProtectedRoute>} />
                <Route path="/admin/danger-zone" element={<ProtectedRoute><AdminDangerZone /></ProtectedRoute>} />
                <Route path="/admin/qr-scanner" element={<ProtectedRoute><AdminQRScanner /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
