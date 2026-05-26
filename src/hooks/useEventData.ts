import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EventData {
  id: string;          // uuid in schema
  title: string | null;
  theme: string | null;
  description: string | null;
  event_date: string | null;
  venue: string | null;
  status: string | null;
  flyer_url: string | null;
  nomination_url: string | null;
  voting_url: string | null;
  popup_enabled: boolean;
  end_time: string | null;
  created_at: string;
  updated_at: string;
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
            fetchPromise = null;
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

  // Allow components to invalidate cache and refetch (e.g. after admin edits)
  const refetch = () => {
    cachedEvent = null;
    fetchPromise = null;
    fetchActiveEvent().then((e) => setEvent(e));
  };

  return { event, loading, refetch };
}
