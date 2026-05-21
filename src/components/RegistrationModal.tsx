import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Package {
  id: string;
  name: string;
  price: number;
  max_tickets: number;
  perks: string[];
}

interface RegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage: Package | null;
}

const RegistrationModal = ({ open, onOpenChange, selectedPackage }: RegistrationModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<any>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const totalCost = selectedPackage? selectedPackage.price * quantity : 0;
  const discountAmount = promoCode? Math.round(totalCost * (promoCode.discount_percent / 100)) : 0;
  const finalCost = totalCost - discountAmount;

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setQuantity(1);
      setPromoInput("");
      setPromoCode(null);
      setSuccess(false);
    }
  }, [open]);

  const validatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoCode(null);

    const { data, error } = await supabase
     .from("promo_codes")
     .select("*")
     .eq("code", promoInput.toUpperCase())
     .eq("active", true)
     .single();

    setPromoChecking(false);

    if (error ||!data) {
      toast.error("Invalid promo code");
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error("Promo code has expired");
      return;
    }

    if (data.used_count >= data.max_uses) {
      toast.error("Promo code usage limit reached");
      return;
    }

    setPromoCode(data);
    toast.success(`${data.discount_percent}% discount applied!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;

    setSubmitting(true);

    const ticketCode = `CSA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { data: regData, error: regError } = await supabase
     .from("registrations")
     .insert({
        name,
        email,
        phone,
        package_id: selectedPackage.id,
        quantity,
        total_cost: finalCost,
        total_paid: 0,
        payment_status: "pending",
        ticket_code: ticketCode,
        promo_code_id: promoCode?.id || null,
      })
     .select()
     .single();

    if (regError) {
      toast.error("Registration failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (promoCode) {
      await supabase
       .from("promo_codes")
       .update({ used_count: promoCode.used_count + 1 })
       .eq("id", promoCode.id);
    }

    setSuccess(true);
    toast.success("Registration submitted! Check your email for payment instructions.");
    setSubmitting(false);
  };

  if (!selectedPackage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for {selectedPackage.name}</DialogTitle>
          <DialogDescription>
            Complete your registration for CSA Gala Dinner 2026
          </DialogDescription>
        </DialogHeader>

        {success? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
            <h3 className="text-xl font-bold">Registration Successful!</h3>
            <p className="text-muted-foreground text-sm">
              Check your email for payment instructions and your ticket.
            </p>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+254 712 345 678"
              />
            </div>

            <div>
              <Label htmlFor="quantity">Number of Tickets</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedPackage.max_tickets}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div>
              <Label htmlFor="promo">Promo Code</Label>
              <div className="flex gap-2">
                <Input
                  id="promo"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                />
                <button
                  type="button"
                  onClick={validatePromo}
                  disabled={!promoInput || promoChecking}
                  className="px-3 rounded-lg border-primary text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {promoChecking? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                </button>
              </div>
              {promoCode && (
                <p className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  {promoCode.discount_percent}% discount applied
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>KES {totalCost.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Discount</span>
                  <span>-KES {discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>KES {finalCost.toLocaleString()}</span>
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationModal;
