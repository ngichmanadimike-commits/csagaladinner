import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ExternalLink, ChevronRight, X, CheckCircle2, Loader2, Copy, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface Partner {
  id: string; name: string; logo_url: string | null; website_url: string | null; display_order: number;
}
interface PartnerPackage {
  id: string; name: string; price: number; description: string; perks: string[]; display_order: number; active: boolean;
}

const TILL = { method: "Buy Goods & Services", number: "5940488", accountName: "CSA GALA DINNER" };

const Partners = () => {
  const [partners, setPartners]     = useState<Partner[]>([]);
  const [packages, setPackages]     = useState<PartnerPackage[]>([]);
  const [loadingP, setLoadingP]     = useState(true);
  const [loadingPkg, setLoadingPkg] = useState(true);

  // Modal state
  const [payPkg, setPayPkg]         = useState<PartnerPackage | null>(null);
  const [step, setStep]             = useState<"form" | "done">("form");
  const [donorName, setDonorName]   = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [mpesaCode, setMpesaCode]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("partners").select("id,name,logo_url,website_url,display_order").eq("active",true).order("display_order",{ascending:true})
      .then(({data}) => { setPartners((data as Partner[])||[]); setLoadingP(false); });
    supabase.from("partner_packages").select("id,name,price,description,perks,display_order,active").eq("active",true).order("display_order",{ascending:true})
      .then(({data}) => { setPackages((data as PartnerPackage[])||[]); setLoadingPkg(false); });
  }, []);

  const openPayModal = (pkg: PartnerPackage) => {
    setPayPkg(pkg); setStep("form");
    setDonorName(""); setDonorEmail(""); setDonorPhone(""); setMpesaCode("");
  };
  const closePayModal = () => { setPayPkg(null); setStep("form"); };
  const copy = (t: string, l: string) => navigator.clipboard.writeText(t).then(() => toast.success(`${l} copied!`));

  // FIX 7: Partner payment → saved to donations table with package name in message
  const handleSubmit = async () => {
    if (!payPkg) return;
    if (!donorName.trim())  { toast.error("Enter your name");         return; }
    if (!donorEmail.trim()) { toast.error("Enter your email");        return; }
    if (!donorPhone.trim()) { toast.error("Enter your phone number"); return; }
    if (!mpesaCode.trim())  { toast.error("Enter M-Pesa code");       return; }
    const { data: dup } = await supabase.from("donations").select("id").eq("mpesa_code", mpesaCode.trim().toUpperCase()).maybeSingle();
    if (dup) { toast.error("This M-Pesa code has already been submitted."); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("donations").insert({
        donor_name: donorName.trim(), donor_email: donorEmail.trim(),
        donor_phone: donorPhone.trim(), amount: payPkg.price,
        mpesa_code: mpesaCode.trim().toUpperCase(),
        message: `Partnership Package: ${payPkg.name}`,
        anonymous: false,
      });
      if (error) { toast.error("Submission failed: " + error.message); return; }
      setStep("done");
      toast.success("Partnership payment submitted!");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 text-center px-4">
        <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
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

      {/* Current partners */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {loadingP ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({length:6}).map((_,i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-2xl"/>)}
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Briefcase size={48} className="mx-auto mb-4 opacity-30" /><p className="text-lg">No partners listed yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((p,i) => (
                <motion.div key={p.id} initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}}
                  className="glass rounded-2xl p-6 flex flex-col items-center text-center hover:border-primary/40 transition-all duration-300 group">
                  <div className="w-24 h-24 rounded-xl border border-border bg-white flex items-center justify-center mb-4 overflow-hidden group-hover:border-primary/40 transition-colors">
                    {p.logo_url
                      ? <img src={p.logo_url} alt={p.name} className="w-full h-full object-contain p-2"/>
                      : <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl"><span className="text-2xl font-bold text-primary">{p.name.charAt(0).toUpperCase()}</span></div>}
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">{p.name}</h3>
                  {p.website_url && (
                    <a href={p.website_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors mt-auto pt-3">
                      <ExternalLink size={14}/> Visit Website
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FIX 1: Partnership packages section with Payment button */}
      {(loadingPkg || packages.length > 0) && (
        <section id="partner-packages" className="py-20 px-4 bg-secondary/10">
          <div className="container mx-auto max-w-6xl">
            <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-center mb-14">
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-3">
                Partnership <span className="text-gradient">Packages</span>
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Choose a tier that fits your organisation. Each package gives your brand premium visibility at the CSA Gala Dinner 2026.
              </p>
            </motion.div>

            {loadingPkg ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({length:3}).map((_,i) => <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl"/>)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg,i) => (
                  <motion.div key={pkg.id} initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.1}}
                    className="glass rounded-2xl p-7 flex flex-col border border-border hover:border-primary/50 transition-all duration-300">
                    <h3 className="font-display text-xl font-bold text-foreground mb-1">{pkg.name}</h3>
                    {pkg.description && <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>}
                    <p className="text-3xl font-extrabold text-primary mb-5">KES {Number(pkg.price).toLocaleString()}</p>
                    {pkg.perks?.length > 0 && (
                      <ul className="space-y-2 mb-6 flex-1">
                        {pkg.perks.filter(Boolean).map((perk,j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                            <CheckCircle2 size={15} className="text-primary mt-0.5 flex-shrink-0"/>{perk}
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Payment button */}
                    <button onClick={() => openPayModal(pkg)}
                      className="w-full mt-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 hover:scale-[1.02] transition-all duration-200 shadow-md">
                      <Smartphone size={16}/> Pay Now — KES {Number(pkg.price).toLocaleString()}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Become a partner CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            className="glass rounded-3xl p-10 text-center border border-primary/20">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Briefcase className="text-primary" size={28}/>
            </div>
            <h2 className="font-display text-3xl font-bold mb-3">Become a <span className="text-gradient">Partner</span></h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">Get exclusive visibility at the CSA Gala Dinner 2026.</p>
            <a href="#partner-packages"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 hover:scale-[1.02] transition-all duration-200 shadow-lg">
              View Partnership Packages <ChevronRight size={18}/>
            </a>
          </motion.div>
        </div>
      </section>

      <Footer/>

      {/* PAYMENT MODAL */}
      <AnimatePresence>
        {payPkg && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              className="glass rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl max-h-[90vh] overflow-y-auto">

              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="font-display font-bold text-foreground text-lg">{payPkg.name}</h2>
                  <p className="text-2xl font-extrabold text-primary mt-0.5">KES {Number(payPkg.price).toLocaleString()}</p>
                </div>
                <button onClick={closePayModal} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16}/>
                </button>
              </div>

              {step === "form" ? (
                <>
                  {/* M-Pesa box */}
                  <div className="rounded-xl p-4 mb-5" style={{backgroundColor:"#0A2342",border:"2px solid #D4AF37"}}>
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone size={18} style={{color:"#D4AF37"}}/><h4 className="font-bold text-white">Pay via M-PESA</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Method</p><p className="text-white font-semibold">{TILL.method}</p></div>
                      <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Till Number</p>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg" style={{color:"#D4AF37"}}>{TILL.number}</p>
                          <button onClick={() => copy(TILL.number,"Till number")} className="text-white/40 hover:text-white"><Copy size={13}/></button>
                        </div>
                      </div>
                      <div><p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Account Name</p><p className="text-white font-semibold">{TILL.accountName}</p></div>
                      <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Amount</p>
                        <p className="font-bold text-lg" style={{color:"#D4AF37"}}>KES {Number(payPkg.price).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {([
                      {label:"Your Full Name / Organisation", value:donorName,  set:setDonorName,  type:"text",  ph:"e.g. Acme Ltd"},
                      {label:"Email Address",                  value:donorEmail, set:setDonorEmail, type:"email", ph:"you@company.com"},
                      {label:"Phone Number",                   value:donorPhone, set:setDonorPhone, type:"tel",   ph:"0712 345 678"},
                      {label:"M-Pesa Transaction Code",        value:mpesaCode,  set:(v:string)=>setMpesaCode(v.toUpperCase()), type:"text", ph:"e.g. SJK3H7T9XQ", mono:true},
                    ] as any[]).map((f:any) => (
                      <div key={f.label}>
                        <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
                        <input type={f.type} value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                          className={`w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50${f.mono?" font-mono tracking-widest":""}`}/>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-5">
                    <button onClick={closePayModal} className="flex-1 px-3 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={submitting||!donorName||!donorEmail||!donorPhone||!mpesaCode}
                      className="flex-1 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {submitting ? <Loader2 size={15} className="animate-spin mx-auto"/> : "Submit Payment"}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center mt-3">
                    Payment will be verified by our team within 3–6 hours. You will be contacted by email.
                  </p>
                </>
              ) : (
                <div className="text-center py-4 space-y-5">
                  <CheckCircle2 className="mx-auto text-emerald-400" size={56}/>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Payment Submitted!</h3>
                    <p className="text-muted-foreground text-sm">
                      Thank you for the <strong>{payPkg.name}</strong> package. Our team will verify and contact you within 3–6 hours.
                    </p>
                  </div>
                  <div className="bg-primary/10 rounded-xl py-4 px-5 text-sm text-muted-foreground">
                    KES {Number(payPkg.price).toLocaleString()} · M-Pesa: {mpesaCode}
                  </div>
                  <button onClick={closePayModal} className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Close</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Partners;
