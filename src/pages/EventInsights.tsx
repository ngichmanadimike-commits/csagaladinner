import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Search, Mic2, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const EventInsights = () => {
  const [name, setName] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) setSearched(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 text-center">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-6xl font-bold mb-4"
          >
            Event <span className="text-gradient">Insights</span>
          </motion.h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Access your dinner materials and discover our distinguished speakers
          </p>
        </div>
      </section>

      {/* Dinner Materials */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="text-primary" size={28} />
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-bold mb-2">Dinner Materials</h2>
            <p className="text-muted-foreground text-sm">Enter your registered name to access your materials and payment status</p>
          </motion.div>

          <div className="glass rounded-2xl p-6">
            <form onSubmit={handleSearch} className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Enter name used during registration"
                value={name}
                onChange={(e) => { setName(e.target.value); setSearched(false); }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Search size={16} /> Search
              </button>
            </form>

            {searched && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-5 text-center space-y-3"
              >
                <p className="text-muted-foreground text-sm">
                  No records found for <span className="text-foreground font-semibold">"{name}"</span>.
                  Please ensure you use the exact name from your registration.
                </p>
                <p className="text-xs text-muted-foreground">
                  For assistance, contact: 0758647130
                </p>
              </motion.div>
            )}

            <div className="mt-6 border-t border-border/50 pt-6">
              <h4 className="font-display font-bold mb-3 text-sm text-muted-foreground uppercase tracking-wider">Downloadable Materials</h4>
              <div className="grid gap-3">
                {[
                  { label: "Event Program", desc: "Full program schedule" },
                  { label: "Dinner Documents", desc: "Official event documents" },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center justify-between glass rounded-lg px-4 py-3">
                    <div>
                      <p className="font-semibold text-sm">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">{doc.desc}</p>
                    </div>
                    <button className="text-primary hover:text-primary/80 transition-colors" title="Download">
                      <Download size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center italic">Materials will be available closer to the event date</p>
            </div>
          </div>
        </div>
      </section>

      {/* Speakers */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mic2 className="text-primary" size={28} />
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-bold mb-2">Speakers</h2>
            <p className="text-muted-foreground text-sm">Meet the voices shaping the future of construction</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Guest Speaker Placeholder */}
            <div className="glass rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mic2 className="text-primary" size={32} />
              </div>
              <h3 className="font-display text-xl font-bold mb-1">Guest Speaker</h3>
              <p className="text-muted-foreground text-sm">Stay tuned for our speaker announcements!</p>
            </div>

            {/* Other Speakers Placeholder */}
            <div className="glass rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="text-primary" size={32} />
              </div>
              <h3 className="font-display text-xl font-bold mb-1">Other Speakers</h3>
              <p className="text-muted-foreground text-sm">Stay tuned for our speaker announcements!</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default EventInsights;
