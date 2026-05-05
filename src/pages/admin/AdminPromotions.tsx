import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/adminLog";
import { exportToXlsx } from "@/lib/exportXlsx";
import { Plus, Trash2, Edit2, Download } from "lucide-react";

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

const empty = (): Partial<Promo> => ({
  title: "",
  code: "",
  discount_type: "percentage",
  discount_value: 10,
  max_uses: null,
  start_at: new Date().toISOString().slice(0, 16),
  expires_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  is_active: true,
  eligible_users: "all",
  description: "",
});

const AdminPromotions = () => {
  const [rows, setRows] = useState<Promo[]>([]);
  const [editing, setEditing] = useState<Partial<Promo> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setRows((data as any) || []);
  };

  useEffect(() => { load(); }, []);

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
        const { error } = await supabase
          .from("promotions")
          .update({ ...payload, updated_by: user?.id })
          .eq("id", editing.id);
        if (error) throw error;
        await logAdminAction({
          actionType: "promotion.update",
          targetType: "promotion",
          targetId: editing.id,
          description: `Updated promotion ${payload.code}`,
          metadata: { previous: prev, next: payload },
        });
      } else {
        const { data, error } = await supabase
          .from("promotions")
          .insert({ ...payload, created_by: user?.id, updated_by: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        await logAdminAction({
          actionType: "promotion.create",
          targetType: "promotion",
          targetId: data.id,
          description: `Created promotion ${payload.code}`,
          metadata: { next: payload },
        });
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
    const { error } = await supabase
      .from("promotions")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      actionType: "promotion.delete",
      targetType: "promotion",
      targetId: p.id,
      description: `Soft-deleted promotion ${p.code}`,
      metadata: { previous: p },
    });
    toast.success("Deleted");
    load();
  };

  const toggleActive = async (p: Promo) => {
    const { error } = await supabase
      .from("promotions")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      actionType: "promotion.toggle",
      targetType: "promotion",
      targetId: p.id,
      description: `${p.is_active ? "Deactivated" : "Activated"} ${p.code}`,
    });
    load();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Promotions</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportToXlsx(rows as any, "promotions", "Promotions")}
            className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-2"
          ><Download size={14}/> Export</button>
          <button
            onClick={() => setEditing(empty())}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"
          ><Plus size={14}/> New</button>
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
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{p.title}</td>
                <td className="p-3 font-mono">{p.code}</td>
                <td className="p-3">{p.discount_type === "percentage" ? `${p.discount_value}%` : `KES ${p.discount_value}`}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(p.start_at).toLocaleDateString()} → {new Date(p.expires_at).toLocaleDateString()}
                </td>
                <td className="p-3">{p.used_count}{p.max_uses ? ` / ${p.max_uses}` : ""}</td>
                <td className="p-3">
                  <button onClick={() => toggleActive(p)} className={`text-xs px-2 py-1 rounded-full ${p.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing({
                    ...p,
                    start_at: new Date(p.start_at).toISOString().slice(0,16),
                    expires_at: new Date(p.expires_at).toISOString().slice(0,16),
                  })} className="p-1.5 hover:text-primary"><Edit2 size={14}/></button>
                  <button onClick={() => softDelete(p)} className="p-1.5 hover:text-destructive"><Trash2 size={14}/></button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No promotions yet</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="glass rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold mb-4">{editing.id ? "Edit" : "New"} Promotion</h3>
            <div className="space-y-3">
              {[
                ["Title","title","text"],
                ["Code","code","text"],
                ["Discount value","discount_value","number"],
                ["Max uses (blank = unlimited)","max_uses","number"],
                ["Start at","start_at","datetime-local"],
                ["Expires at","expires_at","datetime-local"],
                ["Description","description","text"],
              ].map(([label,key,type]) => (
                <div key={key as string}>
                  <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                  <input
                    type={type as string}
                    value={(editing as any)[key as string] ?? ""}
                    onChange={(e) => setEditing({ ...editing, [key as string]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Discount type</label>
                <select value={editing.discount_type} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as any })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed (KES)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Eligibility</label>
                <select value={editing.eligible_users} onChange={(e) => setEditing({ ...editing, eligible_users: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm">
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