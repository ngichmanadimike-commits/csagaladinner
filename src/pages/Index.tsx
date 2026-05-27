import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TicketsSection from "@/components/TicketsSection";
import SponsorSection from "@/components/SponsorSection";
import PartnersSection from "@/components/PartnersSection";
import PartnerForm from "@/components/PartnerForm";
import OrganizersSection from "@/components/OrganizersSection";
import PaymentStatusLookup from "@/components/PaymentStatusLookup";
import SocialSection from "@/components/SocialSection";
import Footer from "@/components/Footer";
import PromoBanner from "@/components/PromoBanner";
import PromoPopup from "@/components/PromoPopup";
import EventNotification from "@/components/EventNotification";
import WhatsAppButton from "@/components/WhatsAppButton";
import AIChatAssistant from "@/components/AIChatAssistant";

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
        <SponsorSection />        {/* id="sponsor" — nav /#sponsor links here */}
        <PartnersSection />       {/* id="partner-packages" — nav /#partner-packages links here */}
        <PartnerForm />
        <OrganizersSection />
        <PaymentStatusLookup />
        <SocialSection />
      </main>
      <Footer />
      <WhatsAppButton />
      <AIChatAssistant />
    </div>
  );
};

export default Index;
