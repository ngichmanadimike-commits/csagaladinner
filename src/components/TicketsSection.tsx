import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Building2, User, UserPlus } from "lucide-react";
import RegistrationModal from "./RegistrationModal";

const packages = [
  { id: "individual", name: "Individual", price: 2650, icon: User, perks: ["1 Seat", "Dinner & Drinks", "Networking"], partial: true },
  { id: "group5", name: "Group of 5", price: 13000, icon: Users, perks: ["5 Seats", "Dinner & Drinks", "Networking"], partial: false },
  { id: "group10", name: "Group of 10", price: 25500, icon: UserPlus, perks: ["10 Seats", "Dinner & Drinks", "Priority Seating"], partial: false },
  { id: "corporate", name: "Corporate", price: 3500, icon: Building2, perks: ["1 Premium Seat", "Brand Visibility", "VIP Networking"], partial: true },
];

const TicketsSection = () => {
  const [selected, setSelected] = useState<typeof packages[0] | null>(null);

  return (
    <section id="tickets" className="py-24 relative">
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
