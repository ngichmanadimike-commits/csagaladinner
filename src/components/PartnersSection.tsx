import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Handshake } from "lucide-react";

interface PartnerPackage {
  id: string;
  name: string;
  price: number;
  description: string | null;
  perks: string[];
  active: boolean;
  display_order: number;
}

const PartnersSection = () => {
  const [packages, setPackages] = useState<PartnerPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("partner_packages")
      .select("*")
      .eq("active", true)
      .order("display_order")
      .then(({ data }) => {
        setPackages((data as PartnerPackage[]) || []);
        setLoading(false);
      });
  }, []);

  if (loading) return null;
  if (packages.length === 0) return null;

  return (
    <section id="partners" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Handshake className="text-primary" size={32} />
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Partner <span className="text-gradient">Packages</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Partner with us and gain visibility among Kenya's future construction leaders
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 flex-col hover:border-primary/50 transition-all duration-300"
            >
              <h3 className="font-display text-xl font-bold mb-2">{pkg.name}</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold text-primary">
                  KES {Number(pkg.price).toLocaleString()}
                </span>
              </div>
              {pkg.description && (
                <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
              )}
              <ul className="space-y-2 flex-1">
                {(pkg.perks || []).filter(Boolean).map((perk, j) => (
                  <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
              
              <a
                href="#partner-form"
                className="mt-6 w-full py-3 rounded-lg bg-primary/10 text-primary font-semibold text-center hover:bg-primary hover:text-primary-foreground transition-all duration-300 block"
              >
                Get This Package
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
