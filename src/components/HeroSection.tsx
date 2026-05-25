import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin, Award, FileCheck, MessageCircle } from "lucide-react";
import heroImg from "@/assets/hero-gala.jpg";
import csaLogo from "@/assets/white_logo.jpg";
import CountdownTimer from "./CountdownTimer";
import { supabase } from "@/integrations/supabase/client";
import { useEventData } from "@/hooks/useEventData";

const HeroSection = () => {
  const [s, setS] = useState<Record<string, string>>({
    hero_eyebrow: "Construction Students Association",
    hero_title: "CSA Gala Dinner 2026",
    hero_subtitle:
      "Laying the First Stone: Honoring the Past, Empowering the Present, and Inspiring the Future of Construction",
    hero_date: "05 June 2026",
    hero_time: "7:00 PM – 11:00 PM",
    hero_venue: "Utalii House",
    hero_countdown: "2026-06-05T19:00:00+03:00",
  });

  const { event } = useEventData();
  const votingUrl     = event?.voting_url     ?? null;
  const nominationUrl = event?.nomination_url ?? null;

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .then(({ data }) => {
        if (!data) return;
        const map = { ...s };
        data.forEach((r: any) => { if (r.value) map[r.key] = r.value; });
        setS(map);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Scroll to tickets section
    const ticketsSection = document.getElementById("tickets");
    if (ticketsSection) {
      ticketsSection.scrollIntoView({ behavior: "smooth" });
      // Click the first "Select Package" button after scrolling
      setTimeout(() => {
        const firstPackageBtn = ticketsSection.querySelector<HTMLButtonElement>("button");
        if (firstPackageBtn) firstPackageBtn.click();
      }, 600);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <img
        src={heroImg}
        alt="CSA Gala Dinner"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920} height={1080}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />

      {/* Floating WhatsApp Button */}
      <motion.a
        href="https://wa.me/254758647130?text=Hello,%20I%20am%20interested%20in%20booking%20a%20ticket%20for%20the%20CSA%20Gala%20Dinner"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-full shadow-2xl hover:bg-[#20bc5a] transition-colors duration-300 group"
        title="Chat with us on WhatsApp"
      >
        <MessageCircle size={24} className="flex-shrink-0" />
        <span className="text-sm font-semibold hidden sm:inline whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-500 ease-out">
          Book a Ticket
        </span>
      </motion.a>

      <div className="relative z-10 container mx-auto px-4 text-center pt-24 pb-16">

        <div className="flex justify-center mb-6">
          <img
            src={csaLogo}
            alt="CSA Logo"
            className="h-20 w-20 rounded-full object-cover border-2 border-primary/40 shadow-lg"
          />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="text-primary font-semibold text-sm uppercase tracking-widest mb-3"
        >
          {s.hero_eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-4 leading-tight"
        >
          {s.hero_title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto mb-8"
        >
          {s.hero_subtitle}
        </motion.p>

        {/* Event meta — Date, Time, Venue, Theme — enlarged and more visible */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-5 mb-10"
        >
          <span className="flex items-center gap-2.5 bg-background/40 backdrop-blur-sm border border-primary/30 rounded-xl px-5 py-2.5 text-foreground font-semibold text-base sm:text-lg shadow-sm">
            <CalendarDays size={20} className="text-primary flex-shrink-0" />
            {s.hero_date}
          </span>
          <span className="flex items-center gap-2.5 bg-background/40 backdrop-blur-sm border border-primary/30 rounded-xl px-5 py-2.5 text-foreground font-semibold text-base sm:text-lg shadow-sm">
            <Clock size={20} className="text-primary flex-shrink-0" />
            {s.hero_time}
          </span>
          <span className="flex items-center gap-2.5 bg-background/40 backdrop-blur-sm border border-primary/30 rounded-xl px-5 py-2.5 text-foreground font-semibold text-base sm:text-lg shadow-sm">
            <MapPin size={20} className="text-primary flex-shrink-0" />
            {s.hero_venue}
          </span>
        </motion.div>

        <CountdownTimer targetDate={s.hero_countdown} />

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4 mt-10"
        >
          {/* Register Now — scrolls to tickets and opens modal */}
          <button
            onClick={handleRegisterClick}
            className="px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:scale-105 transition-all duration-300"
          >
            Register Now
          </button>

          <a href="#sponsor"
            className="px-8 py-3.5 rounded-lg border-2 border-foreground/30 text-foreground font-bold hover:border-primary hover:text-primary transition-all duration-300">
            Sponsor a Student
          </a>

          {/* Nomination button — shows when admin sets nomination URL */}
          {nominationUrl && (
            <a href={nominationUrl} target="_blank" rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-lg border-2 border-primary/60 text-primary font-bold hover:bg-primary/10 transition-all duration-300 flex items-center gap-2">
              <Award size={18} /> Awards Nomination
            </a>
          )}

          {/* Finalist Cert button — premium gold styling to stand out as a special button */}
          {votingUrl && (
            <a href={votingUrl} target="_blank" rel="noopener noreferrer"
              className="relative px-8 py-3.5 rounded-lg font-bold flex items-center gap-2.5 overflow-hidden group transition-all duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #b8860b 0%, #ffd700 40%, #daa520 70%, #b8860b 100%)",
                color: "#1a1000",
                boxShadow: "0 0 18px rgba(255,215,0,0.45), 0 4px 15px rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,215,0,0.6)",
              }}
            >
              {/* Shimmer overlay */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                  animation: "none",
                }}
              />
              <FileCheck size={18} className="relative z-10 flex-shrink-0" />
              <span className="relative z-10 tracking-wide">✦ Finalist Cert</span>
            </a>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
