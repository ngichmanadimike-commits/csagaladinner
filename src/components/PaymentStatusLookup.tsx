import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, CheckCircle2, Clock, AlertCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface RegistrationResult {
  id: string;
  name: string;
  email: string;
  package_type: string;
  total_cost: number;
  total_paid: number;
  payment_status: string;
  ticket_issued: boolean;
  ticket_code: string | null;
}

interface SponsorResult {
  id: string;
  sponsor_name: string;
  sponsor_email: string | null;
  sponsor_phone: string;
  num_students: number;
  level: string;
  amount: number;
  verified: boolean;
  payment_status: string;
  sponsor_code: string | null;
}

interface PaymentRecord {
  id: string;
  registration_id: string;
  amount: number;
  mpesa_code: string | null;
  payment_method: string;
  verified: boolean;
  created_at: string;
}

// Validate: either a booking/sponsor code (no @ needed) OR a valid email (must contain @)
const isValidInput = (val: string): { valid: boolean; hint: string } => {
  const trimmed = val.trim();
  if (!trimmed) return { valid: false, hint: "" };
  // If it contains @ it must be a proper email
  if (trimmed.includes("@")) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, hint: "Please enter a valid email address (e.g. john@gmail.com)" };
    }
    return { valid: true, hint: "" };
  }
  // No @ — treat as booking/sponsor code (must be at least 4 chars, no spaces)
  if (trimmed.includes(" ")) {
    return { valid: false, hint: "Use your booking code or a valid email address — not a name" };
  }
  if (trimmed.length < 4) {
    return { valid: false, hint: "Booking code too short" };
  }
  return { valid: true, hint: "" };
};

const PaymentStatusLookup = () => {
  const [query, setQuery] = useState("");
  const [inputError, setInputError] = useState("");
  const [results, setResults] = useState<RegistrationResult[]>([]);
  const [sponsorResults, setSponsorResults] = useState<SponsorResult[]>([]);
  const [payments, setPayments] = useState<Record<string, PaymentRecord[]>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setQuery(code);
      setTimeout(() => {
        document.getElementById("lookup-form")?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
      }, 400);
    }
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (inputError) setInputError("");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    const { valid, hint } = isValidInput(trimmed);
    if (!valid) {
      setInputError(hint || "Please enter a booking code or email address");
      return;
    }
    setInputError("");
    setLoading(true);
    setSearched(true);

    try {
      const isEmail = trimmed.includes("@");

      const [{ data: regs, error }, { data: sponsors }] = await Promise.all([
        supabase
          .from("registrations")
          .select("id, name, email, package_type, total_cost, total_paid, payment_status, ticket_issued, ticket_code")
          .or(
            isEmail
              ? `email.ilike.${trimmed}`
              : `ticket_code.ilike.${trimmed}`
          ),
        supabase
          .from("sponsorships")
          .select("id, sponsor_name, sponsor_email, sponsor_phone, num_students, level, amount, verified, payment_status, sponsor_code")
          .or(
            isEmail
              ? `sponsor_email.ilike.${trimmed}`
              : `sponsor_code.ilike.${trimmed}`
          ),
      ]);

      if (error) { toast.error(error.message); return; }

      const regList = (regs ?? []) as RegistrationResult[];
      setResults(regList);
      setSponsorResults((sponsors ?? []) as SponsorResult[]);

      if (regList.length > 0) {
        const ids = regList.map((r) => r.id);
        const { data: pays } = await supabase
          .from("payments")
          .select("id, registration_id, amount, mpesa_code, payment_method, verified, created_at")
          .in("registration_id", ids)
          .order("created_at", { ascending: false });

        const grouped: Record<string, PaymentRecord[]> = {};
        (pays || []).forEach((p: any) => {
          grouped[p.registration_id] ||= [];
          grouped[p.registration_id].push(p);
        });
        setPayments(grouped);
      }
    } catch (err: any) {
      toast.error("Search failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (email: string) => {
    const [local, domain] = email.split("@");
    if (!domain) return "****";
    const maskedLocal = local.length > 2 ? local[0] + "*".repeat(local.length - 2) + local[local.length - 1] : "***";
    return `${maskedLocal}@${domain}`;
  };

  const maskName = (name: string) =>
    name.split(" ").map((part) =>
      part.length > 1 ? part[0] + "*".repeat(part.length - 1) : part
    ).join(" ");

  const maskCode = (code: string) => {
    if (code.length <= 6) return "****";
    return code.slice(0, 3) + "****" + code.slice(-3);
  };

  return (
    <section id="payment-status" className="py-16 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Check Your Registration</h2>
          <p className="text-muted-foreground text-sm">Enter your <strong className="text-foreground">booking code</strong> or <strong className="text-foreground">email address</strong> to check your payment status.</p>
        </div>

        <form id="lookup-form" onSubmit={handleSearch} className="space-y-2 mb-8">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Booking code (e.g. CSA-XXXX) or email@example.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-muted border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  inputError ? "border-red-500/60 focus:ring-red-500/40" : "border-border"
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Search"}
            </button>
          </div>
          {inputError && (
            <p className="text-sm text-red-400 flex items-center gap-1.5 px-1">
              <AlertCircle size={14} /> {inputError}
            </p>
          )}
          <p className="text-xs text-muted-foreground px-1">
            Names cannot be used to search. Use your exact booking code or the email you registered with.
          </p>
        </form>

        {searched && !loading && results.length === 0 && sponsorResults.length === 0 && (
          <div className="text-center py-10 text-muted-foreground glass rounded-xl">
            <AlertCircle className="mx-auto mb-3 opacity-40" size={36} />
            <p className="font-semibold">No registration found</p>
            <p className="text-sm mt-1">Try your exact booking code or email address.</p>
          </div>
        )}

        <div className="space-y-5">
          {results.map((r) => {
            const isPaid = r.payment_status === "paid" || r.payment_status === "confirmed";
            const isPending = r.payment_status === "pending";
            const isPartial = r.payment_status === "partial";
            const regPayments = payments[r.id] || [];
            const hasSubmittedPayment = regPayments.length > 0;
            const remaining = Math.max(0, r.total_cost - r.total_paid);
            const show = showDetails[r.id] || false;

            return (
              <div key={r.id} className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">
                      {show ? r.name : maskName(r.name)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {show ? r.email : maskEmail(r.email)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDetails((s) => ({ ...s, [r.id]: !show }))}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {isPaid && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
                        <CheckCircle2 size={15} /> Approved
                      </span>
                    )}
                    {isPending && hasSubmittedPayment && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">
                        <Clock size={15} /> Awaiting Approval
                      </span>
                    )}
                    {isPending && !hasSubmittedPayment && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full">
                        <AlertCircle size={15} /> Payment Pending
                      </span>
                    )}
                    {isPartial && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">
                        <Clock size={15} /> Partial Payment
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-primary/5 border-primary/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Booking Code</p>
                  <p className="font-mono font-extrabold text-xl text-primary tracking-widest select-none">
                    {maskCode(r.ticket_code || "")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Code is masked for security. Check your email or contact support.</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-muted-foreground text-xs mb-1">Total</p>
                    <p className="font-bold">KES {Number(r.total_cost).toLocaleString()}</p>
                  </div>
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-muted-foreground text-xs mb-1">Paid</p>
                    <p className={`font-bold ${r.total_paid > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                      KES {Number(r.total_paid).toLocaleString()}
                    </p>
                  </div>
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-muted-foreground text-xs mb-1">Balance</p>
                    <p className={`font-bold ${remaining > 0 ? "text-orange-400" : "text-emerald-400"}`}>
                      KES {remaining.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Package: </span>
                  <span className="font-semibold capitalize">{r.package_type}</span>
                </div>

                {hasSubmittedPayment && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Submitted</p>
                    {regPayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                        <div>
                          <p className="font-mono font-bold text-foreground">{p.mpesa_code || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            KES {Number(p.amount).toLocaleString()} · {new Date(p.created_at).toLocaleDateString("en-KE")}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.verified ? "text-emerald-400 bg-emerald-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
                          {p.verified ? "Verified" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`rounded-xl p-4 text-sm ${isPaid ? "bg-emerald-500/10 border-emerald-500/20" : "bg-yellow-500/10 border-yellow-500/20"}`}>
                  {isPaid && (
                    <div className="space-y-2">
                      <p className="font-bold text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 size={16} /> Payment Approved — Your ticket is ready!
                      </p>
                      {r.ticket_code && (
                        <a
                          href={`/ticket/${r.ticket_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors"
                        >
                          View & Download Ticket <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  )}
                  {isPending && hasSubmittedPayment && (
                    <div>
                      <p className="font-bold text-yellow-300 flex items-center gap-2">
                        <Clock size={16} /> Payment submitted — awaiting admin approval
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        The Treasurer will verify your M-Pesa payment within 3–6 hours.
                      </p>
                    </div>
                  )}
                  {isPending && !hasSubmittedPayment && (
                    <div>
                      <p className="font-bold text-orange-300 flex items-center gap-2">
                        <AlertCircle size={16} /> No payment received yet
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Pay via M-PESA Buy Goods, Till Number <strong className="text-foreground">6776606</strong>, Amount <strong className="text-foreground">KES {Number(r.total_cost).toLocaleString()}</strong>.
                      </p>
                    </div>
                  )}
                  {isPartial && (
                    <div>
                      <p className="font-bold text-yellow-300 flex items-center gap-2">
                        <Clock size={16} /> Partial payment recorded
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Pay the remaining KES {remaining.toLocaleString()} to receive your ticket.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {sponsorResults.map((s) => (
            <div key={s.id} className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-foreground">
                    {showDetails[s.id] ? s.sponsor_name : maskName(s.sponsor_name)}
                  </h3>
                  <p className="text-xs text-muted-foreground">Sponsor · {s.level}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDetails((prev) => ({ ...prev, [s.id]: !showDetails[s.id] }))}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    {showDetails[s.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${s.verified ? "text-emerald-400 bg-emerald-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
                    {s.verified ? "✓ Verified" : "⏳ Pending Verification"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Students</p>
                  <p className="font-bold">{s.num_students}</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Amount</p>
                  <p className="font-bold">KES {Number(s.amount).toLocaleString()}</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <p className="font-bold text-xs">{s.sponsor_phone}</p>
                </div>
              </div>
              {s.sponsor_code && (
                <div className="bg-primary/5 border-primary/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Sponsor Code</p>
                  <p className="font-mono font-bold text-primary">
                    {showDetails[s.id] ? s.sponsor_code : maskCode(s.sponsor_code)}
                  </p>
                </div>
              )}
              {!s.verified && (
                <p className="text-xs text-muted-foreground bg-yellow-500/10 border-yellow-500/20 rounded-lg p-3">
                  ⏳ Your sponsorship payment is being verified by the Treasurer.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PaymentStatusLookup;
