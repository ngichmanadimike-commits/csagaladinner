import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";
import { logAdminAction } from "@/lib/adminLog";

interface Pkg {
  id?: string;
  slug: string;
  name: string;
  price: number;
  description?: string;
  perks: string[];
  capacity?: number | null;
  partial_allowed: boolean;
  installments: number[];
  installment_mode: "amount" | "percent";
  active: boolean;
  display_order: number;
}

const blank = (): Pkg => ({
  slug: "",
  name: "",
  price: 0,
  perks: [],
  capacity: null,
  partial_allowed: false,
  installments: [],
  installment_mode: "amount",
  active: true,
  display_order: 0,
});

const AdminPackages = () => {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPackages = async () => {
    const { data } = await supabase.from("ticket_packages").select("*").order("display_order");
    setPackages(((data as any) || []).map((p: any) => ({...p, perks: p.perks?? [], installments: p.installments?? [] })));
    setLoading(false);
  };

  useEffect(() => { fetchPackages(); }, []);

  const updateLocal = (i: number, patch: Partial<Pkg>) => {
    setPackages((prev) => prev.map((p, idx) => idx === i? {...p,...patch } : p));
  };

  const save = async (i: number) => {
    const p = packages[i];
    if (!p.slug ||!p.name || p.price < 0) { toast.error("Slug, name and non-negative price required"); return; }
    const payload: any = {
      slug: p.slug, name: p.name, price: p.price, description: p.description || null,
      perks: p.perks, capacity: p.capacity?? null,
      partial_allowed: p.partial_allowed,
      installments: p.installments,
      installment_mode: p.installment_mode,
      active: p.active, display_order: p.display_order,
    };
    if (p.id) {
      const { error } = await supabase.from("ticket_packages").update(payload).eq("id", p.id);
      if (error) { toast.error(error.message); return; }
      logAdminAction({ actionType: "UPDATE_PACKAGE", description: `Updated package ${p.name}`, targetType: "ticket_package", targetId: p.id, metadata: payload });
    } else {
      const { data, error } = await supabase.from("ticket_packages").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      logAdminAction({ actionType: "CREATE_PACKAGE", description: `Created package ${p.name}`, targetType: "ticket_package", targetId: data?.id, metadata: payload });
    }
    toast.success("Saved");
    fetchPackages();
  };

  const remove = async (i: number) => {
    const p = packages[i];
    if (!p.id) { setPackages((prev) => prev.filter((_, idx) => idx!== i)); return; }
    if (!confirm(`Delete package "${p.name}"?`)) return;
    const { error } = await supabase.from("ticket_packages").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    logAdminAction({ actionType: "DELETE_PACKAGE", description: `Deleted package ${p.name}`, targetType: "ticket_package", targetId: p.id });
    toast.success("Deleted");
    fetchPackages();
  };

  const addNew = () => setPackages((prev) => [...prev, {...blank(), display_order: prev.length + 1 }]);

  if (loading) return <AdminLayout><div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Ticket Packages</h1>
          <p className="text-sm text-muted-foreground">Edit prices, perks, capacity and installment plans. Installments are tied to the package price — when you change the price, update the installment amounts here too.</p>
        </div>
        <button onClick={addNew} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
          <Plus size={16} /> New Package
        </button>
      </div>

      <div className="space-y-4">
        {packages.map((p, i) => {
          const installmentTotal = p.installment_mode === "amount"
           ? p.installments.reduce((s, n) => s + Number(n || 0), 0)
            : Math.round(p.installments.reduce((s, n) => s + Number(n || 0), 0) * p.price / 100);
          const matches = installmentTotal === Number(p.price);
          return (
            <div key={p.id || `new-${i}`} className="glass rounded-xl p-5 grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Slug</label>
                    <input value={p.slug} onChange={(e) => updateLocal(i, { slug: e.target.value })} placeholder="individual" className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Order</label>
                    <input type="number" value={p.display_order} onChange={(e) => updateLocal(i, { display_order: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <input value={p.name} onChange={(e) => updateLocal(i, { name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Price (KES)</label>
                    <input type="number" value={p.price} onChange={(e) => updateLocal(i, { price: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Capacity (optional)</label>
                    <input type="number" value={p.capacity?? ""} onChange={(e) => updateLocal(i, { capacity: e.target.value? Number(e.target.value) : null })} className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <input value={p.description || ""} onChange={(e) => updateLocal(i, { description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Perks (one per line)</label>
                  <textarea value={p.perks.join("\n")} rows={3}
                    onChange={(e) => updateLocal(i, { perks: e.target.value.split("\n").filter(Boolean) })}
                    className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={p.active} onChange={(e) => updateLocal(i, { active: e.target.checked })} />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={p.partial_allowed} onChange={(e) => updateLocal(i, { partial_allowed: e.target.checked })} />
                    Allow partial payments
                  </label>
                </div>

                {/* REPLACED INSTALLMENT UI START */}
                {p.partial_allowed && (
                  <div className="space-y-3 p-3 rounded-lg bg-muted/40 border-border">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-muted-foreground">Mode:</label>
                      <select value={p.installment_mode} onChange={(e) => updateLocal(i, { installment_mode: e.target.value as any })} className="px-2 py-1 rounded bg-background border-border text-xs">
                        <option value="amount">Fixed amounts (KES)</option>
                        <option value="percent">Percent of price (%)</option>
                      </select>
                    </div>

                    <label className="text-xs text-muted-foreground block font-semibold">
                      Instalment Schedule — {p.installment_mode === "percent"? "enter % of total price" : "enter KES amount"}
                    </label>

                    {p.installments.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No instalments added yet. Click "Add Instalment" below.</p>
                    )}

                    <div className="space-y-2">
                      {p.installments.map((val, instIdx) => {
                        const kesVal = p.installment_mode === "percent"
                         ? Math.round((val / 100) * Number(p.price))
                          : val;
                        return (
                          <div key={instIdx} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-6 text-right">{instIdx + 1}.</span>
                            <input
                              type="number"
                              min="0"
                              value={val}
                              onChange={(e) => {
                                const updated = [...p.installments];
                                updated[instIdx] = Number(e.target.value) || 0;
                                updateLocal(i, { installments: updated });
                              }}
                              className="w-28 px-2 py-1.5 rounded-lg bg-background border-border text-sm font-mono"
                            />
                            {p.installment_mode === "percent" && (
                              <span className="text-xs text-muted-foreground">= KES {kesVal.toLocaleString()}</span>
                            )}
                            <button
                              onClick={() => {
                                const updated = p.installments.filter((_, idx) => idx!== instIdx);
                                updateLocal(i, { installments: updated });
                              }}
                              className="p-1 rounded text-destructive hover:bg-destructive/10 text-xs"
                              title="Remove this instalment"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => updateLocal(i, { installments: [...p.installments, 0] })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      + Add Instalment
                    </button>

                    <p className={`text-xs font-semibold ${matches? "text-emerald-400" : "text-yellow-400"}`}>
                      Total: KES {installmentTotal.toLocaleString()} {matches? "✓ matches package price" : `≠ package price KES ${Number(p.price).toLocaleString()} — adjust to match`}
                    </p>
                  </div>
                )}
                {/* REPLACED INSTALLMENT UI END */}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => save(i)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                    <Save size={14} /> Save
                  </button>
                  <button onClick={() => remove(i)} className="px-3 py-2 rounded-lg border-border text-destructive hover:bg-destructive/10 text-sm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {packages.length === 0 && (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground">
            No packages yet. Click <strong>New Package</strong> above to create one.
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPackages;
