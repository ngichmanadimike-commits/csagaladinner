import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Trash2, Download, CheckCircle2, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";

// Seats per ticket unit — loaded live from ticket_packages table (slug → seats_per_unit)
// Fallback map used only if DB hasn't defined a seats_per_unit field
const FALLBACK_SEATS: Record<string, number> = {
  individual: 1, single: 1, couple: 2, table: 10, "vip-table": 10, vip: 1,
};

function seatsFromSlug(slug: string, pkgSeatsMap: Record<string, number>): number {
  const s = slug.toLowerCase().replace(/\s+/g, "-");
  // First try the live map from ticket_packages
  if (pkgSeatsMap[s] !== undefined) return pkgSeatsMap[s];
  // Then fallback map
  if (FALLBACK_SEATS[s] !== undefined) return FALLBACK_SEATS[s];
  // Fuzzy match
  if (s.includes("couple")) return 2;
  if (s.includes("table")) return 10;
  return 1;
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

interface PkgInfo {
  slug: string;
  name: string;
  seats_per_unit: number; // how many people per 1 quantity of this ticket
}

const AdminTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pkgSeatsMap, setPkgSeatsMap] = useState<Record<string, number>>({});
  const [pkgNameMap, setPkgNameMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const fetchPackages = async () => {
    // Load ticket_packages to build slug → seats_per_unit map
    // seats_per_unit is derived from the slug/name since it's not a DB column
    const { data } = await supabase
      .from("ticket_packages")
      .select("slug, name")
      .eq("active", true);

    const seatsMap: Record<string, number> = {};
    const nameMap: Record<string, string> = {};

    ((data as any[]) || []).forEach((p) => {
      const s = (p.slug || "").toLowerCase().replace(/\s+/g, "-");
      nameMap[s] = p.name;
      // Derive seats from slug name intelligently
      if (s.includes("couple")) seatsMap[s] = 2;
      else if (s.includes("table")) seatsMap[s] = 10;
      else if (s.includes("vip-table")) seatsMap[s] = 10;
      else seatsMap[s] = 1;
    });

    setPkgSeatsMap(seatsMap);
    setPkgNameMap(nameMap);
  };

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
    fetchPackages();
    fetchTickets();
    const channel = supabase
      .channel("registrations-tickets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, fetchTickets)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const seatsFor = (pkg: string) => seatsFromSlug(pkg, pkgSeatsMap);
  const labelFor = (pkg: string) => {
    const s = pkg.toLowerCase().replace(/\s+/g, "-");
    return pkgNameMap[s] || pkg;
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map((t) => t.id));

  const handleDeleteSelected = async () => {
    if (!selectedIds.length || !confirm(`Delete ${selectedIds.length} ticket(s)? Cannot be undone.`)) return;
    setDeletingSelected(true);
    const { error } = await supabase.from("registrations").delete().in("id", selectedIds);
    setDeletingSelected(false);
    if (error) toast.error("Delete failed: " + error.message);
    else {
      toast.success(`${selectedIds.length} record(s) deleted`);
      setTickets((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
      setSelectedIds([]);
    }
  };

  const handleDeleteRow = async (t: Ticket) => {
    if (!confirm(`Delete ticket for ${t.name}? Cannot be undone.`)) return;
    setDeletingId(t.id);
    const { error } = await supabase.from("registrations").delete().eq("id", t.id);
    setDeletingId(null);
    if (error) toast.error("Delete failed: " + error.message);
    else {
      toast.success("Deleted");
      setTickets((prev) => prev.filter((x) => x.id !== t.id));
    }
  };

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      !search ||
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.phone?.includes(q) ||
      t.ticket_code?.toLowerCase().includes(q) ||
      t.package_type?.toLowerCase().includes(q)
    );
  });

  const totalAttendees = tickets.reduce((s, t) => s + t.quantity * seatsFor(t.package_type), 0);
  const confirmedAttendees = tickets
    .filter((t) => t.payment_status === "paid")
    .reduce((s, t) => s + t.quantity * seatsFor(t.package_type), 0);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Tickets</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, email, code, package..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-72"
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

      {selectedIds.length > 0 && (
        <div className="mb-3 text-sm text-muted-foreground">
          {selectedIds.length} of {filtered.length} selected
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Total Registrations</p>
          <p className="text-xl font-bold">{tickets.length}</p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Fully Paid</p>
          <p className="text-xl font-bold text-emerald-400">
            {tickets.filter((t) => t.payment_status === "paid").length}
          </p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users size={11} /> Total Attendees
          </p>
          <p className="text-xl font-bold text-primary">{totalAttendees}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{confirmedAttendees} confirmed</p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-yellow-400">
            KES {tickets.reduce((s, t) => s + Number(t.total_paid), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Attendees breakdown per package type */}
      {Object.keys(pkgSeatsMap).length > 0 && tickets.length > 0 && (
        <div className="glass rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Attendees by Ticket Type
          </p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(
              tickets.reduce((acc, t) => {
                const key = t.package_type;
                if (!acc[key]) acc[key] = { qty: 0, seats: 0 };
                acc[key].qty += t.quantity;
                acc[key].seats += t.quantity * seatsFor(t.package_type);
                return acc;
              }, {} as Record<string, { qty: number; seats: number }>)
            ).map(([pkg, { qty, seats }]) => (
              <div key={pkg} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <span className="text-xs text-muted-foreground capitalize">{labelFor(pkg)}</span>
                <span className="text-xs font-bold text-foreground">{qty}×</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Users size={10} />{seats} seats
                </span>
              </div>
            ))}
          </div>
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
                      <Users size={12} />Seats
                    </span>
                  </th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ticket</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const seats = t.quantity * seatsFor(t.package_type);
                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="w-4 h-4 cursor-pointer accent-primary"
                        />
                      </td>
                      <td className="p-3 font-mono text-xs text-primary font-bold">{t.ticket_code || "—"}</td>
                      <td className="p-3 text-foreground">{t.name}</td>
                      <td className="p-3 text-muted-foreground text-xs">{t.email}</td>
                      <td className="p-3 text-foreground capitalize">{labelFor(t.package_type)}</td>
                      <td className="p-3 text-center text-foreground font-semibold">{t.quantity}</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          <Users size={10} />{seats}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-foreground">KES {Number(t.total_cost).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-emerald-400">KES {Number(t.total_paid).toLocaleString()}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.payment_status === "paid"
                              ? "bg-emerald-400/10 text-emerald-400"
                              : t.payment_status === "partial"
                              ? "bg-yellow-400/10 text-yellow-400"
                              : "bg-orange-400/10 text-orange-400"
                          }`}
                        >
                          {t.payment_status}
                        </span>
                      </td>
                      <td className="p-3">
                        {t.ticket_issued ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : (
                          <Clock size={16} className="text-muted-foreground" />
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("en-KE")}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteRow(t)}
                          disabled={deletingId === t.id}
                          className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors"
                        >
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
