```tsx id="3pqlxp"
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminEventConfig = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [flyerUrl, setFlyerUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, []);

  const fetchEvent = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setTitle(data.title || "");
      setDescription(data.description || "");
      setFlyerUrl(data.flyer_url || "");
    }
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("site-images")
      .upload(fileName, file);

    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("site-images")
      .getPublicUrl(fileName);

    setFlyerUrl(data.publicUrl);

    toast.success("Flyer uploaded successfully");

    setUploading(false);
  };

  const saveEvent = async () => {
    const payload = {
      title,
      description,
      flyer_url: flyerUrl,
    };

    const { error } = await supabase
      .from("events")
      .update(payload)
      .neq("id", "");

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Event updated");
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display">
            Event Configuration
          </h1>

          <p className="text-muted-foreground mt-2">
            Update your event information and flyer.
          </p>
        </div>

        <div className="space-y-6 glass rounded-2xl p-6">
          <div>
            <label className="block text-sm mb-2">
              Event Title
            </label>

            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted"
              placeholder="CSA Gala Dinner 2026"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted resize-none"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">
              Upload Flyer
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
            />

            {uploading && (
              <p className="text-sm mt-2">
                Uploading flyer...
              </p>
            )}
          </div>

          {flyerUrl && (
            <div>
              <img
                src={flyerUrl}
                alt="Flyer"
                className="rounded-xl border border-border max-h-[400px]"
              />
            </div>
          )}

          <button
            onClick={saveEvent}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Save Event
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEventConfig;
```
