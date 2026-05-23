import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EventData {
  id: string;
  title: string;
  event_date: string | null;
  venue: string | null;
  description: string | null;
  status: string;
  voting_url?: string | null;
  nomination_url?: string | null;
}

let cachedEvent: EventData | null = null;
let cachedLoading = true;
let subscribers: Array<() => void> = [];
let channelCreated = false;

function notify() {
  subscribers.forEach((fn) => fn());
}

function initChannel() {
  if (channelCreated) return;
  channelCreated = true;

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, event_date, venue, description, status, voting_url, nomination_url")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) cachedEvent = data as EventData;
    cachedLoading = false;
    notify();
  };

  fetchEvent();

  supabase
    .channel("event-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, fetchEvent)
    .subscribe();
}

export const useEventData = () => {
  const [, rerender] = useState(0);

  useEffect(() => {
    const handler = () => rerender((n) => n + 1);
    subscribers.push(handler);
    initChannel();
    return () => {
      subscribers = subscribers.filter((s) => s !== handler);
    };
  }, []);

  return { event: cachedEvent, loading: cachedLoading };
};
