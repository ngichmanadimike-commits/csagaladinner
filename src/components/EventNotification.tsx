import { useState, useEffect } from "react";
import { X, Calendar, Mail, Shirt } from "lucide-react";

const SESSION_KEY = "csaEventNotificationSeen";

const EventNotification = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem(SESSION_KEY);
    if (!alreadySeen) {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(10, 35, 66, 0.85)", backdropFilter: "blur(4px)" }} onClick={handleClose} aria-modal="true" role="dialog" aria-labelledby="event-notification-title">
        <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300" style={{ border: "2px solid #D4AF37", backgroundColor: "#0A2342" }} onClick={(e) => e.stopPropagation()}>
          <div className="px-6 pt-6 pb-4 text-center" style={{ backgroundColor: "#D4AF37" }}>
            <p className="text-xs font-bold tracking-[0.25em] mb-1" style={{ color: "#0A2342" }}>IMPORTANT NOTICE</p>
            <h2 id="event-notification-title" className="text-2xl font-black" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#0A2342" }}>CSA Gala Dinner 2026</h2>
          </div>
          <button onClick={handleClose} className="absolute top-3 right-3 p-1.5 rounded-full transition-colors hover:bg-black/20" style={{ color: "#0A2342" }} aria-label="Close notification">
            <X size={18} />
          </button>
          <div className="px-6 py-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: "#D4AF3720" }}><Calendar size={16} style={{ color: "#D4AF37" }} /></div>
                <div>
                  <p className="text-xs font-bold tracking-widest mb-0.5" style={{ color: "#D4AF37", opacity: 0.7 }}>EVENT DATE</p>
                  <p className="text-sm font-semibold text-white">Friday, 5th June 2026 · 7:00 PM – 11:00 PM</p>
                  <p className="text-xs text-white/60">Utalii Hotel, Nairobi</p>
                </div>
              </div>
              <div className="border-t border-dashed" style={{ borderColor: "#D4AF3730" }} />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: "#D4AF3720" }}><Mail size={16} style={{ color: "#D4AF37" }} /></div>
                <div>
                  <p className="text-xs font-bold tracking-widest mb-0.5" style={{ color: "#D4AF37", opacity: 0.7 }}>VENUE & TIME DETAILS</p>
                  <p className="text-sm text-white/85 leading-relaxed">Check your <span className="font-semibold text-white">registered email</span> for full venue and timing details.</p>
                </div>
              </div>
              <div className="border-t border-dashed" style={{ borderColor: "#D4AF3730" }} />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: "#D4AF3720" }}><Shirt size={16} style={{ color: "#D4AF37" }} /></div>
                <div>
                  <p className="text-xs font-bold tracking-widest mb-0.5" style={{ color: "#D4AF37", opacity: 0.7 }}>DRESS CODE</p>
                  <p className="text-sm font-semibold text-white">Formal Attire</p>
                  <p className="text-xs text-white/60">Smart suits, evening gowns, cocktail dresses</p>
                </div>
              </div>
            </div>
            <button onClick={handleClose} className="w-full py-3 rounded-xl font-bold text-sm tracking-wider transition-opacity hover:opacity-90" style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}>GOT IT, SEE YOU THERE!</button>
            <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>This notice is shown once per session</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default EventNotification;
