import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { lazy, Suspense } from "react";

import { AuthProvider } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Lookup from "./pages/Lookup";
import Gallery from "./pages/Gallery";
import EventInsights from "./pages/EventInsights";
import ResetPassword from "./pages/ResetPassword";
import AdminLogin from "./pages/admin/AdminLogin";

const TicketPage = lazy(() => import("./pages/TicketPage"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminEventConfig = lazy(() => import("./pages/admin/AdminEventConfig"));
const AdminRegistrations = lazy(() => import("./pages/admin/AdminRegistrations"));
const AdminPartnerPackages = lazy(() => import("./pages/admin/AdminPartnerPackages"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminPackages = lazy(() => import("./pages/admin/AdminPackages"));
const AdminPartners = lazy(() => import("./pages/admin/AdminPartners"));
const AdminSponsorships = lazy(() => import("./pages/admin/AdminSponsorships"));
const AdminPromotions = lazy(() => import("./pages/admin/AdminPromotions"));
const AdminTickets = lazy(() => import("./pages/admin/AdminTickets"));
const AdminGallery = lazy(() => import("./pages/admin/AdminGallery"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminActivity = lazy(() => import("./pages/admin/AdminActivity"));
const AdminCodes = lazy(() => import("./pages/admin/AdminCodes"));
const AdminDocuments = lazy(() => import("./pages/admin/AdminDocuments"));
const AdminDonations = lazy(() => import("./pages/admin/AdminDonations"));
const AdminInquiries = lazy(() => import("./pages/admin/AdminInquiries"));
const AdminQRScanner = lazy(() => import("./pages/admin/AdminQRScanner"));
const AdminSpeakers = lazy(() => import("./pages/admin/AdminSpeakers"));
const AdminDangerZone = lazy(() => import("./pages/admin/AdminDangerZone"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Simplified ProtectedRoute — only checks if user is logged in, no role check
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/admin/dashboard" element={<ProtectedRoute><AdminOverview /></ProtectedRoute>} />
              <Route path="/admin/event-config" element={<ProtectedRoute><AdminEventConfig /></ProtectedRoute>} />
              <Route path="/admin/registrations" element={<ProtectedRoute><AdminRegistrations /></ProtectedRoute>} />
              <Route path="/admin/partner-packages" element={<ProtectedRoute><AdminPartnerPackages /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute><AdminPayments /></ProtectedRoute>} />
              <Route path="/admin/packages" element={<ProtectedRoute><AdminPackages /></ProtectedRoute>} />
              <Route path="/admin/partners" element={<ProtectedRoute><AdminPartners /></ProtectedRoute>} />
              <Route path="/admin/sponsorships" element={<ProtectedRoute><AdminSponsorships /></ProtectedRoute>} />
              <Route path="/admin/promotions" element={<ProtectedRoute><AdminPromotions /></ProtectedRoute>} />
              <Route path="/admin/tickets" element={<ProtectedRoute><AdminTickets /></ProtectedRoute>} />
              <Route path="/admin/gallery" element={<ProtectedRoute><AdminGallery /></ProtectedRoute>} />
              <Route path="/admin/content" element={<ProtectedRoute><AdminContent /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/activity" element={<ProtectedRoute><AdminActivity /></ProtectedRoute>} />
              <Route path="/admin/codes" element={<ProtectedRoute><AdminCodes /></ProtectedRoute>} />
              <Route path="/admin/documents" element={<ProtectedRoute><AdminDocuments /></ProtectedRoute>} />
              <Route path="/admin/donations" element={<ProtectedRoute><AdminDonations /></ProtectedRoute>} />
              <Route path="/admin/inquiries" element={<ProtectedRoute><AdminInquiries /></ProtectedRoute>} />
              <Route path="/admin/qr-scanner" element={<ProtectedRoute><AdminQRScanner /></ProtectedRoute>} />
              <Route path="/admin/speakers" element={<ProtectedRoute><AdminSpeakers /></ProtectedRoute>} />
              <Route path="/admin/danger-zone" element={<ProtectedRoute><AdminDangerZone /></ProtectedRoute>} />

              {/* Catch All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
