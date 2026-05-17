import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Loader2, Save, Info, Image } from "lucide-react";

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
    const { error } = await supabase
      .from("events")
      .update({
        title: selected.title,
        theme: selected.theme,
        venue: selected.venue,
        event_date: selected.event_date,
        status: selected.status,
        nomination_url: selected.nomination_url,
        voting_url: selected.voting_url,
        description: selected.description,
        flyer_url: selected.flyer_url,
      })
      .eq("id", selected.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      setEvents((prev) => prev.map((e) => (e.id === selected.id ? selected : e)));
      toast.success("Event updated successfully");
    }
  };

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from("events")
      .insert({ title: "New Event", status: "draft" })
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

  const updateField = (field: string, value: string) => {
    setSelected({ ...selected, [field]: value });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Event Configuration</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-transform"
        >
          + New Event
        </button>
      </div>

      {events.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => setSelected(ev)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                selected?.id === ev.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {ev.title}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-6">
          {/* Core event fields */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground text-base border-b border-border pb-2">
              Core Event Details
            </h2>

            {[
              { label: "Event Title", field: "title", type: "text" },
              { label: "Theme / Tagline", field: "theme", type: "text" },
              { label: "Venue", field: "venue", type: "text" },
              { label: "Event Date & Time", field: "event_date", type: "datetime-local" },
              { label: "Nomination URL", field: "nomination_url", type: "url" },
              { label: "Voting URL", field: "voting_url", type: "url" },
            ].map((f) => (
              <div key={f.field}>
                <label className="text-sm text-muted-foreground mb-1 block">{f.label}</label>
                <input
                  type={f.type}
                  value={selected[f.field] || ""}
                  onChange={(e) => updateField(f.field, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Description (shown on site)
              </label>
              <textarea
                value={selected.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <select
                value={selected.status || "draft"}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="draft">Draft (hidden from public)</option>
                <option value="published">Published (visible + shown on popup)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Flyer section */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground text-base border-b border-border pb-2 flex items-center gap-2">
              <Image size={18} className="text-primary" />
              Event Popup Flyer
            </h2>

            <div className="flex gap-3 items-start p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Paste a public image URL here to override the default flyer shown in the popup.
                Leave blank to use the built-in flyer. To upload a new one, go to{" "}
                <strong className="text-foreground">Supabase → Storage → event-assets</strong>,
                upload the image, copy the public URL, and paste it below.
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Flyer Image URL (optional)
              </label>
              <input
                type="url"
                value={selected.flyer_url || ""}
                onChange={(e) => updateField("flyer_url", e.target.value)}
                placeholder="https://xxxx.supabase.co/storage/v1/object/public/event-assets/flyer.jpg"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {selected.flyer_url && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <img
                  src={selected.flyer_url}
                  alt="Flyer preview"
                  className="w-full max-w-xs rounded-xl border border-border object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    toast.error("Could not load image — check the URL");
                  }}
                />
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="glass rounded-xl p-4 flex gap-3 items-start border border-primary/20">
            <Info size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="text-foreground font-semibold mb-1">Event Notification Popup</p>
              <p>
                The popup shown to visitors displays the flyer image automatically — as long as
                status is set to{" "}
                <span className="text-primary font-semibold">Published</span>. You can swap the
                flyer any time using the Flyer Image URL field above.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      )}

      {events.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No events yet. Create your first event to get started.
          </p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminEventConfig;
