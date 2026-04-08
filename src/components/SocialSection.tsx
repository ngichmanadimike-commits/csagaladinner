import { motion } from "framer-motion";
import { Mail, Phone } from "lucide-react";

const socials = [
  { label: "X (Twitter)", url: "https://x.com/csa_tuk", icon: "𝕏" },
  { label: "LinkedIn", url: "https://www.linkedin.com/company/csatuk/", icon: "in" },
  { label: "Instagram", url: "https://www.instagram.com/csa_tuk?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw%3D%3D", icon: "📸" },
  { label: "TikTok", url: "https://www.tiktok.com/@csa_tuk?_r=1&_t=ZM-924WfzrLNAe", icon: "🎵" },
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
              <span className="text-2xl">{s.icon}</span>
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
