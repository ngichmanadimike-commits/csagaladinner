// src/components/RegistrationModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ArrowLeft, Smartphone, Copy, Lock } from "lucide-react";

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

  // package instalments (loaded from DB)
  const [pkgData, setPkgData] = useState<any>(null);
  const [selectedInstalment, setSelectedInstalment] = useState<number | null>(null);

  // post-registration
  const [ticketCode, setTicketCode] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [finalAmount, setFinalAmount] = useState(0);

  // payment fields
  const [mpesaCode, setMpesaCode] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [payAmount, setPayAmount] = useState(""); // user-editable amount
  const [paySubmitting, setPaySubmitting] = useState(false);

  const totalCost = selectedPackage ? selectedPackage.price * quantity : 0;
  const discountAmount = promoCode
    ? promoCode.discount_type === "percentage"
      ? Math.round(totalCost * (promoCode.discount_value / 100))
      : Math.min(promoCode.discount_value, totalCost)
    : 0;
  const displayFinalCost = Math.max(0, totalCost - discountAmount);

  // Load full package data (for instalments)
  useEffect(() => {
    if (!selectedPackage?.id) return;
    supabase
      .from("ticket_packages")
      .select("partial_allowed, installments, installment_mode, price")
      .eq("id", selectedPackage.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setPkgData(data); });
  }, [selectedPackage?.id]);

  useEffect(() => {
    if (!isOpen) {
      setStep("register");
      setName(""); setEmail(""); setPhone(""); setQuantity(1);
      setPromoInput(""); setPromoCode(null);
      setTicketCode(""); setRegistrationId(""); setFinalAmount(0);
      setMpesaCode(""); setPayerPhone(""); setPayAmount("");
      setSelectedInstalment(null); setPkgData(null);
    }
  }, [isOpen]);

  // Compute instalment options
  const getInstalments = (): number[] => {
    const src = pkgData ?? selectedPackage;
    if (!src?.partial_allowed) return [];
    const raw: number[] = Array.isArray(src.installments) ? src.installments : [];
    if (!raw.length) return [];
    if ((src.installment_mode ?? "amount") === "percent") {
      return raw.map((pct: number) => Math.round((pct / 100) * (src.price ?? selectedPackage?.price ?? 0)));
    }
    return raw.map((n: number) => Number(n));
  };

  const instalments = getInstalments();

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    setSubmitting(true);
    try {
      const { data: eventData, error: eventErr } = await supabase
        .from("events").select("id").order("created_at", { ascending: false }).limit(1).single();
      if (eventErr || !eventData) { toast.error("Event not found. Please try again."); return; }

      // NOTE: ticket_code is generated but NOT shown until payment is submitted
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
        });
      }

      // Store internally but do NOT display yet
      setTicketCode(code);
      setRegistrationId(regData.id);
      setFinalAmount(amount);
      setPayerPhone(phone);
      setPayAmount(String(amount)); // default to full amount
      setStep("payment"); // skip directly to payment step — code hidden
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
    setPaySubmitting(true);
    try {
      const { error } = await supabase.from("payments").insert({
        registration_id: registrationId,
        amount: amountToPay,
        mpesa_code: mpesaCode.trim().toUpperCase(),
        payment_method: "mpesa_manual",
        phone: payerPhone,
        verified: false,
      });
      if (error) { toast.error("Could not save payment: " + error.message); return; }

      // Update total_paid on registration
      await supabase.from("registrations")
        .update({ total_paid: amountToPay })
        .eq("id", registrationId);

      setStep("done");
      toast.success("Payment submitted! Waiting for admin approval.");
    } catch { toast.error("Unexpected error. Please try again."); }
    finally { setPaySubmitting(false); }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  if (!selectedPackage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "register" && `Register — ${selectedPackage.name}`}
            {step === "payment" && "Make Payment"}
            {step === "done" && "Payment Submitted!"}
          </DialogTitle>
          <DialogDescription>CSA Gala Dinner 2026</DialogDescription>
        </DialogHeader>

        {/* ── STEP 1: REGISTER ── */}
        {step === "register" && (
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

            {/* Cost summary */}
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

            {/* Instalment preview */}
            {instalments.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm">
                <p className="font-semibold text-foreground mb-1">Instalment options available</p>
                <p className="text-xs text-muted-foreground">You can pay in instalments on the next step.</p>
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
            {/* Booking code is LOCKED — only shown after payment */}
            <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-3">
              <Lock size={20} className="text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Your booking code is ready</p>
                <p className="text-xs text-muted-foreground mt-0.5">Complete payment below — your code will appear after you submit your M-Pesa transaction code.</p>
              </div>
            </div>

            {/* M-Pesa payment card */}
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
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Full Amount</p>
                  <p className="font-bold text-lg" style={{ color: "#D4AF37" }}>KES {finalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Instalment selector */}
            {instalments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Pay an instalment instead:</p>
                <div className="flex flex-wrap gap-2">
                  {instalments.map((amt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectInstalment(amt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                        selectedInstalment === amt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border hover:border-primary"
                      }`}
                    >
                      KES {amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    onClick={() => { setSelectedInstalment(null); setPayAmount(String(finalAmount)); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                      selectedInstalment === null
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-foreground border-border hover:border-primary"
                    }`}
                  >
                    Full: KES {finalAmount.toLocaleString()}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Editable amount field */}
              <div>
                <Label htmlFor="p-amount">Amount You Are Paying (KES)</Label>
                <Input
                  id="p-amount"
                  type="number"
                  min="1"
                  max={finalAmount}
                  value={payAmount}
                  onChange={e => { setPayAmount(e.target.value); setSelectedInstalment(null); }}
                  placeholder={`e.g. ${finalAmount}`}
                  className="mt-1 font-mono"
                />
                {Number(payAmount) < finalAmount && Number(payAmount) > 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Paying partial: KES {Number(payAmount).toLocaleString()} of KES {finalAmount.toLocaleString()} — remaining KES {(finalAmount - Number(payAmount)).toLocaleString()} will be due.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="p-phone">Your Phone Number</Label>
                <Input id="p-phone" type="tel" value={payerPhone}
                  onChange={e => setPayerPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">The number you paid from</p>
              </div>
              <div>
                <Label htmlFor="p-code">M-PESA Transaction Code</Label>
                <Input id="p-code" type="text" value={mpesaCode}
                  onChange={e => setMpesaCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SJK3H7T9XQ"
                  className="mt-1 font-mono tracking-widest"
                  autoCapitalize="characters" />
                <p className="text-xs text-muted-foreground mt-1">From the M-PESA confirmation SMS</p>
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

        {/* ── STEP 3: DONE — booking code now revealed ── */}
        {step === "done" && (
          <div className="text-center py-4 space-y-5">
            <CheckCircle2 className="mx-auto text-emerald-400" size={56} />
            <div>
              <h3 className="text-xl font-bold mb-1">Payment Submitted!</h3>
              <p className="text-muted-foreground text-sm">
                Your payment is being verified by the Treasurer. This usually takes 3–6 hours.
              </p>
            </div>

            {/* Booking code revealed ONLY now */}
            <div className="bg-primary/10 rounded-xl py-4 px-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your Booking Code</p>
              <p className="font-mono font-extrabold text-2xl tracking-widest text-primary">{ticketCode}</p>
              <button
                onClick={() => copyToClipboard(ticketCode, "Booking code")}
                className="mt-2 flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy size={13} /> Copy booking code
              </button>
            </div>

            <div className="glass rounded-xl p-4 text-left space-y-2 text-sm">
              <p className="font-semibold">What happens next?</p>
              <ul className="text-muted-foreground space-y-1.5">
                <li>✅ Your registration & payment are saved</li>
                <li>⏳ Treasurer verifies your M-Pesa payment (3–6 hrs)</li>
                <li>🎫 Once approved, your ticket is issued</li>
                <li>🔍 Use your booking code on the Lookup page to check status</li>
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
