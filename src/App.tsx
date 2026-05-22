import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";

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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
