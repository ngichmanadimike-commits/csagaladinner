import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Smartphone } from "lucide-react";

interface MpesaPaymentProps {
  amount: number;
  onBack: () => void;
  onPaymentSubmitted?: (info: { mpesaCode: string; phone: string; source: "stk" | "manual" }) => Promise<void> | void;
}

// ─── PAYMENT DETAILS ────────────────────────────────────────────────────────
const PAYMENT = {
  method: "Buy Goods (Till)",
  tillNumber: "6776606",
  accountName: "Victor Mwoni Mutemi",
  contact: "0758647130",
};
// ────────────────────────────────────────────────────────────────────────────

const MpesaPayment = ({ amount, onBack, onPaymentSubmitted }: MpesaPaymentProps) => {
  const [txCode, setTxCode] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (done) {
    return (
      <div className="text-center py-6 space-y-4">
        <CheckCircle2 className="mx-auto text-primary" size={48} />
        <h4 className="font-display text-lg font-bold">Payment Submitted!</h4>
        <p className="text-sm text-muted-foreground">
          Your payment is being verified by the Treasurer. This usually takes 3–6 hours.
        </p>
        <p className="text-sm text-muted-foreground">
          For any queries, contact:{" "}
          <a href={`tel:${PAYMENT.contact}`} className="text-primary font-semibold">
            {PAYMENT.contact}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Payment details card */}
      <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#0A2342", border: "2px solid #D4AF37" }}>
        <div className="flex items-center gap-2 mb-1">
          <Smartphone size={18} style={{ color: "#D4AF37" }} />
          <h4 className="font-bold text-white">Lipa na M-PESA</h4>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider">Method</p>
            <p className="text-white font-semibold">{PAYMENT.method}</p>
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider">Till Number</p>
            <p className="font-bold text-lg" style={{ color: "#D4AF37" }}>{PAYMENT.tillNumber}</p>
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider">Account Name</p>
            <p className="text-white font-semibold">{PAYMENT.accountName}</p>
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider">Amount</p>
            <p className="font-bold text-lg" style={{ color: "#D4AF37" }}>KES {amount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Manual payment instructions */}
      <div className="glass rounded-xl p-4">
        <h4 className="font-bold text-foreground mb-3">How to Pay</h4>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Open M-PESA on your phone</li>
          <li>Select <span className="text-foreground font-semibold">Lipa na M-PESA</span></li>
          <li>Select <span className="text-foreground font-semibold">Buy Goods and Services</span></li>
          <li>Enter Till Number: <span className="text-primary font-bold">{PAYMENT.tillNumber}</span></li>
          <li>Enter Amount: <span className="text-primary font-bold">KES {amount.toLocaleString()}</span></li>
          <li>Enter your M-PESA PIN</li>
          <li>Confirm — you'll receive an SMS with a transaction code</li>
          <li>Enter that code below</li>
        </ol>
      </div>

      {/* Transaction code entry */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">M-PESA Transaction Code</label>
        <input
          type="text"
          value={txCode}
          onChange={(e) => setTxCode(e.target.value.toUpperCase())}
          placeholder="e.g. SJK3H7T9XQ"
          className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
        />
        {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
        <button
          onClick={async () => {
            if (!txCode) return;
            setSubmitting(true);
            setError("");
            try {
              if (onPaymentSubmitted) {
                await onPaymentSubmitted({ mpesaCode: txCode, phone: "", source: "manual" });
              }
              setDone(true);
            } catch (e: any) {
              setError(e?.message || "Could not save payment. Please try again.");
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={!txCode || submitting}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? "Saving..." : "Confirm Payment"}
        </button>
      </div>
    </div>
  );
};

export default MpesaPayment;
