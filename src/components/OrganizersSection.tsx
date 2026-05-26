import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrganizerItem {
  id: string;
  section_key: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
}

/** Return up to 2 uppercase initials from a name string */
const getInitials = (name: string | null, fallback: string): string => {
  const source = name || fallback;
  const words = source.replace(/_/g, " ").trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "?";
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const OrganizersSection = () => {
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("id, section_key, title, body, image_url")
      .order("section_key")
      .then(({ data }) => setOrganizers((data as OrganizerItem[]) || []));
  }, []);

  if (organizers.length === 0) return null;

  return (
    <section id="organizers" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users2 className="text-primary" size={32} />
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Meet the <span className="text-gradient">Organizers</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The team making CSA Gala Dinner 2026 possible
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {organizers.map((org, i) => {
            const displayName = org.title || org.section_key.replace(/_/g, " ");
            const initials = getInitials(org.title, org.section_key);

            return (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl p-6 flex flex-col items-center text-center hover:border-primary/40 transition-all duration-300 group"
              >
                {org.image_url ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 mb-4 group-hover:border-primary/60 transition-colors">
                    <img
                      src={org.image_url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // If image fails to load, hide it and show initials fallback
                        const target = e.currentTarget;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="w-full h-full flex items-center justify-center text-primary font-bold text-xl">${initials}</span>`;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-4 group-hover:border-primary/40 transition-colors">
                    <span className="text-primary font-bold text-xl">{initials}</span>
                  </div>
                )}

                <h3 className="font-display font-bold text-foreground text-base leading-tight mb-1 capitalize">
                  {displayName}
                </h3>
                {org.body && org.body !== "Short bio" && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{org.body}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OrganizersSection;
