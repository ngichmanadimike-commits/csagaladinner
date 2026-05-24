// src/pages/admin/AdminPayments.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, CheckCircle2, XCircle, Download, Trash2, Plus, X } from "lucide-react";
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

  // Add manual payment form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addRegSearch, setAddRegSearch] = useState("");
  const [addRegResults, setAddRegResults] = useState<any[]>([]);
  const [addSelectedReg, setAddSelectedReg] = useState<any>(null);
  const [addAmount, setAddAmount] = useState("");
  const [addMpesa, setAddMpesa] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

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

  const searchRegistrations = async () => {
    if (!addRegSearch.trim()) return;
    const { data } = await supabase
      .from("registrations")
      .select("id, name, email, phone, total_cost, total_paid, payment_status")
      .or(`email.ilike.%${addRegSearch}%,name.ilike.%${addRegSearch}%,ticket_code.ilike.%${addRegSearch}%`)
      .limit(5);
    setAddRegResults(data || []);
  };

  const handleAddManualPayment = async () => {
    if (!addSelectedReg) { toast.error("Select a registration first"); return; }
    const amt = Number(addAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!addMpesa.trim()) { toast.error("Enter M-Pesa code"); return; }
    setAddSubmitting(true);
    try {
      const { error } = await supabase.from("payments").insert({
        registration_id: addSelectedReg.id,
        amount: amt,
        mpesa_code: addMpesa.trim().toUpperCase(),
        payment_method: "mpesa_manual",
        phone: addPhone || addSelectedReg.phone,
        verified: false,
        source: "manual",
      });
      if (error) { toast.error("Failed: " + error.message); return; }
      logAdminAction({
        actionType: "ADD_PAYMENT",
        description: `Added manual payment of KES ${amt} for ${addSelectedReg.name}`,
        targetType: "payment",
        metadata: { amount: amt, mpesa_code: addMpesa, registration_id: addSelectedReg.id },
      });
      toast.success(`Payment of KES ${amt.toLocaleString()} added`);
      setShowAddForm(false);
      setAddRegSearch(""); setAddRegResults([]); setAddSelectedReg(null);
      setAddAmount(""); setAddMpesa(""); setAddPhone("");
      fetchPayments();
    } finally { setAddSubmitting(false); }
  };

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
    } else {
      toast.success(`${selectedIds.length} payment(s) deleted`);
      setPayments(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    }
  };

  const handleDeleteRow = async (payment: any) => {
    const reg = payment.registrations;
    if (!confirm(`Delete payment of KES ${payment.amount} for ${reg?.name || "Unknown"}?`)) return;
    setDeletingId(payment.id);
    const { error } = await supabase.from("payments").delete().eq("id", payment.id);
    setDeletingId(null);
    if (error) {
      toast.error("Delete failed: " + error.message);
    } else {
      toast.success("Payment deleted");
      setPayments(prev => prev.filter(p => p.id !== payment.id));
      setSelectedIds(prev => prev.filter(id => id !== payment.id));
    }
  };

  const handleVerify = async (paymentId: string, verified: boolean) => {
    const target = payments.find(p => p.id === paymentId);
    if (!target) return;
    setVerifyingId(paymentId);

    const { error } = await supabase
      .from("payments")
      .update({ verified, verified_at: verified ? new Date().toISOString() : null })
      .eq("id", paymentId);

    if (error) {
      toast.error("Failed to update payment: " + error.message);
      setVerifyingId(null);
      return;
    }

    if (target.registration_id) {
      const { data: allPays } = await supabase
        .from("payments")
        .select("id, amount, verified")
        .eq("registration_id", target.registration_id);

      if (allPays) {
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
            total_paid: totalPaid,
            payment_status: newStatus,
            ticket_issued: newStatus === "paid",
          })
          .eq("id", target.registration_id);
      }
    }

    toast.success(verified ? "Payment approved ✓" : "Payment rejected");
    logAdminAction({
      actionType: verified ? "VERIFY_PAYMENT" : "REJECT_PAYMENT",
      description: `${verified ? "Approved" : "Rejected"} payment of KES ${target.amount} for ${target.registrations?.name}`,
      targetType: "payment", targetId: paymentId,
      metadata: { amount: target.amount, mpesa_code: target.mpesa_code },
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
    count: filtered.length,
    verified: filtered.filter(p => p.verified).reduce((s, p) => s + Number(p.amount), 0),
    pending: filtered.filter(p => !p.verified).reduce((s, p) => s + Number(p.amount), 0),
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
            <input type="text" placeholder="Search name, email, M-Pesa code..." value={search}
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
          <button onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
            <Plus size={16} /> Add Manual Payment
          </button>
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

      {/* Add Manual Payment Panel */}
      {showAddForm && (
        <div className="glass rounded-xl p-5 mb-4 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Add Manual Payment</h2>
            <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X size={16} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Registration lookup */}
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Search Registration (name, email, or ticket code)</label>
              <div className="flex gap-2">
                <input
                  value={addRegSearch}
                  onChange={e => setAddRegSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchRegistrations()}
                  placeholder="e.g. john@example.com or John Doe"
                  className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button onClick={searchRegistrations}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                  Search
                </button>
              </div>
              {addRegResults.length > 0 && !addSelectedReg && (
                <div className="mt-2 space-y-1">
                  {addRegResults.map(r => (
                    <button key={r.id} onClick={() => { setAddSelectedReg(r); setAddRegResults([]); setAddAmount(String(r.total_cost - (r.total_paid || 0))); setAddPhone(r.phone); }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm flex justify-between items-center">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground text-xs">
                        Balance: KES {(r.total_cost - (r.total_paid || 0)).toLocaleString()} · {r.payment_status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {addSelectedReg && (
                <div className="mt-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-foreground">{addSelectedReg.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{addSelectedReg.email}</span>
                    <span className="text-muted-foreground ml-2 text-xs">Balance: KES {(addSelectedReg.total_cost - (addSelectedReg.total_paid || 0)).toLocaleString()}</span>
                  </div>
                  <button onClick={() => setAddSelectedReg(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount Paid (KES)</label>
              <input
                type="number"
                min="1"
                value={addAmount}
                onChange={e => setAddAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* M-Pesa Code */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">M-Pesa Transaction Code</label>
              <input
                type="text"
                value={addMpesa}
                onChange={e => setAddMpesa(e.target.value.toUpperCase())}
                placeholder="e.g. SJK3H7T9XQ"
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Payer Phone (optional)</label>
              <input
                type="tel"
                value={addPhone}
                onChange={e => setAddPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                onClick={handleAddManualPayment}
                disabled={addSubmitting || !addSelectedReg || !addAmount || !addMpesa}
                className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {addSubmitting ? "Saving..." : "Save Payment (unverified — approve manually)"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <th className="p-3">Amount Paid</th>
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
                      <td className="p-3 text-foreground font-semibold text-emerald-400">
                        KES {Number(p.amount).toLocaleString()}
                        {reg?.total_cost && (
                          <span className="text-xs text-muted-foreground ml-1">/ {Number(reg.total_cost).toLocaleString()}</span>
                        )}
                      </td>
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
