// src/hooks/useEventData.ts
// NEW FILE — shared cache for the published event so HeroSection and
// EventNotification don't each fire a separate DB query on mount.
// The result is cached in module scope for 5 minutes.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EventData {
  id: string;
  title: string;
  flyer_url: string | null;
  voting_url: string | null;
}

// Module-level cache — one object shared by every component that calls this hook.
// This means the DB is only hit ONCE per 5 minutes regardless of how many components
// call useEventData() on the same page.
let eventCache: EventData | null = null;
let eventCacheTs = 0;
const EVENT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useEventData() {
  const [event, setEvent] = useState<EventData | null>(eventCache);
  const [loading, setLoading] = useState(!eventCache);

  useEffect(() => {
    // If we have a fresh cached value, use it immediately — no DB call
    if (eventCache && Date.now() - eventCacheTs < EVENT_TTL_MS) {
      setEvent(eventCache);
      setLoading(false);
      return;
    }

    let active = true;

    supabase
      .from("events")
      .select("id, title, flyer_url, voting_url")
      .eq("status", "published")
      .order("event_date", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        eventCache = (data as EventData) ?? null;
        eventCacheTs = Date.now();
        setEvent(eventCache);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { event, loading };
            }
