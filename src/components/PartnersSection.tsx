import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase } from "lucide-react";
import MpesaPayment from "./MpesaPayment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PartnerPkg {
  id: string;
  name: string;
  price: number;
  description: string | null;
  perks: string[];
  display_order: number;
}

const levels = [
  { label: "Half Sponsorship", multiplier: 0.5 },
  { label: "Three-Quarter Sponsorship", multiplier: 0.75 },
  { label: "Full Sponsorship", multiplier: 1 },
];

const COST_PER_STUDENT = 2000;

const PartnersSection = () => {
  // Partner packages from DB
  const [partnerPackages, setPartnerPackages] = useState<PartnerPkg[]>([]);

  // Student sponsorship state
  const [students, setStudents] = useState(1);
  const [levelIdx, setLevelIdx] = useState(2);
  const [showPayment, setShowPayment] = useState(false);
  const [sponsor, setSponsor] = useState({ name: "", email: "", phone: "" });
  const [sponsorCode, setSponsorCode] = useState<string | null>(null);

  const total = Math.round(students * COST_PER_STUDENT * levels[levelIdx].multiplier);

  // Load active partner packages on mount
  useEffect(() => {
    supabase
      .from("partner_packages")
      .select("id, name, price, description, perks, display_order")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Failed to load partner packages:", error.message);
        setPartnerPackages(
          ((data as PartnerPkg[]) || []).map((p) => ({
            ...p,
            perks: Array.isArray(p.perks) ? p.perks.filter(Boolean) : [],
          }))
        );
      });
  }, []);

  const handlePaymentSubmitted = async (info: {
    mpesaCode: string;
    phone: string;
    source: "stk" | "manual";
  }) => {
    const { data, error } = await supabase
      .from("sponsorships")
      .insert({
        sponsor_name: sponsor.name,
        sponsor_email: sponsor.email || null,
        sponsor_phone: sponsor.phone || info.phone,
        level: levels[levelIdx].label,
        num_students: students,
        amount: total,
        mpesa_code: info.mpesaCode || null,
        payment_method: info.source === "stk" ? "mpesa_stk" : "mpesa_manual",
        status: "pending",   // always pending — admin approves
        verified: false,
      })
      .select("sponsor_code")
      .single();

    if (error) {
      toast.error("Failed to save sponsorship: " + error.message);
      throw error;
    }
    if (data?.sponsor_code) {
      setSponsorCode(data.sponsor_code);
    }
    toast.success("Sponsorship recorded — thank you!");
  };

  const canProceed = sponsor.name.trim() !== "" && sponsor.phone.trim() !== "";

  return (
    <>
      {/* ── PARTNER PACKAGES (from DB) ── */}
      {partnerPackages.length > 0 && (
        <section id="partner-packages" className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="text-primary" size={32} />
              </div>
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
                Partnership <span className="text-gradient">Packages</span>
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Partner with us and get visibility at the CSA Gala Dinner 2026
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {partnerPackages.map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-6 flex flex-col hover:border-primary/50 hover:glow-sm transition-all duration-300 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Briefcase className="text-primary" size={20} />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-1">{pkg.name}</h3>
                  <p className="text-2xl font-bold text-primary mb-3">
                    KES {Number(pkg.price).toLocaleString()}
                  </p>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                  )}
                  <ul className="space-y-2 flex-1">
                    {pkg.perks.map((perk, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── STUDENT SPONSORSHIP ── */}
      <section id="sponsor" className="py-24">
        <div className="container mx-auto px-4 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="text-primary" size={32} />
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Sponsor a <span className="text-gradient">Student</span>
            </h2>
            <p className="text-muted-foreground">
              Help a fellow student attend the gala dinner
            </p>
          </motion.div>

          {!showPayment ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 space-y-6"
            >
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Number of Students
                </label>
                <input
                  type="number"
                  min={1}
                  value={students}
                  onChange={(e) =>
                    setStudents(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={sponsor.name}
                    onChange={(e) =>
                      setSponsor({ ...sponsor, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={sponsor.phone}
                    onChange={(e) =>
                      setSponsor({ ...sponsor, phone: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={sponsor.email}
                    onChange={(e) =>
                      setSponsor({ ...sponsor, email: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Sponsorship Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {levels.map((l, i) => (
                    <button
                      key={l.label}
                      onClick={() => setLevelIdx(i)}
                      className={`py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                        i === levelIdx
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {Math.round(l.multiplier * 100)}%
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {levels[levelIdx].label}
                </p>
              </div>

              <div className="glass rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Total Sponsorship Amount
                </p>
                <p className="font-display text-3xl font-bold text-primary mt-1">
                  KES {total.toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => canProceed && setShowPayment(true)}
                disabled={!canProceed}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] glow-primary transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
              >
                Proceed to Payment
              </button>
            </motion.div>
          ) : (
            <div className="glass rounded-2xl p-6">
              {sponsorCode && (
                <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-xs text-muted-foreground">
                    Your sponsor code — save this to track verification
                  </p>
                  <p className="font-mono font-bold text-primary text-lg">
                    {sponsorCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Payment is pending admin approval (3–6 hours).
                  </p>
                </div>
              )}
              <MpesaPayment
                amount={total}
                onBack={() => setShowPayment(false)}
                onPaymentSubmitted={handlePaymentSubmitted}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default PartnersSection;
