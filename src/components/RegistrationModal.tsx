import { useState } from "react";
import { X } from "lucide-react";
import MpesaPayment from "./MpesaPayment";

interface Pkg {
  id: string;
  name: string;
  price: number;
  partial: boolean;
}

const partialSchedule: Record<string, number[]> = {
  individual: [1050, 800, 800],
  corporate: [1500, 1000, 1000],
};

const RegistrationModal = ({ pkg, onClose }: { pkg: Pkg; onClose: () => void }) => {
  const [step, setStep] = useState<"form" | "payment-choice" | "mpesa">("form");
  const [form, setForm] = useState({ name: "", email: "", phone: "", institution: "" });
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [installment, setInstallment] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const amount =
    paymentType === "full"
      ? pkg.price * quantity
      : (partialSchedule[pkg.id]?.[installment] ?? pkg.price) * quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.institution) return;
    setStep("payment-choice");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        <h3 className="font-display text-xl font-bold mb-1">{pkg.name} Ticket</h3>
        <p className="text-primary font-semibold mb-4">KES {pkg.price.toLocaleString()} each</p>

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
            <div className="space-y-3">
              <button
                onClick={() => { setPaymentType("full"); setStep("mpesa"); }}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform"
              >
                Full Payment – KES {(pkg.price * quantity).toLocaleString()}
              </button>

              {pkg.partial && (
                <>
                  <p className="text-sm text-muted-foreground text-center">or pay in installments:</p>
                  {partialSchedule[pkg.id]?.map((amt, i) => (
                    <button
                      key={i}
                      onClick={() => { setPaymentType("partial"); setInstallment(i); setStep("mpesa"); }}
                      className="w-full py-3 rounded-lg border border-border text-foreground font-semibold hover:border-primary hover:text-primary transition-all"
                    >
                      Installment {i + 1} – KES {(amt * quantity).toLocaleString()}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {step === "mpesa" && (
          <MpesaPayment amount={amount} onBack={() => setStep("payment-choice")} />
        )}
      </div>
    </div>
  );
};

export default RegistrationModal;
