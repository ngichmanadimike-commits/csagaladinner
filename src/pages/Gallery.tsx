import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Loader2, Upload, Trash2, Edit2, Check, XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface GalleryImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  created_at: string;
}

const Gallery = () => {
  const { isAdmin, user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const fetchImages = async () => {
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .order("created_at", { ascending: false });
    setImages((data as GalleryImage[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
    const channel = supabase
      .channel("gallery-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_images" }, fetchImages)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setPreviewFile({ file, url: URL.createObjectURL(file) });
  };

  const handleUpload = async () => {
    if (!previewFile) return;
    setUploading(true);
    const ext = previewFile.file.name.split(".").pop();
    const path = `gallery/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("site-images")
      .upload(path, previewFile.file, { upsert: true });

    if (uploadErr) {
      toast.error("Upload failed: " + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("site-images").getPublicUrl(path);

    const { error: dbErr } = await supabase.from("gallery_images").insert({
      image_url: urlData.publicUrl,
      title: uploadTitle.trim() || null,
      uploaded_by: user?.id,
    } as any);

    if (dbErr) {
      toast.error("Failed to save: " + dbErr.message);
    } else {
      toast.success("Image uploaded!");
      setPreviewFile(null);
      setUploadTitle("");
      fetchImages();
    }
    setUploading(false);
  };

  const handleDelete = async (img: GalleryImage) => {
    if (!confirm("Delete this image?")) return;
    const { error } = await supabase.from("gallery_images").delete().eq("id", img.id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Image deleted");
      fetchImages();
    }
  };

  const handleEditSave = async (id: string) => {
    const { error } = await supabase
      .from("gallery_images")
      .update({ title: editTitle.trim() || null })
      .eq("id", id);
    if (error) toast.error("Update failed");
    else {
      toast.success("Updated");
      setEditingId(null);
      fetchImages();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="text-primary" size={32} />
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">
              Event <span className="text-gradient">Gallery</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Photos and memories from CSA events
            </p>
          </motion.div>

          {/* Admin Upload */}
          {isAdmin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5 mb-8 max-w-xl mx-auto">
              <h3 className="font-display font-bold text-foreground text-sm mb-3">Upload Image</h3>
              {previewFile ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border border-border aspect-video">
                    <img src={previewFile.url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Image title (optional)"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <Upload className="text-muted-foreground mb-2" size={24} />
                  <span className="text-sm text-muted-foreground">Click to select an image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </label>
              )}
            </motion.div>
          )}

          {/* Gallery Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : images.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center max-w-md mx-auto">
              <Camera className="text-primary/30 mx-auto mb-3" size={48} />
              <p className="text-muted-foreground text-sm">No images yet. Check back soon!</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {images.map((img, i) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  className="break-inside-avoid group relative rounded-xl overflow-hidden border border-border bg-card"
                >
                  <img
                    src={img.image_url}
                    alt={img.title || "Gallery image"}
                    className="w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onClick={() => setLightbox(img)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingId === img.id ? (
                      <div className="flex gap-1">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 px-2 py-1 rounded bg-background/80 text-foreground text-xs border border-border"
                          autoFocus
                        />
                        <button onClick={() => handleEditSave(img.id)} className="p-1 rounded bg-primary text-primary-foreground"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded bg-muted text-foreground"><XIcon size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-end justify-between">
                        <p className="text-white text-sm font-medium truncate">{img.title || ""}</p>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingId(img.id); setEditTitle(img.title || ""); }}
                              className="p-1.5 rounded-lg bg-background/60 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(img); }}
                              className="p-1.5 rounded-lg bg-background/60 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(null)}>
              <X size={28} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox.image_url}
              alt={lightbox.title || ""}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.title && (
              <p className="absolute bottom-6 text-white text-lg font-medium">{lightbox.title}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default Gallery;
