import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, Linkedin, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z" />
  </svg>
);

const defaults = {
  social_x: "https://x.com/csa_tuk",
  social_linkedin: "https://www.linkedin.com/company/csatuk/",
  social_instagram: "https://www.instagram.com/csa_tuk",
  social_tiktok: "https://www.tiktok.com/@csa_tuk",
  contact_email: "csa@students.tukenya.ac.ke",
  contact_phone: "0758647130",
};

const SocialSection = () => {
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .then(({ data }) => {
        if (!data) return;
        const map = { ...defaults };
        for (const row of data) {
          if (row.key in map && row.value) (map as any)[row.key] = row.value;
        }
        setSettings(map);
      });
  }, []);

  const socials = [
    { label: "X (Twitter)", url: settings.social_x, icon: <XIcon /> },
    { label: "LinkedIn", url: settings.social_linkedin, icon: <Linkedin className="w-6 h-6" /> },
    { label: "Instagram", url: settings.social_instagram, icon: <Instagram className="w-6 h-6" /> },
    { label: "TikTok", url: settings.social_tiktok, icon: <TikTokIcon /> },
  ].filter((s) => s.url);

  return (
    <section id="connect" className="py-24">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Follow the <span className="text-gradient">Movement</span>
          </h2>
          <p className="text-muted-foreground mb-10">Stay connected with CSA</p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {socials.map((s, i) => (
            <motion.a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl w-20 h-20 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:glow-sm transition-all duration-300 group"
            >
              <span className="text-foreground group-hover:text-primary transition-colors">{s.icon}</span>
              <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">{s.label}</span>
            </motion.a>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
            <Mail size={16} /> {settings.contact_email}
          </a>
          <a href={`tel:${settings.contact_phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
            <Phone size={16} /> {settings.contact_phone}
          </a>
        </div>
      </div>
    </section>
  );
};

export default SocialSection;
