import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Save, Upload, Plus, Trash2, Image as ImageIcon } from "lucide-react";

interface ContentItem {
  id: string;
  section_key: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  updated_at: string;
}

const AdminContent = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");

  const fetchContent = async () => {
    const { data } = await supabase.from("site_content").select("*").order("section_key");
    setItems((data as ContentItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchContent(); }, []);

  const handleSave = async (item: ContentItem) => {
    setSaving(item.id);
    const { error } = await supabase
      .from("site_content")
      .update({
        title: item.title,
        body: item.body,
        image_url: item.image_url,
        updated_by: user?.id,
      })
      .eq("id", item.id);

    setSaving(null);
    if (error) toast.error("Failed to save");
    else toast.success(`"${item.section_key}" updated`);
  };

  const handleCreate = async () => {
    if (!newKey.trim()) return;
    const { data, error } = await supabase
      .from("site_content")
      .insert({ section_key: newKey.trim() } as any)
      .select()
      .single();

    if (error) toast.error(error.message);
    else {
      setItems([...(items), data as ContentItem]);
      setNewKey("");
      toast.success("Section created");
    }
  };

  const handleDelete = async (id: string, key: string) => {
    if (!confirm(`Delete section "${key}"?`)) return;
    const { error } = await supabase.from("site_content").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      setItems(items.filter((i) => i.id !== id));
      toast.success("Section deleted");
    }
  };

  const handleImageUpload = async (item: ContentItem, file: File) => {
    setUploading(item.id);
    const ext = file.name.split(".").pop();
    const path = `${item.section_key}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("site-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("site-images").getPublicUrl(path);
    const updated = items.map((i) =>
      i.id === item.id ? { ...i, image_url: urlData.publicUrl } : i
    );
    setItems(updated);

    // Auto-save the image URL
    await supabase
      .from("site_content")
      .update({ image_url: urlData.publicUrl, updated_by: user?.id })
      .eq("id", item.id);

    setUploading(null);
    toast.success("Image uploaded");
  };

  const updateItem = (id: string, field: string, value: string) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">Content Management</h1>

      {/* Create new section */}
      <div className="glass rounded-xl p-5 mb-6">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Add Content Section</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Section key (e.g. hero, about, sponsors)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleCreate}
            disabled={!newKey.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-muted-foreground">No content sections yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider">
                  {item.section_key}
                </h3>
                <button
                  onClick={() => handleDelete(item.id, item.section_key)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                  <input
                    type="text"
                    value={item.title || ""}
                    onChange={(e) => updateItem(item.id, "title", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Body</label>
                  <textarea
                    value={item.body || ""}
                    onChange={(e) => updateItem(item.id, "body", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>

                {/* Image */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Image</label>
                  {item.image_url && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-border w-32 h-20">
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary cursor-pointer transition-colors">
                    {uploading === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(item, f);
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">
                    Updated: {new Date(item.updated_at).toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleSave(item)}
                    disabled={saving === item.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                  >
                    {saving === item.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminContent;
