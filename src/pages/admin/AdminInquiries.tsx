import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx } from "@/lib/exportXlsx";

const AdminInquiries = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("partner_inquiries").select("*").order("created_at", { ascending: false });
    setRows(data || []); setLoading(false);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("inq-rt").on("postgres_changes", { event: "*", schema: "public", table: "partner_inquiries" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("partner_inquiries").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete inquiry?")) return;
    await supabase.from("partner_inquiries").delete().eq("id", id);
    load();
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !search || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.company?.toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Partner Inquiries</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm w-full sm:w-64" />
          </div>
          <button onClick={() => exportToXlsx(filtered, "partner-inquiries", "Inquiries")} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> :
        filtered.length === 0 ? <div className="glass rounded-xl p-8 text-center text-muted-foreground">No inquiries yet.</div> : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-foreground">{r.name} <span className="text-xs text-muted-foreground">— {r.company}</span></p>
                  <p className="text-xs text-muted-foreground">{r.email} • {r.phone}</p>
                  {r.proposal && <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{r.proposal}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="px-2 py-1 rounded-lg bg-muted border border-border text-xs">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button onClick={() => del(r.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInquiries;