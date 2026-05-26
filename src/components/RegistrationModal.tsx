// src/components/RegistrationModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ArrowLeft, Smartphone, Copy, Lock, Search } from "lucide-react";

interface Package {
  id: string;
  name: string;
  price: number;
  max_tickets?: number;
  perks: string[];
  partial_allowed?: boolean;
  installments?: number[];
  installment_mode?: "amount" | "percent";
}

interface RegistrationModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  pkg?: Package | null;
  onClose?: () => void;
  selectedPackage?: Package | null;
}

const TILL = {
  method: "Buy Goods (Till)",
  number: "6776606",
  accountName: "Victor Mwoni Mutemi",
  contact: "0758647130",
};

const RegistrationModal = ({
  open, onOpenChange, pkg, onClose, selectedPackage: _selectedPackage,
}: RegistrationModalProps) => {
  const selectedPackage = pkg ?? _selectedPackage ?? null;
  const isOpen = open !== undefined ? open : !!selectedPackage;

  const handleOpenChange = (v: boolean) => {
    onOpenChange?.(v);
    if (!v) onClose?.();
  };

  // mode: "new" = fresh registration; "returning" = look up existing booking
  const [mode, setMode] = useState<"new" | "returning">("new");

  // step: register → payment → done
  const [step, setStep] = useState<"register" | "payment" | "done">("register");

  // registration fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<any>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // returning-user lookup
  const [bookingCodeQuery, setBookingCodeQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [existingReg, setExistingReg] = useState<any>(null);

  // package data (loaded from DB for allow_custom_amount, etc.)
  const [pkgData, setPkgData] = useState<any>(null);
  const [selectedInstalment, setSelectedInstalment] = useState<number | null>(null);

  // post-registration
  const [ticketCode, setTicketCode] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [finalAmount, setFinalAmount] = useState(0);

  // payment fields
  const [mpesaCode, setMpesaCode] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  const totalCost = selectedPackage ? selectedPackage.price * quantity : 0;
  const discountAmount = promoCode
    ? promoCode.discount_type === "percentage"
      ? Math.round(totalCost * (promoCode.discount_value / 100))
      : Math.min(promoCode.discount_value, totalCost)
    : 0;
  const displayFinalCost = Math.max(0, totalCost - discountAmount);

  useEffect(() => {
    if (!selectedPackage?.id) return;
    supabase
      .from("ticket_packages")
      .select("partial_allowed, installments, installment_mode, price, allow_custom_amount")
      .eq("id", selectedPackage.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setPkgData(data); });
  }, [selectedPackage?.id]);

  useEffect(() => {
    if (!isOpen) {
      setMode("new");
      setStep("register");
      setName(""); setEmail(""); setPhone(""); setQuantity(1);
      setPromoInput(""); setPromoCode(null);
      setTicketCode(""); setRegistrationId(""); setFinalAmount(0);
      setMpesaCode(""); setPayerPhone(""); setPayAmount("");
      setSelectedInstalment(null); setPkgData(null);
      setBookingCodeQuery(""); setExistingReg(null);
    }
  }, [isOpen]);

  // Compute instalment options (promo discount applied proportionally)
  const getInstalments = (baseAmount?: number): number[] => {
    const src = pkgData ?? selectedPackage;
    if (!src?.partial_allowed) return [];
    const raw: number[] = Array.isArray(src.installments) ? src.installments : [];
    if (!raw.length) return [];

    const fullPrice = Number(src.price ?? selectedPackage?.price ?? 0);
    const discountedAmount = baseAmount ?? displayFinalCost;
    const ratio = fullPrice > 0 ? discountedAmount / fullPrice : 1;

    if ((src.installment_mode ?? "amount") === "percent") {
      return raw.map((pct: number) => Math.round((pct / 100) * discountedAmount));
    }
    // Fixed amounts: scale proportionally if promo applied
    return raw.map((n: number) => Math.round(Number(n) * ratio));
  };

  const instalments = getInstalments();
  const allowCustomAmount = pkgData?.allow_custom_amount ?? true;

  // For returning user: get remaining balance instalments
  const getReturningInstalments = (): number[] => {
    if (!existingReg || !pkgData) return [];
    const remaining = Number(existingReg.total_cost) - Number(existingReg.total_paid);
    if (remaining <= 0) return [];
    return getInstalments(Number(existingReg.total_cost));
  };

  const validatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoCode(null);
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("id, code, discount_type, discount_value, max_uses, used_count, expires_at, start_at, is_active, deleted_at")
        .eq("code", promoInput.toUpperCase())
        .eq("is_active", true)
        .is("deleted_at", null)
        .single();
      if (error || !data) { toast.error("Invalid promo code"); return; }
      if (new Date(data.expires_at) < new Date()) { toast.error("Promo code has expired"); return; }
      if (new Date(data.start_at) > new Date()) { toast.error("Promo not active yet"); return; }
      if (data.max_uses !== null && data.used_count >= data.max_uses) { toast.error("Promo limit reached"); return; }
      setPromoCode(data);
      toast.success(data.discount_type === "percentage"
        ? `${data.discount_value}% discount applied!`
        : `KES ${data.discount_value} discount applied!`);
    } catch { toast.error("Could not validate promo code"); }
    finally { setPromoChecking(false); }
  };

  const handleLookupBookingCode = async () => {
    if (!bookingCodeQuery.trim()) return;
    setLookupLoading(true);
    setExistingReg(null);
    try {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, name, email, phone, package_type, total_cost, total_paid, payment_status, ticket_issued, ticket_code, promo_code, discount_amount")
        .eq("ticket_code", bookingCodeQuery.trim().toUpperCase())
        .maybeSingle();

      if (error || !data) {
        toast.error("Booking code not found. Check the code and try again.");
        return;
      }

      const remaining = Number(data.total_cost) - Number(data.total_paid);

      if (data.payment_status === "paid") {
        toast.success("This booking is fully paid! You can download your ticket.");
      } else if (remaining <= 0) {
        toast.success("Fully paid!");
      } else {
        toast.success(`Found! Remaining balance: KES ${remaining.toLocaleString()}`);
      }

      setExistingReg(data);
      setRegistrationId(data.id);
      setFinalAmount(remaining > 0 ? remaining : 0);
      setPayAmount(String(remaining > 0 ? remaining : 0));
      setPayerPhone(data.phone);

      if (remaining > 0) {
        setStep("payment");
      }
    } catch {
      toast.error("Lookup failed. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    setSubmitting(true);
    try {
      const { data: eventData, error: eventErr } = await supabase
        .from("events").select("id").order("created_at", { ascending: false }).limit(1).single();
      if (eventErr || !eventData) { toast.error("Event not found. Please try again."); return; }

      const code = `CSA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const amount = Math.max(0, totalCost - discountAmount);

      const { data: regData, error: regErr } = await supabase
        .from("registrations")
        .insert({
          name, email, phone,
          event_id: eventData.id,
          package_type: selectedPackage.id,
          quantity,
          total_cost: amount,
          total_paid: 0,
          original_price: totalCost,
          discount_amount: discountAmount,
          promo_code: promoCode?.code || null,
          payment_status: "pending",
          payment_type: "full",
          ticket_code: code,
          ticket_issued: false,
        })
        .select("id").single();

      if (regErr) { toast.error("Registration failed: " + regErr.message); return; }

      if (promoCode) {
        await supabase.from("promo_redemptions").insert({
          code: promoCode.code, promotion_id: promoCode.id,
          email, phone, discount_amount: discountAmount, status: "redeemed",
          registration_id: regData.id,
        });
      }

      setTicketCode(code);
      setRegistrationId(regData.id);
      setFinalAmount(amount);
      setPayerPhone(phone);
      setPayAmount(String(amount));
      setStep("payment");
    } catch { toast.error("Unexpected error. Please try again."); }
    finally { setSubmitting(false); }
  };

  const handleSelectInstalment = (amt: number) => {
    setSelectedInstalment(amt);
    setPayAmount(String(amt));
  };

  const handlePayment = async () => {
    const amountToPay = Number(payAmount);
    if (!mpesaCode.trim()) { toast.error("Enter your M-Pesa transaction code"); return; }
    if (!amountToPay || amountToPay <= 0) { toast.error("Enter a valid amount"); return; }

    const regId = registrationId || existingReg?.id;
    if (!regId) { toast.error("Registration not found"); return; }

    setPaySubmitting(true);
    try {
      // Check for duplicate M-Pesa code
      const { data: dupCheck } = await supabase
        .from("payments")
        .select("id")
        .eq("mpesa_code", mpesaCode.trim().toUpperCase())
        .maybeSingle();
      if (dupCheck) {
        toast.error("This M-Pesa code has already been submitted. Contact support if this is an error.");
        return;
      }

      const { error } = await supabase.from("payments").insert({
        registration_id: regId,
        amount: amountToPay,
        mpesa_code: mpesaCode.trim().toUpperCase(),
        payment_method: "mpesa_manual",
        phone: payerPhone,
        verified: false,
        source: "manual",
      });
      if (error) { toast.error("Could not save payment: " + error.message); return; }

      // Update total_paid optimistically (admin will confirm)
      const currentPaid = Number(existingReg?.total_paid ?? 0);
      await supabase.from("registrations")
        .update({ total_paid: currentPaid + amountToPay })
        .eq("id", regId);

      const revealCode = ticketCode || existingReg?.ticket_code || "";
      setTicketCode(revealCode);
      setStep("done");
      toast.success("Payment submitted! Waiting for admin approval.");
    } catch { toast.error("Unexpected error. Please try again."); }
    finally { setPaySubmitting(false); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  if (!selectedPackage) return null;

  const returningInstalments = getReturningInstalments();
  const remainingBalance = existingReg
    ? Math.max(0, Number(existingReg.total_cost) - Number(existingReg.total_paid))
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "register" && `Register — ${selectedPackage.name}`}
            {step === "payment" && (mode === "returning" ? "Pay Remaining Balance" : "Make Payment")}
            {step === "done" && "Payment Submitted!"}
          </DialogTitle>
          <DialogDescription>CSA Gala Dinner 2026</DialogDescription>
        </DialogHeader>

        {/* Mode selector (only on step=register) */}
        {step === "register" && (
          <div className="flex rounded-lg overflow-hidden border border-border mb-2">
            <button onClick={() => setMode("new")}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === "new" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              New Registration
            </button>
            <button onClick={() => setMode("returning")}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === "returning" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              I Have a Booking Code
            </button>
          </div>
        )}

        {/* ── RETURNING USER: LOOKUP ── */}
        {step === "register" && mode === "returning" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter your booking code to continue paying your balance.</p>
            <div>
              <Label htmlFor="bc-query">Your Booking Code</Label>
              <div className="flex gap-2 mt-1">
                <Input id="bc-query" value={bookingCodeQuery}
                  onChange={e => setBookingCodeQuery(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleLookupBookingCode()}
                  placeholder="e.g. CSA-XXXXXXXXX"
                  className="font-mono tracking-widest" />
                <Button type="button" onClick={handleLookupBookingCode} disabled={lookupLoading || !bookingCodeQuery.trim()}>
                  {lookupLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                </Button>
              </div>
            </div>

            {existingReg && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="font-semibold text-foreground">{existingReg.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="glass rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold">KES {Number(existingReg.total_cost).toLocaleString()}</p>
                  </div>
                  <div className="glass rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-bold text-emerald-400">KES {Number(existingReg.total_paid).toLocaleString()}</p>
                  </div>
                  <div className="glass rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className={`font-bold ${remainingBalance > 0 ? "text-orange-400" : "text-emerald-400"}`}>
                      KES {remainingBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
                {existingReg.payment_status === "paid" ? (
                  <div className="text-center space-y-2">
                    <p className="text-emerald-400 font-semibold">✅ Fully paid — your ticket is ready!</p>
                    {existingReg.ticket_code && (
                      <a href={`/ticket/${existingReg.ticket_code}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-400 text-sm">
                        View & Download Ticket
                      </a>
                    )}
                  </div>
                ) : remainingBalance > 0 ? (
                  <Button className="w-full" onClick={() => setStep("payment")}>
                    Pay Balance — KES {remainingBalance.toLocaleString()}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: NEW REGISTER ── */}
        {step === "register" && mode === "new" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="r-name">Full Name</Label>
              <Input id="r-name" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" />
            </div>
            <div>
              <Label htmlFor="r-email">Email</Label>
              <Input id="r-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@example.com" />
            </div>
            <div>
              <Label htmlFor="r-phone">Phone Number</Label>
              <Input id="r-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="0712 345 678" />
            </div>
            <div>
              <Label htmlFor="r-qty">Number of Tickets</Label>
              <Input id="r-qty" type="number" min="1" max={selectedPackage.max_tickets ?? 10}
                value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} required />
            </div>
            <div>
              <Label htmlFor="r-promo">Promo Code (optional)</Label>
              <div className="flex gap-2">
                <Input id="r-promo" value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE" />
                <button type="button" onClick={validatePromo}
                  disabled={!promoInput || promoChecking}
                  className="px-3 rounded-lg border border-primary text-primary hover:bg-primary/10 disabled:opacity-50 text-sm">
                  {promoChecking ? <Loader2 size={15} className="animate-spin" /> : "Apply"}
                </button>
              </div>
              {promoCode && (
                <p className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  {promoCode.discount_type === "percentage"
                    ? `${promoCode.discount_value}% off`
                    : `KES ${promoCode.discount_value} off`}
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>KES {totalCost.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>– KES {discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total to Pay</span>
                <span className="text-primary">KES {displayFinalCost.toLocaleString()}</span>
              </div>
            </div>

            {instalments.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm">
                <p className="font-semibold text-foreground mb-1">Instalment options available</p>
                <p className="text-xs text-muted-foreground">
                  You can pay in instalments on the next step.
                  {discountAmount > 0 && " Promo discount is applied proportionally to each instalment."}
                </p>
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting
                ? <><Loader2 size={15} className="animate-spin mr-2" />Registering...</>
                : "Register & Proceed to Payment"}
            </Button>
          </form>
        )}

        {/* ── STEP 2: PAYMENT ── */}
        {step === "payment" && (
          <div className="space-y-5">
            {mode !== "returning" && (
              <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-3">
                <Lock size={20} className="text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Your booking code is ready</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Complete payment below — your code will appear after you submit.</p>
                </div>
              </div>
            )}

            {mode === "returning" && existingReg && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-foreground">{existingReg.name} — Paying balance</p>
                <p className="text-muted-foreground">Remaining: <strong className="text-orange-400">KES {remainingBalance.toLocaleString()}</strong></p>
              </div>
            )}

            <div className="rounded-xl p-4" style={{ backgroundColor: "#0A2342", border: "2px solid #D4AF37" }}>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone size={18} style={{ color: "#D4AF37" }} />
                <h4 className="font-bold text-white">Pay via M-PESA</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Method</p>
                  <p className="text-white font-semibold">{TILL.method}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Till Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-lg" style={{ color: "#D4AF37" }}>{TILL.number}</p>
                    <button onClick={() => copyToClipboard(TILL.number, "Till number")}
                      className="text-white/40 hover:text-white"><Copy size={13} /></button>
                  </div>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Account Name</p>
                  <p className="text-white font-semibold">{TILL.accountName}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">
                    Amount to Pay
                  </p>
                  <p className="font-bold text-lg" style={{ color: "#D4AF37" }}>
                    KES {(Number(payAmount) > 0 ? Number(payAmount) : (mode === "returning" ? remainingBalance : finalAmount)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Instalment selector */}
            {(mode === "returning" ? returningInstalments : instalments).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {mode === "returning" ? "Pay an instalment:" : "Pay an instalment instead:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(mode === "returning" ? returningInstalments : instalments).map((amt, idx) => (
                    <button key={idx} onClick={() => handleSelectInstalment(amt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                        selectedInstalment === amt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border hover:border-primary"
                      }`}>
                      KES {amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSelectedInstalment(null);
                      setPayAmount(String(mode === "returning" ? remainingBalance : finalAmount));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                      selectedInstalment === null
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-foreground border-border hover:border-primary"
                    }`}>
                    Full: KES {(Number(payAmount) > 0 ? Number(payAmount) : (mode === "returning" ? remainingBalance : finalAmount)).toLocaleString()}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="p-amount">Amount You Are Paying (KES)</Label>
                <Input
                  id="p-amount"
                  type="number"
                  min="1"
                  max={mode === "returning" ? remainingBalance : finalAmount}
                  value={payAmount}
                  onChange={e => {
                    if (allowCustomAmount) {
                      setPayAmount(e.target.value);
                      setSelectedInstalment(null);
                    }
                  }}
                  readOnly={!allowCustomAmount && instalments.length > 0}
                  placeholder={`e.g. ${finalAmount}`}
                  className={`mt-1 font-mono ${!allowCustomAmount ? "opacity-75 cursor-not-allowed" : ""}`}
                />
                {!allowCustomAmount && instalments.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Select one of the instalment options above.</p>
                )}
                {allowCustomAmount && Number(payAmount) < (mode === "returning" ? remainingBalance : finalAmount) && Number(payAmount) > 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Partial: KES {Number(payAmount).toLocaleString()} — remaining KES {((mode === "returning" ? remainingBalance : finalAmount) - Number(payAmount)).toLocaleString()} will be due.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="p-phone">Your Phone Number</Label>
                <Input id="p-phone" type="tel" value={payerPhone}
                  onChange={e => setPayerPhone(e.target.value)}
                  placeholder="0712 345 678" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="p-code">M-PESA Transaction Code</Label>
                <Input id="p-code" type="text" value={mpesaCode}
                  onChange={e => setMpesaCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SJK3H7T9XQ"
                  className="mt-1 font-mono tracking-widest"
                  autoCapitalize="characters" />
              </div>
            </div>

            <Button onClick={handlePayment} disabled={!mpesaCode.trim() || !payAmount || paySubmitting} className="w-full text-base py-3">
              {paySubmitting
                ? <><Loader2 size={15} className="animate-spin mr-2" />Submitting...</>
                : "Submit Payment for Approval"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Your payment will be verified by the Treasurer within 3–6 hours.
            </p>
          </div>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === "done" && (
          <div className="text-center py-4 space-y-5">
            <CheckCircle2 className="mx-auto text-emerald-400" size={56} />
            <div>
              <h3 className="text-xl font-bold mb-1">Payment Submitted!</h3>
              <p className="text-muted-foreground text-sm">
                Your payment is being verified by the Treasurer. This usually takes 3–6 hours.
              </p>
            </div>

            <div className="bg-primary/10 rounded-xl py-4 px-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your Booking Code</p>
              <p className="font-mono font-extrabold text-2xl tracking-widest text-primary">{ticketCode}</p>
              <button onClick={() => copyToClipboard(ticketCode, "Booking code")}
                className="mt-2 flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-foreground">
                <Copy size={13} /> Copy booking code
              </button>
            </div>

            <div className="glass rounded-xl p-4 text-left space-y-2 text-sm">
              <p className="font-semibold">What happens next?</p>
              <ul className="text-muted-foreground space-y-1.5">
                <li> Your registration & payment are saved</li>
                <li> Treasurer verifies your M-Pesa payment (3–6 hrs)</li>
                <li> Once approved, your ticket is issued</li>
                <li> Use your booking code on the Lookup page to check status or pay more</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              For queries: <a href={`tel:${TILL.contact}`} className="text-primary font-semibold">{TILL.contact}</a>
            </p>
            <Button onClick={() => handleOpenChange(false)} className="w-full">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationModal;
