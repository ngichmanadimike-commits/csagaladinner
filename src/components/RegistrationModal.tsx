import { useState } from "react";
import { X, Tag, CheckCircle2 } from "lucide-react";
import MpesaPayment from "./MpesaPayment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { applyDiscount, formatDiscount } from "@/hooks/useActivePromotion";

interface Pkg {
  id: string;
  name: string;
  price: number;
  partial: boolean;
  installments?: number[];
  installment_mode?: "amount" | "percent";
}

const computeInstallments = (pkg: Pkg): number[] => {
  const list = pkg.installments || [];
  if (!list.length) return [];
  if (pkg.installment_mode === "percent") {
    return list.map((pct) => Math.round((Number(pct) / 100) * pkg.price));
  }
  return list.map((n) => Number(n));
};

const RegistrationModal = ({ pkg, onClose }: { pkg: Pkg; onClose: () => void }) => {
  const [step, setStep] = useState<"start" | "form" | "payment-choice" | "mpesa">("start");
  const [form, setForm] = useState({ name: "", email: "", phone: "", institution: "" });
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [installment, setInstallment] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [secureToken, setSecureToken] = useState<string | null>(null);
  const [existingCodeInput, setExistingCodeInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [existingReg, setExistingReg] = useState<any>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ id: string; code: string; discount_type: "percentage"|"fixed"; discount_value: number; title?: string } | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  const installments = computeInstallments(pkg);

  const baseAmount =
    paymentType === "full"
      ? pkg.price * quantity
      : (installments[installment] ?? pkg.price) * quantity;
  const amount = promoApplied ? applyDiscount(baseAmount, promoApplied) : baseAmount;
  const totalCost = pkg.price * quantity;

  const lookupExisting = async () => {
    const code = existingCodeInput.trim().toUpperCase();
    if (!code) return;
    setLookupLoading(true);
    const { data, error } = await supabase
      .from("registrations")
      .select("id, name, email, phone, institution, total_cost, total_paid, package_type, quantity, ticket_code, secure_ticket_token")
      .eq("ticket_code", code)
      .maybeSingle();
    setLookupLoading(false);
    if (error || !data) {
      toast.error("Booking code not found");
      return;
    }
    setExistingReg(data);
    setRegistrationId(data.id);
    setTicketCode(data.ticket_code);
    setSecureToken((data as any).secure_ticket_token);
    setForm({ name: data.name, email: data.email, phone: data.phone, institution: data.institution || "" });
    setQuantity(data.quantity || 1);
    setStep("payment-choice");
    toast.success("Code verified — payments will cumulate to this booking");
  };

  const validatePromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoChecking(true);
    const { data, error } = await supabase.rpc("validate_promo_code", { _code: code, _email: form.email || null });
    setPromoChecking(false);
    const res = data as any;
    if (error || !res?.valid) {
      setPromoApplied(null);
      toast.error(res?.reason ? `Promo rejected: ${res.reason.replace(/_/g," ")}` : "Invalid promo code");
      await supabase.from("promo_redemptions").insert({ code: code.toUpperCase(), email: form.email, status: "rejected", reason: res?.reason || "error" });
      return;
    }
    setPromoApplied({ id: res.id, code: res.code, discount_type: res.discount_type, discount_value: Number(res.discount_value), title: res.title });
    toast.success(`${res.title} applied — ${formatDiscount({ discount_type: res.discount_type, discount_value: Number(res.discount_value) })}`);
  };

  const ensureRegistration = async (): Promise<string | null> => {
    if (registrationId) return registrationId;
    const { data: ev } = await supabase
      .from("events")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("registrations")
      .insert({
        event_id: ev?.id ?? "00000000-0000-0000-0000-000000000000",
        name: form.name,
        email: form.email,
        phone: form.phone,
        institution: form.institution,
        package_type: pkg.id,
        quantity,
        payment_type: paymentType,
        total_cost: totalCost,
      })
      .select("id, ticket_code, secure_ticket_token")
      .single();
    if (error) {
      toast.error("Failed to save registration: " + error.message);
      return null;
    }
    setRegistrationId(data.id);
    setTicketCode(data.ticket_code);
    setSecureToken((data as any).secure_ticket_token);
    if (data.ticket_code) {
      toast.success(`Booking code: ${data.ticket_code} — keep it to track your payments`);
    }
    return data.id;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.institution) return;
    setStep("payment-choice");
  };

  const handlePaymentSubmitted = async (info: { mpesaCode: string; phone: string; source: "stk" | "manual" }) => {
    const regId = await ensureRegistration();
    if (!regId) return;
    const { error } = await supabase.from("payments").insert({
      registration_id: regId,
      amount,
      mpesa_code: info.mpesaCode,
      phone: info.phone,
      source: info.source,
      verified: info.source === "stk",
      verified_at: info.source === "stk" ? new Date().toISOString() : null,
    });
    if (error) {
      toast.error("Failed to save payment: " + error.message);
      throw error;
    }
    if (promoApplied) {
      await supabase.from("promo_redemptions").insert({
        promotion_id: promoApplied.id,
        code: promoApplied.code,
        registration_id: regId,
        email: form.email,
        phone: info.phone,
        status: "applied",
        discount_amount: baseAmount - amount,
      });
    }
    toast.success("Payment recorded — pending verification");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        <h3 className="font-display text-xl font-bold mb-1">{pkg.name} Ticket</h3>
        <p className="text-primary font-semibold mb-4">KES {pkg.price.toLocaleString()} each</p>
        {ticketCode && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 text-center">
            <p className="text-xs uppercase tracking-wider text-primary/80 mb-1">Your Booking Code</p>
            <p className="font-mono font-extrabold text-primary text-2xl tracking-widest">{ticketCode}</p>
            <p className="text-xs text-muted-foreground mt-2">Save this — use it on the lookup page to track payment & ticket status.</p>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(ticketCode); toast.success("Code copied"); }}
              className="mt-2 text-xs px-3 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary/30"
            >Copy code</button>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm text-muted-foreground">Quantity:</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg bg-muted border border-border text-foreground flex items-center justify-center hover:border-primary transition-colors"
            >
              −
            </button>
            <span className="w-10 text-center font-bold text-foreground">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg bg-muted border border-border text-foreground flex items-center justify-center hover:border-primary transition-colors"
            >
              +
            </button>
          </div>
          <span className="text-sm font-semibold text-primary ml-auto">
            Total: KES {(pkg.price * quantity).toLocaleString()}
          </span>
        </div>

        {step === "start" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Are you new, or continuing an existing booking?</p>
            <button
              onClick={() => setStep("form")}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold"
            >
              New booking
            </button>
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">Continuing? Enter your booking code so all payments cumulate to one ticket.</p>
              <div className="flex gap-2">
                <input
                  value={existingCodeInput}
                  onChange={(e) => setExistingCodeInput(e.target.value.toUpperCase())}
                  placeholder="CSA-XXXXXX"
                  className="flex-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-mono"
                />
                <button
                  onClick={lookupExisting}
                  disabled={!existingCodeInput || lookupLoading}
                  className="px-4 rounded-lg border border-primary text-primary text-sm font-semibold disabled:opacity-50"
                >
                  {lookupLoading ? "…" : "Continue"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {(["name", "email", "phone", "institution"] as const).map((field) => (
              <div key={field}>
                <label className="text-sm text-muted-foreground capitalize mb-1 block">
                  {field === "name" ? "Full Name" : field === "phone" ? "Phone Number" : field === "institution" ? "Institution" : "Email Address"}
                </label>
                <input
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  required
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform"
            >
              Proceed to Payment
            </button>
          </form>
        )}

        {step === "payment-choice" && (
          <div className="space-y-4">
            {existingReg && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
                <p className="font-semibold text-primary flex items-center gap-1"><CheckCircle2 size={14}/> Booking found</p>
                <p className="text-muted-foreground text-xs mt-1">Paid so far: KES {Number(existingReg.total_paid).toLocaleString()} of KES {Number(existingReg.total_cost).toLocaleString()}</p>
              </div>
            )}

            {/* Promo code */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Tag size={12}/> Promo code (optional)</label>
              {promoApplied ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary font-semibold">{promoApplied.code} — {formatDiscount(promoApplied)}</span>
                  <button onClick={() => setPromoApplied(null)} className="text-xs text-muted-foreground underline">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="SAVE20"
                    className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono"
                  />
                  <button onClick={validatePromo} disabled={!promoInput || promoChecking} className="px-3 rounded-lg border border-primary text-primary text-sm font-semibold disabled:opacity-50">
                    {promoChecking ? "…" : "Apply"}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setPaymentType("full"); setStep("mpesa"); }}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform"
              >
                Full Payment – KES {(promoApplied ? applyDiscount(pkg.price * quantity, promoApplied) : pkg.price * quantity).toLocaleString()}
                {promoApplied && <span className="block text-xs opacity-80 line-through">KES {(pkg.price * quantity).toLocaleString()}</span>}
              </button>

              {pkg.partial && (
                <>
                  <p className="text-sm text-muted-foreground text-center">or pay in installments:</p>
                  {installments.map((amt, i) => (
                    <button
                      key={i}
                      onClick={() => { setPaymentType("partial"); setInstallment(i); setStep("mpesa"); }}
                      className="w-full py-3 rounded-lg border border-border text-foreground font-semibold hover:border-primary hover:text-primary transition-all"
                    >
                      Installment {i + 1} – KES {(promoApplied ? applyDiscount(amt * quantity, promoApplied) : amt * quantity).toLocaleString()}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {step === "mpesa" && (
          <MpesaPayment
            amount={amount}
            onBack={() => setStep("payment-choice")}
            onPaymentSubmitted={handlePaymentSubmitted}
          />
        )}
      </div>
    </div>
  );
};

export default RegistrationModal;
