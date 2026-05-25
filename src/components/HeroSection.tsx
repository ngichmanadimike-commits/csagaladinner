import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin, Award, FileCheck } from "lucide-react";
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

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground mb-10"
        >
          <span className="flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" /> {s.hero_date}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={16} className="text-primary" /> {s.hero_time}
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-primary" /> {s.hero_venue}
          </span>
        </motion.div>

        <CountdownTimer targetDate={s.hero_countdown} />

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4 mt-10"
        >
          <a href="#register"
            className="px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:scale-105 transition-all duration-300">
            Register Now
          </a>

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

          {/* Finalist Cert button — matches Awards Nomination style, shows when admin sets voting URL */}
          {votingUrl && (
            <a href={votingUrl} target="_blank" rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-lg border-2 border-primary/60 text-primary font-bold hover:bg-primary/10 transition-all duration-300 flex items-center gap-2">
              <FileCheck size={18} /> Finalist Cert
            </a>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
