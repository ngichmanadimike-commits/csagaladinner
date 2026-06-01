import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, ExternalLink, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
}

const Partners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("partners")
      .select("id, name, logo_url, website_url, display_order")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        setPartners((data as Partner[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 text-center px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="text-primary" size={32} />
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
            Our <span className="text-gradient">Partners</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Organizations and institutions supporting the CSA Gala Dinner 2026
          </p>
        </motion.div>
      </section>

      {/* Partners grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">No partners listed yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl p-6 flex flex-col items-center text-center hover:border-primary/40 transition-all duration-300 group"
                >
                  {/* Logo */}
                  <div className="w-24 h-24 rounded-xl border border-border bg-white flex items-center justify-center mb-4 overflow-hidden group-hover:border-primary/40 transition-colors">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={p.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
                        <span className="text-2xl font-bold text-primary">{p.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">{p.name}</h3>
                  {p.website_url && (
                    <a
                      href={p.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors mt-auto pt-3"
                    >
                      <ExternalLink size={14} /> Visit Website
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Become a partner CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-10 text-center border border-primary/20"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Briefcase className="text-primary" size={28} />
            </div>
            <h2 className="font-display text-3xl font-bold mb-3">
              Become a <span className="text-gradient">Partner</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Get exclusive visibility at the CSA Gala Dinner 2026. Choose a package that works for you.
            </p>
            <a
              href="/#partner-packages"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 hover:scale-[1.02] transition-all duration-200 shadow-lg"
            >
              View Partnership Packages <ChevronRight size={18} />
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partners;
