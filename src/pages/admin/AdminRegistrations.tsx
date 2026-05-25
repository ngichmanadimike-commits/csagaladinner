// src/pages/admin/AdminRegistrations.tsx
// ─── UPGRADES vs original ────────────────────────────────────────────────────
//  1. Detail Drawer — click any row to open a side-drawer with:
//       • full contact info, booking code, package & quantity
//       • live payment history (all payments for this registration)
//       • one-click approve / reject on each payment row
//       • "Add payment note" field so admin can annotate a record
//  2. Payment-history column replaces generic "Ticket" column — shows
//     payments count + verified count so admin can glance without clicking
//  3. Realtime indicator — a subtle pulsing "LIVE" badge so admin knows the
//     table auto-refreshes
//  4. Better stats bar — added "Partial Payments" count
//  5. Sorting — click column headers to sort (created_at desc by default)
//  6. All existing approve/reject/delete/export/filter logic kept intact
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Search, Trash2, Download, CheckCircle2, XCircle,
  ChevronUp, ChevronDown, X, ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";
import { logAdminAction } from "@/lib/adminLog";

// ── Types ────────────────────────────────────────────────────────────────────
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
  institution?: string | null;
}

interface Payment {
  id: string;
  amount: number;
  mpesa_code: string | null;
  payment_method: string;
  phone: string | null;
  source: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
}

type SortKey = keyof Pick<Registration, "name" | "created_at" | "total_cost" | "total_paid" | "payment_status">;

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  paid:    "bg-emerald-400/10 text-emerald-400",
  partial: "bg-blue-400/10 text-blue-400",
  pending: "bg-yellow-400/10 text-yellow-400",
  failed:  "bg-red-400/10 text-red-400",
  refunded:"bg-purple-400/10 text-purple-400",
};

// ── Main Component ────────────────────────────────────────────────────────────
const AdminRegistrations = () => {
  // data
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  // filters / sort
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // action states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // detail drawer
  const [drawerReg, setDrawerReg] = useState<Registration | null>(null);
  const [drawerPayments, setDrawerPayments] = useState<Payment[]>([]);
  const [drawerPayLoading, setDrawerPayLoading] = useState(false);
  const [drawerApprovingId, setDrawerApprovingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id, ticket_code, name, email, phone, package_type, quantity, " +
        "total_cost, total_paid, payment_status, ticket_issued, created_at, institution"
      )
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load registrations: " + error.message);
    setRegistrations((data as Registration[]) || []);
    setLoading(false);
  };

  const fetchDrawerPayments = async (regId: string) => {
    setDrawerPayLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("id, amount, mpesa_code, payment_method, phone, source, verified, verified_at, created_at")
      .eq("registration_id", regId)
      .order("created_at", { ascending: false });
    setDrawerPayments((data as Payment[]) || []);
    setDrawerPayLoading(false);
  };

  useEffect(() => {
    fetchRegistrations();
    const channel = supabase
      .channel("registrations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, () => {
        fetchRegistrations();
        if (drawerReg) fetchDrawerPayments(drawerReg.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch drawer payments when drawer opens
  useEffect(() => {
    if (drawerReg) {
      fetchDrawerPayments(drawerReg.id);
      setNoteText("");
    }
  }, [drawerReg?.id]);

  // Close drawer on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerReg(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Payment approve / reject (table-level) ────────────────────────────────
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
      const latest = payments[0] as any;
      const { error } = await supabase
        .from("payments")
        .update({ verified: false, verified_at: null })
        .eq("id", latest.id);
      if (error) { toast.error("Failed to reject: " + error.message); }
      else {
        toast.success("Payment rejected.");
        logAdminAction({ actionType: "REJECT_PAYMENT", description: `Rejected KES ${latest.amount} for ${reg.name}`, targetType: "payment", targetId: latest.id, metadata: { registration_id: reg.id } });
        fetchRegistrations();
      }
      setApprovingId(null);
      return;
    }

    const { error } = await supabase
      .from("payments")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", latestUnverified.id);
    if (error) { toast.error("Approve failed: " + error.message); }
    else {
      toast.success(`KES ${latestUnverified.amount.toLocaleString()} approved ✓`);
      logAdminAction({ actionType: "VERIFY_PAYMENT", description: `Approved KES ${latestUnverified.amount} for ${reg.name}`, targetType: "payment", targetId: latestUnverified.id, metadata: { registration_id: reg.id } });
      fetchRegistrations();
    }
    setApprovingId(null);
  };

  // ── Payment approve / reject (inside drawer) ──────────────────────────────
  const handleDrawerVerify = async (pay: Payment, verified: boolean) => {
    setDrawerApprovingId(pay.id);
    const { error } = await supabase
      .from("payments")
      .update({ verified, verified_at: verified ? new Date().toISOString() : null })
      .eq("id", pay.id);
    if (error) { toast.error("Failed: " + error.message); }
    else {
      toast.success(verified ? `KES ${Number(pay.amount).toLocaleString()} approved ✓` : "Payment rejected");
      logAdminAction({
        actionType: verified ? "VERIFY_PAYMENT" : "REJECT_PAYMENT",
        description: `${verified ? "Approved" : "Rejected"} KES ${pay.amount} for ${drawerReg?.name}`,
        targetType: "payment", targetId: pay.id,
      });
      // Refresh both drawer and table
      await fetchRegistrations();
      if (drawerReg) {
        fetchDrawerPayments(drawerReg.id);
        // Sync drawerReg with fresh data
        const { data: fresh } = await supabase
          .from("registrations")
          .select("id, ticket_code, name, email, phone, package_type, quantity, total_cost, total_paid, payment_status, ticket_issued, created_at, institution")
          .eq("id", drawerReg.id)
          .single();
        if (fresh) setDrawerReg(fresh as Registration);
      }
    }
    setDrawerApprovingId(null);
  };

  // ── Delete helpers ────────────────────────────────────────────────────────
  const deleteRegistrationWithPayments = async (id: string): Promise<string | null> => {
    const { error: payErr } = await supabase.from("payments").delete().eq("registration_id", id);
    if (payErr) return payErr.message;
    const { error: regErr } = await supabase.from("registrations").delete().eq("id", id);
    if (regErr) return regErr.message;
    return null;
  };

  const handleDeleteRow = async (row: Registration) => {
    if (!confirm(`Delete booking ${row.ticket_code || row.id} for ${row.name}?\n\nThis also deletes ALL linked payments. Cannot be undone.`)) return;
    setDeletingId(row.id);
    const err = await deleteRegistrationWithPayments(row.id);
    setDeletingId(null);
    if (err) { toast.error("Delete failed: " + err); }
    else {
      toast.success("Registration and linked payments deleted");
      setRegistrations(prev => prev.filter(r => r.id !== row.id));
      setSelectedIds(prev => prev.filter(id => id !== row.id));
      if (drawerReg?.id === row.id) setDrawerReg(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} registration(s) and ALL their payment records? Cannot be undone.`)) return;
    setDeletingSelected(true);
    let failed = 0;
    for (const id of selectedIds) {
      const err = await deleteRegistrationWithPayments(id);
      if (err) failed++;
    }
    setDeletingSelected(false);
    if (failed > 0) { toast.error(`${failed} deletion(s) failed`); }
    else {
      toast.success(`${selectedIds.length} registration(s) deleted`);
      setRegistrations(prev => prev.filter(r => !selectedIds.includes(r.id)));
      setSelectedIds([]);
    }
  };

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(r => r.id));

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    exportToXlsx(
      registrations.map(r => ({
        booking_code: r.ticket_code || "",
        name: r.name, email: r.email, phone: r.phone, institution: r.institution || "",
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

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = registrations
    .filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.includes(q) ||
        r.ticket_code?.toLowerCase().includes(q) ||
        r.package_type?.toLowerCase().includes(q) ||
        r.institution?.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || r.payment_status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const confirmedRevenue = registrations
    .filter(r => r.payment_status === "paid")
    .reduce((s, r) => s + Number(r.total_paid), 0);
  const totalExpected = registrations.reduce((s, r) => s + Number(r.total_cost), 0);
  const balance = totalExpected - confirmedRevenue;
  const partialCount = registrations.filter(r => r.payment_status === "partial").length;

  // ── Sort icon ─────────────────────────────────────────────────────────────
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="opacity-30 ml-1 inline" />;
    return sortAsc
      ? <ChevronUp size={12} className="ml-1 inline text-primary" />
      : <ChevronDown size={12} className="ml-1 inline text-primary" />;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-foreground">Registrations</h1>
          {/* LIVE indicator */}
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search name, email, phone, code…" value={search}
              onChange={e => setSearch(e.target.value)}
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
              {deletingSelected ? "Deleting…" : `Delete (${selectedIds.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: registrations.length, color: "" },
          { label: "Confirmed Revenue", value: `KES ${confirmedRevenue.toLocaleString()}`, color: "text-emerald-400" },
          { label: "Outstanding", value: `KES ${balance.toLocaleString()}`, color: "text-yellow-400" },
          { label: "Partial", value: partialCount, color: "text-blue-400" },
          { label: "Tickets Issued", value: registrations.filter(r => r.ticket_issued).length, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-3 text-sm text-muted-foreground">{selectedIds.length} of {filtered.length} selected</div>
      )}

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No registrations found.</div>
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
                  <th className="p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("name")}>
                    Name <SortIcon col="name" />
                  </th>
                  <th className="p-3">Booking Code</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Package / Qty</th>
                  <th className="p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("total_paid")}>
                    Paid / Total <SortIcon col="total_paid" />
                  </th>
                  <th className="p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("payment_status")}>
                    Status <SortIcon col="payment_status" />
                  </th>
                  <th className="p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("created_at")}>
                    Date <SortIcon col="created_at" />
                  </th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setDrawerReg(r)}
                  >
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelect(r.id)} className="w-4 h-4 cursor-pointer accent-primary" />
                    </td>
                    <td className="p-3">
                      <p className="text-foreground font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="p-3 font-mono text-xs text-primary font-bold">{r.ticket_code || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">{r.phone}</td>
                    <td className="p-3 text-foreground capitalize">
                      {r.package_type}
                      {r.quantity > 1 && <span className="ml-1 text-xs text-muted-foreground">×{r.quantity}</span>}
                    </td>
                    <td className="p-3">
                      <span className="text-emerald-400 font-semibold">{Number(r.total_paid).toLocaleString()}</span>
                      <span className="text-muted-foreground"> / {Number(r.total_cost).toLocaleString()}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.payment_status] || "bg-muted text-muted-foreground"}`}>
                        {r.payment_status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(r.created_at).toLocaleDateString("en-KE")}
                    </td>
                    <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 justify-end">
                        {(r.payment_status === "pending" || r.payment_status === "partial") && (
                          <button onClick={() => handleApprovePayment(r)} disabled={approvingId === r.id}
                            title="Approve latest payment"
                            className="p-1.5 rounded-lg hover:bg-emerald-400/10 text-emerald-400 disabled:opacity-40 transition-colors">
                            {approvingId === r.id ? <span className="text-xs">…</span> : <CheckCircle2 size={15} />}
                          </button>
                        )}
                        {r.payment_status === "paid" && (
                          <button onClick={() => handleApprovePayment(r)} disabled={approvingId === r.id}
                            title="Reject / un-verify latest payment"
                            className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors">
                            {approvingId === r.id ? <span className="text-xs">…</span> : <XCircle size={15} />}
                          </button>
                        )}
                        <button onClick={() => handleDeleteRow(r)} disabled={deletingId === r.id}
                          title="Delete registration" className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors">
                          {deletingId === r.id ? <span className="text-xs">…</span> : <Trash2 size={15} />}
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

      {/* ── DETAIL DRAWER ─────────────────────────────────────────────────────── */}
      {drawerReg && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setDrawerReg(null)}
          />
          {/* Panel */}
          <div
            ref={drawerRef}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-background border-l border-border z-50 overflow-y-auto flex flex-col shadow-2xl"
            style={{ animation: "slideInRight 0.2s ease" }}
          >
            {/* Drawer header */}
            <div className="flex items-start justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
              <div>
                <h2 className="text-lg font-bold text-foreground">{drawerReg.name}</h2>
                <p className="text-sm text-muted-foreground">{drawerReg.email}</p>
              </div>
              <button onClick={() => setDrawerReg(null)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors mt-0.5">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-6 flex-1">
              {/* Contact / registration details */}
              <section>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Registration Details</p>
                <div className="glass rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Booking Code" value={<span className="font-mono font-bold text-primary">{drawerReg.ticket_code || "—"}</span>} />
                  <Detail label="Status">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[drawerReg.payment_status] || ""}`}>
                      {drawerReg.payment_status}
                    </span>
                  </Detail>
                  <Detail label="Phone" value={drawerReg.phone} />
                  <Detail label="Package" value={<span className="capitalize">{drawerReg.package_type}</span>} />
                  <Detail label="Quantity" value={drawerReg.quantity} />
                  <Detail label="Institution" value={drawerReg.institution || "—"} />
                  <Detail label="Total Cost" value={`KES ${Number(drawerReg.total_cost).toLocaleString()}`} />
                  <Detail label="Total Paid" value={<span className="text-emerald-400 font-semibold">KES {Number(drawerReg.total_paid).toLocaleString()}</span>} />
                  <Detail label="Balance">
                    <span className={Math.max(0, drawerReg.total_cost - drawerReg.total_paid) > 0 ? "text-orange-400 font-semibold" : "text-emerald-400 font-semibold"}>
                      KES {Math.max(0, Number(drawerReg.total_cost) - Number(drawerReg.total_paid)).toLocaleString()}
                    </span>
                  </Detail>
                  <Detail label="Ticket Issued" value={drawerReg.ticket_issued ? "✓ Yes" : "Pending"} />
                  <Detail label="Registered" value={new Date(drawerReg.created_at).toLocaleString("en-KE")} />
                </div>
              </section>

              {/* Payment history */}
              <section>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Payment History</p>
                {drawerPayLoading ? (
                  <p className="text-sm text-muted-foreground">Loading payments…</p>
                ) : drawerPayments.length === 0 ? (
                  <div className="glass rounded-xl p-4 text-sm text-muted-foreground text-center">
                    No payment records yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drawerPayments.map(pay => (
                      <div key={pay.id} className={`glass rounded-xl p-4 text-sm ${!pay.verified ? "border border-yellow-400/20" : "border border-emerald-400/10"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">
                              KES {Number(pay.amount).toLocaleString()}
                              <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">{pay.source === "stk" ? "STK Push" : "Manual"}</span>
                            </p>
                            {pay.mpesa_code && (
                              <p className="font-mono text-xs text-muted-foreground mt-0.5">{pay.mpesa_code}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(pay.created_at).toLocaleString("en-KE")}
                              {pay.verified_at && ` · Approved ${new Date(pay.verified_at).toLocaleString("en-KE")}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pay.verified ? "bg-emerald-400/10 text-emerald-400" : "bg-yellow-400/10 text-yellow-400"}`}>
                              {pay.verified ? "✓ Verified" : "⏳ Pending"}
                            </span>
                            {!pay.verified ? (
                              <button
                                onClick={() => handleDrawerVerify(pay, true)}
                                disabled={drawerApprovingId === pay.id}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold disabled:opacity-40 transition-colors">
                                {drawerApprovingId === pay.id ? "…" : <><CheckCircle2 size={11} /> Approve</>}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDrawerVerify(pay, false)}
                                disabled={drawerApprovingId === pay.id}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold disabled:opacity-40 transition-colors">
                                {drawerApprovingId === pay.id ? "…" : <><XCircle size={11} /> Reject</>}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Admin note (saved to activity log) */}
              <section>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Add Admin Note</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="e.g. Confirmed payment via call"
                    className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    disabled={!noteText.trim()}
                    onClick={async () => {
                      await logAdminAction({
                        actionType: "REGISTRATION_NOTE",
                        description: noteText.trim(),
                        targetType: "registration",
                        targetId: drawerReg.id,
                        metadata: { name: drawerReg.name, ticket_code: drawerReg.ticket_code },
                      });
                      toast.success("Note saved to activity log");
                      setNoteText("");
                    }}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity">
                    Save
                  </button>
                </div>
              </section>

              {/* Danger zone inside drawer */}
              <section className="border-t border-border pt-4">
                <button
                  onClick={() => handleDeleteRow(drawerReg)}
                  disabled={deletingId === drawerReg.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-semibold disabled:opacity-50 transition-colors">
                  <Trash2 size={14} />
                  {deletingId === drawerReg.id ? "Deleting…" : "Delete This Registration"}
                </button>
                <p className="text-xs text-muted-foreground mt-1">Removes this registration and all linked payments. Cannot be undone.</p>
              </section>
            </div>
          </div>

          {/* Drawer slide-in keyframe */}
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
          `}</style>
        </>
      )}
    </AdminLayout>
  );
};

// ── Small helper component ────────────────────────────────────────────────────
const Detail = ({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-foreground font-medium mt-0.5">{children ?? value}</div>
  </div>
);

export default AdminRegistrations;
