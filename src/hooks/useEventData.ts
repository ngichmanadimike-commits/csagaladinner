import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EventData {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  is_active: boolean;
}

export const useEventData = () => {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setEvent(data as EventData);
      }

      setLoading(false);
    };

    fetchEvent();

    const channel = supabase
      .channel("event-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        fetchEvent
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { event, loading };
};
