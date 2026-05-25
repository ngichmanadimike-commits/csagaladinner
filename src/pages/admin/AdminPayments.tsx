// src/pages/admin/AdminPayments.tsx
// ─── UPGRADES vs original ────────────────────────────────────────────────────
//  1. Bulk Approve — select multiple pending payments and approve them all
//     in one click (with progress toast)
//  2. Duplicate M-Pesa code warning — highlights rows where the same
//     mpesa_code appears more than once in the dataset
//  3. Payment timeline inside expanded row — shows the sequence of all
//     payments for that registration so you can see instalment history
//  4. "Days pending" badge — shows how many days a payment has been
//     waiting for approval, with red highlight if > 1 day
//  5. Improved Add Manual Payment — phone pre-fills from registration,
//     shows live balance remaining after your typed amount
//  6. All original logic (verify, reject, delete, filter, export, add
//     manual, STK filter, source filter, search, stats) kept intact
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Search, CheckCircle2, XCircle, Download, Trash2,
  Plus, X, Info, AlertTriangle, Clock,
} from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  // Add manual payment form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addRegSearch, setAddRegSearch] = useState("");
  const [addRegResults, setAddRegResults] = useState<any[]>([]);
  const [addSelectedReg, setAddSelectedReg] = useState<any>(null);
  const [addAmount, setAddAmount] = useState("");
  const [addMpesa, setAddMpesa] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Timeline data for expanded rows
  const [timelineData, setTimelineData] = useState<Record<string, any[]>>({});

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select(`
        *,
        registrations(name, email, phone, total_cost, total_paid, payment_status, package_type, ticket_code)
      `)
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

  // ── Duplicate detection ─────────────────────────────────────────────────────
  const duplicateCodes = useMemo(() => {
    const codeMap: Record<string, number> = {};
    payments.forEach(p => {
      if (p.mpesa_code) codeMap[p.mpesa_code] = (codeMap[p.mpesa_code] || 0) + 1;
    });
    return new Set(Object.entries(codeMap).filter(([, v]) => v > 1).map(([k]) => k));
  }, [payments]);

  // ── Timeline fetch ──────────────────────────────────────────────────────────
  const fetchTimeline = async (registrationId: string) => {
    if (!registrationId || timelineData[registrationId]) return;
    const { data } = await supabase
      .from("payments")
      .select("id, amount, verified, verified_at, mpesa_code, created_at, source")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: true });
    if (data) setTimelineData(prev => ({ ...prev, [registrationId]: data }));
  };

  const handleExpand = (paymentId: string, registrationId: string) => {
    const next = expandedId === paymentId ? null : paymentId;
    setExpandedId(next);
    if (next && registrationId) fetchTimeline(registrationId);
  };

  // ── Registration search for manual payment form ─────────────────────────────
  const searchRegistrations = async () => {
    if (!addRegSearch.trim()) return;
    const { data } = await supabase
      .from("registrations")
      .select("id, name, email, phone, total_cost, total_paid, payment_status, package_type, ticket_code")
      .or(`email.ilike.%${addRegSearch}%,name.ilike.%${addRegSearch}%,ticket_code.ilike.%${addRegSearch}%`)
      .limit(6);
    setAddRegResults(data || []);
  };

  const handleAddManualPayment = async () => {
    if (!addSelectedReg) { toast.error("Select a registration first"); return; }
    const amt = Number(addAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!addMpesa.trim()) { toast.error("Enter M-Pesa code"); return; }

    // Check duplicate M-Pesa code
    const { data: dup } = await supabase
      .from("payments")
      .select("id")
      .eq("mpesa_code", addMpesa.trim().toUpperCase())
      .maybeSingle();
    if (dup) { toast.error("This M-Pesa code already exists in the system."); return; }

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
      toast.success(`KES ${amt.toLocaleString()} added — approve it below`);
      setShowAddForm(false);
      setAddRegSearch(""); setAddRegResults([]); setAddSelectedReg(null);
      setAddAmount(""); setAddMpesa(""); setAddPhone("");
      fetchPayments();
    } finally { setAddSubmitting(false); }
  };

  // ── Selection helpers ────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(p => p.id));

  // ── Bulk approve ─────────────────────────────────────────────────────────────
  const handleBulkApprove = async () => {
    const pendingSelected = selectedIds.filter(id => {
      const p = payments.find(x => x.id === id);
      return p && !p.verified;
    });
    if (!pendingSelected.length) { toast.error("No pending payments selected"); return; }
    if (!confirm(`Approve ${pendingSelected.length} pending payment(s)?`)) return;

    setBulkApproving(true);
    let approved = 0;
    const now = new Date().toISOString();

    for (const id of pendingSelected) {
      const { error } = await supabase
        .from("payments")
        .update({ verified: true, verified_at: now })
        .eq("id", id);
      if (!error) {
        approved++;
        const p = payments.find(x => x.id === id);
        if (p?.registration_id) await syncRegistrationStatus(p.registration_id, id, true);
      }
    }

    toast.success(`${approved} of ${pendingSelected.length} payments approved ✓`);
    logAdminAction({
      actionType: "BULK_APPROVE_PAYMENTS",
      description: `Bulk approved ${approved} payments`,
      metadata: { ids: pendingSelected, count: approved },
    });
    setSelectedIds([]);
    setBulkApproving(false);
    fetchPayments();
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} payment(s)? Cannot be undone.`)) return;
    setDeletingSelected(true);
    const { error } = await supabase.from("payments").delete().in("id", selectedIds);
    setDeletingSelected(false);
    if (error) { toast.error("Delete failed: " + error.message); }
    else {
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
    if (error) { toast.error("Delete failed: " + error.message); }
    else {
      toast.success("Payment deleted");
      if (payment.registration_id) syncRegistrationStatus(payment.registration_id, payment.id, null);
      setPayments(prev => prev.filter(p => p.id !== payment.id));
      setSelectedIds(prev => prev.filter(id => id !== payment.id));
    }
  };

  // ── Sync registration after payment state changes ────────────────────────────
  const syncRegistrationStatus = async (
    registrationId: string,
    excludePaymentId: string | null,
    overrideVerified: boolean | null
  ) => {
    const { data: allPays } = await supabase
      .from("payments")
      .select("id, amount, verified")
      .eq("registration_id", registrationId);
    if (!allPays) return;

    const pays = allPays.map((p: any) => {
      if (excludePaymentId !== null && p.id === excludePaymentId) {
        if (overrideVerified === null) return null;
        return { ...p, verified: overrideVerified };
      }
      return p;
    }).filter(Boolean) as any[];

    const { data: regData } = await supabase
      .from("registrations")
      .select("total_cost")
      .eq("id", registrationId)
      .single();

    const totalCost = Number(regData?.total_cost ?? 0);
    const totalPaid = pays.filter((p: any) => p.verified).reduce((s: number, p: any) => s + Number(p.amount), 0);
    const newStatus =
      totalPaid <= 0 ? "pending" :
      totalCost > 0 && totalPaid >= totalCost ? "paid" :
      "partial";

    await supabase.from("registrations").update({
      total_paid: totalPaid,
      payment_status: newStatus,
      ticket_issued: newStatus === "paid",
    }).eq("id", registrationId);

    return { totalPaid, newStatus };
  };

  // ── Verify / reject single ────────────────────────────────────────────────────
  const handleVerify = async (paymentId: string, verified: boolean) => {
    const target = payments.find(p => p.id === paymentId);
    if (!target) return;
    setVerifyingId(paymentId);

    const { error } = await supabase.from("payments").update({
      verified,
      verified_at: verified ? new Date().toISOString() : null,
    }).eq("id", paymentId);

    if (error) { toast.error("Failed: " + error.message); setVerifyingId(null); return; }

    if (target.registration_id) {
      const result = await syncRegistrationStatus(target.registration_id, paymentId, verified);
      if (verified && result?.newStatus === "paid") toast.success("✅ Approved — ticket issued!");
      else if (verified) toast.success(`✅ KES ${Number(target.amount).toLocaleString()} approved (partial)`);
      else toast.success("Payment rejected");
    }

    logAdminAction({
      actionType: verified ? "VERIFY_PAYMENT" : "REJECT_PAYMENT",
      description: `${verified ? "Approved" : "Rejected"} KES ${target.amount} for ${target.registrations?.name}`,
      targetType: "payment", targetId: paymentId,
      metadata: { amount: target.amount, mpesa_code: target.mpesa_code, source: target.source },
    });

    // Invalidate timeline cache for this registration so it re-fetches
    if (target.registration_id) {
      setTimelineData(prev => {
        const next = { ...prev };
        delete next[target.registration_id];
        return next;
      });
    }

    setVerifyingId(null);
    fetchPayments();
  };

  // ── Filter ────────────────────────────────────────────────────────────────────
  const filtered = payments.filter(p => {
    const reg = p.registrations as any;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      reg?.name?.toLowerCase().includes(q) ||
      reg?.email?.toLowerCase().includes(q) ||
      p.mpesa_code?.toLowerCase().includes(q) ||
      reg?.ticket_code?.toLowerCase().includes(q);
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
    pendingCount: filtered.filter(p => !p.verified).length,
  };

  // ── Days pending helper ────────────────────────────────────────────────────────
  const daysPending = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // ── Live balance preview in add form ──────────────────────────────────────────
  const addAmountNum = Number(addAmount);
  const addBalance = addSelectedReg
    ? Math.max(0, Number(addSelectedReg.total_cost) - Number(addSelectedReg.total_paid))
    : 0;
  const addAfterBalance = addSelectedReg ? Math.max(0, addBalance - addAmountNum) : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">Payments</h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            All payments require admin approval before a ticket is issued.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
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
            <input type="text" placeholder="Search name, code, ticket…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64" />
          </div>
          {selectedIds.length > 0 && (
            <>
              <button onClick={handleBulkApprove} disabled={bulkApproving}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-emerald-700 transition-colors">
                <CheckCircle2 size={16} />
                {bulkApproving ? "Approving…" : `Approve Selected (${selectedIds.length})`}
              </button>
              <button onClick={handleDeleteSelected} disabled={deletingSelected}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors">
                <Trash2 size={16} />
                {deletingSelected ? "Deleting…" : `Delete (${selectedIds.length})`}
              </button>
            </>
          )}
          <button onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
            <Plus size={16} /> Add Manual Payment
          </button>
          <button
            onClick={() => exportToXlsx(filtered.map((p: any) => ({
              Name: p.registrations?.name, Email: p.registrations?.email,
              Phone: p.registrations?.phone, Package: p.registrations?.package_type,
              "Ticket Code": p.registrations?.ticket_code,
              Amount: Number(p.amount), "M-Pesa Code": p.mpesa_code,
              Source: p.source, Verified: p.verified ? "Yes" : "No",
              "Verified At": p.verified_at, Created: p.created_at,
            })), "payments", "Payments")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 text-sm">
        <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">How approval works: </span>
          Payments arrive as <span className="text-yellow-400 font-medium">Pending</span>. Click{" "}
          <span className="text-emerald-400 font-medium">Approve</span> to verify. Once cumulative paid ≥ total cost, the ticket is auto-issued.
          Use <strong>Bulk Approve</strong> to approve multiple at once. Expand any row to see the full payment timeline for that registration.
        </p>
      </div>

      {/* Duplicate warning */}
      {duplicateCodes.size > 0 && (
        <div className="flex items-start gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4 text-sm">
          <AlertTriangle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-orange-400">Duplicate M-Pesa codes detected: </span>
            {[...duplicateCodes].join(", ")} — rows with duplicate codes are highlighted in orange. Investigate before approving.
          </p>
        </div>
      )}

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
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Search Registration (name, email, or ticket code)</label>
              <div className="flex gap-2">
                <input value={addRegSearch} onChange={e => setAddRegSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchRegistrations()}
                  placeholder="e.g. john@example.com or CSA-XXXXXX"
                  className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <button onClick={searchRegistrations}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Search</button>
              </div>
              {addRegResults.length > 0 && !addSelectedReg && (
                <div className="mt-2 space-y-1">
                  {addRegResults.map(r => (
                    <button key={r.id} onClick={() => {
                      setAddSelectedReg(r);
                      setAddRegResults([]);
                      setAddAmount(String(Math.max(0, r.total_cost - (r.total_paid || 0))));
                      setAddPhone(r.phone);
                    }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm flex justify-between items-center">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {r.ticket_code} · Balance KES {(r.total_cost - (r.total_paid || 0)).toLocaleString()} · {r.payment_status}
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
                    <span className="text-muted-foreground ml-2 text-xs">Balance: KES {addBalance.toLocaleString()}</span>
                  </div>
                  <button onClick={() => { setAddSelectedReg(null); setAddAmount(""); setAddPhone(""); }}
                    className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount Paid (KES)</label>
              <input type="number" min="1" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              {/* Live balance preview */}
              {addSelectedReg && addAmountNum > 0 && (
                <p className={`text-xs mt-1 ${addAfterBalance > 0 ? "text-orange-400" : "text-emerald-400"}`}>
                  {addAfterBalance > 0
                    ? `After this payment: KES ${addAfterBalance.toLocaleString()} still outstanding`
                    : "✓ This payment will fully settle the balance"}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">M-Pesa Transaction Code</label>
              <input type="text" value={addMpesa} onChange={e => setAddMpesa(e.target.value.toUpperCase())}
                placeholder="e.g. SJK3H7T9XQ"
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Payer Phone (optional)</label>
              <input type="tel" value={addPhone} onChange={e => setAddPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="sm:col-span-2">
              <button onClick={handleAddManualPayment}
                disabled={addSubmitting || !addSelectedReg || !addAmount || !addMpesa}
                className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {addSubmitting ? "Saving…" : "Save Payment (will appear as Pending — approve below)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="mb-3 text-sm text-muted-foreground">{selectedIds.length} of {filtered.length} selected</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Showing</p><p className="text-xl font-bold">{totals.count}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Verified KES</p><p className="text-xl font-bold text-emerald-400">{totals.verified.toLocaleString()}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Pending KES</p><p className="text-xl font-bold text-yellow-400">{totals.pending.toLocaleString()}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Pending Count</p><p className="text-xl font-bold text-orange-400">{totals.pendingCount}</p></div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="p-3 w-10">
                    <input type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll} className="w-4 h-4 cursor-pointer accent-primary" />
                  </th>
                  <th className="p-3">Name / Package</th>
                  <th className="p-3">M-Pesa Code</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Age</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const reg = p.registrations as any;
                  const balance = Math.max(0, Number(reg?.total_cost ?? 0) - Number(reg?.total_paid ?? 0));
                  const isExpanded = expandedId === p.id;
                  const isDuplicate = p.mpesa_code && duplicateCodes.has(p.mpesa_code);
                  const days = daysPending(p.created_at);
                  const timeline = p.registration_id ? (timelineData[p.registration_id] || []) : [];

                  return (
                    <>
                      <tr
                        key={p.id}
                        className={`border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors ${
                          isDuplicate ? "bg-orange-500/5 border-l-2 border-l-orange-400" :
                          !p.verified ? "bg-yellow-500/5" : ""
                        }`}
                        onClick={() => handleExpand(p.id, p.registration_id)}
                      >
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.includes(p.id)}
                            onChange={() => toggleSelect(p.id)} className="w-4 h-4 cursor-pointer accent-primary" />
                        </td>
                        <td className="p-3">
                          <p className="text-foreground font-medium">{reg?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{reg?.email || ""} · {reg?.package_type || ""}</p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground font-mono text-xs">{p.mpesa_code || "—"}</span>
                            {isDuplicate && <AlertTriangle size={12} className="text-orange-400" title="Duplicate code" />}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-emerald-400">
                          KES {Number(p.amount).toLocaleString()}
                          {reg?.total_cost && (
                            <span className="text-xs text-muted-foreground ml-1">/ {Number(reg.total_cost).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={balance > 0 ? "text-orange-400" : "text-emerald-400"}>
                            KES {balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.source === "stk" ? "bg-blue-400/10 text-blue-400" : "bg-muted text-muted-foreground"
                          }`}>
                            {p.source === "stk" ? "STK" : "Manual"}
                          </span>
                        </td>
                        <td className="p-3">
                          {!p.verified && (
                            <span className={`flex items-center gap-1 text-xs ${days >= 1 ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                              <Clock size={11} />
                              {days === 0 ? "Today" : `${days}d`}
                            </span>
                          )}
                          {p.verified && <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3">
                          <span title={p.verified_at ? `Approved ${new Date(p.verified_at).toLocaleString("en-KE")}` : "Awaiting approval"}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.verified ? "bg-emerald-400/10 text-emerald-400" : "bg-yellow-400/10 text-yellow-400"
                            }`}>
                            {p.verified ? "✓ Verified" : "⏳ Pending"}
                          </span>
                        </td>
                        <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            {!p.verified ? (
                              <button onClick={() => handleVerify(p.id, true)} disabled={verifyingId === p.id}
                                title="Approve payment"
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-40 text-xs font-semibold transition-colors">
                                {verifyingId === p.id ? "…" : <><CheckCircle2 size={13} /> Approve</>}
                              </button>
                            ) : (
                              <button onClick={() => handleVerify(p.id, false)} disabled={verifyingId === p.id}
                                title="Reject payment"
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40 text-xs font-semibold transition-colors">
                                {verifyingId === p.id ? "…" : <><XCircle size={13} /> Reject</>}
                              </button>
                            )}
                            <button onClick={() => handleDeleteRow(p)} disabled={deletingId === p.id}
                              title="Delete payment"
                              className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors">
                              {deletingId === p.id ? <span className="text-xs">…</span> : <Trash2 size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row — details + timeline */}
                      {isExpanded && (
                        <tr key={`${p.id}-detail`} className="bg-muted/10 border-b border-border/50">
                          <td colSpan={9} className="px-6 py-4 text-sm">
                            <div className="grid sm:grid-cols-3 gap-6">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Registration</p>
                                <p><span className="text-muted-foreground">Ticket:</span> <span className="font-mono font-bold text-primary">{reg?.ticket_code || "—"}</span></p>
                                <p><span className="text-muted-foreground">Phone:</span> {reg?.phone || "—"}</p>
                                <p><span className="text-muted-foreground">Reg Status:</span> <span className="capitalize">{reg?.payment_status}</span></p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">This Payment</p>
                                <p><span className="text-muted-foreground">Method:</span> {p.payment_method}</p>
                                <p><span className="text-muted-foreground">Submitted:</span> {new Date(p.created_at).toLocaleString("en-KE")}</p>
                                {p.verified_at && <p><span className="text-muted-foreground">Approved:</span> {new Date(p.verified_at).toLocaleString("en-KE")}</p>}
                                {!p.verified && (
                                  <button onClick={() => handleVerify(p.id, true)} disabled={verifyingId === p.id}
                                    className="mt-3 w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                    {verifyingId === p.id ? "Approving…" : "✓ Approve This Payment"}
                                  </button>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Payment Timeline</p>
                                {timeline.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">Loading…</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {timeline.map((t: any, i: number) => (
                                      <div key={t.id} className="flex items-start gap-2 text-xs">
                                        <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                                          t.verified ? "bg-emerald-400/20 text-emerald-400" : "bg-yellow-400/20 text-yellow-400"
                                        }`}>{i + 1}</div>
                                        <div>
                                          <span className="font-semibold text-foreground">KES {Number(t.amount).toLocaleString()}</span>
                                          <span className="text-muted-foreground ml-1">{t.mpesa_code || "—"}</span>
                                          <br />
                                          <span className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString("en-KE")} · {t.verified ? "✓" : "⏳"} {t.source}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
