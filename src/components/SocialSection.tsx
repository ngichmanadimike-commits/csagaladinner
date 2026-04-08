import { motion } from "framer-motion";
import { Mail, Phone, Linkedin, Instagram } from "lucide-react";

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

const socials = [
  { label: "X (Twitter)", url: "https://x.com/csa_tuk", icon: <XIcon /> },
  { label: "LinkedIn", url: "https://www.linkedin.com/company/csatuk/", icon: <Linkedin className="w-6 h-6" /> },
  { label: "Instagram", url: "https://www.instagram.com/csa_tuk?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw%3D%3D", icon: <Instagram className="w-6 h-6" /> },
  { label: "TikTok", url: "https://www.tiktok.com/@csa_tuk?_r=1&_t=ZM-924WfzrLNAe", icon: <TikTokIcon /> },
];

const SocialSection = () => {
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
          <a href="mailto:csa@students.tukenya.ac.ke" className="flex items-center gap-2 hover:text-primary transition-colors">
            <Mail size={16} /> csa@students.tukenya.ac.ke
          </a>
          <a href="tel:0758647130" className="flex items-center gap-2 hover:text-primary transition-colors">
            <Phone size={16} /> 0758647130
          </a>
        </div>
      </div>
    </section>
  );
};

export default SocialSection;
