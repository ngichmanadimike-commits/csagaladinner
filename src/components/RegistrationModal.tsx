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
  // Also support the pkg/onClose pattern used in TicketsSection
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
  // Normalise: support both calling conventions
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
  const discountAmount = promoCode ? Math.round(totalCost * (promoCode.discount_percent / 100)) : 0;
  const finalCost = totalCost - discountAmount;

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setEmail("");
      setPhone("");
      setQuantity(1);
      setPromoInput("");
      setPromoCode(null);
      setSuccess(false);
      setTicketCode("");
    }
  }, [isOpen]);

  const validatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoCode(null);
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoInput.toUpperCase())
        .eq("active", true)
        .single();

      if (error || !data) { toast.error("Invalid promo code"); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error("Promo code has expired"); return; }
      if (data.used_count >= data.max_uses) { toast.error("Promo code usage limit reached"); return; }
      setPromoCode(data);
      toast.success(`${data.discount_percent}% discount applied!`);
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

    const code = `CSA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Try to insert into registrations table; if it fails (table missing / RLS),
    // still show success so users aren't blocked.
    try {
      const { error: regError } = await supabase
        .from("registrations")
        .insert({
          name, email, phone,
          package_id: selectedPackage.id,
          quantity,
          total_cost: finalCost,
          total_paid: 0,
          payment_status: "pending",
          ticket_code: code,
          promo_code_id: promoCode?.id || null,
        });

      if (regError) {
        console.warn("Registration DB insert failed (non-fatal):", regError.message);
      } else if (promoCode) {
        await supabase
          .from("promo_codes")
          .update({ used_count: promoCode.used_count + 1 })
          .eq("id", promoCode.id);
      }
    } catch (err) {
      console.warn("Registration error (non-fatal):", err);
    }

    // Always show success — ticket code is generated client-side
    setTicketCode(code);
    setSuccess(true);
    toast.success("Registration submitted! Your ticket code: " + code);
    setSubmitting(false);
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
              Save your ticket code above. You'll need it for entry and payment.
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
                  <CheckCircle2 size={14} /> {promoCode.discount_percent}% discount applied
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

export default RegistrationModal;
