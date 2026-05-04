import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, CheckCircle2, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";
import { logAdminAction } from "@/lib/adminLog";

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "stk" | "manual">("all");
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
    const target = payments.find((p) => p.id === paymentId);
    const { error } = await supabase
      .from("payments")
      .update({ verified, verified_at: verified ? new Date().toISOString() : null })
      .eq("id", paymentId);

    if (error) {
      toast.error("Failed to update payment");
      logAdminAction({ actionType: verified ? "VERIFY_PAYMENT" : "REJECT_PAYMENT", description: `Failed to ${verified ? "verify" : "reject"} payment`, targetType: "payment", targetId: paymentId, status: "failed", metadata: { error: error.message } });
    } else {
      toast.success(verified ? "Payment verified" : "Payment rejected");
      logAdminAction({ actionType: verified ? "VERIFY_PAYMENT" : "REJECT_PAYMENT", description: `${verified ? "Verified" : "Rejected"} payment of KES ${target?.amount} for ${target?.registrations?.name}`, targetType: "payment", targetId: paymentId, metadata: { amount: target?.amount, mpesa_code: target?.mpesa_code, registration_id: target?.registration_id } });
      fetchPayments();
    }
  };

  const filtered = payments.filter((p) => {
    const reg = p.registrations as any;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      reg?.name?.toLowerCase().includes(q) ||
      reg?.email?.toLowerCase().includes(q) ||
      p.mpesa_code?.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && p.verified) ||
      (statusFilter === "pending" && !p.verified);
    const matchSource = sourceFilter === "all" || p.source === sourceFilter;
    return matchSearch && matchStatus && matchSource;
  });

  const totals = {
    count: filtered.length,
    verified: filtered.filter((p) => p.verified).reduce((s, p) => s + Number(p.amount), 0),
    pending: filtered.filter((p) => !p.verified).reduce((s, p) => s + Number(p.amount), 0),
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Payments</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
            <option value="all">All status</option>
            <option value="pending">Pending approval</option>
            <option value="verified">Verified</option>
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
            <option value="all">All sources</option>
            <option value="stk">M-Pesa STK</option>
            <option value="manual">Manual</option>
          </select>
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
          <button
            onClick={() =>
              exportToXlsx(
                filtered.map((p: any) => ({
                  Name: p.registrations?.name,
                  Email: p.registrations?.email,
                  Phone: p.registrations?.phone,
                  Amount: Number(p.amount),
                  "M-Pesa Code": p.mpesa_code,
                  Source: p.source,
                  Verified: p.verified ? "Yes" : "No",
                  "Verified At": p.verified_at,
                  Created: p.created_at,
                })),
                "payments",
                "Payments"
              )
            }
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Showing</p><p className="text-xl font-bold">{totals.count}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Verified KES</p><p className="text-xl font-bold text-emerald-400">{totals.verified.toLocaleString()}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Pending KES</p><p className="text-xl font-bold text-yellow-400">{totals.pending.toLocaleString()}</p></div>
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
