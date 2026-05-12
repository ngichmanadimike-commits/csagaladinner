import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MpesaPaymentProps {
  amount: number;
  onBack: () => void;
  /** Called when the user submits a manual M-PESA code or STK completes. Should persist payment. */
  onPaymentSubmitted?: (info: { mpesaCode: string; phone: string; source: "stk" | "manual" }) => Promise<void> | void;
}

const MpesaPayment = ({ amount, onBack, onPaymentSubmitted }: MpesaPaymentProps) => {
  const [phone, setPhone] = useState("");
  const [txCode, setTxCode] = useState("");
  const [step, setStep] = useState<"phone" | "waiting" | "confirm" | "done">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleStkPush = async () => {
    if (!phone) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("mpesa-stk-push", {
        body: { phone, amount },
      });
      if (fnError) throw fnError;
      if (data?.errorCode) {
        setError(data.errorMessage || "STK Push failed. Please try manually.");
        setStep("confirm");
      } else {
        setStep("waiting");
        // Auto-advance to confirm after 15s
        setTimeout(() => setStep("confirm"), 15000);
      }
    } catch (err: any) {
      console.error(err);
      setError("Could not initiate payment. Use manual instructions below.");
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="text-center py-6 space-y-4">
        <CheckCircle2 className="mx-auto text-primary" size={48} />
        <h4 className="font-display text-lg font-bold">Payment Submitted</h4>
        <p className="text-sm text-muted-foreground">
          Your payment is being verified by the Treasurer. This will take 3 to 6 hours.
        </p>
        <p className="text-sm text-muted-foreground">
          For any queries, contact: <a href="tel:0758647130" className="text-primary">0758647130</a>
        </p>
      </div>
    );
  }

  if (step === "waiting") {
    return (
      <div className="text-center py-8 space-y-4">
        <Loader2 className="mx-auto text-primary animate-spin" size={48} />
        <h4 className="font-display text-lg font-bold">Check Your Phone</h4>
        <p className="text-sm text-muted-foreground">
          An M-PESA prompt has been sent to <span className="text-foreground font-semibold">{phone}</span>.
          Enter your PIN to complete payment.
        </p>
        <button
          onClick={() => setStep("confirm")}
          className="text-sm text-primary underline mt-4"
        >
          I've completed the payment / Pay manually instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass rounded-xl p-4 space-y-2">
        <h4 className="font-bold text-foreground">Payment Details</h4>
        <p className="text-sm text-muted-foreground">Method: <span className="text-foreground">Lipa na M-PESA</span></p>
        {/* <p className="text-sm text-muted-foreground">Till Number: <span className="text-primary font-bold">6776606</span></p> */}
        <p className="text-sm text-muted-foreground">Business Name: <span className="text-foreground">Victor Mwoni Mutemi</span></p>
        <p className="text-sm text-muted-foreground">Amount: <span className="text-primary font-bold">KES {amount.toLocaleString()}</span></p>
      </div>

      {step === "phone" && (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Enter M-PESA Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={handleStkPush}
            disabled={!phone || loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Pay KES {amount.toLocaleString()} via STK Push
          </button>
          <button
            onClick={() => setStep("confirm")}
            className="w-full text-sm text-muted-foreground underline"
          >
            Pay manually instead
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-yellow-400 bg-yellow-400/10 rounded-lg p-3">{error}</p>
          )}

          <div className="glass rounded-xl p-4">
            <h4 className="font-bold text-foreground mb-3">How to Pay via M-PESA</h4>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Go to M-PESA</li>
              <li>Select <span className="text-foreground">Lipa na M-PESA</span></li>
              <li>Select <span className="text-foreground">Pay Bill</span></li>
              <li>Enter Business No: <span className="text-primary font-semibold">174379</span> <span className="text-xs text-yellow-400">(Test Mode)</span></li>
              <li>Enter Account No: <span className="text-primary font-semibold">TICKET</span></li>
              <li>Enter Amount: <span className="text-primary font-semibold">KES {amount.toLocaleString()}</span></li>
              <li>Enter PIN</li>
              <li>Confirm</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">* For testing only. Use STK Push above for easier payment.</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Enter M-PESA Transaction Code</label>
            <input
              type="text"
              value={txCode}
              onChange={(e) => setTxCode(e.target.value.toUpperCase())}
              placeholder="e.g. SJK3H7T9XQ"
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
            />
            <button
              onClick={async () => {
                if (!txCode) return;
                setSubmitting(true);
                try {
                  if (onPaymentSubmitted) {
                    await onPaymentSubmitted({ mpesaCode: txCode, phone, source: "manual" });
                  }
                  setStep("done");
                } catch (e: any) {
                  setError(e?.message || "Could not save payment. Please try again.");
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!txCode || submitting}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting ? "Saving..." : "Confirm Payment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MpesaPayment;
