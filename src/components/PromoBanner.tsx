import { useActivePromotion, formatDiscount } from "@/hooks/useActivePromotion";
import { PromoCountdown } from "./PromoCountdown";
import { Tag } from "lucide-react";

const PromoBanner = () => {
  const { promo } = useActivePromotion();
  if (!promo) return null;
  return (
    <div className="w-full bg-gradient-to-r from-primary/90 via-primary to-primary/90 text-primary-foreground overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold animate-marquee whitespace-nowrap">
        <Tag size={14} />
        <span>🔥 {promo.title}: Use <span className="font-mono bg-primary-foreground/20 px-2 py-0.5 rounded">{promo.code}</span> — {formatDiscount(promo)} • Ends in <PromoCountdown to={promo.expires_at} /></span>
      </div>
    </div>
  );
};

export default PromoBanner;