import { useState, useEffect } from "react";
import { X, Calendar, Mail, Shirt, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "csaEventNotificationSeen";

const DEFAULT_CONFIG = {
  title: "CSA Gala Dinner 2026",
  date: "Friday, 5th June 2026 · 7:00 PM – 11:00 PM",
  venue: "Utalii Hotel, Nairobi",
  dress_code: "Navy Blue & White",
  dress_code_detail: "Smart suits, evening gowns, cocktail dresses",
  body: "Check your registered email for full venue and timing details.",
  flyer_url: null, // Add this
};

const EventNotification = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data } = await supabase
          .from("events")
          .select("title, venue, event_date, description, theme, flyer_url")
          .eq("status", "published")
          .order("event_date", { ascending: true })
          .limit(1)
          .single();

        if (data) {
          const eventDate = data.event_date
            ? new Date(data.event_date).toLocaleDateString("en-KE", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }) +
              " · " +
              new Date(data.event_date).toLocaleTimeString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : DEFAULT_CONFIG.date;

          setConfig({
            title: data.title || DEFAULT_CONFIG.title,
            date: eventDate,
            venue: data.venue || DEFAULT_CONFIG.venue,
            dress_code: DEFAULT_CONFIG.dress_code,
            dress_code_detail: DEFAULT_CONFIG.dress_code_detail,
            body: data.description || DEFAULT_CONFIG.body,
            flyer_url: data.flyer_url || null,
          });
        }
      } catch {
        // Keep defaults if fetch fails
      }
    };

    fetchEvent();

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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(10, 35, 66, 0.88)", backdropFilter: "blur(6px)" }}
        onClick={handleClose}
        aria-modal="true"
        role="dialog"
        aria-labelledby="event-notification-title"
      >
        <div
          className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300"
          style={{ border: "2px solid #D4AF37", backgroundColor: "#0A2342" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 rounded-full transition-colors hover:bg-black/30 z-10"
            style={{ color: "#FFF", backgroundColor: "rgba(0,0,0,0.4)" }}
            aria-label="Close notification"
          >
            <X size={18} />
          </button>

          {/* Flyer Image */}
          {config.flyer_url && (
            <div className="w-full">
              <img 
                src={config.flyer_url} 
                alt="CSA Gala Dinner 2026 Flyer"
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Gold header */}
          <div className="px-6 pt-5 pb-4 text-center" style={{ backgroundColor: "#D4AF37" }}>
            <p className="text-xs font-bold tracking-[0.25em] mb-1 uppercase" style={{ color: "#0A2342" }}>
              Important Notice
            </p>
            <h2
              id="event-notification-title"
              className="text-xl font-black"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#0A2342" }}
            >
              {config.title}
            </h2>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="space-y-3">
              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: "#D4AF3720" }}>
                  <Calendar size={16} style={{ color: "#D4AF37" }} />
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest mb-0.5 uppercase" style={{ color: "#D4AF37", opacity: 0.85 }}>Event Date</p>
                  <p className="text-sm font-semibold text-white">{config.date}</p>
                </div>
              </div>

              <div className="border-t border-dashed" style={{ borderColor: "#D4AF3730" }} />

              {/* Venue */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: "#D4AF3720" }}>
                  <MapPin size={16} style={{ color: "#D4AF37" }} />
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest mb-0.5 uppercase" style={{ color: "#D4AF37", opacity: 0.85 }}>Venue</p>
                  <p className="text-sm font-semibold text-white">{config.venue}</p>
                </div>
              </div>

              <div className="border-t border-dashed" style={{ borderColor: "#D4AF3730" }} />

              {/* Dress code */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: "#D4AF3720" }}>
                  <Shirt size={16} style={{ color: "#D4AF37" }} />
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest mb-0.5 uppercase" style={{ color: "#D4AF37", opacity: 0.85 }}>Dress Code</p>
                  <p className="text-sm font-semibold text-white">{config.dress_code}</p>
                  <p className="text-xs text-white/60">{config.dress_code_detail}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl font-bold text-sm tracking-wider transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}
            >
              GOT IT, SEE YOU THERE!
            </button>
            <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              This notice is shown once per session
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default EventNotification;
