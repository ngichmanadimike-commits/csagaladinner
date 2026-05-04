import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Download, Search, Shield } from "lucide-react";
import { exportToXlsx } from "@/lib/exportXlsx";

const AdminActivity = () => {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const fetchLogs = async () => {
    setLoading(true);
    let q = supabase.from("admin_activity_logs").select("*").order("created_at", { ascending: false }).limit(2000);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    const { data } = await q;
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { if (isSuperAdmin) fetchLogs(); }, [isSuperAdmin, from, to]);

  if (authLoading) return <AdminLayout><div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div></AdminLayout>;

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto mt-10">
          <Shield className="mx-auto text-yellow-400 mb-3" size={36} />
          <h2 className="font-display text-xl font-bold mb-2">Super Admin Only</h2>
          <p className="text-sm text-muted-foreground">
            The Admin Activity log is restricted to Super Admins. Ask the Super Admin to grant access.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const actions = Array.from(new Set(logs.map((l) => l.action_type))).sort();
  const admins = Array.from(new Set(logs.map((l) => `${l.admin_email || l.admin_id}`))).sort();

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || JSON.stringify(l).toLowerCase().includes(q);
    const matchAction = actionFilter === "all" || l.action_type === actionFilter;
    const matchAdmin = adminFilter === "all" || (l.admin_email || l.admin_id) === adminFilter;
    return matchSearch && matchAction && matchAdmin;
  });

  // Performance summary per admin
  const summary: Record<string, { name: string; total: number; success: number; failed: number }> = {};
  filtered.forEach((l) => {
    const k = l.admin_email || l.admin_id || "unknown";
    summary[k] ||= { name: l.admin_name || k, total: 0, success: 0, failed: 0 };
    summary[k].total++;
    if (l.status === "success") summary[k].success++; else summary[k].failed++;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Activity & Performance</h1>
          <p className="text-xs text-muted-foreground">Append-only audit trail. Super Admin only.</p>
        </div>
        <button
          onClick={() => exportToXlsx(
            filtered.map((l) => ({
              "Admin Name": l.admin_name,
              "Email": l.admin_email,
              "Role": l.role,
              "Branch": l.branch,
              "Action Type": l.action_type,
              "Description": l.action_description,
              "Target Type": l.target_type,
              "Target ID": l.target_id,
              "Date": new Date(l.created_at).toISOString().slice(0, 10),
              "Time": new Date(l.created_at).toISOString().slice(11, 19),
              "Status": l.status,
              "IP": l.ip_address,
              "Device": l.device_info,
              "Metadata": JSON.stringify(l.metadata || {}),
            })),
            "admin-activity",
            "Activity"
          )}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Download size={16} /> Export XLSX
        </button>
      </div>

      <div className="glass rounded-xl p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description / target..." className="pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm w-full" />
        </div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
          <option value="all">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
          <option value="all">All admins</option>
          {admins.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value ? `${e.target.value}T00:00:00Z` : "")} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value ? `${e.target.value}T23:59:59Z` : "")} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
      </div>

      {/* Performance summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {Object.entries(summary).slice(0, 6).map(([k, s]) => (
          <div key={k} className="glass rounded-xl p-3">
            <p className="font-semibold text-sm">{s.name}</p>
            <p className="text-xs text-muted-foreground truncate">{k}</p>
            <div className="flex gap-3 mt-2 text-xs">
              <span>Total: <strong>{s.total}</strong></span>
              <span className="text-emerald-400">OK: {s.success}</span>
              <span className="text-red-400">Fail: {s.failed}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No activity yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">When</th>
                  <th className="p-3 text-left">Admin</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Target</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20 align-top">
                    <td className="p-3 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="p-3"><div className="font-semibold text-foreground">{l.admin_name}</div><div className="text-xs text-muted-foreground">{l.admin_email}</div></td>
                    <td className="p-3 text-xs">{l.role}<br /><span className="text-muted-foreground">{l.branch}</span></td>
                    <td className="p-3 text-xs"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">{l.action_type}</span></td>
                    <td className="p-3 text-xs max-w-xs">{l.action_description}</td>
                    <td className="p-3 text-xs text-muted-foreground">{l.target_type}<br /><span className="font-mono">{l.target_id?.slice(0, 8)}</span></td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${l.status === "success" ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>{l.status}</span></td>
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

export default AdminActivity;
