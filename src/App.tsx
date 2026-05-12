import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Index from "@/pages/Index";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDonations from "@/pages/admin/AdminDonations";

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        
        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/donations" element={<AdminDonations />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
