import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { maskName, maskEmail, maskTicketToken } from "@/lib/mask";
import { downloadTicketPdf } from "@/lib/generateTicket";
import { Download } from "lucide-react";

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
  partial: { icon: Clock, label: "Partial Payment", class: "text-yellow-400" },
  pending: { icon: AlertCircle, label: "Pending", class: "text-orange-400" },
};

const PaymentStatusLookup = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegistrationResult[]>([]);
  const [sponsorResults, setSponsorResults] = useState<SponsorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);

    const [{ data, error }, sponsorRes] = await Promise.all([
      supabase
      .from("registrations")
      .select("id, name, email, package_type, total_cost, total_paid, payment_status, ticket_issued, ticket_code, secure_ticket_token")
      .or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,ticket_code.ilike.%${trimmed}%`),
      supabase
        .from("sponsorships")
        .select("id, sponsor_name, sponsor_email, sponsor_phone, num_students, level, amount, verified, payment_status, sponsor_code")
        .or(`sponsor_name.ilike.%${trimmed}%,sponsor_email.ilike.%${trimmed}%,sponsor_code.ilike.%${trimmed}%`),
    ]);

    setLoading(false);

    if (error) {
      toast.error("Failed to search. Please try again.");
      return;
    }

    setResults(data ?? []);
    setSponsorResults((sponsorRes.data as any) ?? []);
  };

  return (
    <section id="payment-status" className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Check Payment Status
          </h2>
          <p className="text-muted-foreground">
            Enter your name or email to view your registration &amp; payment details.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
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
            const config = statusConfig[r.payment_status] ?? statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <div key={r.id} className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-foreground">{maskName(r.name)}</h3>
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
                    <p className="font-semibold text-foreground capitalize">{r.package_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total Cost</p>
                    <p className="font-semibold text-foreground">KSh {r.total_cost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Paid</p>
                    <p className="font-semibold text-foreground">KSh {r.total_paid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Balance</p>
                    <p className={`font-semibold ${remaining > 0 ? "text-orange-400" : "text-green-400"}`}>
                      KSh {remaining.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Booking Code</p>
                  <p className="font-mono font-bold text-primary">{r.ticket_code || "—"}</p>
                  {r.payment_status === "paid" && r.secure_ticket_token ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-2">Your Ticket (fully paid)</p>
                      <p className="font-mono text-xs break-all text-emerald-400">{r.secure_ticket_token}</p>
                      <button
                        onClick={async () => {
                          try {
                            await downloadTicketPdf({
                              name: r.name,
                              bookingCode: r.ticket_code || "",
                              ticketType: r.package_type,
                              amount: r.total_paid,
                              status: "PAID",
                              secureToken: r.secure_ticket_token || "",
                              ticketNumber: r.ticket_code || "",
                            });
                          } catch (e: any) {
                            toast.error("Failed to generate ticket: " + (e?.message || "unknown"));
                          }
                        }}
                        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                      >
                        <Download size={12} /> Download Ticket (PDF)
                      </button>
                    </>
                  ) : r.payment_status === "partial" ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-2">Ticket (locked until full payment)</p>
                      <p className="font-mono text-xs text-yellow-400">{maskTicketToken(r.secure_ticket_token)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Pay the remaining balance to unlock the full ticket.</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">Complete a payment to receive your ticket.</p>
                  )}
                </div>
              </div>
            );
          })}
          {sponsorResults.map((s) => (
            <div key={s.id} className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-foreground">{maskName(s.sponsor_name)}</h3>
                  <p className="text-xs text-muted-foreground">Sponsor • {s.level}</p>
                </div>
                <span className={`text-sm font-semibold ${s.verified ? "text-green-400" : "text-yellow-400"}`}>
                  {s.verified ? "Verified" : "Pending"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Students</p><p className="font-semibold">{s.num_students}</p></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold">KSh {Number(s.amount).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-semibold">{s.sponsor_phone}</p></div>
              </div>
              {s.sponsor_code && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Sponsor Code</p>
                  <p className="font-mono font-bold text-primary">{s.sponsor_code}</p>
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
