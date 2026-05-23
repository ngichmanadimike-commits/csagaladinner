import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import TicketsSection from "@/components/TicketsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <TicketsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
