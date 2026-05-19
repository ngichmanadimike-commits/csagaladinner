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
      {/* Fixed top navbar */}
      <Navbar />

      {/* Promo popup — shown once per session if a promo is active */}
      <PromoPopup />

      {/* Promo banner — sticky ribbon below navbar when a promo is live */}
      <PromoBanner />

      {/* Event notification banner (admin-managed) */}
      <EventNotification />

      {/* ── Page sections ── */}
      <main>
        {/* Hero / landing */}
        <HeroSection />

        {/* Ticket packages + registration modal */}
        <TicketsSection />

        {/* Sponsor a student */}
        <SponsorSection />

        {/* Corporate / individual partner form */}
        <PartnerForm />

        {/* Current partners showcase */}
        <PartnersSection />

        {/* Payment & booking lookup */}
        <PaymentStatusLookup />

        {/* Social links + contact */}
        <SocialSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
