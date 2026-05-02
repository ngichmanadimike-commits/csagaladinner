import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

const FIELDS = [
  { key: "contact_email", label: "Contact Email" },
  { key: "contact_phone", label: "Contact Phone" },
  { key: "social_x", label: "X (Twitter) URL" },
  { key: "social_linkedin", label: "LinkedIn URL" },
  { key: "social_instagram", label: "Instagram URL" },
  { key: "social_tiktok", label: "TikTok URL" },
];

const AdminSettings = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((r) => { map[r.key] = r.value || ""; });
      setValues(map); setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const rows = FIELDS.map((f) => ({ key: f.key, value: values[f.key] || "" }));
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  };

  if (loading) return <AdminLayout><div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">Site Settings</h1>
      <div className="glass rounded-xl p-5 space-y-4 max-w-2xl">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-sm text-muted-foreground mb-1 block">{f.label}</label>
            <input value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
          </div>
        ))}
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;