import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ExternalLink, ChevronDown, ChevronUp, Star, Check } from "lucide-react";
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

interface PartnerPackage {
  id: string;
  name: string;
  price: number;
  description: string;
  perks: string[];
  display_order: number;
  active: boolean;
}

const Partners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [packages, setPackages] = useState<PartnerPackage[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showPackages, setShowPackages] = useState(false);
  const [packagesFetched, setPackagesFetched] = useState(false);

  useEffect(() => {
    supabase
      .from("partners")
      .select("id, name, logo_url, website_url, display_order")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        setPartners((data as Partner[]) || []);
        setLoadingPartners(false);
      });
  }, []);

  const handleTogglePackages = async () => {
    if (!packagesFetched) {
      setLoadingPackages(true);
      const { data } = await supabase
        .from("partner_packages")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });
      setPackages(
        ((data as PartnerPackage[]) || []).map((p) => ({
          ...p,
          perks: Array.isArray(p.perks) ? p.perks.filter(Boolean) : [],
        }))
      );
      setLoadingPackages(false);
      setPackagesFetched(true);
    }
    setShowPackages((v) => !v);
  };

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
          {loadingPartners ? (
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

          {/* Toggle Partner Packages Button */}
          <div className="flex justify-center mt-12">
            <button
              onClick={handleTogglePackages}
              disabled={loadingPackages}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-60"
            >
              {loadingPackages ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Loading Packages…
                </span>
              ) : (
                <>
                  <Briefcase size={18} />
                  {showPackages ? "Hide Partner Packages" : "View Partner Packages"}
                  {showPackages ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Partner Packages — revealed on button click */}
      <AnimatePresence>
        {showPackages && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden"
            id="partner-packages"
          >
            <div className="py-12 px-4 bg-muted/30">
              <div className="container mx-auto max-w-5xl">
                <div className="text-center mb-10">
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
                    Partnership <span className="text-gradient">Packages</span>
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Choose a package that gives your brand the right exposure at the CSA Gala Dinner 2026.
                  </p>
                </div>

                {packages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Star size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No packages available right now.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.map((pkg, i) => (
                      <motion.div
                        key={pkg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="glass rounded-2xl p-6 flex flex-col border border-border hover:border-primary/40 transition-all duration-300"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Star size={16} className="text-primary" />
                          <h3 className="font-display text-lg font-bold text-foreground">{pkg.name}</h3>
                        </div>
                        <div className="text-2xl font-bold text-primary mb-3">
                          KES {Number(pkg.price).toLocaleString()}
                        </div>
                        {pkg.description && (
                          <p className="text-muted-foreground text-sm mb-4">{pkg.description}</p>
                        )}
                        {pkg.perks.length > 0 && (
                          <ul className="space-y-2 mt-auto">
                            {pkg.perks.map((perk, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                                <Check size={14} className="text-primary mt-0.5 shrink-0" />
                                {perk}
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="text-center mt-10">
                  <a
                    href="/#partner-form"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all duration-200 shadow-lg"
                  >
                    Become a Partner <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default Partners;
