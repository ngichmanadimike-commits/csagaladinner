import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Package {
  id: string;
  name: string;
  price: number;
  max_tickets?: number;
  perks: string[];
}

interface RegistrationModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  pkg?: Package | null;
  onClose?: () => void;
  selectedPackage?: Package | null;
}

const RegistrationModal = ({
  open,
  onOpenChange,
  pkg,
  onClose,
  selectedPackage: _selectedPackage,
}: RegistrationModalProps) => {
  const selectedPackage = pkg ?? _selectedPackage ?? null;
  const isOpen = open !== undefined ? open : !!selectedPackage;
  const handleOpenChange = (v: boolean) => {
    onOpenChange?.(v);
    if (!v) onClose?.();
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<any>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketCode, setTicketCode] = useState("");

  const totalCost = selectedPackage ? selectedPackage.price * quantity : 0;
  const discountAmount = promoCode
    ? promoCode.discount_type === "percentage"
      ? Math.round(totalCost * (promoCode.discount_value / 100))
      : Math.min(promoCode.discount_value, totalCost)
    : 0;
  const finalCost = Math.max(0, totalCost - discountAmount);

  useEffect(() => {
    if (!isOpen) {
      setName(""); setEmail(""); setPhone("");
      setQuantity(1); setPromoInput("");
      setPromoCode(null); setSuccess(false); setTicketCode("");
    }
  }, [isOpen]);

  // Queries the CORRECT table: promotions
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
      if (new Date(data.start_at) > new Date()) { toast.error("Promo code is not active yet"); return; }
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        toast.error("Promo code usage limit reached"); return;
      }
      setPromoCode(data);
      const label = data.discount_type === "percentage"
        ? `${data.discount_value}% discount applied!`
        : `KES ${data.discount_value} discount applied!`;
      toast.success(label);
    } catch {
      toast.error("Could not validate promo code");
    } finally {
      setPromoChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    setSubmitting(true);

    try {
      // Step 1: get the active event id
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (eventError || !eventData) {
        toast.error("Could not find event. Please try again.");
        setSubmitting(false);
        return;
      }

      const code = `CSA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Step 2: insert with CORRECT columns
      const { error: regError } = await supabase
        .from("registrations")
        .insert({
          name,
          email,
          phone,
          event_id: eventData.id,
          package_type: selectedPackage.id, // slug e.g. "individual"
          quantity,
          total_cost: finalCost,
          total_paid: 0,
          original_price: totalCost,
          discount_amount: discountAmount,
          promo_code: promoCode?.code || null,
          payment_status: "pending",
          payment_type: "full",
          ticket_code: code,
          ticket_issued: false,
        });

      if (regError) {
        console.error("Registration failed:", regError.message);
        toast.error("Registration failed: " + regError.message);
        setSubmitting(false);
        return;
      }

      // Step 3: record promo redemption if used
      if (promoCode) {
        await supabase.from("promo_redemptions").insert({
          code: promoCode.code,
          promotion_id: promoCode.id,
          email,
          phone,
          discount_amount: discountAmount,
          status: "redeemed",
        });
      }

      setTicketCode(code);
      setSuccess(true);
      toast.success("Registration submitted! Ticket code: " + code);
    } catch (err: any) {
      toast.error("Unexpected error. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedPackage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for {selectedPackage.name}</DialogTitle>
          <DialogDescription>Complete your registration for CSA Gala Dinner 2026</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
            <h3 className="text-xl font-bold">Registration Successful!</h3>
            {ticketCode && (
              <div className="bg-primary/10 rounded-xl py-3 px-4">
                <p className="text-xs text-muted-foreground mb-1">Your Ticket Code</p>
                <p className="font-mono font-extrabold text-xl tracking-widest text-primary">{ticketCode}</p>
              </div>
            )}
            <p className="text-muted-foreground text-sm">
              Save your ticket code. You'll need it for entry and payment.
            </p>
            <Button onClick={() => handleOpenChange(false)} className="w-full">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="john@example.com" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+254 712 345 678" />
            </div>
            <div>
              <Label htmlFor="quantity">Number of Tickets</Label>
              <Input id="quantity" type="number" min="1" max={selectedPackage.max_tickets ?? 10}
                value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} required />
            </div>
            <div>
              <Label htmlFor="promo">Promo Code (optional)</Label>
              <div className="flex gap-2">
                <Input id="promo" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="ENTER CODE" />
                <button type="button" onClick={validatePromo} disabled={!promoInput || promoChecking}
                  className="px-3 rounded-lg border border-primary text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed">
                  {promoChecking ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                </button>
              </div>
              {promoCode && (
                <p className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  {promoCode.discount_type === "percentage"
                    ? `${promoCode.discount_value}% discount applied`
                    : `KES ${promoCode.discount_value} discount applied`}
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>KES {totalCost.toLocaleString()}</span></div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400"><span>Discount</span><span>-KES {discountAmount.toLocaleString()}</span></div>
              )}
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>KES {finalCost.toLocaleString()}</span></div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <><Loader2 size={16} className="animate-spin mr-2" />Processing...</> : "Complete Registration"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationModal;a
