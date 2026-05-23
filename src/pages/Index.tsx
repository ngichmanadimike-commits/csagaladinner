import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import TicketsSection from "@/components/TicketsSection";
import SponsorSection from "@/components/SponsorSection";
import SocialSection from "@/components/SocialSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <TicketsSection />
        <SponsorSection />
        <SocialSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
