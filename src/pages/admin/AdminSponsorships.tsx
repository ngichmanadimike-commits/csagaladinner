import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, CheckCircle2, XCircle, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";

const AdminSponsorships = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("sponsorships")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("sponsorships-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsorships" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setVerified = async (id: string, verified: boolean) => {
    const { error } = await supabase
      .from("sponsorships")
      .update({
        verified,
        payment_status: verified ? "verified" : "pending",
        verified_at: verified ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(verified ? "Verified" : "Marked pending"); load(); }
  };

  const handleDeleteRow = async (id: string, name: string) => {
    if (!confirm(`Delete sponsorship for ${name}? Cannot be undone.`)) return;
    setDeletingId(id);
    const { error } = await supabase.from("sponsorships").delete().eq("id", id);
    setDeletingId(null);
    if (error) toast.error("Delete failed: " + error.message);
    else {
      toast.success("Sponsorship deleted");
      setRows((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === filtered.length ? [] : filtered.map((r) => r.id)
    );

  const handleDeleteSelected = async () => {
    if (!selectedIds.length || !confirm(`Delete ${selectedIds.length} sponsorship(s)? Cannot be undone.`)) return;
    setDeletingSelected(true);
    const { error } = await supabase.from("sponsorships").delete().in("id", selectedIds);
    setDeletingSelected(false);
    if (error) toast.error("Delete failed: " + error.message);
    else {
      toast.success(`${selectedIds.length} deleted`);
      setRows((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
    }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      !search ||
      r.sponsor_name?.toLowerCase().includes(q) ||
      r.sponsor_phone?.includes(q) ||
      r.mpesa_code?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Sponsorships</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm w-full sm:w-64"
            />
          </div>
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
          <button
            onClick={() => exportToXlsx(filtered, "sponsorships", "Sponsorships")}
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

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No sponsorships yet.</div>
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
                  <th className="p-3">Sponsor</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Students</th>
                  <th className="p-3">Level</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">M-Pesa</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
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
                    <td className="p-3 text-foreground">
                      {r.sponsor_name}
                      <div className="text-xs text-muted-foreground">{r.sponsor_email}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.sponsor_phone}</td>
                    <td className="p-3 text-foreground">{r.num_students}</td>
                    <td className="p-3 text-muted-foreground">{r.level}</td>
                    <td className="p-3 text-foreground font-semibold">
                      KES {Number(r.amount).toLocaleString()}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{r.mpesa_code || "—"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.verified
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-yellow-400/10 text-yellow-400"
                        }`}
                      >
                        {r.verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 items-center">
                        {!r.verified && (
                          <button
                            onClick={() => setVerified(r.id, true)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10"
                            title="Verify"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {r.verified && (
                          <button
                            onClick={() => setVerified(r.id, false)}
                            className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-400/10"
                            title="Unverify"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRow(r.id, r.sponsor_name)}
                          disabled={deletingId === r.id}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 disabled:opacity-40 transition-colors"
                          title="Delete"
                        >
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

export default AdminSponsorships;
