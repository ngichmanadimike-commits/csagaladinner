import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivePromotion {
  id: string;
  title: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  start_at: string;
  expires_at: string;
  description?: string | null;
}

let cache: { promo: ActivePromotion | null; ts: number } | null = null;
const TTL = 60_000;

export function useActivePromotion() {
  const [promo, setPromo] = useState<ActivePromotion | null>(cache?.promo ?? null);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (cache && Date.now() - cache.ts < TTL) {
        setPromo(cache.promo);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("promotions")
        .select("id,title,code,discount_type,discount_value,start_at,expires_at,description")
        .eq("is_active", true)
        .is("deleted_at", null)
        .lte("start_at", new Date().toISOString())
        .gte("expires_at", new Date().toISOString())
        .order("discount_value", { ascending: false })
        .limit(1)
        .maybeSingle();
      const p = (data as any) || null;
      cache = { promo: p, ts: Date.now() };
      if (active) {
        setPromo(p);
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, TTL);
    return () => { active = false; clearInterval(t); };
  }, []);

  return { promo, loading };
}

export function formatDiscount(p: Pick<ActivePromotion, "discount_type" | "discount_value">) {
  return p.discount_type === "percentage"
    ? `${p.discount_value}% OFF`
    : `KES ${Number(p.discount_value).toLocaleString()} OFF`;
}

export function applyDiscount(amount: number, p: Pick<ActivePromotion, "discount_type" | "discount_value">) {
  if (p.discount_type === "percentage") {
    return Math.max(0, Math.round(amount - (amount * p.discount_value) / 100));
  }
  return Math.max(0, Math.round(amount - p.discount_value));
}