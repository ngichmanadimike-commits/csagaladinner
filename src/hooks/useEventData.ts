import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EventData {
  id: number;
  name: string;
  theme: string;
  event_date: string | null;
  venue: string | null;
  status: string | null;
  flyer_url: string | null;
  title: string | null;
  description: string | null;
  nomination_url: string | null;
  voting_url: string | null;
}

let cachedEvent: EventData | null = null;
let fetchPromise: Promise<EventData | null> | null = null;

async function fetchActiveEvent(): Promise<EventData | null> {
  if (cachedEvent) return cachedEvent;
  if (fetchPromise) return fetchPromise;

  fetchPromise = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .limit(1)
    .single()
    .then(({ data, error }) => {
      if (error || !data) {
        return supabase
          .from("events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
          .then(({ data: d }) => {
            if (d) cachedEvent = d as EventData;
            return cachedEvent;
          });
      }
      cachedEvent = data as EventData;
      fetchPromise = null;
      return cachedEvent;
    });

  return fetchPromise;
}

export function useEventData() {
  const [event, setEvent] = useState<EventData | null>(cachedEvent);
  const [loading, setLoading] = useState(!cachedEvent);

  useEffect(() => {
    if (cachedEvent) {
      setEvent(cachedEvent);
      setLoading(false);
      return;
    }
    fetchActiveEvent().then((e) => {
      setEvent(e);
      setLoading(false);
    });
  }, []);

  return { event, loading };
    }
