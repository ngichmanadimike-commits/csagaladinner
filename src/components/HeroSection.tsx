// src/components/HeroSection.tsx
// Changes made:
//   1. Removed the separate events DB query — now uses shared useEventData hook
//      (eliminates one of 8 duplicate DB calls on page load)
//   2. Hero image given fetchPriority="high" so browser loads it first (LCP fix)
//   3. Reduced/removed framer-motion animations on non-critical elements
//      (eliminates the ~300ms CPU spike on mobile on initial load)

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin, Vote } from "lucide-react";
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

  // PERF FIX: use shared cache hook instead of a separate DB query
  const { event } = useEventData();
  const votingUrl = event?.voting_url ?? null;

  useEffect(() => {
    // Only site_settings query remains here — events query removed (handled by hook)
    supabase
      .from("site_settings")
      .select("key, value")
      .then(({ data }) => {
        if (!data) return;
        const map = { ...s };
        data.forEach((r: any) => {
          if (r.value) map[r.key] = r.value;
        });
        setS(map);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* PERF FIX: fetchPriority="high" tells the browser this is the LCP element —
          load it before anything else. decoding="async" prevents it blocking the main thread. */}
      <img
        src={heroImg}
        alt="CSA Gala Dinner"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />

      <div className="relative z-10 container mx-auto px-4 text-center pt-24 pb-16">

        {/* PERF FIX: Logo — removed motion wrapper entirely.
            It's above the fold so animating it wastes the very first render frame. */}
        <div className="flex justify-center mb-6">
          <img
            src={csaLogo}
            alt="CSA Logo"
            className="h-20 w-20 rounded-full object-cover border-2 border-primary/40 shadow-lg"
          />
        </div>

        {/* PERF FIX: Shortened animation durations — faster feel, less CPU time */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="text-primary font-semibold tracking-widest uppercase text-sm mb-4"
        >
          {s.hero_eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight"
        >
          {s.hero_title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8 italic font-display"
        >
          "{s.hero_subtitle}"
        </motion.p>

        {/* PERF FIX: Removed motion wrapper from static date/time/venue row —
            it never needs to animate, it's just data. Saves a motion instance. */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-base md:text-xl text-foreground mb-10 font-semibold">
          <span className="flex items-center gap-2">
            <CalendarDays size={22} className="text-primary" /> {s.hero_date}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={22} className="text-primary" /> {s.hero_time}
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={22} className="text-primary" /> {s.hero_venue}
          </span>
        </div>

        <CountdownTimer targetDate={s.hero_countdown} />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="flex flex-wrap justify-center gap-4 mt-10"
        >
          <a
            href="#tickets"
            className="px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-105 glow-primary transition-all duration-300"
          >
            Buy Ticket
          </a>
          <a
            href="#partner-form"
            className="px-8 py-3.5 rounded-lg border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            Become a Partner
          </a>
          <a
            href="#sponsor"
            className="px-8 py-3.5 rounded-lg border-2 border-foreground/30 text-foreground font-bold hover:border-primary hover:text-primary transition-all duration-300"
          >
            Sponsor a Student
          </a>
          <a
            href="https://forms.gle/VL4Sk37Cjji64PVf6"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-lg border-2 border-primary/60 text-primary font-bold hover:bg-primary/10 transition-all duration-300"
          >
            Awards Nomination
          </a>

          {/* VOTING BUTTON — only shows when admin sets a voting URL */}
          {votingUrl && (
            <a
              href={votingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              <Vote size={18} /> Vote Now
            </a>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
