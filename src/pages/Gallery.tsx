import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

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
                  className="break-inside-avoid group relative rounded-xl overflow-hidden border border-border bg-card cursor-pointer"
                  onClick={() => setLightbox(img)}
                >
                  <img
                    src={img.image_url}
                    alt={img.title || "Gallery image"}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {img.title && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-medium truncate">{img.title}</p>
                      </div>
                    </>
                  )}
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
