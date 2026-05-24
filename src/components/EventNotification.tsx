// src/components/EventNotification.tsx
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import flyerImage from "@/assets/IMG-20260512-WA0019.jpg";
import { useEventData } from "@/hooks/useEventData";

const SESSION_KEY = "csaEventNotificationSeen";

const EventNotification = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { event } = useEventData();

  const flyerUrl = event?.flyer_url || flyerImage;
  const eventTitle = event?.title || "CSA Gala Dinner 2026";

  // popup_enabled defaults to true if not set (backward compatible)
  const popupEnabled = event?.popup_enabled !== false;

  useEffect(() => {
    // Don't show if: admin turned it off, or event not published, or already seen this session
    if (!popupEnabled) return;
    if (event && event.status !== "published") return;

    const alreadySeen = sessionStorage.getItem(SESSION_KEY);
    if (!alreadySeen) {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [popupEnabled, event?.status]);

  const handleClose = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10, 35, 66, 0.92)", backdropFilter: "blur(8px)" }}
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300"
        style={{ border: "2px solid #D4AF37" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
          aria-label="Close notification"
        >
          <X size={18} />
        </button>

        <div className="w-full">
          <img
            src={flyerUrl}
            alt={eventTitle}
            className="w-full h-auto object-cover block"
            style={{ maxHeight: "80vh" }}
          />
        </div>

        <div
          className="px-5 py-4 flex flex-col items-center gap-2"
          style={{ backgroundColor: "#0A2342" }}
        >
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl font-bold text-sm tracking-widest transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}
          >
            GOT IT — SEE YOU THERE!
          </button>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Tap anywhere outside to close · Shown once per session
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventNotification;
