import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";
import { logAdminAction } from "@/lib/adminLog";

interface Donation {
  id: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string;
  amount: number;
  mpesa_code: string;
  message: string;
  anonymous: boolean;
  created_at: string;
}

const AdminDonations = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const fetchDonations = async () => {
    const { data } = await supabase
      .from("donations")
      .select("*")
      .order("created_at", { ascending: false });
    setDonations((data as Donation[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDonations();
    const channel = supabase
      .channel("donations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "donations" }, fetchDonations)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(d => d.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} donation(s)? Cannot be undone.`)) return;
    
    setDeletingSelected(true);
    const { error } = await supabase.from("donations").delete().in("id", selectedIds);
    setDeletingSelected(false);
    
    if (error) {
      toast.error("Delete failed: " + error.message);
      logAdminAction({ actionType: "DELETE_DONATION", description: `Failed to delete ${selectedIds.length} donations`, targetType: "donation", status: "failed", metadata: { error: error.message } });
    } else {
      toast.success(`${selectedIds.length} donation(s) deleted`);
      logAdminAction({ actionType: "DELETE_DONATION", description: `Deleted ${selectedIds.length} donation(s)`, targetType: "donation", metadata: { count: selectedIds.length } });
      setDonations(prev => prev.filter(d => !selectedIds.includes(d.id)));
      setSelectedIds([]);
    }
  };

  const handleDeleteRow = async (donation: Donation) => {
    if (!confirm(`Delete donation of KES ${donation.amount} from ${donation.donor_name}? Cannot be undone.`)) return;
    
    setDeletingId(donation.id);
    const { error } = await supabase.from("donations").delete().eq("id", donation.id);
    setDeletingId(null);
    
    if (error) {
      toast.error("Delete failed: " + error.message);
      logAdminAction({ actionType: "DELETE_DONATION", description: `Failed to delete donation`, targetType: "donation", targetId: donation.id, status: "failed", metadata: { error: error.message } });
    } else {
      toast.success("Donation deleted");
      logAdminAction({ actionType: "DELETE_DONATION", description: `Deleted donation of KES ${donation.amount} from ${donation.donor_name}`, targetType: "donation", targetId: donation.id, metadata: { amount: donation.amount, mpesa_code: donation.mpesa_code } });
      setDonations(prev => prev.filter(d => d.id !== donation.id));
      setSelectedIds(prev => prev.filter(id => id !== donation.id));
    }
  };

  const filtered = donations.filter((d) => {
    const q = search.toLowerCase();
    return !search || 
      d.donor_name?.toLowerCase().includes(q) || 
      d.donor_email?.toLowerCase().includes(q) || 
      d.mpesa_code?.toLowerCase().includes(q) ||
      d.donor_phone?.includes(q);
  });

  const totalAmount = filtered.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Donations</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-72"
            />
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              disabled={deletingSelected}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              {deletingSelected ? "Deleting..." : `Delete (${selectedIds.length})`}
            </button>
          )}
          <button
            onClick={() =>
              exportToXlsx(
                filtered.map((d) => ({
                  Name: d.anonymous ? "Anonymous" : d.donor_name,
                  Email: d.donor_email,
                  Phone: d.donor_phone,
                  Amount: Number(d.amount),
                  "M-Pesa Code": d.mpesa_code,
                  Message: d.message,
                  Anonymous: d.anonymous ? "Yes" : "No",
                  Date: d.created_at,
                })),
                "donations",
                "Donations"
              )
            }
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-3 text-sm text-muted-foreground">
          {selectedIds.length} of {filtered.length} selected
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Total Donations</p><p className="text-xl font-bold">{filtered.length}</p></div>
        <div className="glass rounded-xl p-3"><p className="text-xs text-muted-foreground">Total Amount</p><p className="text-xl font-bold text-emerald-400">KES {totalAmount.toLocaleString()}</p></div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No donations found.</div>
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
                  <th className="p-3">Donor</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">M-Pesa Code</th>
                  <th className="p-3">Message</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        className="w-4 h-4 cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="p-3 text-foreground">
                      {d.anonymous ? <span className="italic text-muted-foreground">Anonymous</span> : d.donor_name}
                    </td>
                    <td className="p-3 text-muted-foreground">{d.donor_email || "—"}</td>
                    <td className="p-3 text-foreground font-semibold">KES {Number(d.amount).toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{d.mpesa_code || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs max-w-xs truncate">{d.message || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">{new Date(d.created_at).toLocaleDateString("en-KE")}</td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => handleDeleteRow(d)} 
                        disabled={deletingId === d.id}
                        className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 disabled:opacity-40 transition-colors"
                        title="Delete"
                      >
                        {deletingId === d.id ? <span className="text-xs">...</span> : <Trash2 size={15} />}
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

export default AdminDonations;
