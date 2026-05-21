import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Import admin pages if they exist
import EventInsights from "./pages/EventInsights";
import Gallery from "./pages/Gallery";
import Lookup from "./pages/Lookup";
import ResetPassword from "./pages/ResetPassword";
import TicketPage from "./pages/TicketPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/event-insights" element={<EventInsights />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/ticket" element={<TicketPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
