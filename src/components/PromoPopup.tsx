import { useState, useEffect } from "react";
import { X, Tag } from "lucide-react";
import { useActivePromotion, formatDiscount } from "@/hooks/useActivePromotion";

export default function PromoPopup() {
  const { promo, loading } = useActivePromotion();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (loading || !promo) return;
    const dismissed = sessionStorage.getItem("csaPromoPopupDismissed");
    if (!dismissed) {
      const t = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [promo, loading]);

  const closePopup = () => {
    setIsOpen(false);
    sessionStorage.setItem("csaPromoPopupDismissed", "true");
  };

  if (!promo || !isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10,35,66,0.88)", backdropFilter: "blur(6px)" }}
      onClick={closePopup}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300"
        style={{ border: "2px solid #D4AF37", backgroundColor: "#0A2342" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closePopup}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full text-white"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          aria-label="Close promo"
        >
          <X size={18} />
        </button>

        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(212,175,55,0.15)", border: "2px solid #D4AF37" }}>
            <Tag size={26} style={{ color: "#D4AF37" }} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#D4AF37" }}>
              Limited Time Offer
            </p>
            <h2 className="text-xl font-bold text-white mb-1">{promo.title}</h2>
            <p className="text-3xl font-extrabold" style={{ color: "#D4AF37" }}>
              {formatDiscount(promo)}
            </p>
            {promo.description && (
              <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.65)" }}>
                {promo.description}
              </p>
            )}
          </div>

          <div className="w-full rounded-xl py-3 px-4 text-center"
            style={{ backgroundColor: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
            <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Use code</p>
            <p className="font-mono font-extrabold text-xl tracking-widest" style={{ color: "#D4AF37" }}>
              {promo.code}
            </p>
          </div>

          <button
            onClick={closePopup}
            className="w-full py-3 rounded-xl font-bold text-sm tracking-widest transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}
          >
            CLAIM OFFER
          </button>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Tap anywhere outside to close · Shown once per session
          </p>
        </div>
      </div>
    </div>
  );
                                         }
