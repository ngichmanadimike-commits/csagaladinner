// TODO: Add admin auth check — protect this route behind useAuth isAdmin guard
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface TicketPurchase {
  id: string;
  ticket_number: string;
  name: string;
  amount: number;
  created_at: string;
  phone: string;
  email: string;
  status: string;
}

const AdminTickets = () => {
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("ticket_purchases")
      .select("id, ticket_number, name, amount, created_at, phone, email, status")
      .order("created_at", { ascending: false });
    setTickets((data as TicketPurchase[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
    const channel = supabase
      .channel("ticket_purchases-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_purchases" }, fetchTickets)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(t => t.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    const confirmed = window.confirm(`Delete ${selectedIds.length} ticket(s)? This cannot be undone.`)
    if (!confirmed) return
    
    setDeletingSelected(true)
    const { error } = await supabase
      .from("ticket_purchases")
      .delete()
      .in("id", selectedIds)
    
    setDeletingSelected(false)
    if (error) { 
      toast.error("Failed to delete tickets: " + error.message)
    } else { 
      toast.success(`${selectedIds.length} ticket(s) deleted`)
      setTickets(prev => prev.filter(t => !selectedIds.includes(t.id)))
      setSelectedIds([])
    }
  }

  const handleDeleteAll = async () => {
    const confirmed = window.confirm("Delete ALL ticket records? This cannot be undone.");
    if (!confirmed) return;
    setDeletingAll(true);
    const { error } = await supabase.from("ticket_purchases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setDeletingAll(false);
    if (error) { toast.error("Failed to delete all tickets: " + error.message); }
    else { toast.success("All tickets deleted"); setTickets([]); setSelectedIds([]); }
  };

  const handleDeleteRow = async (row: TicketPurchase) => {
    const confirmed = window.confirm(`Delete ticket ${row.ticket_number}? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(row.id);
    const { error } = await supabase.from("ticket_purchases").delete().eq("id", row.id);
    setDeletingId(null);
    if (error) { toast.error("Failed to delete ticket: " + error.message); }
    else { 
      toast.success("Ticket deleted"); 
      setTickets((prev) => prev.filter((t) => t.id !== row.id));
      setSelectedIds(prev => prev.filter(id => id !== row.id));
    }
  };

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    return !search || t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.phone?.includes(q) || t.ticket_number?.toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Ticket Purchases</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search by name, email, phone, or ticket #..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-72" />
          </div>
                              {selectedIds.length > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              disabled={deletingSelected} 
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              {deletingSelected ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
            </button>
          )}
          
          <button onClick={handleDeleteAll} disabled={deletingAll || tickets.length === 0} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-50 hover:bg-destructive/90 transition-colors">
            <AlertTriangle size={16} />
            {deletingAll ? "Deleting…" : "Delete All"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Total Tickets</p><p className="text-xl font-bold">{tickets.length}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Confirmed</p><p className="text-xl font-bold text-emerald-400">{tickets.filter((t) => t.status === "confirmed" || t.status === "paid").length}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold text-yellow-400">KES {tickets.reduce((s, t) => s + Number(t.amount), 0).toLocaleString()}</p></div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-3 text-sm text-muted-foreground">
          {selectedIds.length} of {filtered.length} selected
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No ticket purchases found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                                 <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="p-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer accent-primary"
                    />
                  </th>
                  <th className="p-3">Ticket #</th><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="w-4 h-4 cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="p-3 font-mono text-xs text-foreground font-semibold">#{t.ticket_number}</td>
                    <td className="p-3 text-foreground font-medium">{t.name}</td>
                    <td className="p-3 text-muted-foreground">{t.email}</td>
                    <td className="p-3 text-muted-foreground">{t.phone}</td>
                    <td className="p-3 text-foreground font-semibold">KES {Number(t.amount).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "paid" || t.status === "confirmed" ? "bg-emerald-400/10 text-emerald-400" : t.status === "pending" ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400"}`}>{t.status}</span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{new Date(t.created_at).toLocaleDateString("en-KE")}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDeleteRow(t)} disabled={deletingId === t.id} title={`Delete ticket ${t.ticket_number}`} className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors">
                        {deletingId === t.id ? <span className="text-xs">…</span> : <Trash2 size={15} />}
                      </button>
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

export default AdminTickets;

