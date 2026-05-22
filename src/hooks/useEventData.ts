import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EventData {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  is_active: boolean;
  voting_url?: string | null;
  flyer_url?: string | null;
}

export const useEventData = () => {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!cancelled && !error && data) {
        setEvent(data as EventData);
      }
      if (!cancelled) setLoading(false);
    };

    fetchEvent();

    // IMPORTANT: .on() must be called BEFORE .subscribe()
    const channel = supabase
      .channel("event-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => { fetchEvent(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { event, loading };
};
