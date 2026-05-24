import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Plus, Trash2, Save, Upload, Loader2, Download } from "lucide-react";
import { exportToXlsx } from "@/lib/exportXlsx";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
  active: boolean;
}

const AdminPartners = () => {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchAll = async () => {
    const { data } = await supabase.from("partners").select("*").order("display_order");
    setItems((data as Partner[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAdd = async () => {
    const { data, error } = await supabase
      .from("partners").insert({ name: "New Partner" }).select().single();
    if (error) toast.error(error.message);
    else { setItems([...items, data as Partner]); toast.success("Partner added"); }
  };

  const handleSave = async (p: Partner) => {
    const { error } = await supabase.from("partners").update({
      name: p.name, logo_url: p.logo_url, website_url: p.website_url,
      display_order: p.display_order, active: p.active,
    }).eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this partner?")) return;
    const { error } = await supabase.from("partners").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { setItems(items.filter((i) => i.id !== id)); toast.success("Deleted"); }
  };

  const handleLogoUpload = async (p: Partner, file: File) => {
    setUploading(p.id);
    const ext = file.name.split(".").pop();
    const path = `partners/${p.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(null); return; }
    const { data } = supabase.storage.from("site-images").getPublicUrl(path);
    update(p.id, "logo_url", data.publicUrl);
    await supabase.from("partners").update({ logo_url: data.publicUrl }).eq("id", p.id);
    setUploading(null);
    toast.success("Logo uploaded");
  };

  const update = (id: string, field: keyof Partner, value: any) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="font-display text-2xl font-bold text-foreground">Partners</h1>
        <div className="flex gap-2">
          <button onClick={() => exportToXlsx(items as any, "partners", "Partners")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-semibold">
            <Download size={16} /> Export
          </button>
          <button onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            <Plus size={16} /> Add Partner
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((p) => (
            <div key={p.id} className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {p.logo_url
                  ? <img src={p.logo_url} alt="" className="w-16 h-16 object-contain rounded-lg bg-white/90 p-1" />
                  : <div className="w-16 h-16 rounded-lg bg-muted" />}
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm cursor-pointer hover:border-primary">
                  {uploading === p.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(p, f); }} />
                </label>
              </div>
              <input value={p.name} onChange={(e) => update(p.id, "name", e.target.value)}
                placeholder="Name" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
              <input value={p.website_url || ""} onChange={(e) => update(p.id, "website_url", e.target.value)}
                placeholder="Website URL" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Order</label>
                <input type="number" value={p.display_order}
                  onChange={(e) => update(p.id, "display_order", parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 rounded-lg bg-muted border border-border text-sm" />
                <label className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                  <input type="checkbox" checked={p.active}
                    onChange={(e) => update(p.id, "active", e.target.checked)} /> Active
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSave(p)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                  <Save size={14} /> Save
                </button>
                <button onClick={() => handleDelete(p.id)}
                  className="px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPartners;
