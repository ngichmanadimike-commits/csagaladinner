import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TicketsSection from "@/components/TicketsSection";
import PaymentStatusLookup from "@/components/PaymentStatusLookup";
import SponsorSection from "@/components/SponsorSection";
import PartnerForm from "@/components/PartnerForm";
import PartnersSection from "@/components/PartnersSection";
import SocialSection from "@/components/SocialSection";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <HeroSection />
    <TicketsSection />
    <PaymentStatusLookup />
    <SponsorSection />
    <PartnerForm />
    <PartnersSection />
    <SocialSection />
    <Footer />
  </div>
);

export default Index;
