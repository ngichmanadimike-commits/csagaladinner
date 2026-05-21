import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";

interface PkgRow {
  id?: string;
  name: string;
  price: number;
  description: string;
  perks: string[];
  display_order: number;
  active: boolean;
}

const blank = (): PkgRow => ({
  name: "",
  price: 0,
  description: "",
  perks: [],
  display_order: 0,
  active: true,
});

const AdminPartnerPackages = () => {
  const [packages, setPackages] = useState<PkgRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPackages = async () => {
    const { data, error } = await supabase
    .from("partner_packages")
    .select("*")
    .order("display_order");

    if (error) toast.error("Failed to load packages: " + error.message);

    setPackages((data as PkgRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const updateLocal = (i: number, patch: Partial<PkgRow>) => {
    setPackages((prev) =>
      prev.map((p, idx) => (idx === i? {...p,...patch } : p))
    );
  };

  const save = async (i: number) => {
    const p = packages[i];

    if (!p.name.trim() || p.price < 0) {
      toast.error("Name and a non-negative price are required");
      return;
    }

    const payload = {
      name: p.name.trim(),
      price: p.price,
      description: p.description.trim() || null,
      perks: p.perks.filter(Boolean),
      display_order: p.display_order,
      active: p.active,
    };

    if (p.id) {
      const { error } = await supabase
      .from("partner_packages")
      .update(payload)
      .eq("id", p.id);

      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
      .from("partner_packages")
      .insert(payload)
      .select("id")
      .single();

      if (error) {
        toast.error(error.message);
        return;
      }

      setPackages((prev) =>
        prev.map((pkg, idx) =>
          idx === i? {...pkg, id: data.id } : pkg
        )
      );
    }

    toast.success("Saved");
  };

  const remove = async (i: number) => {
    const p = packages[i];

    if (!p.id) {
      setPackages((prev) => prev.filter((_, idx) => idx!== i));
      return;
    }

    if (!confirm(`Delete "${p.name}"?`)) return;

    const { error } = await supabase
    .from("partner_packages")
    .delete()
    .eq("id", p.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Deleted");

    setPackages((prev) => prev.filter((_, idx) => idx!== i));
  };

  const addNew = () =>
    setPackages((prev) => [
    ...prev,
     {...blank(), display_order: prev.length + 1 },
    ]);

  if (loading)
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <Loader2 className="animate-spin mx-auto text-primary" />
        </div>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Partner Packages
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Define the partnership tiers shown on the public Partners section.
          </p>
        </div>

        <button
          onClick={addNew}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Plus size={16} /> New Package
        </button>
      </div>

      <div className="space-y-4">
        {packages.map((p, i) => (
          <div
            key={p.id || `new-${i}`}
            className="glass rounded-xl p-5 grid md:grid-cols-2 gap-4"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Package Name
                  </label>

                  <input
                    value={p.name}
                    onChange={(e) =>
                      updateLocal(i, { name: e.target.value })
                    }
                    placeholder="Gold Partner"
                    className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    Display Order
                  </label>

                  <input
                    type="number"
                    value={p.display_order}
                    onChange={(e) =>
                      updateLocal(i, {
                        display_order: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">
                  Price (KES)
                </label>

                <input
                  type="number"
                  min={0}
                  value={p.price}
                  onChange={(e) =>
                    updateLocal(i, { price: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">
                  Short Description
                </label>

                <input
                  value={p.description}
                  onChange={(e) =>
                    updateLocal(i, { description: e.target.value })
                  }
                  placeholder="Premium visibility"
                  className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  Perks (one per line)
                </label>

                <textarea
                  rows={5}
                  value={p.perks.join("\n")}
                  onChange={(e) =>
                    updateLocal(i, {
                      perks: e.target.value.split("\n"),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-muted border-border text-sm resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={(e) =>
                    updateLocal(i, { active: e.target.checked })
                  }
                />
                Active (visible on site)
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => save(i)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                >
                  <Save size={14} /> Save
                </button>

                <button
                  onClick={() => remove(i)}
                  className="px-3 py-2 rounded-lg border-border text-destructive hover:bg-destructive/10 text-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminPartnerPackages;
