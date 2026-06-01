import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ArrowLeft, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import MpesaPayment from "./MpesaPayment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
  active: boolean;
}

interface PartnerPkg {
  id: string;
  name: string;
  price: number;
  description: string | null;
  perks: string[];
  display_order: number;
}

const cleanName = (name: string) => name.replace(/[\s.]+$/, "");

const PartnersSection = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerPackages, setPartnerPackages] = useState<PartnerPkg[]>([]);
  const [showPackages, setShowPackages] = useState(false);

  // Partner package payment state
  const [selectedPkg, setSelectedPkg] = useState<PartnerPkg | null>(null);
  const [pkgContact, setPkgContact] = useState({ name: "", email: "", phone: "", company: "" });
  const [pkgShowPayment, setPkgShowPayment] = useState(false);
  const [pkgInquiryId, setPkgInquiryId] = useState<string | null>(null);

  const pkgCanProceed =
    pkgContact.name.trim() !== "" &&
    pkgContact.phone.trim() !== "" &&
    pkgContact.company.trim() !== "";

  useEffect(() => {
    // Load active partners
    supabase
      .from("partners")
      .select("id, name, logo_url, website_url, display_order, active")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => setPartners((data as Partner[]) || []));

    // Load partner packages
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
            name: cleanName(p.name),
            perks: Array.isArray(p.perks) ? p.perks.filter(Boolean) : [],
          }))
        );
      });
  }, []);

  const handlePkgPaymentSubmitted = async (info: {
    mpesaCode: string;
    phone: string;
    source: "stk" | "manual";
  }) => {
    if (!selectedPkg) return;

    const { data: inqData, error: inqError } = await supabase
      .from("partner_inquiries")
      .insert({
        name: pkgContact.name,
        email: pkgContact.email,
        phone: pkgContact.phone || info.phone,
        company: pkgContact.company,
        proposal: `Package: ${selectedPkg.name} — KES ${selectedPkg.price.toLocaleString()}`,
        status: info.source === "stk" ? "paid" : "pending",
      })
      .select("id")
      .single();

    if (inqError) {
      toast.error("Failed to save inquiry: " + inqError.message);
      throw inqError;
    }

    await supabase.from("donations").insert({
      donor_name: `${pkgContact.name} (${pkgContact.company})`,
      donor_email: pkgContact.email || null,
      donor_phone: pkgContact.phone || info.phone || null,
      amount: selectedPkg.price,
      mpesa_code: info.mpesaCode || null,
      message: `Partnership Package: ${selectedPkg.name}`,
      status: info.source === "stk" ? "paid" : "pending",
      anonymous: false,
    });

    setPkgInquiryId(inqData?.id ?? null);
    toast.success("Partnership payment recorded — thank you!");
  };

  // Don't render section at all if no partners AND no packages
  if (partners.length === 0 && partnerPackages.length === 0) return null;

  return (
    <section id="partner-packages" className="py-16 bg-secondary/20">
      <div className="container mx-auto px-4">

        {/* ── SECTION HEADER ── */}
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
            Our <span className="text-gradient">Partners</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Organizations supporting the CSA Gala Dinner 2026
          </p>
        </motion.div>

        {/* ── PARTNERS GRID ── */}
        {partners.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 max-w-5xl mx-auto mb-10">
            {partners.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="glass rounded-2xl p-5 flex flex-col items-center text-center hover:border-primary/40 transition-all duration-300 group"
              >
                {/* Logo */}
                <div className="w-20 h-20 rounded-xl border border-border bg-white flex items-center justify-center mb-3 overflow-hidden group-hover:border-primary/40 transition-colors">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
                      <span className="text-2xl font-bold text-primary">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="font-display text-sm font-bold text-foreground mb-1 leading-tight">
                  {p.name}
                </h3>
                {p.website_url && (
                  <a
                    href={p.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
                  >
                    <ExternalLink size={11} /> Visit
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* ── PARTNERSHIP PACKAGES TOGGLE ── */}
        {partnerPackages.length > 0 && !pkgShowPayment && (
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setShowPackages((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all duration-200 font-semibold text-sm group"
            >
              <Briefcase size={16} />
              {showPackages ? "Hide" : "View"} Partnership Packages
              {showPackages
                ? <ChevronUp size={16} className="transition-transform" />
                : <ChevronDown size={16} className="transition-transform group-hover:translate-y-0.5" />
              }
            </button>

            <AnimatePresence>
              {showPackages && (
                <motion.div
                  key="packages"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-8">
                    <p className="text-center text-muted-foreground text-sm mb-6">
                      Partner with us and get visibility at the CSA Gala Dinner 2026
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {partnerPackages.map((pkg, i) => (
                        <motion.div
                          key={pkg.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
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
                          <ul className="space-y-2 flex-1 mb-6">
                            {pkg.perks.map((perk, j) => (
                              <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                {perk}
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => {
                              setSelectedPkg(pkg);
                              setPkgContact({ name: "", email: "", phone: "", company: "" });
                              setPkgInquiryId(null);
                              setPkgShowPayment(true);
                              setTimeout(() => {
                                document
                                  .getElementById("partner-packages")
                                  ?.scrollIntoView({ behavior: "smooth" });
                              }, 100);
                            }}
                            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 hover:scale-[1.02] transition-all duration-200"
                          >
                            Partner Now — KES {Number(pkg.price).toLocaleString()}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── PACKAGE PAYMENT FLOW ── */}
        {pkgShowPayment && (
          <div className="max-w-md mx-auto mt-6">
            <div className="glass rounded-2xl p-6">
              {pkgInquiryId ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Briefcase className="text-primary" size={32} />
                  </div>
                  <h3 className="font-display text-xl font-bold">Thank You!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your partnership payment for <strong>{selectedPkg?.name}</strong> has been recorded.
                    Our team will verify and be in touch shortly.
                  </p>
                  <button
                    onClick={() => {
                      setPkgShowPayment(false);
                      setSelectedPkg(null);
                      setPkgInquiryId(null);
                    }}
                    className="mt-2 px-6 py-2.5 rounded-lg border border-border text-sm text-foreground hover:border-primary hover:text-primary transition-all"
                  >
                    View Other Packages
                  </button>
                </div>
              ) : !pkgCanProceed || pkgContact.name === "" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setPkgShowPayment(false)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h3 className="font-display font-bold text-foreground">{selectedPkg?.name}</h3>
                      <p className="text-primary font-semibold text-sm">
                        KES {Number(selectedPkg?.price).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {[
                    { key: "name", label: "Your Full Name", type: "text" },
                    { key: "company", label: "Company / Institution", type: "text" },
                    { key: "phone", label: "Phone Number", type: "tel" },
                    { key: "email", label: "Email (optional)", type: "email" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="text-sm text-muted-foreground mb-1 block">{f.label}</label>
                      <input
                        type={f.type}
                        value={pkgContact[f.key as keyof typeof pkgContact]}
                        onChange={(e) =>
                          setPkgContact({ ...pkgContact, [f.key]: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  ))}

                  <button
                    onClick={() => setPkgContact((c) => ({ ...c }))}
                    disabled={!pkgCanProceed}
                    className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Proceed to Payment
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setPkgContact({ name: "", email: "", phone: "", company: "" })}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h3 className="font-display font-bold text-foreground">{selectedPkg?.name}</h3>
                      <p className="text-primary font-semibold text-sm">
                        KES {Number(selectedPkg?.price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <MpesaPayment
                    amount={selectedPkg?.price ?? 0}
                    onBack={() => setPkgContact({ name: "", email: "", phone: "", company: "" })}
                    onPaymentSubmitted={handlePkgPaymentSubmitted}
                  />
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default PartnersSection;
