import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, FileText, ExternalLink } from "lucide-react";

const AdminDocuments = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState({ title: "", description: "", category: "program" });

  const load = async () => {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File) => {
    if (!meta.title) { toast.error("Add a title first"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${meta.category}/${Date.now()}.${ext}`;
    const { error: up } = await supabase.storage.from("documents").upload(path, file);
    if (up) { toast.error(up.message); setUploading(false); return; }
    const { data: url } = supabase.storage.from("documents").getPublicUrl(path);
    const { error } = await supabase.from("documents").insert({
      title: meta.title, description: meta.description, category: meta.category,
      file_url: url.publicUrl, file_type: file.type,
    });
    setUploading(false);
    if (error) toast.error(error.message);
    else { toast.success("Uploaded"); setMeta({ title: "", description: "", category: "program" }); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete document?")) return;
    await supabase.from("documents").delete().eq("id", id);
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("documents").update({ active }).eq("id", id);
    load();
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">Documents</h1>

      <div className="glass rounded-xl p-5 mb-6 space-y-3">
        <h2 className="font-display text-lg font-bold">Upload Document</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="Title" className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
          <input value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} placeholder="Description" className="px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
          <select value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
            <option value="program">Program</option>
            <option value="proposal">Proposal</option>
            <option value="general">General</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Uploading..." : "Choose File"}
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
        </label>
      </div>

      {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> :
        items.length === 0 ? <div className="glass rounded-xl p-8 text-center text-muted-foreground">No documents yet.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((d) => (
            <div key={d.id} className="glass rounded-xl p-4 flex items-start gap-3">
              <FileText size={28} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.category}</p>
                {d.description && <p className="text-sm text-muted-foreground mt-1">{d.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1"><ExternalLink size={12} /> View</a>
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <input type="checkbox" checked={d.active} onChange={(e) => toggleActive(d.id, e.target.checked)} /> Public
                  </label>
                  <button onClick={() => del(d.id)} className="text-destructive ml-auto"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDocuments;