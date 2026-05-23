import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/adminLog";
import { exportToXlsx } from "@/lib/exportXlsx";
import { Plus, Trash2, Edit2, Download, ChevronDown, ChevronUp, Users } from "lucide-react";

interface Promo {
  id: string;
  title: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  start_at: string;
  expires_at: string;
  is_active: boolean;
  eligible_users: string;
  description: string | null;
  deleted_at: string | null;
}

interface Redemption {
  id: string;
  code: string;
  registration_id: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  discount_amount: number;
  created_at: string;
  // joined from registrations
  reg_name?: string;
  reg_ticket_code?: string;
}

const empty = (): Partial<Promo> => ({
  title: "", code: "", discount_type: "percentage", discount_value: 10,
  max_uses: null,
  start_at: new Date().toISOString().slice(0, 16),
  expires_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  is_active: true, eligible_users: "all", description: "",
});

const AdminPromotions = () => {
  const [rows, setRows]       = useState<Promo[]>([]);
  const [editing, setEditing] = useState<Partial<Promo> | null>(null);
  const [loading, setLoading] = useState(false);
  // ── NEW: expanded rows show redemption detail ──
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [redemptions, setRedemptions]     = useState<Record<string, Redemption[]>>({});
  const [loadingRed, setLoadingRed]       = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("promotions").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    setRows((data as any) || []);
  };

  useEffect(() => { load(); }, []);

  // ── Load redemptions for a specific promotion ──────────────────────────────
  const loadRedemptions = async (promoId: string, code: string) => {
    if (redemptions[promoId]) return; // already loaded
    setLoadingRed(promoId);
    const { data, error } = await supabase
      .from("promo_redemptions")
      .select("id, code, registration_id, email, phone, status, discount_amount, created_at")
      .eq("code", code)
      .eq("status","redeemed" )
      .order("created_at", { ascending: false });

    if (error) { toast.error("Failed to load redemptions"); setLoadingRed(null); return; }

    // Enrich with registration name + ticket code
    const enriched: Redemption[] = await Promise.all(
      (data || []).map(async (r: any) => {
        if (!r.registration_id) return r;
        const { data: reg } = await supabase
          .from("registrations")
          .select("name, ticket_code")
          .eq("id", r.registration_id)
          .single();
        return { ...r, reg_name: reg?.name, reg_ticket_code: reg?.ticket_code };
      })
    );

    setRedemptions((prev) => ({ ...prev, [promoId]: enriched }));
    setLoadingRed(null);
  };

  const toggleExpand = (p: Promo) => {
    if (expandedId === p.id) {
      setExpandedId(null);
    } else {
      setExpandedId(p.id);
      loadRedemptions(p.id, p.code);
    }
  };

  const save = async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const payload: any = {
        title: editing.title,
        code: (editing.code || "").toUpperCase().trim(),
        discount_type: editing.discount_type,
        discount_value: Number(editing.discount_value),
        max_uses: editing.max_uses ? Number(editing.max_uses) : null,
        start_at: new Date(editing.start_at as string).toISOString(),
        expires_at: new Date(editing.expires_at as string).toISOString(),
        is_active: !!editing.is_active,
        eligible_users: editing.eligible_users,
        description: editing.description,
      };
      const { data: { user } } = await supabase.auth.getUser();
      if (editing.id) {
        const prev = rows.find((r) => r.id === editing.id);
        const { error } = await supabase.from("promotions").update({ ...payload, updated_by: user?.id }).eq("id", editing.id);
        if (error) throw error;
        await logAdminAction({ actionType: "promotion.update", targetType: "promotion", targetId: editing.id, description: `Updated ${payload.code}`, metadata: { previous: prev, next: payload } });
      } else {
        const { data, error } = await supabase.from("promotions").insert({ ...payload, created_by: user?.id, updated_by: user?.id }).select("id").single();
        if (error) throw error;
        await logAdminAction({ actionType: "promotion.create", targetType: "promotion", targetId: data.id, description: `Created ${payload.code}`, metadata: { next: payload } });
      }
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally { setLoading(false); }
  };

  const softDelete = async (p: Promo) => {
    if (!confirm(`Delete promotion ${p.code}?`)) return;
    const { error } = await supabase.from("promotions").update({ deleted_at: new Date().toISOString(), is_active: false }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await logAdminAction({ actionType: "promotion.delete", targetType: "promotion", targetId: p.id, description: `Soft-deleted ${p.code}`, metadata: { previous: p } });
    toast.success("Deleted"); load();
  };

  const toggleActive = async (p: Promo) => {
    const { error } = await supabase.from("promotions").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await logAdminAction({ actionType: "promotion.toggle", targetType: "promotion", targetId: p.id, description: `${p.is_active ? "Deactivated" : "Activated"} ${p.code}` });
    load();
  };

  const exportRedemptions = () => {
    const allRed = Object.values(redemptions).flat();
    if (!allRed.length) { toast.error("Expand a promotion first to load redemptions"); return; }
    exportToXlsx(
      allRed.map((r) => ({
        promo_code: r.code,
        name: r.reg_name || "—",
        ticket_code: r.reg_ticket_code || "—",
        email: r.email || "—",
        phone: r.phone || "—",
        discount_amount: r.discount_amount,
        date: new Date(r.created_at).toLocaleDateString("en-KE"),
      })),
      "promo-redemptions",
      "Promo Redemptions"
    );
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Promotions</h1>
        <div className="flex gap-2">
          <button onClick={exportRedemptions} className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-2">
            <Users size={14} /> Export Users
          </button>
          <button onClick={() => exportToXlsx(rows as any, "promotions", "Promotions")}
            className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-2">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setEditing(empty())}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2">
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      <div className="glass rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground text-xs uppercase">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Code</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Window</th>
              <th className="p-3">Uses</th>
              <th className="p-3">Status</th>
              <th className="p-3">Users</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <>
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">{p.title}</td>
                  <td className="p-3 font-mono">{p.code}</td>
                  <td className="p-3">{p.discount_type === "percentage" ? `${p.discount_value}%` : `KES ${p.discount_value}`}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(p.start_at).toLocaleDateString()} → {new Date(p.expires_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">{p.used_count}{p.max_uses ? ` / ${p.max_uses}` : ""}</td>
                  <td className="p-3">
                    <button onClick={() => toggleActive(p)}
                      className={`text-xs px-2 py-1 rounded-full ${p.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  {/* ── NEW: expand to see who used it ── */}
                  <td className="p-3">
                    <button
                      onClick={() => toggleExpand(p)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {p.used_count} user{p.used_count !== 1 ? "s" : ""}
                      {expandedId === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setEditing({ ...p, start_at: new Date(p.start_at).toISOString().slice(0,16), expires_at: new Date(p.expires_at).toISOString().slice(0,16) })}
                      className="p-1.5 hover:text-primary"><Edit2 size={14}/></button>
                    <button onClick={() => softDelete(p)} className="p-1.5 hover:text-destructive"><Trash2 size={14}/></button>
                  </td>
                </tr>

                {/* ── Redemption detail rows ── */}
                {expandedId === p.id && (
                  <tr key={`${p.id}-redemptions`} className="bg-muted/20">
                    <td colSpan={8} className="px-6 py-4">
                      {loadingRed === p.id ? (
                        <p className="text-xs text-muted-foreground">Loading users…</p>
                      ) : (redemptions[p.id] || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No redemptions recorded yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground border-b border-border">
                                <th className="py-1 pr-4 text-left">Name</th>
                                <th className="py-1 pr-4 text-left">Booking Code</th>
                                <th className="py-1 pr-4 text-left">Email</th>
                                <th className="py-1 pr-4 text-left">Phone</th>
                                <th className="py-1 pr-4 text-right">Discount (KES)</th>
                                <th className="py-1 text-left">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(redemptions[p.id] || []).map((r) => (
                                <tr key={r.id} className="border-b border-border/30">
                                  <td className="py-1.5 pr-4 font-medium text-foreground">{r.reg_name || "—"}</td>
                                  <td className="py-1.5 pr-4 font-mono text-primary">{r.reg_ticket_code || "—"}</td>
                                  <td className="py-1.5 pr-4 text-muted-foreground">{r.email || "—"}</td>
                                  <td className="py-1.5 pr-4 text-muted-foreground">{r.phone || "—"}</td>
                                  <td className="py-1.5 pr-4 text-right text-emerald-400 font-semibold">
                                    {Number(r.discount_amount).toLocaleString()}
                                  </td>
                                  <td className="py-1.5 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-KE")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!rows.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No promotions yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Edit / Create modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="glass rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold mb-4">{editing.id ? "Edit" : "New"} Promotion</h3>
            <div className="space-y-3">
              {[
                ["Title","title","text"],["Code","code","text"],["Discount value","discount_value","number"],
                ["Max uses (blank = unlimited)","max_uses","number"],["Start at","start_at","datetime-local"],
                ["Expires at","expires_at","datetime-local"],["Description","description","text"],
              ].map(([label,key,type]) => (
                <div key={key as string}>
                  <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                  <input type={type as string} value={(editing as any)[key as string] ?? ""}
                    onChange={(e) => setEditing({ ...editing, [key as string]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Discount type</label>
                <select value={editing.discount_type} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed (KES)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Eligibility</label>
                <select value={editing.eligible_users} onChange={(e) => setEditing({ ...editing, eligible_users: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                  <option value="all">All users</option>
                  <option value="new_users">New users only</option>
                  <option value="specific_segment">Specific segment</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg border border-border">Cancel</button>
              <button onClick={save} disabled={loading} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-semibold">
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPromotions;
