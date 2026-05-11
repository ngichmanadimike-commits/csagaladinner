import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Download, Trash2 } from "lucide-react";
import { exportToXlsx } from "@/lib/exportXlsx";
import { toast } from "sonner";

const AdminRegistrations = () => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const fetchRegistrations = async () => {
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });
    setRegistrations(data || []);
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(r => r.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} registration(s)? Cannot be undone.`)) return
    
    setDeletingSelected(true)
    const { error } = await supabase.from("registrations").delete().in("id", selectedIds)
    setDeletingSelected(false)
    
    if (error) toast.error("Delete failed: " + error.message)
    else {
      toast.success(`${selectedIds.length} registration(s) deleted`)
      setRegistrations(prev => prev.filter(r => !selectedIds.includes(r.id)))
      setSelectedIds([])
    }
  }

  const handleDeleteRow = async (row: any) => {
    if (!confirm(`Delete registration for ${row.name}? Cannot be undone.`)) return
    setDeletingId(row.id)
    const { error } = await supabase.from("registrations").delete().eq("id", row.id)
    setDeletingId(null)
    if (error) toast.error("Delete failed: " + error.message)
    else {
      toast.success("Registration deleted")
      setRegistrations(prev => prev.filter(r => r.id !== row.id))
      setSelectedIds(prev => prev.filter(id => id !== row.id))
    }
  }

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    return !search || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.phone?.includes(q);
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Registrations</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-72"
            />
          </div>
          <button
            onClick={() =>
              exportToXlsx(
                filtered.map((r: any) => ({
                  Name: r.name,
                  Email: r.email,
                  Phone: r.phone,
                  Institution: r.institution,
                  Package: r.package_type,
                  Quantity: r.quantity,
                  "Payment Type": r.payment_type,
                  "Total Cost": Number(r.total_cost),
                  "Total Paid": Number(r.total_paid),
                  Balance: Number(r.total_cost) - Number(r.total_paid),
                  Status: r.payment_status,
                  Created: r.created_at,
                })),
                "registrations",
                "Registrations"
              )
            }
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Download size={16} /> Export
          </button>
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
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer accent-primary"
                    />
                  </th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Package</th>
                  <th className="p-3">Cost</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="w-4 h-4 cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="p-3 text-foreground">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{r.email}</td>
                    <td className="p-3 text-muted-foreground">{r.phone}</td>
                    <td className="p-3 text-foreground capitalize">{r.package_type}</td>
                    <td className="p-3 text-foreground">KES {Number(r.total_cost).toLocaleString()}</td>
                    <td className="p-3 text-emerald-400">KES {Number(r.total_paid).toLocaleString()}</td>
                    <td className="p-3 text-yellow-400">KES {(Number(r.total_cost) - Number(r.total_paid)).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.payment_status === "paid" ? "bg-emerald-400/10 text-emerald-400" :
                        r.payment_status === "partial" ? "bg-yellow-400/10 text-yellow-400" :
                        "bg-red-400/10 text-red-400"
                      }`}>
                        {r.payment_status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => handleDeleteRow(r)} 
                        disabled={deletingId === r.id}
                        className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors"
                      >
                        {deletingId === r.id ? <span className="text-xs">...</span> : <Trash2 size={15} />}
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

export default AdminRegistrations;
