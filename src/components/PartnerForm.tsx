import { useState } from "react";
import { motion } from "framer-motion";
import { Handshake, FileText, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PartnerForm = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", proposal: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.company) return;
    setSubmitting(true);
    const { error } = await supabase.from("partner_inquiries").insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      proposal: form.proposal || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit: " + error.message);
      return;
    }
    toast.success("Inquiry submitted — we'll be in touch.");
    setSubmitted(true);
  };

  return (
    <section id="partner-form" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4 max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Handshake className="text-primary" size={32} />
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Become a <span className="text-gradient">Partner</span>
          </h2>
          <p className="text-muted-foreground">Join us in empowering the future of construction</p>
        </motion.div>

        <div className="glass rounded-2xl p-6">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: "name", label: "Full Name", type: "text" },
                { key: "email", label: "Email Address", type: "email" },
                { key: "phone", label: "Phone Number", type: "tel" },
                { key: "company", label: "Institution / Company Name", type: "text" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-sm text-muted-foreground mb-1 block">{f.label}</label>
                  <input
                    type={f.type}
                    required
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Partnership Proposal (optional)</label>
                <textarea
                  rows={3}
                  value={form.proposal}
                  onChange={(e) => setForm({ ...form, proposal: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] glow-primary transition-all duration-300 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Partnership Interest"}
              </button>
            </form>
          ) : (
            <div className="text-center py-6 space-y-4">
              <Handshake className="mx-auto text-primary" size={48} />
              <h4 className="font-display text-lg font-bold">Thank You!</h4>
              <p className="text-sm text-muted-foreground">
                Thank you for your interest in partnering with the CSA Gala Dinner 2026. Our team will review your details and reach out shortly.
              </p>
              <p className="text-sm text-muted-foreground">You can now view the official dinner proposal for more details.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <a
                  href="https://drive.google.com/file/d/1VxxT5PVtTGSyHMbS4G4RR5_-iRMVo8mE/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                >
                  <FileText size={16} /> View Dinner Proposal
                </a>
                <a
                  href="#"
                  className="px-6 py-2.5 rounded-lg border border-border text-foreground font-semibold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-all"
                >
                  <Home size={16} /> Return to Homepage
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PartnerForm;
