import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Building2, User, UserPlus } from "lucide-react";
import RegistrationModal from "./RegistrationModal";
import { supabase } from "@/integrations/supabase/client";

const iconFor = (id: string) =>
  id === "individual" ? User : id === "corporate" ? Building2 : id === "group10" ? UserPlus : Users;

interface PkgRow {
  id: string; name: string; price: number; icon: any; perks: string[]; partial: boolean;
  installments: number[]; installment_mode: "amount" | "percent";
}

const TicketsSection = () => {
  const [packages, setPackages] = useState<PkgRow[]>([]);
  const [selected, setSelected] = useState<PkgRow | null>(null);

  useEffect(() => {
    supabase.from("ticket_packages").select("*").eq("active", true).order("display_order").then(({ data }) => {
      const rows = (data || []).map((p: any) => ({
        id: p.slug, name: p.name, price: Number(p.price), icon: iconFor(p.slug),
        perks: Array.isArray(p.perks) ? p.perks : [],
        partial: !!p.partial_allowed,
        installments: Array.isArray(p.installments) ? p.installments.map(Number) : [],
        installment_mode: p.installment_mode || "amount",
      }));
      setPackages(rows);
    });
  }, []);

  return (
    <section id="tickets" className="py-24 relative bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Ticket <span className="text-gradient">Packages</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Choose the perfect package for your gala experience
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 flex flex-col hover:border-primary/50 hover:glow-sm transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <pkg.icon className="text-primary" size={24} />
              </div>
              <h3 className="font-display text-xl font-bold mb-1">{pkg.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold text-primary">KES {pkg.price.toLocaleString()}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {pkg.perks.map((p) => (
                  <li key={p} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {p}
                  </li>
                ))}
                {pkg.partial && (
                  <li className="text-sm text-primary/80 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Partial payment available
                  </li>
                )}
              </ul>
              <button
                onClick={() => setSelected(pkg)}
                className="w-full py-3 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                Select Package
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {selected && (
        <RegistrationModal
          pkg={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
};

export default TicketsSection;
