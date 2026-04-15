import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, Image as ImageIcon } from "lucide-react";

interface GalleryImage {
  id: string;
  image_url: string;
  title: string | null;
  created_at: string;
}

const AdminGallery = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchImages = async () => {
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .order("created_at", { ascending: false });
    setImages((data as GalleryImage[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchImages(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `gallery/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("site-images")
      .upload(path, file, { upsert: true });

    if (upErr) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("site-images").getPublicUrl(path);

    const { error: dbErr } = await supabase.from("gallery_images").insert({
      image_url: urlData.publicUrl,
      title: file.name.replace(/\.[^.]+$/, ""),
      uploaded_by: user?.id,
    } as any);

    setUploading(false);
    if (dbErr) toast.error(dbErr.message);
    else { toast.success("Uploaded"); fetchImages(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Deleted"); fetchImages(); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Gallery Management</h1>
        <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Upload
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : images.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <ImageIcon className="text-muted-foreground mx-auto mb-3" size={40} />
          <p className="text-muted-foreground text-sm">No gallery images. Upload one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className="glass rounded-xl overflow-hidden group relative">
              <img src={img.image_url} alt={img.title || ""} className="w-full aspect-square object-cover" loading="lazy" />
              <div className="p-2">
                <p className="text-xs text-foreground truncate">{img.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground">{new Date(img.created_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminGallery;
