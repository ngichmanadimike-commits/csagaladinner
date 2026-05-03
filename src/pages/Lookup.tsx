import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaymentStatusLookup from "@/components/PaymentStatusLookup";

const Lookup = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-gradient mb-3">Booking & Payment Lookup</h1>
        <p className="text-muted-foreground">Enter your booking code, sponsor code, name, or email to view your payment status, balance, and ticket.</p>
      </div>
      <PaymentStatusLookup />
    </div>
    <Footer />
  </div>
);

export default Lookup;
