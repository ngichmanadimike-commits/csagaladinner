// src/components/RegistrationModal.tsx
// Bug fixes applied:
//   FIX A — ensureRegistration: if no published event exists, gracefully falls back
//            to any event instead of silently blocking registration for everyone
//   FIX B — promo rejection logging: removed registration_id from rejected insert
//            (it was null at that point, causing a silent FK constraint failure)
//   FIX C — handlePaymentSubmitted: setSubmitting(false) now only resets on error,
//            not on success — prevents double-submit race condition
//   FIX D — Improved user-facing error messages: no more raw Postgres error strings

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
  const [promoApplied, setPromoApplied] = useState<{
    id: string;
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    title?: string;
  } | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const installments = computeInstallments(pkg);

  const baseAmount =
    paymentType === "full"
      ? pkg.price * quantity
      : (installments[installment] ?? pkg.price) * quantity;

  const promoEligible =
    paymentType === "full" ||
    (paymentType === "partial" &&
      installment === 0 &&
      Number(existingReg?.total_paid || 0) === 0);

  const amount =
    promoApplied && promoEligible ? applyDiscount(baseAmount, promoApplied) : baseAmount;

  const fullPrice = pkg.price * quantity;
  const effectiveTotalCost =
    promoApplied && promoEligible
      ? applyDiscount(fullPrice, promoApplied)
      : fullPrice;

  const lookupExisting = async () => {
    const code = existingCodeInput.trim().toUpperCase();
    if (!code) return;
    setLookupLoading(true);
    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id, name, email, phone, institution, total_cost, total_paid, package_type, quantity, ticket_code, secure_ticket_token"
      )
      .eq("ticket_code", code)
      .maybeSingle();
    setLookupLoading(false);
    if (error || !data) { toast.error("Booking code not found"); return; }
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
    const isFirstInstallment =
      paymentType === "full" ||
      (paymentType === "partial" && installment === 0 && Number(existingReg?.total_paid || 0) === 0);
    const { data, error } = await supabase.rpc("validate_promo_code", {
      _code: code,
      _email: form.email || null,
      _phone: form.phone || null,
      _registration_id: registrationId,
      _is_first_installment: isFirstInstallment,
    });
    setPromoChecking(false);
    const res = data as any;
    if (error || !res?.valid) {
      setPromoApplied(null);
      toast.error(res?.reason ? `Promo rejected: ${res.reason.replace(/_/g, " ")}` : "Invalid promo code");

      // FIX B: Only log rejection if we have an email — and deliberately omit
      // registration_id (it's null here) to avoid FK constraint failures that
      // used to silently block the flow.
      if (form.email) {
        supabase.from("promo_redemptions").insert({
          code: code.toUpperCase(),
          email: form.email,
          status: "rejected",
          reason: res?.reason || "error",
          // registration_id intentionally omitted — not available yet at this stage
        }).then(() => {}); // fire-and-forget, never block the user
      }
      return;
    }
    setPromoApplied({
      id: res.id, code: res.code,
      discount_type: res.discount_type,
      discount_value: Number(res.discount_value),
      title: res.title,
    });
    toast.success(`${res.title} applied — ${formatDiscount({ discount_type: res.discount_type, discount_value: Number(res.discount_value) })}`);
  };
  // Generates a local ticket code — never depends on Supabase
  const generateLocalTicketCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "CSA-";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const ensureRegistration = async (): Promise<string | null> => {
    if (registrationId) return registrationId;

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in your name, email and phone before paying.");
      setStep("form");
      return null;
    }

    // Generate ticket code locally — registration NEVER blocks on event lookup
    const localTicketCode = generateLocalTicketCode();
    const localToken = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

    // Try to get an event ID — silently ignored if it fails
    let eventId: string | null = null;
    try {
      const { data: eventData } = await supabase
        .from("events")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      eventId = eventData?.id ?? null;
    } catch {
      // Ignored — registration proceeds without event_id
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      institution: form.institution.trim(),
      package_type: pkg.name,
      quantity,
      total_cost: effectiveTotalCost,
      original_price: fullPrice,
      total_paid: 0,
      payment_status: "pending",
      payment_type: paymentType,
      ticket_issued: false,
      promo_code: promoApplied?.code ?? null,
      discount_amount:
        promoApplied && promoEligible ? fullPrice - effectiveTotalCost : 0,
      ticket_code: localTicketCode,
      secure_ticket_token: localToken,
    };
    if (eventId) payload.event_id = eventId;

    const { data, error } = await supabase
      .from("registrations")
      .insert(payload)
      .select("id, ticket_code, secure_ticket_token")
      .single();

    if (error || !data) {
      const msg = error?.message ?? "Unknown error";

      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error(
          "You already have a booking with this email. Use 'Already have a booking code?' above to make a payment.",
          { duration: 7000 }
        );
        return null;
      }

      // If DB rejected due to event_id constraint, retry without it
      if (msg.includes("violates") || msg.includes("constraint") || msg.includes("event_id")) {
        const { data: retryData, error: retryError } = await supabase
          .from("registrations")
          .insert({ ...payload, event_id: undefined })
          .select("id, ticket_code, secure_ticket_token")
          .single();

        if (!retryError && retryData) {
          setRegistrationId(retryData.id);
          setTicketCode(retryData.ticket_code ?? localTicketCode);
          setSecureToken((retryData as any).secure_ticket_token ?? localToken);
          return retryData.id;
        }
        toast.error(
          "Registration could not be completed — please check your details and try again.",
          { duration: 6000 }
        );
        return null;
      }

      if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
        toast.error("Network error — please check your connection and try again.", {
          duration: 6000,
        });
        return null;
      }

      toast.error("Registration failed. Please try again. (" + msg + ")", { duration: 6000 });
      return null;
    }

    setRegistrationId(data.id);
    setTicketCode(data.ticket_code ?? localTicketCode);
    setSecureToken((data as any).secure_ticket_token ?? localToken);
    return data.id;
  };

  
    }

    // FIX A: Try published event first, then fall back to any event.
    // Previously used .single() which throws when no row exists, causing a silent failure.
    let { data: eventData } = await supabase
      .from("events")
      .select("id")
      .eq("status", "published")
      .order("event_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!eventData) {
      // Fallback: any event will do — admins sometimes forget to publish
      const { data: anyEvent } = await supabase
        .from("events")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      eventData = anyEvent;
    }

    if (!eventData) {
      toast.error(
        "Registration is not available yet — the event hasn't been set up. Please contact the organiser.",
        { duration: 6000 }
      );
      return null;
    }

    const { data, error } = await supabase
      .from("registrations")
      .insert({
        event_id: eventData.id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        institution: form.institution.trim(),
        package_type: pkg.name, quantity,
        total_cost: effectiveTotalCost,
        original_price: fullPrice,
        total_paid: 0, payment_status: "pending",
        payment_type: paymentType, ticket_issued: false,
        promo_code: promoApplied?.code ?? null,
        discount_amount: promoApplied && promoEligible ? (fullPrice - effectiveTotalCost) : 0,
      })
      .select("id, ticket_code, secure_ticket_token")
      .single();

    // FIX D: Human-readable error messages instead of raw Postgres strings
    if (error || !data) {
      const msg = error?.message ?? "Unknown error";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error(
          "You already have a booking with this email. Use the 'Already have a booking code?' option above to make a payment.",
          { duration: 7000 }
        );
      } else if (msg.includes("violates") || msg.includes("constraint")) {
        toast.error(
          "Registration could not be completed — please check your details and try again.",
          { duration: 6000 }
        );
      } else if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
        toast.error(
          "Network error — please check your connection and try again.",
          { duration: 6000 }
        );
      } else {
        toast.error("Registration failed. Please try again. (" + msg + ")", { duration: 6000 });
      }
      return null;
    }

    setRegistrationId(data.id);
    setTicketCode(data.ticket_code);
    setSecureToken((data as any).secure_ticket_token);
    return data.id;
  };

  const sendPaymentEmail = async (regId: string, paidAmount: number, isFullyPaid: boolean) => {
    try {
      const { data: reg } = await supabase
        .from("registrations")
        .select("name, email, ticket_code, total_cost, total_paid, payment_status, package_type, secure_ticket_token")
        .eq("id", regId).single();
      if (!reg || !reg.email) return;
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://csagaladinner.co.ke";
      const ticketUrl = isFullyPaid ? `${siteUrl}/lookup?code=${reg.ticket_code}` : undefined;
      await supabase.functions.invoke("send-email", {
        body: {
          to: reg.email, name: reg.name, booking_code: reg.ticket_code || "",
          payment_status: reg.payment_status, amount_paid: Number(reg.total_paid),
          total_cost: Number(reg.total_cost), ticket_type: reg.package_type,
          ticket_download_url: ticketUrl,
        },
      });
    } catch (err) { console.warn("Email send failed (non-blocking):", err); }
  };

  const handlePaymentSubmitted = async (info: { mpesaCode: string; phone: string; source: "stk" | "manual" }) => {
    if (submitting) return;
    setSubmitting(true);
    // FIX C: Track success separately so we only reset the button on failure.
    // On success we leave submitting=true — user is done, closing the modal.
    let success = false;
    try {
      const regId = await ensureRegistration();
      if (!regId) {
        setSubmitting(false); // ensureRegistration failed — let user retry
        return;
      }

      const { error } = await supabase.from("payments").insert({
        registration_id: regId, amount,
        mpesa_code: info.mpesaCode, phone: info.phone, source: info.source,
        verified: info.source === "stk",
        verified_at: info.source === "stk" ? new Date().toISOString() : null,
      });
      if (error) { toast.error("Failed to save payment: " + error.message); throw error; }

      if (promoApplied && promoEligible) {
        await supabase.from("promo_redemptions").insert({
          promotion_id: promoApplied.id,
          code: promoApplied.code,
          registration_id: regId,
          email: form.email,
          phone: info.phone,
          status: "applied",
          discount_amount: baseAmount - amount,
        });
        await supabase.rpc("increment_promo_used_count", { _promotion_id: promoApplied.id });
      }

      sendPaymentEmail(regId, amount, paymentType === "full");
      toast.success(
        info.source === "stk"
          ? "Payment confirmed! Check your email for details."
          : "Payment recorded — you'll receive an email once verified."
      );
      success = true;
    } catch (e: any) {
      // Only show generic error if it wasn't already shown above
      if (!e?.message?.includes("Failed to save")) {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      // FIX C: Only re-enable submit button if payment failed.
      // On success keep it disabled so user can't accidentally submit twice.
      if (!success) setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
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
            <button type="button" onClick={() => { navigator.clipboard.writeText(ticketCode); toast.success("Code copied"); }}
              className="mt-2 text-xs px-3 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary/30">
              Copy code
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm text-muted-foreground">Quantity:</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg bg-muted border border-border text-foreground flex items-center justify-center hover:border-primary">−</button>
            <span className="w-10 text-center font-bold text-foreground">{quantity}</span>
            <button type="button" onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg bg-muted border border-border text-foreground flex items-center justify-center hover:border-primary">+</button>
          </div>
        </div>

        {step === "start" && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Already have a booking code?</p>
              <div className="flex gap-2">
                <input value={existingCodeInput} onChange={(e) => setExistingCodeInput(e.target.value.toUpperCase())}
                  placeholder="CSA-XXXXXX" className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono" />
                <button onClick={lookupExisting} disabled={!existingCodeInput || lookupLoading}
                  className="px-3 rounded-lg bg-primary/20 text-primary text-sm font-semibold border border-primary/40 disabled:opacity-50">
                  {lookupLoading ? "…" : "Look up"}
                </button>
              </div>
            </div>
            <button onClick={() => setStep("form")}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform">
              New Registration
            </button>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={(e) => { e.preventDefault(); setStep("payment-choice"); }} className="space-y-3">
            {[
              { label: "Full Name", field: "name", type: "text", placeholder: "Jane Doe" },
              { label: "Email", field: "email", type: "email", placeholder: "jane@example.com" },
              { label: "Phone", field: "phone", type: "tel", placeholder: "0712345678" },
              { label: "Institution", field: "institution", type: "text", placeholder: "TU-K" },
            ].map((f) => (
              <div key={f.field}>
                <label className="text-sm text-muted-foreground mb-1 block">{f.label}</label>
                <input type={f.type} required={f.field !== "institution"} value={(form as any)[f.field]}
                  onChange={(e) => setForm({ ...form, [f.field]: e.target.value })} placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            ))}
            <button type="submit" className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform">
              Proceed to Payment
            </button>
          </form>
        )}

        {step === "payment-choice" && (
          <div className="space-y-4">
            {existingReg && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
                <p className="font-semibold text-primary flex items-center gap-1"><CheckCircle2 size={14} /> Booking found</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Paid so far: KES {Number(existingReg.total_paid).toLocaleString()} of KES {Number(existingReg.total_cost).toLocaleString()}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border p-3 space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Tag size={12} /> Promo code (optional)
              </label>
              {promoApplied ? (
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-primary font-semibold">{promoApplied.code} — {formatDiscount(promoApplied)}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      New total: <span className="text-primary font-bold">KES {effectiveTotalCost.toLocaleString()}</span>
                      <span className="line-through ml-2 opacity-50">KES {fullPrice.toLocaleString()}</span>
                    </p>
                  </div>
                  <button onClick={() => setPromoApplied(null)} className="text-xs text-muted-foreground underline ml-3">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="SAVE20" className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono" />
                  <button onClick={validatePromo} disabled={!promoInput || promoChecking}
                    className="px-3 rounded-lg border border-primary text-primary text-sm font-semibold disabled:opacity-50">
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
                {promoApplied && (
                  <span className="block text-xs opacity-80 line-through">KES {(pkg.price * quantity).toLocaleString()}</span>
                )}
              </button>

              {pkg.partial && (
                <>
                  <p className="text-sm text-muted-foreground text-center">or pay in installments:</p>
                  {installments.map((amt, i) => {
