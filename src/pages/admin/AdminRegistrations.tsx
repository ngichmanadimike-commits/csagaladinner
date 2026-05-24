// src/pages/admin/AdminRegistrations.tsx  ← FULL REPLACEMENT FILE
// Changes vs original:
//   1. Added "Approve / Reject payment" inline action — finds the latest unverified
//      payment for a registration and verifies it (or un-verifies it). The DB trigger
//      recalc_registration_totals then automatically updates total_paid & payment_status.
//   2. Added a payment_status filter dropdown so admin can quickly see pending-only, etc.
//   3. Fixed confirmedRevenue calculation — was filtering on "confirmed" which is not a
//      valid status in the DB enum; only "paid" is used for fully-paid registrations.
//   4. Added logAdminAction calls to the approve/reject flow.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Trash2, Download, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";
import { logAdminAction } from "@/lib/adminLog";

interface Registration {
  id: string;
  ticket_code: string | null;
  name: string;
  email: string;
  phone: string;
  package_type: string;
  quantity: number;
  total_cost: number;
  total_paid: number;
  payment_status: string;
  ticket_issued: boolean;
  created_at: string;
}

const AdminRegistrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "partial" | "paid" | "failed">("all");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from("registrations")
      .select("id, ticket_code, name, email, phone, package_type, quantity, total_cost, total_paid, payment_status, ticket_issued, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load registrations: " + error.message);
    setRegistrations((data as Registration[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRegistrations();
    const channel = supabase
      .channel("registrations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, fetchRegistrations)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Approve / reject payment for a registration ──────────────────────────
  // Finds the most recent unverified payment for this registration and
  // verifies it. The DB trigger then recalculates total_paid & payment_status.
  const handleApprovePayment = async (reg: Registration) => {
    setApprovingId(reg.id);
    const { data: payments, error: fetchErr } = await supabase
      .from("payments")
      .select("id, amount, verified")
      .eq("registration_id", reg.id)
      .order("created_at", { ascending: false });

    if (fetchErr || !payments || payments.length === 0) {
      toast.error("No payment records found for this registration.");
      setApprovingId(null);
      return;
    }

    const latestUnverified = payments.find((p: any) => !p.verified);
    if (!latestUnverified) {
      // All payments already verified — offer to un-verify the latest
      const latest = payments[0] as any;
      const { error } = await supabase
        .from("payments")
        .update({ verified: false, verified_at: null })
        .eq("id", latest.id);
      if (error) {
        toast.error("Failed to reject payment: " + error.message);
      } else {
        toast.success("Payment rejected — registration status updated.");
        logAdminAction({
          actionType: "REJECT_PAYMENT",
          description: `Rejected payment of KES ${latest.amount} for ${reg.name}`,
          targetType: "payment",
          targetId: latest.id,
          metadata: { registration_id: reg.id, amount: latest.amount },
        });
        fetchRegistrations();
      }
      setApprovingId(null);
      return;
    }

    const { error } = await supabase
      .from("payments")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", latestUnverified.id);

    if (error) {
      toast.error("Failed to approve payment: " + error.message);
    } else {
      toast.success(`Payment of KES ${latestUnverified.amount} approved.`);
      logAdminAction({
        actionType: "VERIFY_PAYMENT",
        description: `Approved payment of KES ${latestUnverified.amount} for ${reg.name} (${reg.ticket_code})`,
        targetType: "payment",
        targetId: latestUnverified.id,
        metadata: { registration_id: reg.id, amount: latestUnverified.amount },
      });
      fetchRegistrations();
    }
    setApprovingId(null);
  };

  // ── Delete helpers ────────────────────────────────────────────────────────
  const deleteRegistrationWithPayments = async (id: string): Promise<string | null> => {
    const { error: payErr } = await supabase.from("payments").delete().eq("registration_id", id);
    if (payErr) return payErr.message;
    const { error: regErr } = await supabase.from("registrations").delete().eq("id", id);
    if (regErr) return regErr.message;
    return null;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((r) => r.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} registration(s) and ALL their payment records? This cannot be undone.`)) return;
    setDeletingSelected(true);
    let failed = 0;
    for (const id of selectedIds) {
      const err = await deleteRegistrationWithPayments(id);
      if (err) failed++;
    }
    setDeletingSelected(false);
    if (failed > 0) {
      toast.error(`${failed} deletion(s) failed`);
    } else {
      toast.success(`${selectedIds.length} registration(s) and linked payments deleted`);
      setRegistrations((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
    }
  };

  const handleDeleteRow = async (row: Registration) => {
    if (!confirm(`Delete booking ${row.ticket_code || row.id} for ${row.name}?\n\nThis will also delete ALL payment records linked to this booking. Cannot be undone.`)) return;
    setDeletingId(row.id);
    const err = await deleteRegistrationWithPayments(row.id);
    setDeletingId(null);
    if (err) {
      toast.error("Delete failed: " + err);
    } else {
      toast.success("Registration and linked payments deleted");
      setRegistrations((prev) => prev.filter((r) => r.id !== row.id));
      setSelectedIds((prev) => prev.filter((id) => id !== row.id));
    }
  };

  const handleExport = () => {
    exportToXlsx(
      registrations.map((r) => ({
        booking_code: r.ticket_code || "",
        name: r.name, email: r.email, phone: r.phone,
        package: r.package_type, qty: r.quantity,
        total_cost: r.total_cost, total_paid: r.total_paid,
        balance: Math.max(0, r.total_cost - r.total_paid),
        status: r.payment_status,
        ticket_issued: r.ticket_issued ? "Yes" : "No",
        date: new Date(r.created_at).toLocaleDateString("en-KE"),
      })),
      "registrations", "Registrations"
    );
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.ticket_code?.toLowerCase().includes(q) ||
      r.package_type?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Stats — FIX: was wrongly including "confirmed" (not a DB enum value) ──
  const confirmedRevenue = registrations
    .filter((r) => r.payment_status === "paid")
    .reduce((s, r) => s + Number(r.total_paid), 0);
  const totalExpected = registrations.reduce((s, r) => s + Number(r.total_cost), 0);
  const balance = totalExpected - confirmedRevenue;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Registrations</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search name, email, phone, booking code..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-72" />
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm font-semibold hover:border-primary transition-colors">
            <Download size={16} /> Export
          </button>
          {selectedIds.length > 0 && (
            <button onClick={handleDeleteSelected} disabled={deletingSelected}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors">
              <Trash2 size={16} />
              {deletingSelected ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Total Registrations</p>
          <p className="text-xl font-bold">{registrations.length}</p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Confirmed Revenue</p>
          <p className="text-xl font-bold text-emerald-400">KES {confirmedRevenue.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <p className="text-xl font-bold text-yellow-400">KES {balance.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Tickets Issued</p>
          <p className="text-xl font-bold text-primary">{registrations.filter((r) => r.ticket_issued).length}</p>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-3 text-sm text-muted-foreground">
          {selectedIds.length} of {filtered.length} selected
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No registrations found.</div>
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
                  <th className="p-3">Booking Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Package</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Paid / Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ticket</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <input type="checkbox" checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelect(r.id)} className="w-4 h-4 cursor-pointer accent-primary" />
                    </td>
                    <td className="p-3 font-mono text-xs text-primary font-bold">{r.ticket_code || "—"}</td>
                    <td className="p-3 text-foreground font-medium">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{r.email}</td>
                    <td className="p-3 text-muted-foreground">{r.phone}</td>
                    <td className="p-3 text-foreground capitalize">{r.package_type}</td>
                    <td className="p-3 text-center text-foreground">{r.quantity}</td>
                    <td className="p-3">
                      <span className="text-emerald-400 font-semibold">{Number(r.total_paid).toLocaleString()}</span>
                      <span className="text-muted-foreground"> / {Number(r.total_cost).toLocaleString()}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.payment_status === "paid" ? "bg-emerald-400/10 text-emerald-400"
                        : r.payment_status === "partial" ? "bg-blue-400/10 text-blue-400"
                        : r.payment_status === "pending" ? "bg-yellow-400/10 text-yellow-400"
                        : "bg-red-400/10 text-red-400"
                      }`}>
                        {r.payment_status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {r.ticket_issued
                        ? <span className="text-xs text-emerald-400 font-semibold">✓ Issued</span>
                        : <span className="text-xs text-muted-foreground">Pending</span>}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString("en-KE")}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        {/* Approve payment — green when pending/partial, red (reject) when already paid */}
                        {(r.payment_status === "pending" || r.payment_status === "partial") && (
                          <button
                            onClick={() => handleApprovePayment(r)}
                            disabled={approvingId === r.id}
                            title="Approve latest payment"
                            className="p-1.5 rounded-lg hover:bg-emerald-400/10 text-emerald-400 disabled:opacity-40 transition-colors"
                          >
                            {approvingId === r.id
                              ? <span className="text-xs">…</span>
                              : <CheckCircle2 size={15} />}
                          </button>
                        )}
                        {r.payment_status === "paid" && (
                          <button
                            onClick={() => handleApprovePayment(r)}
                            disabled={approvingId === r.id}
                            title="Reject / un-verify latest payment"
                            className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors"
                          >
                            {approvingId === r.id
                              ? <span className="text-xs">…</span>
                              : <XCircle size={15} />}
                          </button>
                        )}
                        <button onClick={() => handleDeleteRow(r)} disabled={deletingId === r.id}
                          title="Delete registration and all linked payments"
                          className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors">
                          {deletingId === r.id ? <span className="text-xs">...</span> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRegistrations;
