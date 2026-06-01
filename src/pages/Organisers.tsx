import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OrganizersSection from "@/components/OrganizersSection";

// Dedicated /organizers page — reuses the existing OrganizersSection component
const Organizers = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-16">
      <OrganizersSection />
    </div>
    <Footer />
  </div>
);

export default Organizers;
