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

// ── Singleton state shared across all hook instances ──────────────────────────
// This ensures only ONE Supabase channel is ever created, even if multiple
// components call useEventData() at the same time.
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
      .select("*")
      .eq("is_active", true)
      .order("date", { ascending: true })
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

// ── Hook ──────────────────────────────────────────────────────────────────────
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
