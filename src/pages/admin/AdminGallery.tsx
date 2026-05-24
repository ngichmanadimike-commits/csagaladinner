import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, Image as ImageIcon, Eye, EyeOff } from "lucide-react";

interface GalleryImage {
  id: string;
  image_url: string;
  title: string | null;
  caption: string | null;
  display_order: number;
  active: boolean;
  created_at: string;
}

const AdminGallery = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const fetchImages = async () => {
    // Admin sees ALL images (including inactive)
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load gallery: " + error.message);
    setImages((data as GalleryImage[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchImages(); }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!previewFile) return;
    setUploading(true);
    const ext = previewFile.name.split(".").pop();
    const path = `gallery/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("site-images")
      .upload(path, previewFile, { upsert: true });

    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("site-images").getPublicUrl(path);

    const { error: dbErr } = await supabase.from("gallery_images").insert({
      image_url: urlData.publicUrl,
      title: uploadTitle.trim() || null,
      caption: uploadCaption.trim() || null,
      active: true,
      display_order: images.length,
    } as any);

    setUploading(false);
    if (dbErr) {
      toast.error("Failed to save image record: " + dbErr.message);
    } else {
      toast.success("Uploaded successfully");
      setPreviewFile(null);
      setPreviewUrl(null);
      setUploadTitle("");
      setUploadCaption("");
      fetchImages();
    }
  };

  const handleToggleActive = async (img: GalleryImage) => {
    const { error } = await supabase
      .from("gallery_images")
      .update({ active: !img.active })
      .eq("id", img.id);
    if (error) toast.error("Update failed: " + error.message);
    else {
      toast.success(img.active ? "Hidden from public gallery" : "Shown in public gallery");
      fetchImages();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image permanently?")) return;
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) toast.error("Delete failed: " + error.message);
    else { toast.success("Deleted"); fetchImages(); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Gallery Management</h1>
      </div>

      {/* Upload panel */}
      <div className="glass rounded-xl p-5 mb-6 border border-primary/20">
        <h2 className="font-semibold text-foreground mb-4">Upload New Image</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="flex items-center justify-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="max-h-40 rounded-lg object-contain" />
              ) : (
                <div className="text-center">
                  <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to select image (max 10MB)</p>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </label>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Title</label>
            <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
              placeholder="Photo title"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Caption (optional)</label>
            <input value={uploadCaption} onChange={e => setUploadCaption(e.target.value)}
              placeholder="Short description"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
          </div>
          <div className="sm:col-span-2">
            <button onClick={handleUpload} disabled={!previewFile || uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/80 transition-colors">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Uploading..." : "Upload Image"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : images.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <ImageIcon className="text-muted-foreground mx-auto mb-3" size={40} />
          <p className="text-muted-foreground text-sm">No gallery images yet. Upload one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className={`glass rounded-xl overflow-hidden group relative ${!img.active ? "opacity-50" : ""}`}>
              <img src={img.image_url} alt={img.title || ""} className="w-full aspect-square object-cover" loading="lazy" />
              <div className="p-2">
                <p className="text-xs text-foreground truncate font-medium">{img.title || "Untitled"}</p>
                {img.caption && <p className="text-xs text-muted-foreground truncate">{img.caption}</p>}
                <p className="text-xs text-muted-foreground">{new Date(img.created_at).toLocaleDateString()}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${img.active ? "bg-emerald-400/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  {img.active ? "Visible" : "Hidden"}
                </span>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleToggleActive(img)}
                  className="p-1.5 rounded-lg bg-background/80 text-foreground hover:bg-background">
                  {img.active ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => handleDelete(img.id)}
                  className="p-1.5 rounded-lg bg-background/80 text-destructive hover:bg-background">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminGallery;
