import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Gallery = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-24">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Camera className="text-primary" size={40} />
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
              Event <span className="text-gradient">Gallery</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto mb-12">
              Photos and videos from CSA events
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-12 max-w-lg mx-auto"
          >
            <Camera className="text-primary/40 mx-auto mb-4" size={48} />
            <h3 className="font-display text-xl font-bold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground text-sm">
              Stay tuned for our gallery updates!
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Gallery;
