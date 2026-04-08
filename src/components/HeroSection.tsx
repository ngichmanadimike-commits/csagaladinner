import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import heroImg from "@/assets/hero-gala.jpg";
import CountdownTimer from "./CountdownTimer";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <img
        src={heroImg}
        alt="CSA Gala Dinner"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />

      <div className="relative z-10 container mx-auto px-4 text-center pt-24 pb-16">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-primary font-semibold tracking-widest uppercase text-sm mb-4"
        >
          Construction Students Association
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight"
        >
          CSA Gala Dinner <span className="text-gradient">2026</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8 italic font-display"
        >
          "Laying the First Stone: Honoring the Past, Empowering the Present, and Inspiring the Future of Construction"
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-6 md:gap-10 text-base md:text-xl text-foreground mb-10 font-semibold"
        >
          <span className="flex items-center gap-2"><CalendarDays size={22} className="text-primary" /> 05 June 2026</span>
          <span className="flex items-center gap-2"><Clock size={22} className="text-primary" /> 7:00 PM – 11:00 PM</span>
          <span className="flex items-center gap-2"><MapPin size={22} className="text-primary" /> Utalii House</span>
        </motion.div>

        <CountdownTimer targetDate="2026-06-05T19:00:00+03:00" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4 mt-10"
        >
          <a href="#tickets" className="px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-105 glow-primary transition-all duration-300">
            Buy Ticket
          </a>
          <a href="#partner-form" className="px-8 py-3.5 rounded-lg border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-300">
            Become a Partner
          </a>
          <a href="#sponsor" className="px-8 py-3.5 rounded-lg border-2 border-foreground/30 text-foreground font-bold hover:border-primary hover:text-primary transition-all duration-300">
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
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
