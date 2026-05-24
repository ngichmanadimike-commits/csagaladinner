// src/pages/admin/AdminPayments.tsx  ← FULL REPLACEMENT
// 
// FIXES in this version:
//  1. handleVerify now correctly recalculates registration totals client-side
//     as a belt-and-suspenders (the SQL fix to the trigger is the real fix,
//     but this ensures the UI stays correct even if there's any lag).
//  2. Fixed bug in previous belt-and-suspenders: payment id was not selected,
//     so the newly-approved payment was never counted in the local recalc.
//  3. Optimistic UI update: the payments list updates immediately on screen
//     rather than waiting for a full re-fetch.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, CheckCircle2, XCircle, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";
import { logAdminAction } from "@/lib/adminLog";

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "stk" | "manual">("all");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, registrations(name, email, phone, total_cost, payment_status)")
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

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(p => p.id));

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} payment(s)? Cannot be undone.`)) return;
    setDeletingSelected(true);
    const { error } = await supabase.from("payments").delete().in("id", selectedIds);
    setDeletingSelected(false);
    if (error) {
      toast.error("Delete failed: " + error.message);
      logAdminAction({ actionType: "DELETE_PAYMENT", description: `Failed to delete ${selectedIds.length} payments`, targetType: "payment", status: "failed", metadata: { error: error.message, ids: selectedIds } });
    } else {
      toast.success(`${selectedIds.length} payment(s) deleted`);
      logAdminAction({ actionType: "DELETE_PAYMENT", description: `Deleted ${selectedIds.length} payment(s)`, targetType: "payment", metadata: { count: selectedIds.length, ids: selectedIds } });
      setPayments(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    }
  };

  const handleDeleteRow = async (payment: any) => {
    const reg = payment.registrations;
    if (!confirm(`Delete payment of KES ${payment.amount} for ${reg?.name || "Unknown"}? Cannot be undone.`)) return;
    setDeletingId(payment.id);
    const { error } = await supabase.from("payments").delete().eq("id", payment.id);
    setDeletingId(null);
    if (error) {
      toast.error("Delete failed: " + error.message);
      logAdminAction({ actionType: "DELETE_PAYMENT", description: `Failed to delete payment`, targetType: "payment", targetId: payment.id, status: "failed", metadata: { error: error.message } });
    } else {
      toast.success("Payment deleted");
      logAdminAction({ actionType: "DELETE_PAYMENT", description: `Deleted payment of KES ${payment.amount} for ${reg?.name}`, targetType: "payment", targetId: payment.id, metadata: { amount: payment.amount, mpesa_code: payment.mpesa_code } });
      setPayments(prev => prev.filter(p => p.id !== payment.id));
      setSelectedIds(prev => prev.filter(id => id !== payment.id));
    }
  };

  const handleVerify = async (paymentId: string, verified: boolean) => {
    const target = payments.find(p => p.id === paymentId);
    if (!target) return;
    setVerifyingId(paymentId);

    // Step 1: Update the payment's verified status
    const { error } = await supabase
      .from("payments")
      .update({ verified, verified_at: verified ? new Date().toISOString() : null })
      .eq("id", paymentId);

    if (error) {
      toast.error("Failed to update payment: " + error.message);
      logAdminAction({
        actionType: verified ? "VERIFY_PAYMENT" : "REJECT_PAYMENT",
        description: `Failed to ${verified ? "approve" : "reject"} payment`,
        targetType: "payment", targetId: paymentId, status: "failed",
        metadata: { error: error.message },
      });
      setVerifyingId(null);
      return;
    }

    // Step 2: Belt-and-suspenders client-side recalc of the registration.
    // The DB trigger (recalc_registration_totals) should handle this automatically
    // after the FIX_5 SQL migration (SECURITY DEFINER). This is a fallback.
    if (target.registration_id) {
      const { data: allPays } = await supabase
        .from("payments")
        .select("id, amount, verified")           // ← id is now selected (was missing before)
        .eq("registration_id", target.registration_id);

      if (allPays) {
        // Apply the new verified state to the local list before summing
        const withUpdate = allPays.map((p: any) =>
          p.id === paymentId ? { ...p, verified } : p
        );
        const totalPaid = withUpdate
          .filter((p: any) => p.verified)
          .reduce((s: number, p: any) => s + Number(p.amount), 0);

        const totalCost = Number(target.registrations?.total_cost ?? 0);
        const newStatus =
          totalPaid <= 0 ? "pending" :
          totalCost > 0 && totalPaid >= totalCost ? "paid" :
          "partial";

        await supabase
          .from("registrations")
          .update({
            total_paid:     totalPaid,
            payment_status: newStatus,
            ticket_issued:  newStatus === "paid",
          })
          .eq("id", target.registration_id);
      }
    }

    toast.success(verified ? "Payment approved ✓" : "Payment rejected");
    logAdminAction({
      actionType: verified ? "VERIFY_PAYMENT" : "REJECT_PAYMENT",
      description: `${verified ? "Approved" : "Rejected"} payment of KES ${target.amount} for ${target.registrations?.name}`,
      targetType: "payment", targetId: paymentId,
      metadata: { amount: target.amount, mpesa_code: target.mpesa_code, registration_id: target.registration_id },
    });

    setVerifyingId(null);
    fetchPayments();
  };

  const filtered = payments.filter(p => {
    const reg = p.registrations as any;
    const q = search.toLowerCase();
    const matchSearch = !search ||
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
    count:    filtered.length,
    verified: filtered.filter(p => p.verified).reduce((s, p) => s + Number(p.amount), 0),
    pending:  filtered.filter(p => !p.verified).reduce((s, p) => s + Number(p.amount), 0),
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Payments</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
            <option value="all">All status</option>
            <option value="pending">Pending approval</option>
            <option value="verified">Verified</option>
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
            <option value="all">All sources</option>
            <option value="stk">M-Pesa STK</option>
            <option value="manual">Manual</option>
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search by name, email, or M-Pesa code..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-72" />
          </div>
          {selectedIds.length > 0 && (
            <button onClick={handleDeleteSelected} disabled={deletingSelected}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors">
              <Trash2 size={16} />
              {deletingSelected ? "Deleting..." : `Delete (${selectedIds.length})`}
            </button>
          )}
          <button
            onClick={() => exportToXlsx(filtered.map((p: any) => ({
              Name: p.registrations?.name, Email: p.registrations?.email,
              Phone: p.registrations?.phone, Amount: Number(p.amount),
              "M-Pesa Code": p.mpesa_code, Source: p.source,
              Verified: p.verified ? "Yes" : "No", "Verified At": p.verified_at, Created: p.created_at,
            })), "payments", "Payments")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-3 text-sm text-muted-foreground">{selectedIds.length} of {filtered.length} selected</div>
      )}

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
                  <th className="p-3 w-12">
                    <input type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll} className="w-4 h-4 cursor-pointer accent-primary" />
                  </th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">M-Pesa Code</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const reg = p.registrations as any;
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3">
                        <input type="checkbox" checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)} className="w-4 h-4 cursor-pointer accent-primary" />
                      </td>
                      <td className="p-3 text-foreground">{reg?.name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{reg?.email || "—"}</td>
                      <td className="p-3 text-foreground font-semibold">KES {Number(p.amount).toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">{p.mpesa_code || "—"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.source === "stk" ? "bg-blue-400/10 text-blue-400" : "bg-muted text-muted-foreground"
                        }`}>
                          {p.source === "stk" ? "STK" : "Manual"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          title={p.verified && p.verified_at
                            ? `Approved ${new Date(p.verified_at).toLocaleString("en-KE")}`
                            : "Awaiting approval"}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.verified ? "bg-emerald-400/10 text-emerald-400" : "bg-yellow-400/10 text-yellow-400"
                          }`}
                        >
                          {p.verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          {!p.verified ? (
                            <button
                              onClick={() => handleVerify(p.id, true)}
                              disabled={verifyingId === p.id}
                              title="Approve payment"
                              className="p-1.5 rounded-lg hover:bg-emerald-400/10 text-emerald-400 disabled:opacity-40 transition-colors"
                            >
                              {verifyingId === p.id
                                ? <span className="text-xs animate-pulse">…</span>
                                : <CheckCircle2 size={16} />}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerify(p.id, false)}
                              disabled={verifyingId === p.id}
                              title="Reject / un-verify"
                              className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors"
                            >
                              {verifyingId === p.id
                                ? <span className="text-xs animate-pulse">…</span>
                                : <XCircle size={16} />}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRow(p)}
                            disabled={deletingId === p.id}
                            title="Delete payment"
                            className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors"
                          >
                            {deletingId === p.id
                              ? <span className="text-xs">...</span>
                              : <Trash2 size={15} />}
                          </button>
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
