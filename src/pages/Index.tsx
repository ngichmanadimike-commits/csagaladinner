import Navbar from "@/components/Navbar";
import PromoBanner from "@/components/PromoBanner";
import PromoPopup from "@/components/PromoPopup";
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
    <PromoBanner />
    <Navbar />
    <HeroSection />
    <TicketsSection />
    <PaymentStatusLookup />
    <SponsorSection />
    <PartnerForm />
    <PartnersSection />
    <SocialSection />
    <Footer />
    <PromoPopup />
  </div>
);

export default Index;
