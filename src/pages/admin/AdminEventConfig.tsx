// src/pages/admin/AdminEventConfig.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Loader2, Save, Info, Image, Bell, BellOff } from "lucide-react";

const AdminEventConfig = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      setEvents(data || []);
      if (data && data.length > 0) setSelected(data[0]);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);

    // Build event_date from date + start_time parts
    let eventDateValue = selected.event_date;
    if (selected._date_part && selected._start_time) {
      eventDateValue = `${selected._date_part}T${selected._start_time}:00`;
    }

    const { error } = await supabase
      .from("events")
      .update({
        title: selected.title,
        theme: selected.theme,
        venue: selected.venue,
        event_date: eventDateValue,
        end_time: selected.end_time || null,
        status: selected.status,
        nomination_url: selected.nomination_url,
        voting_url: selected.voting_url,
        description: selected.description,
        flyer_url: selected.flyer_url,
        popup_enabled: selected.popup_enabled ?? true,
      })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      setEvents((prev) => prev.map((e) => (e.id === selected.id ? { ...selected, event_date: eventDateValue } : e)));
      toast.success("Event updated successfully");
    }
  };

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from("events")
      .insert({ title: "New Event", status: "draft", popup_enabled: true })
      .select()
      .single();
    if (error) {
      toast.error("Failed to create event");
    } else if (data) {
      setEvents([data, ...events]);
      setSelected(data);
      toast.success("Event created");
    }
  };

  const updateField = (field: string, value: any) => {
    setSelected((prev: any) => ({ ...prev, [field]: value }));
  };

  // Parse event_date into date and time parts for the split inputs
  const getDatePart = () => {
    if (selected?._date_part) return selected._date_part;
    if (!selected?.event_date) return "";
    return selected.event_date.slice(0, 10);
  };

  const getStartTime = () => {
    if (selected?._start_time) return selected._start_time;
    if (!selected?.event_date) return "";
    const t = selected.event_date.slice(11, 16);
    return t || "";
  };

  const getEndTime = () => selected?.end_time || "";

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </AdminLayout>
    );
  }

  const popupEnabled = selected?.popup_enabled !== false;
  const popupWillShow = popupEnabled && selected?.status === "published";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Event Configuration</h1>
        <button onClick={handleCreate}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-transform">
          + New Event
        </button>
      </div>

      {events.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {events.map((ev) => (
            <button key={ev.id} onClick={() => setSelected(ev)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                selected?.id === ev.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}>
              {ev.title}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground text-base border-b border-border pb-2">
              Core Event Details
            </h2>

            {/* Title */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Event Title</label>
              <input type="text" value={selected.title || ""}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            {/* Theme */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Theme / Tagline</label>
              <input type="text" value={selected.theme || ""}
                onChange={(e) => updateField("theme", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            {/* Venue */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Venue</label>
              <input type="text" value={selected.venue || ""}
                onChange={(e) => updateField("venue", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            {/* Event Date */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Event Date</label>
              <input type="date" value={getDatePart()}
                onChange={(e) => updateField("_date_part", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            {/* Start Time + End Time side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Start Time</label>
                <input type="time" value={getStartTime()}
                  onChange={(e) => updateField("_start_time", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">End Time</label>
                <input type="time" value={getEndTime()}
                  onChange={(e) => updateField("end_time", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Start & end times appear on the ticket (e.g. 7:00 PM – 11:00 PM)
            </p>

            {/* Links */}
            {[
              { label: "Nomination URL", field: "nomination_url" },
              { label: "Finalist Certificate / Voting URL", field: "voting_url" },
            ].map((f) => (
              <div key={f.field}>
                <label className="text-sm text-muted-foreground mb-1 block">{f.label}</label>
                <input type="url" value={selected[f.field] || ""}
                  onChange={(e) => updateField(f.field, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            ))}

            {/* Description */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Description (shown on site)</label>
              <textarea value={selected.description || ""} onChange={(e) => updateField("description", e.target.value)}
                rows={3} className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>

            {/* Status */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <select value={selected.status || "draft"} onChange={(e) => updateField("status", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="draft">Draft (hidden from public)</option>
                <option value="published">Published (visible on site)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Flyer section */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground text-base border-b border-border pb-2 flex items-center gap-2">
              <Image size={18} className="text-primary" /> Event Popup Flyer
            </h2>
            <div className="flex gap-3 items-start p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Paste a public image URL here to override the default flyer shown in the popup.
                Leave blank to use the built-in flyer. To upload: go to{" "}
                <strong className="text-foreground">Supabase → Storage → event-assets</strong>,
                upload the image, copy the public URL, and paste it below.
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Flyer Image URL (optional)</label>
              <input type="url" value={selected.flyer_url || ""}
                onChange={(e) => updateField("flyer_url", e.target.value)}
                placeholder="https://xxxx.supabase.co/storage/v1/object/public/event-assets/flyer.jpg"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            {selected.flyer_url && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <img src={selected.flyer_url} alt="Flyer preview"
                  className="w-full max-w-xs rounded-xl border border-border object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    toast.error("Could not load image — check the URL");
                  }} />
              </div>
            )}
          </div>

          {/* Popup toggle */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground text-base border-b border-border pb-2 flex items-center gap-2">
              {popupEnabled ? <Bell size={18} className="text-primary" /> : <BellOff size={18} className="text-muted-foreground" />}
              Event Notification Popup
            </h2>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Popup Notification</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When ON and status is Published, the flyer popup shows to visitors once per session.
                </p>
              </div>
              <button
                onClick={() => updateField("popup_enabled", !popupEnabled)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                  popupEnabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  popupEnabled ? "translate-x-8" : "translate-x-1"
                }`} />
              </button>
            </div>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
              popupWillShow
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : "bg-yellow-500/10 border border-yellow-500/30"
            }`}>
              {popupWillShow ? (
                <>
                  <Bell size={18} className="text-emerald-400 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-300">Popup is ACTIVE</p>
                    <p className="text-muted-foreground text-xs">Visitors will see the flyer popup once per session.</p>
                  </div>
                </>
              ) : (
                <>
                  <BellOff size={18} className="text-yellow-400 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-300">Popup is INACTIVE</p>
                    <p className="text-muted-foreground text-xs">
                      {!popupEnabled ? "Toggle is OFF — enable it above." : "Status is not Published — set status to Published above."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      )}

      {events.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-muted-foreground mb-4">No events yet. Create your first event to get started.</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminEventConfig;
