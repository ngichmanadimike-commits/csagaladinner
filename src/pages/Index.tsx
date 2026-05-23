import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TicketsSection from "@/components/TicketsSection";
import SponsorSection from "@/components/SponsorSection";
import PartnersSection from "@/components/PartnersSection";
import PartnerForm from "@/components/PartnerForm";
import PaymentStatusLookup from "@/components/PaymentStatusLookup";
import SocialSection from "@/components/SocialSection";
import Footer from "@/components/Footer";
import PromoBanner from "@/components/PromoBanner";
import PromoPopup from "@/components/PromoPopup";
import EventNotification from "@/components/EventNotification";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PromoPopup />
      <PromoBanner />
      <EventNotification />
      <main>
        <HeroSection />
        <TicketsSection />
        <SponsorSection />
        <PartnerForm />
        <PartnersSection />
        <PaymentStatusLookup />
        <SocialSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
