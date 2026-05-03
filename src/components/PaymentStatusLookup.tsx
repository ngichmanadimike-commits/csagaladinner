import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
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

const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; class: string }> = {
  paid: { icon: CheckCircle, label: "Fully Paid", class: "text-green-400" },
  partial: { icon: Clock, label: "Partial Payment", class: "text-yellow-400" },
  pending: { icon: AlertCircle, label: "Pending", class: "text-orange-400" },
};

const PaymentStatusLookup = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegistrationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from("registrations")
      .select("id, name, email, package_type, total_cost, total_paid, payment_status, ticket_issued, ticket_code")
      .or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,ticket_code.ilike.%${trimmed}%`);

    setLoading(false);

    if (error) {
      toast.error("Failed to search. Please try again.");
      return;
    }

    setResults(data ?? []);
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

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No registration found. Please check your name or email and try again.
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
                    <h3 className="font-display font-bold text-foreground">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
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

                {r.ticket_issued && r.ticket_code && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Ticket Code</p>
                    <p className="font-mono font-bold text-primary">{r.ticket_code}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PaymentStatusLookup;
