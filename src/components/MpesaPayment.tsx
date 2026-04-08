import { useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const MpesaPayment = ({ amount, onBack }: { amount: number; onBack: () => void }) => {
  const [txCode, setTxCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
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

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass rounded-xl p-4 space-y-2">
        <h4 className="font-bold text-foreground">Payment Details</h4>
        <p className="text-sm text-muted-foreground">Method: <span className="text-foreground">Lipa na M-PESA</span></p>
        <p className="text-sm text-muted-foreground">Till Number: <span className="text-primary font-bold">6776606</span></p>
        <p className="text-sm text-muted-foreground">Business Name: <span className="text-foreground">Victor Mwoni Mutemi</span></p>
        <p className="text-sm text-muted-foreground">Amount: <span className="text-primary font-bold">KES {amount.toLocaleString()}</span></p>
      </div>

      <div className="glass rounded-xl p-4">
        <h4 className="font-bold text-foreground mb-3">How to Pay via M-PESA</h4>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Go to M-PESA</li>
          <li>Select <span className="text-foreground">Lipa na M-PESA</span></li>
          <li>Select <span className="text-foreground">Buy Goods and Services</span></li>
          <li>Enter Till Number: <span className="text-primary font-semibold">6776606</span></li>
          <li>Enter Amount: <span className="text-primary font-semibold">KES {amount.toLocaleString()}</span></li>
          <li>Enter PIN</li>
          <li>Confirm</li>
        </ol>
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
          onClick={() => txCode && setSubmitted(true)}
          disabled={!txCode}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          Confirm Payment
        </button>
      </div>
    </div>
  );
};

export default MpesaPayment;
