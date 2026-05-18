import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, CheckCircle, Clock, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { maskName, maskEmail, maskTicketToken, maskBookingCode } from "@/lib/mask";
import { downloadTicketPdf } from "@/lib/generateTicket";

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
  secure_ticket_token: string | null;
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

const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; class: string }> = {
  paid: { icon: CheckCircle, label: "Fully Paid", class: "text-green-400" },
  confirmed: { icon: CheckCircle, label: "Confirmed", class: "text-green-400" },
  partial: { icon: Clock, label: "Partial Payment", class: "text-yellow-400" },
  pending: { icon: AlertCircle, label: "Pending", class: "text-orange-400" },
};

const PaymentStatusLookup = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegistrationResult[]>([]);
  const [sponsorResults, setSponsorResults] = useState<SponsorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Pre-fill from URL query param ?code=CSA-XXXXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setQuery(code);
      // Auto-search
      setTimeout(() => {
        document.getElementById("lookup-form")?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
      }, 300);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);

    try {
      const [{ data, error }, sponsorRes] = await Promise.all([
        supabase
          .from("registrations")
          .select(
            "id, name, email, package_type, total_cost, total_paid, payment_status, ticket_issued, ticket_code, secure_ticket_token"
          )
          .or(
            `name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,ticket_code.ilike.%${trimmed}%`
          ),
        supabase
          .from("sponsorships")
          .select(
            "id, sponsor_name, sponsor_email, sponsor_phone, num_students, level, amount, verified, payment_status, sponsor_code"
          )
          .or(
            `sponsor_name.ilike.%${trimmed}%,sponsor_email.ilike.%${trimmed}%,sponsor_code.ilike.%${trimmed}%`
          ),
      ]);

      if (error) {
        toast.error(error.message);
        return;
      }

      setResults(data ?? []);
      setSponsorResults((sponsorRes.data as any) ?? []);
    } catch (err: any) {
      toast.error("Search failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="payment-status" className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Check Payment Status
          </h2>
          <p className="text-muted-foreground">
            Enter your name, email, or booking code to view your registration &amp; payment details.
          </p>
        </div>

        <form id="lookup-form" onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Booking code, name, or email..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Search"}
          </button>
        </form>

        {searched && !loading && results.length === 0 && sponsorResults.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No registration or sponsorship found. Try your booking/sponsor code, name, or email.
          </div>
        )}

        <div className="space-y-4">
          {results.map((r) => {
            const remaining = Math.max(0, r.total_cost - r.total_paid);
            const config =
              statusConfig[r.payment_status] ?? statusConfig.pending;
            const StatusIcon = config.icon;
            const isPaid =
              r.payment_status === "paid" || r.payment_status === "confirmed";

            return (
              <div key={r.id} className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-foreground">
                      {maskName(r.name)}
                    </h3>
                    <p className="text-xs text-muted-foreground">{maskEmail(r.email)}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${config.class}`}>
                    <StatusIcon size={16} />
                    {config.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Package</p>
                    <p className="font-semibold text-foreground capitalize">
                      {r.package_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total Cost</p>
                    <p className="font-semibold text-foreground">
                      KSh {Number(r.total_cost).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Paid</p>
                    <p className="font-semibold text-foreground">
                      KSh {Number(r.total_paid).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Balance</p>
                    <p
                      className={`font-semibold ${
                        remaining > 0 ? "text-orange-400" : "text-green-400"
                      }`}
                    >
                      KSh {remaining.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Booking Code</p>
                  <p className="font-mono font-bold text-primary">
                    {maskBookingCode(r.ticket_code)}
                  </p>

                  {isPaid && r.secure_ticket_token ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-2">
                        Your Ticket Token
                      </p>
                      <p className="font-mono text-xs break-all text-emerald-400">
                        {maskTicketToken(r.secure_ticket_token)}
                      </p>
                      <SecureDownload reg={r} />
                    </>
                  ) : r.payment_status === "partial" ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ticket locked until full payment
                      </p>
                      <p className="font-mono text-xs text-yellow-400">
                        {maskTicketToken(r.secure_ticket_token)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pay the remaining KSh {remaining.toLocaleString()} to unlock your ticket.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">
                      Complete a payment to receive your ticket.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {sponsorResults.map((s) => (
            <div key={s.id} className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-foreground">
                    {maskName(s.sponsor_name)}
                  </h3>
                  <p className="text-xs text-muted-foreground">Sponsor • {s.level}</p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    s.verified ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  {s.verified ? "Verified" : "Pending Verification"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Students</p>
                  <p className="font-semibold">{s.num_students}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold">
                    KSh {Number(s.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-semibold">{s.sponsor_phone}</p>
                </div>
              </div>
              {s.sponsor_code && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Sponsor Code</p>
                  <p className="font-mono font-bold text-primary">
                    {maskBookingCode(s.sponsor_code)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PaymentStatusLookup;

// ── Secure Download Component ────────────────────────────────────────────────
function SecureDownload({ reg }: { reg: RegistrationResult }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    const entered = code.trim().toUpperCase();
    if (!entered) {
      toast.error("Enter your booking code");
      return;
    }
    const storedCode = (reg.ticket_code ?? "").toUpperCase();
    if (!storedCode || entered !== storedCode) {
      toast.error("Incorrect booking code. Please try again.");
      return;
    }
    setBusy(true);
    try {
      // FIX: correct field mapping — generateTicket uses purchaser_name and booking_code
      await downloadTicketPdf({
        purchaser_name: reg.name ?? "—",
        booking_code: reg.ticket_code ?? "",
        ticket_type: reg.package_type ?? "Regular",
        type_name: reg.package_type ?? "Regular",
        total_amount: reg.total_paid ?? reg.total_cost ?? 0,
        payment_status: "PAID",
        ticket_number: reg.ticket_code ?? "",
        ticket_code: reg.ticket_code ?? "",
        qr_code: reg.secure_ticket_token ?? reg.ticket_code ?? reg.id ?? "",
        eventName: "CSA Gala Dinner 2026",
        eventDate: "Friday, 5th June 2026",
        venue: "Utalii Hotel, Nairobi",
        time: "7:00 PM – 11:00 PM",
      });
      toast.success("Ticket downloaded successfully!");
      setOpen(false);
      setCode("");
    } catch (e: any) {
      toast.error("Failed to generate ticket: " + (e?.message || "unknown error"));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
      >
        <Download size={12} /> Download Ticket (PDF)
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-lg border border-primary/40 bg-primary/5 space-y-2">
      <p className="text-xs text-muted-foreground">
        Enter your full booking code to verify &amp; download:
      </p>
      <div className="flex gap-2">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CSA-XXXXXX"
          className="flex-1 px-3 py-2 rounded-md bg-muted border border-border text-sm font-mono"
        />
        <button
          onClick={handle}
          disabled={busy}
          className="px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
        >
          {busy ? "Generating…" : "Verify & Download"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setCode("");
          }}
          className="px-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
    }
