import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, CheckCircle2, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";

const AdminSponsorships = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("sponsorships").select("*").order("created_at", { ascending: false });
    setRows(data || []); setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("sponsorships-rt").on("postgres_changes", { event: "*", schema: "public", table: "sponsorships" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setVerified = async (id: string, verified: boolean) => {
    const { error } = await supabase.from("sponsorships").update({
      verified, payment_status: verified ? "verified" : "pending",
      verified_at: verified ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(verified ? "Verified" : "Marked pending"); load(); }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !search || r.sponsor_name?.toLowerCase().includes(q) || r.sponsor_phone?.includes(q) || r.mpesa_code?.toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Sponsorships</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm w-full sm:w-64" />
          </div>
          <button onClick={() => exportToXlsx(filtered, "sponsorships", "Sponsorships")} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> :
          filtered.length === 0 ? <div className="p-8 text-center text-muted-foreground">No sponsorships yet.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                <th className="p-3">Sponsor</th><th className="p-3">Phone</th><th className="p-3">Students</th>
                <th className="p-3">Level</th><th className="p-3">Amount</th><th className="p-3">M-Pesa</th>
                <th className="p-3">Status</th><th className="p-3">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3 text-foreground">{r.sponsor_name}<div className="text-xs text-muted-foreground">{r.sponsor_email}</div></td>
                    <td className="p-3 text-muted-foreground">{r.sponsor_phone}</td>
                    <td className="p-3 text-foreground">{r.num_students}</td>
                    <td className="p-3 text-muted-foreground">{r.level}</td>
                    <td className="p-3 text-foreground font-semibold">KES {Number(r.amount).toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{r.mpesa_code || "—"}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.verified ? "bg-emerald-400/10 text-emerald-400" : "bg-yellow-400/10 text-yellow-400"}`}>{r.verified ? "Verified" : "Pending"}</span></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {!r.verified && <button onClick={() => setVerified(r.id, true)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10"><CheckCircle2 size={16} /></button>}
                        {r.verified && <button onClick={() => setVerified(r.id, false)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10"><XCircle size={16} /></button>}
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