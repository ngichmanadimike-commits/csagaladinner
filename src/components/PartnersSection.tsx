import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import gbaLogo from "@/assets/gba_logo.png";
import decoLogo from "@/assets/deco_logo.png";
import iqskLogo from "@/assets/iqsk_logo.png";

const fallbackPartners = [
  { name: "Green Build Academy", url: "https://greenbuildhub.co.ke/", logo: gbaLogo },
  { name: "Deco Roofing Systems", url: "https://decoroofing.co.ke/", logo: decoLogo },
  { name: "IQSK", url: "https://iqskenya.org/", logo: iqskLogo },
];

const PartnersSection = () => {
  const [partners, setPartners] = useState<Array<{ name: string; url: string; logo: string }>>(fallbackPartners);

  useEffect(() => {
    supabase
      .from("partners")
      .select("name, website_url, logo_url")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPartners(data.map((p) => ({ name: p.name, url: p.website_url || "#", logo: p.logo_url || "" })));
        }
      });
  }, []);

  return (
    <section id="partners" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Our <span className="text-gradient">Partners</span>
          </h2>
          <p className="text-muted-foreground">Organizations supporting the future of construction</p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8 mb-12">
          {partners.map((p, i) => (
            <motion.a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl px-8 py-6 min-w-[200px] flex flex-col items-center justify-center hover:border-primary/50 hover:glow-sm transition-all duration-300 group"
            >
              <div className="w-28 h-28 flex items-center justify-center mb-3 rounded-xl bg-white/90 p-3">
                <img
                  src={p.logo}
                  alt={p.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="font-display text-lg font-bold group-hover:text-primary transition-colors text-center">{p.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Visit Website &rarr;</p>
            </motion.a>
          ))}
        </div>

        <div className="text-center">
          <a
            href="#partner-form"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            Become a Partner
          </a>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
