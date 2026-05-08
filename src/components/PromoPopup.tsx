import { useEffect, useRef, useState } from "react";
import { useActivePromotion, formatDiscount } from "@/hooks/useActivePromotion";
import { PromoCountdown } from "./PromoCountdown";
import { X, Tag, Copy } from "lucide-react";
import { toast } from "sonner";

const KEY = "promoDismissed";
const COOLDOWN = 24 * 60 * 60 * 1000;

const PromoPopup = () => {
  const { promo } = useActivePromotion();
  const [open, setOpen] = useState(false);
  const [adminEnabled, setAdminEnabled] = useState(true); // NEW: admin control
  const closeRef = useRef<HTMLButtonElement>(null);

  // NEW: Check if admin globally disabled promos
  useEffect(() => {
    fetch('/api/promo-status')
     .then(r => r.json())
     .then(d => setAdminEnabled(d.enabled))
     .catch(() => setAdminEnabled(true)); // Fail open if API down
  }, []);

  useEffect(() => {
    if (!promo ||!adminEnabled) return; // NEW: Admin kill switch
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const { id, ts } = JSON.parse(raw);
        if (id === promo.id && Date.now() - ts < COOLDOWN) return;
      } catch {}
    }
    const t = setTimeout(() => setOpen(true), 3000);
    return () => clearTimeout(t);
  }, [promo, adminEnabled]); // NEW: depend on adminEnabled

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const dismiss = () => {
    if (promo) localStorage.setItem(KEY, JSON.stringify({ id: promo.id, ts: Date.now() }));
    setOpen(false);
  };

  if (!promo ||!open ||!adminEnabled) return null; // NEW: Hide if admin disabled

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={promo.title}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="glass rounded-2xl max-w-sm w-full p-6 relative border border-primary/40"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          onClick={dismiss}
          aria-label="Close promotion"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>
        <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-3">
          <Tag className="text-primary" size={22} />
        </div>
        <h3 className="font-display text-2xl font-bold mb-1">{promo.title}</h3>
        <p className="text-primary font-semibold mb-3">{formatDiscount(promo)}</p>
        {promo.description && <p className="text-sm text-muted-foreground mb-4">{promo.description}</p>}
        <div className="rounded-xl border-2 border-primary/40 p-3 text-center mb-4 bg-primary/5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Promo Code</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-xl font-extrabold text-primary tracking-widest">{promo.code}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(promo.code); toast.success("Copied"); }}
              className="p-1.5 rounded-md hover:bg-primary/10 text-primary"
              aria-label="Copy code"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground mb-4">
          Ends in <PromoCountdown to={promo.expires_at} className="text-foreground font-semibold" />
        </p>
        <button
          onClick={() => { dismiss(); document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth" }); }}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform"
        >
          Claim Now
        </button>
      </div>
    </div>
  );
};

export default PromoPopup;
