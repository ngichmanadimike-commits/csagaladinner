import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, registrations(name, email, phone)")
      .order("created_at", { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
    const channel = supabase
      .channel("payments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, fetchPayments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVerify = async (paymentId: string, verified: boolean) => {
    const { error } = await supabase
      .from("payments")
      .update({ verified, verified_at: verified ? new Date().toISOString() : null })
      .eq("id", paymentId);

    if (error) {
      toast.error("Failed to update payment");
    } else {
      toast.success(verified ? "Payment verified" : "Payment rejected");
      fetchPayments();
    }
  };

  const filtered = payments.filter((p) => {
    const reg = p.registrations as any;
    const q = search.toLowerCase();
    return (
      !search ||
      reg?.name?.toLowerCase().includes(q) ||
      reg?.email?.toLowerCase().includes(q) ||
      p.mpesa_code?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Payments</h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-72"
          />
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">M-Pesa Code</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const reg = p.registrations as any;
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3 text-foreground">{reg?.name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{reg?.email || "—"}</td>
                      <td className="p-3 text-foreground font-semibold">KES {Number(p.amount).toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">{p.mpesa_code || "—"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.verified ? "bg-emerald-400/10 text-emerald-400" : "bg-yellow-400/10 text-yellow-400"}`}>
                          {p.verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {!p.verified && (
                            <button onClick={() => handleVerify(p.id, true)} className="p-1.5 rounded-lg hover:bg-emerald-400/10 text-emerald-400" title="Verify">
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          {p.verified && (
                            <button onClick={() => handleVerify(p.id, false)} className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400" title="Reject">
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
