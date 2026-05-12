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
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red
