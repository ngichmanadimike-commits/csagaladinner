import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Plus, Trash2, Save, Upload, Loader2 } from "lucide-react";

const AdminSpeakers = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("speakers").select("*").order("display_order");
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const { data, error } = await supabase.from("speakers").insert({ name: "New Speaker" }).select().single();
    if (error) toast.error(error.message); else setItems([...items, data]);
  };

  const save = async (s: any) => {
    const { error } = await supabase.from("speakers").update({
      name: s.name, role: s.role, bio: s.bio, photo_url: s.photo_url,
      display_order: s.display_order, active: s.active,
    }).eq("id", s.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const del = async (id: string) => {
    if (!confirm("Delete speaker?")) return;
    await supabase.from("speakers").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  };

  const upload = async (s: any, file: File) => {
    setUploading(s.id);
    const ext = file.name.split(".").pop();
    const path = `speakers/${s.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(null); return; }
    const { data } = supabase.storage.from("site-images").getPublicUrl(path);
    update(s.id, "photo_url", data.publicUrl);
    await supabase.from("speakers").update({ photo_url: data.publicUrl }).eq("id", s.id);
    setUploading(null);
    toast.success("Photo uploaded");
  };

  const update = (id: string, field: string, value: any) =>
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Speakers</h1>
        <button onClick={add} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"><Plus size={16} /> Add</button>
      </div>

      {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> :
        items.length === 0 ? <div className="glass rounded-xl p-8 text-center text-muted-foreground">No speakers yet.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((s) => (
            <div key={s.id} className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {s.photo_url ? <img src={s.photo_url} alt="" className="w-16 h-16 object-cover rounded-full" /> : <div className="w-16 h-16 rounded-full bg-muted" />}
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm cursor-pointer hover:border-primary">
                  {uploading === s.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(s, f); }} />
                </label>
              </div>
              <input value={s.name} onChange={(e) => update(s.id, "name", e.target.value)} placeholder="Name" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
              <input value={s.role || ""} onChange={(e) => update(s.id, "role", e.target.value)} placeholder="Role / Title" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
              <textarea value={s.bio || ""} onChange={(e) => update(s.id, "bio", e.target.value)} placeholder="Short bio" rows={3} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm resize-none" />
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground">Order</label>
                <input type="number" value={s.display_order} onChange={(e) => update(s.id, "display_order", parseInt(e.target.value) || 0)} className="w-20 px-2 py-1 rounded-lg bg-muted border border-border text-sm" />
                <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={s.active} onChange={(e) => update(s.id, "active", e.target.checked)} /> Active</label>
              </div>
              <div className="flex gap-2">
                <button onClick={() => save(s)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"><Save size={14} /> Save</button>
                <button onClick={() => del(s.id)} className="px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSpeakers;