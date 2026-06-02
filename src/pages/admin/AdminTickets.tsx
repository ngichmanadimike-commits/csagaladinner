import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Trash2, Download, CheckCircle2, Clock, Users, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";

// ─── Seats per ticket type slug ───────────────────────────────────────────────
const SEATS_MAP: Record<string, number> = {
  couple: 2, "csa-couple": 2,
  group5: 5, "group-5": 5,
  group10: 10, "group-10": 10, table: 10, "vip-table": 10,
};
function seatsFor(pkg: string): number {
  const s = (pkg || "").toLowerCase().replace(/\s+/g, "-");
  if (SEATS_MAP[s] !== undefined) return SEATS_MAP[s];
  if (s.includes("couple")) return 2;
  if (s.includes("group10") || s.includes("group-10")) return 10;
  if (s.includes("group5")  || s.includes("group-5"))  return 5;
  if (s.includes("table"))  return 10;
  return 1; // individual, corporate, csa-leaders, individual-eb, vip, etc.
}

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

// ─── Per-type summary row ─────────────────────────────────────────────────────
interface TypeSummary {
  type: string;
  seatsEach: number;
  orders: number;
  people: number;
  confirmedOrders: number;
  confirmedPeople: number;
  pendingPeople: number;
  revenue: number;
}

function buildSummary(tickets: Ticket[]): TypeSummary[] {
  const map: Record<string, TypeSummary> = {};
  for (const t of tickets) {
    const key = (t.package_type || "unknown").toLowerCase();
    const seats = seatsFor(t.package_type);
    if (!map[key]) {
      map[key] = { type: t.package_type || "unknown", seatsEach: seats,
        orders: 0, people: 0, confirmedOrders: 0, confirmedPeople: 0,
        pendingPeople: 0, revenue: 0 };
    }
    const row = map[key];
    const people = t.quantity * seats;
    row.orders++;
    row.people += people;
    row.revenue += Number(t.total_paid);
    if (t.payment_status === "paid" || t.payment_status === "confirmed") {
      row.confirmedOrders++;
      row.confirmedPeople += people;
    } else {
      row.pendingPeople += people;
    }
  }
  return Object.values(map).sort((a, b) => b.people - a.people);
}

const AdminTickets = () => {
  const [tickets, setTickets]               = useState<Ticket[]>([]);
  const [search, setSearch]                 = useState("");
  const [loading, setLoading]               = useState(true);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [selectedIds, setSelectedIds]       = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [showSummary, setShowSummary]       = useState(true);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("registrations")
      .select("id, ticket_code, name, email, phone, package_type, quantity, total_cost, total_paid, payment_status, ticket_issued, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load tickets");
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
    const ch = supabase.channel("registrations-tickets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, fetchTickets)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const toggleSelect    = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(t => t.id));

  const handleDeleteSelected = async () => {
    if (!selectedIds.length || !confirm(`Delete ${selectedIds.length} ticket(s)? Cannot be undone.`)) return;
    setDeletingSelected(true);
    const { error } = await supabase.from("registrations").delete().in("id", selectedIds);
    setDeletingSelected(false);
    if (error) toast.error("Delete failed: " + error.message);
    else { toast.success(`${selectedIds.length} record(s) deleted`); setTickets(p => p.filter(t => !selectedIds.includes(t.id))); setSelectedIds([]); }
  };

  const handleDeleteRow = async (t: Ticket) => {
    if (!confirm(`Delete ticket for ${t.name}? Cannot be undone.`)) return;
    setDeletingId(t.id);
    const { error } = await supabase.from("registrations").delete().eq("id", t.id);
    setDeletingId(null);
    if (error) toast.error("Delete failed: " + error.message);
    else { toast.success("Deleted"); setTickets(p => p.filter(x => x.id !== t.id)); }
  };

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    return !search || t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q)
      || t.phone?.includes(q) || t.ticket_code?.toLowerCase().includes(q);
  });

  // ── Computed totals ──────────────────────────────────────────────────────────
  const summary         = buildSummary(tickets);
  const totalPeople     = tickets.reduce((s, t) => s + t.quantity * seatsFor(t.package_type), 0);
  const confirmedPeople = tickets.filter(t => t.payment_status === "paid" || t.payment_status === "confirmed")
                                 .reduce((s, t) => s + t.quantity * seatsFor(t.package_type), 0);
  const pendingPeople   = totalPeople - confirmedPeople;
  const totalRevenue    = tickets.reduce((s, t) => s + Number(t.total_paid), 0);

  return (
    <AdminLayout>
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Tickets</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search name, email, code..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64" />
          </div>
          <button onClick={() => exportToXlsx(filtered as any, "tickets", "Tickets")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm">
            <Download size={14} /> Export
          </button>
          {selectedIds.length > 0 && (
            <button onClick={handleDeleteSelected} disabled={deletingSelected}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700">
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
        {/* Panel header */}
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
            {/* Quick totals chips */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-bold">
              <Users size={11} /> {totalPeople} people
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={11} /> {confirmedPeople} confirmed
            </span>
            {showSummary ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </button>

        {showSummary && (
          <>
            {/* Totals bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border">
              {[
                { label: "Total People Expected", value: totalPeople, sub: `${tickets.length} ticket orders`, color: "text-yellow-400" },
                { label: "Confirmed (Paid)", value: confirmedPeople, sub: `${tickets.filter(t => t.payment_status === "paid").length} paid orders`, color: "text-emerald-400" },
                { label: "Pending / Partial", value: pendingPeople, sub: `${tickets.filter(t => t.payment_status !== "paid").length} unpaid orders`, color: "text-orange-400" },
                { label: "Total Revenue", value: `KES ${totalRevenue.toLocaleString()}`, sub: "from all payments", color: "text-primary" },
              ].map(card => (
                <div key={card.label} className="px-5 py-4 border-r border-border last:border-r-0 border-b sm:border-b-0">
                  <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Per-type breakdown table */}
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Seats/Ticket</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Orders</th>
                    <th className="px-4 py-3 text-xs font-semibold text-yellow-500 uppercase tracking-wide text-center">Total People</th>
                    <th className="px-4 py-3 text-xs font-semibold text-emerald-500 uppercase tracking-wide text-center">Confirmed</th>
                    <th className="px-4 py-3 text-xs font-semibold text-orange-400 uppercase tracking-wide text-center">Pending</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row, i) => (
                    <tr key={row.type} className={`border-t border-border/50 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary opacity-70" />
                          <span className="font-semibold text-foreground capitalize">{row.type.replace(/-/g, " ")}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground text-xs font-bold">
                          {row.seatsEach}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-foreground font-medium">{row.orders}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 font-bold text-sm">
                          <Users size={11} /> {row.people}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 font-semibold text-sm">
                          <CheckCircle2 size={11} /> {row.confirmedPeople}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.pendingPeople > 0
                          ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-400/10 text-orange-400 font-semibold text-sm">
                              <Clock size={11} /> {row.pendingPeople}
                            </span>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">
                        KES {row.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals footer row */}
                <tfoot>
                  <tr className="border-t-2 border-primary/30 bg-primary/5">
                    <td className="px-5 py-3 font-bold text-foreground">TOTAL</td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs">—</td>
                    <td className="px-4 py-3 text-center font-bold text-foreground">{tickets.length}</td>
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
                    <input type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer accent-primary" />
                  </th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Package</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-center">
                    <span className="flex items-center gap-1 justify-center"><Users size={12}/>People</span>
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
                {filtered.map((t) => {
                  const people = t.quantity * seatsFor(t.package_type);
                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3">
                        <input type="checkbox" checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="w-4 h-4 cursor-pointer accent-primary" />
                      </td>
                      <td className="p-3 font-mono text-xs text-primary font-bold">{t.ticket_code || "—"}</td>
                      <td className="p-3 font-medium text-foreground">{t.name}</td>
                      <td className="p-3 text-muted-foreground text-xs">{t.email}</td>
                      <td className="p-3">
                        <span className="capitalize text-foreground">{(t.package_type || "—").replace(/-/g, " ")}</span>
                      </td>
                      <td className="p-3 text-center text-foreground">{t.quantity}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                          ${people > 1 ? "bg-yellow-400/10 text-yellow-400" : "bg-muted text-muted-foreground"}`}>
                          <Users size={10} /> {people} {people === 1 ? "person" : "people"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-foreground">KES {Number(t.total_cost).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-emerald-400">KES {Number(t.total_paid).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.payment_status === "paid"    ? "bg-emerald-400/10 text-emerald-400" :
                          t.payment_status === "partial" ? "bg-yellow-400/10 text-yellow-400"  :
                                                           "bg-orange-400/10 text-orange-400"
                        }`}>
                          {t.payment_status}
                        </span>
                      </td>
                      <td className="p-3">
                        {t.ticket_issued
                          ? <CheckCircle2 size={16} className="text-emerald-400" />
                          : <Clock size={16} className="text-muted-foreground" />}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("en-KE")}
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleDeleteRow(t)} disabled={deletingId === t.id}
                          className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors">
                          {deletingId === t.id ? <span className="text-xs">...</span> : <Trash2 size={15} />}
                        </button>
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

export default AdminTickets;
