// src/hooks/useEventData.ts
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EventData {
  id: string;
  title: string;
  flyer_url: string | null;
  voting_url: string | null;
}

let eventCache: EventData | null = null;
let eventCacheTs = 0;
const EVENT_TTL_MS = 5 * 60 * 1000;

export function useEventData() {
  const [event, setEvent] = useState<EventData | null>(eventCache);
  const [loading, setLoading] = useState(!eventCache);

  useEffect(() => {
    if (eventCache && Date.now() - eventCacheTs < EVENT_TTL_MS) {
      setEvent(eventCache);
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      // Try published first
      let { data } = await supabase
        .from("events")
        .select("id, title, flyer_url, voting_url")
        .eq("status", "published")
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      // Fall back to any event if no published one exists
      if (!data) {
        const { data: anyEvent } = await supabase
          .from("events")
          .select("id, title, flyer_url, voting_url")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        data = anyEvent;
      }

      if (!active) return;
      eventCache = (data as EventData) ?? null;
      eventCacheTs = Date.now();
      setEvent(eventCache);
      setLoading(false);
    })();

    return () => { active = false; };
  }, []);

  return { event, loading };
}
