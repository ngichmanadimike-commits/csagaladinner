import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";

interface PartnerPackage {
  id: string;
  name: string;
  price: number;
  description: string;
  perks: string[];
  display_order: number;
  active: boolean;
}

const PartnersSection = () => {
  const = useState<PartnerPackage[]>([]);
  const = useState(true);[packages][setPackages][loading][setLoading]

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    const { data, error } = await supabase
     .from("partner_packages")
     .select("*")
     .eq("active", true)
     .order("display_order");

    if (!error && data) {
      setPackages(data as PartnerPackage[]);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            Loading partner packages...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="partners" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Partnership Packages
          </h2>

          <p className="text-muted-foreground max-w-2xl mx-auto">
            Partner with us and showcase your brand during the CSA Gala Dinner
            2026 event experience.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="glass rounded-2xl p-8 border-border hover:border-primary/40 transition-all duration-300"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">
                  {pkg.name}
                </h3>

                <p className="text-muted-foreground text-sm">
                  {pkg.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  KES {pkg.price.toLocaleString()}
                </span>
              </div>

              <div className="space-y-3 mb-8">
                {pkg.perks?.map((perk, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3"
                  >
                    <Check
                      className="text-primary mt-1 flex-shrink-0"
                      size={18}
                    />

                    <span className="text-sm text-foreground">
                      {perk}
                    </span>
                  </div>
                ))}
              </div>

              <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition">
                Become a Partner
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
