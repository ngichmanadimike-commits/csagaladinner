import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Search, Trash2, Download, CheckCircle2, Clock,
  Users, ChevronDown, ChevronUp, Plus, X,
} from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";

// ─────────────────────────────────────────────────────────────────────────────
//  SEATS-PER-TICKET-UNIT MAP
//
//  Rule:  people_attending = registration.quantity × seatsFor(package_type)
//
//  Slugs are typed manually by admins in AdminPackages, so variants like
//  "couple-eb", "group10-eb", "group-of-10-eb" etc. can exist.
//  The function below handles ALL of them with a 4-layer strategy.
//
//  Canonical seat counts:
//    Any "group" slug containing "10"  → 10 people
//    Any "group" slug containing "5"   →  5 people
//    Any slug containing "couple"      →  2 people
//    Any slug containing "partner"     →  1 person
//    Everything else                   →  1 person
// ─────────────────────────────────────────────────────────────────────────────

/** Known exact slugs → seat count.  EB = early-bird (same seats, different price). */
const SEATS_MAP: Record<string, number> = {
  // 1 person
  individual          : 1,
  "individual-eb"     : 1,
  single              : 1,
  vip                 : 1,
  "csa-leaders"       : 1,
  "csa-leader"        : 1,
  corporate           : 1,
  "corporate-eb"      : 1,
  sponsored           : 1,
  "sponsored-eb"      : 1,

  // 2 people
  couple              : 2,
  "couple-eb"         : 2,
  "csa-couple"        : 2,
  "csa-couple-eb"     : 2,

  // 5 people
  group5              : 5,
  "group-5"           : 5,
  "group5-eb"         : 5,
  "group-5-eb"        : 5,
  "group-of-5"        : 5,
  "group-of-5-eb"     : 5,

  // 10 people
  group10             : 10,
  "group-10"          : 10,
  "group10-eb"        : 10,
  "group-10-eb"       : 10,
  "group-of-10"       : 10,
  "group-of-10-eb"    : 10,
  table               : 10,
  "vip-table"         : 10,
  "table-eb"          : 10,

  // Partners (1 person per ticket)
  partners            : 1,
  partner             : 1,
  "partners-package"  : 1,
  "partners-eb"       : 1,
};

/**
 * seatsFor — returns how many PEOPLE attend per ONE ticket unit.
 *
 * Layer 1: Exact lowercase slug match in SEATS_MAP
 * Layer 2: Number-aware group detection (handles any future groupN-* slug)
 * Layer 3: Keyword substring matching
 * Layer 4: Default 1
 */
function seatsFor(pkg: string): number {
  const s = (pkg || "").toLowerCase().replace(/\s+/g, "-").replace(/[.\s]+$/, "").trim();

  // Layer 1: exact map lookup
  if (SEATS_MAP[s] !== undefined) return SEATS_MAP[s];

  // Layer 2: number-aware group detection
  // Catches: group10eb, group-of-10-eb, group10EB, group-of-10, etc.
  if (s.includes("group")) {
    if (/10/.test(s)) return 10;
    if (/(?:^|[-_of])5(?:$|[-_eb])/.test(s) || s.includes("group5")) return 5;
  }

  // Layer 3: keyword substring matching
  if (s.includes("couple"))                                                     return 2;
  if (s.includes("partners") || s.includes("partner"))                          return 1;
  if (s.includes("vip-table") || (s.includes("vip") && s.includes("table")))   return 10;
  if (s.includes("table"))                                                       return 10;

  // Layer 4: default — individual / corporate / sponsored / unknown
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
//  INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
interface Ticket {
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

interface TypeSummary {
  type       : string;
  seatsEach  : number;   // people per single ticket unit
  orders     : number;   // number of registration rows of this type
  totalUnits : number;   // Σ quantity across all orders of this type
  people     : number;   // totalUnits × seatsEach  ← true headcount
  confirmedOrders : number;
  confirmedPeople : number;
  pendingPeople   : number;
  revenue    : number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  buildSummary
//
//  Statistical calculation (no person is missed):
//    people = Σ (registration.quantity × seatsFor(package_type))
//
//  This correctly handles e.g.:
//    • 1 order of Group-10, quantity 2  → 20 people
//    • 3 orders of Couple,  quantity 1  →  6 people
//    • 5 orders of Individual, qty 1    →  5 people
// ─────────────────────────────────────────────────────────────────────────────
function buildSummary(tickets: Ticket[]): TypeSummary[] {
  const map: Record<string, TypeSummary> = {};

  for (const t of tickets) {
    const key   = (t.package_type || "unknown").toLowerCase().trim();
    const seats = seatsFor(t.package_type);

    if (!map[key]) {
      map[key] = {
        type: t.package_type || "unknown",
        seatsEach       : seats,
        orders          : 0,
        totalUnits      : 0,
        people          : 0,
        confirmedOrders : 0,
        confirmedPeople : 0,
        pendingPeople   : 0,
        revenue         : 0,
      };
    }

    const row    = map[key];
    // Core formula: people this order contributes
    const people = t.quantity * seats;

    row.orders     += 1;
    row.totalUnits += t.quantity;
    row.people     += people;
    row.revenue    += Number(t.total_paid);

    if (t.payment_status === "paid" || t.payment_status === "confirmed") {
      row.confirmedOrders += 1;
      row.confirmedPeople += people;
    } else {
      row.pendingPeople += people;
    }
  }

  // Sort by headcount descending so largest groups appear first
  return Object.values(map).sort((a, b) => b.people - a.people);
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AdminTickets = () => {
  const [tickets, setTickets]           = useState<Ticket[]>([]);
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [selectedIds, setSelectedIds]   = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [showSummary, setShowSummary]   = useState(true);

  // ── Payment modal state ────────────────────────────────────────────────────
  const [payTicket, setPayTicket]       = useState<Ticket | null>(null);
  const [payAmount, setPayAmount]       = useState("");
  const [payMpesa, setPayMpesa]         = useState("");
  const [payPhone, setPayPhone]         = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id, ticket_code, name, email, phone, package_type, quantity, total_cost, total_paid, payment_status, ticket_issued, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load tickets");
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
    const ch = supabase
      .channel("registrations-tickets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, fetchTickets)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect    = (id: string) =>
    setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(t => t.id));

  // ── Bulk delete ────────────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    if (!selectedIds.length || !confirm(`Delete ${selectedIds.length} ticket(s)? Cannot be undone.`)) return;
    setDeletingSelected(true);
    const { error } = await supabase.from("registrations").delete().in("id", selectedIds);
    setDeletingSelected(false);
    if (error) toast.error("Delete failed: " + error.message);
    else {
      toast.success(`${selectedIds.length} record(s) deleted`);
      setTickets(p => p.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]);
    }
  };

  // ── Row delete ─────────────────────────────────────────────────────────────
  const handleDeleteRow = async (t: Ticket) => {
    if (!confirm(`Delete ticket for ${t.name}? Cannot be undone.`)) return;
    setDeletingId(t.id);
    const { error } = await supabase.from("registrations").delete().eq("id", t.id);
    setDeletingId(null);
    if (error) toast.error("Delete failed: " + error.message);
    else {
      toast.success("Deleted");
      setTickets(p => p.filter(x => x.id !== t.id));
    }
  };

  // ── Manual payment (used for Partners and any pending ticket) ──────────────
  const openPayModal = (t: Ticket) => {
    setPayTicket(t);
    setPayAmount(String(Math.max(0, Number(t.total_cost) - Number(t.total_paid))));
    setPayPhone(t.phone || "");
    setPayMpesa("");
  };
  const closePayModal = () => {
    setPayTicket(null);
    setPayAmount("");
    setPayMpesa("");
    setPayPhone("");
  };

  const handleRecordPayment = async () => {
    if (!payTicket) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0)       { toast.error("Enter a valid amount");    return; }
    if (!payMpesa.trim())        { toast.error("Enter M-Pesa code");       return; }

    // Duplicate code guard
    const { data: dup } = await supabase
      .from("payments")
      .select("id")
      .eq("mpesa_code", payMpesa.trim().toUpperCase())
      .maybeSingle();
    if (dup) { toast.error("This M-Pesa code already exists in the system."); return; }

    setPaySubmitting(true);
    try {
      const { error } = await supabase.from("payments").insert({
        registration_id : payTicket.id,
        amount          : amt,
        mpesa_code      : payMpesa.trim().toUpperCase(),
        payment_method  : "mpesa_manual",
        phone           : payPhone || payTicket.phone,
        verified        : false,
        source          : "manual",
      });
      if (error) { toast.error("Failed: " + error.message); return; }
      toast.success(`KES ${amt.toLocaleString()} recorded — approve it in Payments`);
      closePayModal();
      fetchTickets();
    } finally {
      setPaySubmitting(false);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    return (
      !search ||
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.phone?.includes(q) ||
      t.ticket_code?.toLowerCase().includes(q)
    );
  });

  // ── Aggregate statistics (whole dataset, not filtered) ────────────────────
  //
  //  totalPeople = Σ (quantity × seatsFor(package_type))  over ALL registrations
  //  This is the authoritative expected headcount.
  //
  const summary         = buildSummary(tickets);
  const totalOrders     = tickets.length;
  const totalPeople     = tickets.reduce((s, t) => s + t.quantity * seatsFor(t.package_type), 0);
  const confirmedPeople = tickets
    .filter(t => t.payment_status === "paid" || t.payment_status === "confirmed")
    .reduce((s, t) => s + t.quantity * seatsFor(t.package_type), 0);
  const pendingPeople   = totalPeople - confirmedPeople;
  const totalRevenue    = tickets.reduce((s, t) => s + Number(t.total_paid), 0);

  // ── helpers ────────────────────────────────────────────────────────────────
  const isPartners = (pkg: string) => {
    const s = (pkg || "").toLowerCase();
    return s.includes("partner");
  };
  const needsPayment = (t: Ticket) =>
    t.payment_status !== "paid" && t.payment_status !== "confirmed";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Tickets</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, email, code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64"
            />
          </div>
          <button
            onClick={() => exportToXlsx(filtered as any, "tickets", "Tickets")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm"
          >
            <Download size={14} /> Export
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deletingSelected}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700"
            >
              <Trash2 size={14} />
              {deletingSelected ? "Deleting..." : `Delete (${selectedIds.length})`}
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ATTENDANCE SUMMARY PANEL
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl overflow-hidden mb-6 border border-border">

        {/* Collapsible header */}
        <button
          onClick={() => setShowSummary(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users size={16} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground text-sm">Attendance Summary</p>
              <p className="text-xs text-muted-foreground">
                {totalPeople} total people · {confirmedPeople} confirmed · {pendingPeople} pending
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-bold">
              <Users size={11} /> {totalPeople} people
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={11} /> {confirmedPeople} confirmed
            </span>
            {showSummary
              ? <ChevronUp size={16} className="text-muted-foreground" />
              : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </button>

        {showSummary && (
          <>
            {/* ── KPI bar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border">
              {[
                {
                  label : "Total People Expected",
                  value : totalPeople,
                  sub   : `${totalOrders} ticket orders`,
                  color : "text-yellow-400",
                },
                {
                  label : "Confirmed (Paid)",
                  value : confirmedPeople,
                  sub   : `${tickets.filter(t => t.payment_status === "paid" || t.payment_status === "confirmed").length} paid orders`,
                  color : "text-emerald-400",
                },
                {
                  label : "Pending / Partial",
                  value : pendingPeople,
                  sub   : `${tickets.filter(t => t.payment_status !== "paid" && t.payment_status !== "confirmed").length} unpaid orders`,
                  color : "text-orange-400",
                },
                {
                  label : "Total Revenue",
                  value : `KES ${totalRevenue.toLocaleString()}`,
                  sub   : "from all payments",
                  color : "text-primary",
                },
              ].map(card => (
                <div key={card.label} className="px-5 py-4 border-r border-border last:border-r-0 border-b sm:border-b-0">
                  <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Per-type breakdown table ── */}
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Ticket Type
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
                      People / Unit
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
                      Orders
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
                      Units Sold
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-yellow-500 uppercase tracking-wide text-center">
                      Total People
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-emerald-500 uppercase tracking-wide text-center">
                      Confirmed
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-orange-400 uppercase tracking-wide text-center">
                      Pending
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row, i) => (
                    <tr
                      key={row.type}
                      className={`border-t border-border/50 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                    >
                      {/* Type */}
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary opacity-70" />
                          <span className="font-semibold text-foreground capitalize">
                            {row.type.replace(/-/g, " ")}
                          </span>
                        </span>
                      </td>

                      {/* People per unit badge */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground text-xs font-bold">
                          {row.seatsEach}
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="px-4 py-3 text-center text-foreground font-medium">
                        {row.orders}
                      </td>

                      {/* Units sold */}
                      <td className="px-4 py-3 text-center text-foreground font-medium">
                        {row.totalUnits}
                      </td>

                      {/* Total people = units × seatsEach */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 font-bold text-sm">
                          <Users size={11} /> {row.people}
                        </span>
                      </td>

                      {/* Confirmed people */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 font-semibold text-sm">
                          <CheckCircle2 size={11} /> {row.confirmedPeople}
                        </span>
                      </td>

                      {/* Pending people */}
                      <td className="px-4 py-3 text-center">
                        {row.pendingPeople > 0
                          ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-400/10 text-orange-400 font-semibold text-sm">
                              <Clock size={11} /> {row.pendingPeople}
                            </span>
                          )
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-3 text-right text-foreground font-medium">
                        KES {row.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* ── Grand total footer ── */}
                <tfoot>
                  <tr className="border-t-2 border-primary/30 bg-primary/5">
                    <td className="px-5 py-3 font-bold text-foreground">TOTAL</td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs">—</td>
                    {/* orders = sum of per-type orders (same as tickets.length) */}
                    <td className="px-4 py-3 text-center font-bold text-foreground">
                      {summary.reduce((s, r) => s + r.orders, 0)}
                    </td>
                    {/* total units sold */}
                    <td className="px-4 py-3 text-center font-bold text-foreground">
                      {summary.reduce((s, r) => s + r.totalUnits, 0)}
                    </td>
                    {/* total people */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/20 text-yellow-400 font-bold">
                        <Users size={11} /> {totalPeople}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-400 font-bold">
                        <CheckCircle2 size={11} /> {confirmedPeople}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-400/20 text-orange-400 font-bold">
                        <Clock size={11} /> {pendingPeople}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      KES {totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN TICKETS TABLE
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedIds.length > 0 && (
        <div className="mb-3 text-sm text-muted-foreground">
          {selectedIds.length} of {filtered.length} selected
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No tickets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer accent-primary"
                    />
                  </th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Package</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-center">
                    <span className="flex items-center gap-1 justify-center">
                      <Users size={12} /> People
                    </span>
                  </th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Issued</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  // Core formula per row — same as in buildSummary
                  const people    = t.quantity * seatsFor(t.package_type);
                  const isPartner = isPartners(t.package_type);
                  const unpaid    = needsPayment(t);

                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">

                      {/* Checkbox */}
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="w-4 h-4 cursor-pointer accent-primary"
                        />
                      </td>

                      {/* Ticket code */}
                      <td className="p-3 font-mono text-xs text-primary font-bold">
                        {t.ticket_code || "—"}
                      </td>

                      {/* Name */}
                      <td className="p-3 font-medium text-foreground">{t.name}</td>

                      {/* Email */}
                      <td className="p-3 text-muted-foreground text-xs">{t.email}</td>

                      {/* Package */}
                      <td className="p-3">
                        <span className="capitalize text-foreground">
                          {(t.package_type || "—").replace(/-/g, " ")}
                        </span>
                        {isPartner && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase tracking-wide">
                            Partner
                          </span>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="p-3 text-center text-foreground">{t.quantity}</td>

                      {/* People — the key headcount cell */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                            ${people > 1
                              ? "bg-yellow-400/10 text-yellow-400"
                              : "bg-muted text-muted-foreground"
                            }`}
                        >
                          <Users size={10} />
                          {people} {people === 1 ? "person" : "people"}
                        </span>
                      </td>

                      {/* Total cost */}
                      <td className="p-3 font-semibold text-foreground">
                        KES {Number(t.total_cost).toLocaleString()}
                      </td>

                      {/* Amount paid */}
                      <td className="p-3 font-semibold text-emerald-400">
                        KES {Number(t.total_paid).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.payment_status === "paid" || t.payment_status === "confirmed"
                              ? "bg-emerald-400/10 text-emerald-400"
                              : t.payment_status === "partial"
                              ? "bg-yellow-400/10 text-yellow-400"
                              : "bg-orange-400/10 text-orange-400"
                          }`}
                        >
                          {t.payment_status}
                        </span>
                      </td>

                      {/* Ticket issued */}
                      <td className="p-3">
                        {t.ticket_issued
                          ? <CheckCircle2 size={16} className="text-emerald-400" />
                          : <Clock size={16} className="text-muted-foreground" />}
                      </td>

                      {/* Date */}
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("en-KE")}
                      </td>

                      {/* Actions — Pay button shown for Partners and any unpaid ticket */}
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Record payment button — always visible for partners, visible for unpaid others */}
                          {(isPartner || unpaid) && (
                            <button
                              onClick={() => openPayModal(t)}
                              title="Record payment"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition-colors"
                            >
                              <Plus size={12} /> Pay
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteRow(t)}
                            disabled={deletingId === t.id}
                            className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors"
                          >
                            {deletingId === t.id
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

      {/* ══════════════════════════════════════════════════════════════════════
          RECORD PAYMENT MODAL
          Shown when admin clicks "Pay" on any ticket row (Partners always
          visible; other ticket types visible while status ≠ paid/confirmed).
      ══════════════════════════════════════════════════════════════════════ */}
      {payTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl">

            {/* Modal header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display font-bold text-foreground text-lg">
                  Record Payment
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {payTicket.name}
                  {isPartners(payTicket.package_type) && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase tracking-wide">
                      Partners
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {(payTicket.package_type || "").replace(/-/g, " ")} ·{" "}
                  {payTicket.quantity * seatsFor(payTicket.package_type)} people
                </p>
              </div>
              <button
                onClick={closePayModal}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Balance summary */}
            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              {[
                { label: "Total Cost",   value: `KES ${Number(payTicket.total_cost).toLocaleString()}`,  color: "text-foreground" },
                { label: "Paid So Far",  value: `KES ${Number(payTicket.total_paid).toLocaleString()}`,  color: "text-emerald-400" },
                { label: "Balance Due",  value: `KES ${Math.max(0, Number(payTicket.total_cost) - Number(payTicket.total_paid)).toLocaleString()}`, color: "text-orange-400" },
              ].map(c => (
                <div key={c.label} className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{c.label}</p>
                  <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Form fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Amount (KES)</label>
                <input
                  type="number"
                  min={1}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. 2650"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">M-Pesa Code</label>
                <input
                  type="text"
                  value={payMpesa}
                  onChange={e => setPayMpesa(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. QGH7X4KPAM"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Payer Phone <span className="text-muted-foreground/60">(optional override)</span>
                </label>
                <input
                  type="tel"
                  value={payPhone}
                  onChange={e => setPayPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={payTicket.phone || "07XX XXX XXX"}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              <button
                onClick={closePayModal}
                className="flex-1 px-3 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={paySubmitting || !payAmount || !payMpesa.trim()}
                className="flex-1 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {paySubmitting ? "Saving..." : "Record Payment"}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Payment will be saved as <strong>pending</strong> — approve it in the Payments section.
            </p>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default AdminTickets;
