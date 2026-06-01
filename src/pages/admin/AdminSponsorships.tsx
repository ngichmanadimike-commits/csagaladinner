import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import {
  Loader2, Save, Plus, Trash2, Search, ChevronDown, ChevronUp, GraduationCap,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface SponsorLevel {
  label: string;
  multiplier: number;
}

interface SponsorSettings {
  enabled: boolean;
  costPerStudent: number;
  levels: SponsorLevel[];
}

interface Sponsorship {
  id: string;
  sponsor_name: string;
  sponsor_email: string | null;
  sponsor_phone: string | null;
  level: string | null;
  amount: number;
  mpesa_code: string | null;
  sponsor_code: string | null;
  num_students: number | null;
  status: string | null;
  verified: boolean | null;
  verified_at: string | null;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_LEVELS: SponsorLevel[] = [
  { label: "Half Sponsorship", multiplier: 0.5 },
  { label: "Three-Quarter Sponsorship", multiplier: 0.75 },
  { label: "Full Sponsorship", multiplier: 1 },
];

// Upsert a single site_settings row
async function upsertSetting(key: string, value: string) {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

// ── Component ────────────────────────────────────────────────────────────────

const AdminSponsorships = () => {
  // ── Student sponsorship settings ───────────────────────────────────────────
  const [sponsorSettings, setSponsorSettings] = useState<SponsorSettings>({
    enabled: true,
    costPerStudent: 2000,
    levels: DEFAULT_LEVELS,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ── Sponsorship submissions ────────────────────────────────────────────────
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch sponsor settings ─────────────────────────────────────────────────
  const fetchSponsorSettings = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["sponsor_enabled", "sponsor_cost_per_student", "sponsor_levels"]);

    const map: Record<string, string> = {};
    (data || []).forEach((r) => { map[r.key] = r.value ?? ""; });

    const enabled = map["sponsor_enabled"] !== "false";
    const costPerStudent = Number(map["sponsor_cost_per_student"]) || 2000;
    let levels = DEFAULT_LEVELS;
    if (map["sponsor_levels"]) {
      try {
        const parsed = JSON.parse(map["sponsor_levels"]);
        if (Array.isArray(parsed) && parsed.length > 0) levels = parsed;
      } catch { /* keep defaults */ }
    }

    setSponsorSettings({ enabled, costPerStudent, levels });
    setSettingsLoading(false);
  };

  // ── Save sponsor settings ──────────────────────────────────────────────────
  const saveSponsorSettings = async () => {
    // Validate levels
    for (const l of sponsorSettings.levels) {
      if (!l.label.trim()) { toast.error("All level labels must be filled in"); return; }
      if (l.multiplier <= 0 || l.multiplier > 1) {
        toast.error("Level percentages must be between 1% and 100%");
        return;
      }
    }
    if (sponsorSettings.costPerStudent <= 0) {
      toast.error("Cost per student must be greater than 0");
      return;
    }

    setSettingsSaving(true);
    try {
      await upsertSetting("sponsor_enabled", sponsorSettings.enabled ? "true" : "false");
      await upsertSetting("sponsor_cost_per_student", String(sponsorSettings.costPerStudent));
      await upsertSetting("sponsor_levels", JSON.stringify(sponsorSettings.levels));
      toast.success("Student sponsorship settings saved");
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const updateLevel = (i: number, patch: Partial<SponsorLevel>) => {
    setSponsorSettings((prev) => ({
      ...prev,
      levels: prev.levels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));
  };

  const addLevel = () => {
    setSponsorSettings((prev) => ({
      ...prev,
      levels: [...prev.levels, { label: "New Level", multiplier: 0.25 }],
    }));
  };

  const removeLevel = (i: number) => {
    if (sponsorSettings.levels.length <= 1) {
      toast.error("At least one sponsorship level is required");
      return;
    }
    setSponsorSettings((prev) => ({
      ...prev,
      levels: prev.levels.filter((_, idx) => idx !== i),
    }));
  };

  // ── Fetch sponsorship submissions ─────────────────────────────────────────
  const fetchSponsorships = async () => {
    const { data, error } = await supabase
      .from("sponsorships")
      .select("id, sponsor_name, sponsor_email, sponsor_phone, level, amount, mpesa_code, sponsor_code, num_students, status, verified, verified_at, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load sponsorships: " + error.message);
    setSponsorships((data as Sponsorship[]) || []);
    setSubLoading(false);
  };

  useEffect(() => {
    fetchSponsorSettings();
    fetchSponsorships();
  }, []);

  // ── FIX 4: Approve (verified=true, status=paid) ────────────────────────────
  const approveSponsorship = async (s: Sponsorship) => {
    if (!confirm(`Approve payment from ${s.sponsor_name} — KES ${Number(s.amount).toLocaleString()}?`)) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("sponsorships")
      .update({ verified: true, verified_at: now, status: "paid" })
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    setSponsorships((prev) =>
      prev.map((sp) => sp.id === s.id ? { ...sp, verified: true, verified_at: now, status: "paid" } : sp)
    );
    toast.success(`✅ ${s.sponsor_name} approved`);
  };

  const rejectSponsorship = async (id: string) => {
    if (!confirm("Reject this sponsorship?")) return;
    const { error } = await supabase.from("sponsorships").update({ status: "cancelled", verified: false }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSponsorships((prev) => prev.map((s) => s.id === id ? { ...s, status: "cancelled", verified: false } : s));
    toast.success("Sponsorship rejected");
  };

  const deleteSponsorship = async (id: string) => {
    if (!confirm("Delete this sponsorship record?")) return;
    const { error } = await supabase.from("sponsorships").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSponsorships((prev) => prev.filter((s) => s.id !== id));
    toast.success("Deleted");
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredSponsorships = sponsorships.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.sponsor_name?.toLowerCase().includes(q) ||
      s.sponsor_email?.toLowerCase().includes(q) ||
      s.sponsor_phone?.toLowerCase().includes(q) ||
      s.sponsor_code?.toLowerCase().includes(q) ||
      s.mpesa_code?.toLowerCase().includes(q)
    );
  });

  // ── Status badge ────────────────────────────────────────────────────────────
  const statusBadge = (s: Sponsorship) => {
    if (s.verified) return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">✓ Approved</span>
    );
    const map: Record<string, string> = {
      pending:   "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      paid:      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      failed:    "bg-red-500/15 text-red-300 border-red-500/30",
      cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
    };
    const st = s.status || "pending";
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[st] ?? map.pending}`}>
        {st.charAt(0).toUpperCase() + st.slice(1)}
      </span>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sponsorships</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage student sponsorship settings and approve submitted sponsorships
          </p>
        </div>
      </div>

      {/* FIX 3: Partner packages moved to their own admin page */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-6 text-sm text-primary/80">
        💡 <strong>Partnership packages</strong> are managed under{" "}
        <a href="/admin/partner-packages" className="underline font-semibold hover:text-primary">
          Admin → Partner Packages
        </a>. Partnership payments also appear in the Donations section.
      </div>

      {/* ── STUDENT SPONSORSHIP SETTINGS ── */}
      <div className="glass rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="text-primary" size={18} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Student Sponsorship Settings</h2>
            <p className="text-xs text-muted-foreground">Controls the "Sponsor a Student" section on the public site</p>
          </div>
        </div>

        {settingsLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Enable/disable toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setSponsorSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  sponsorSettings.enabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    sponsorSettings.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {sponsorSettings.enabled ? "Section visible on public site" : "Section hidden from public site"}
                </p>
                <p className="text-xs text-muted-foreground">Toggle to show or hide the entire "Sponsor a Student" section</p>
              </div>
            </label>

            {/* Cost per student */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cost per Student (KES)</label>
                <input
                  type="number"
                  min={1}
                  value={sponsorSettings.costPerStudent}
                  onChange={(e) =>
                    setSponsorSettings((prev) => ({
                      ...prev,
                      costPerStudent: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-semibold"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Base price per student. The total = students × cost × level %
                </p>
              </div>
            </div>

            {/* Sponsorship levels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground">Sponsorship Levels</label>
                <button
                  onClick={addLevel}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Plus size={12} /> Add Level
                </button>
              </div>
              <div className="space-y-2">
                {sponsorSettings.levels.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-0.5">Label</label>
                        <input
                          type="text"
                          value={l.label}
                          onChange={(e) => updateLevel(i, { label: e.target.value })}
                          placeholder="e.g. Half Sponsorship"
                          className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-0.5">
                          Percentage (1–100)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={Math.round(l.multiplier * 100)}
                            onChange={(e) =>
                              updateLevel(i, {
                                multiplier: Math.min(1, Math.max(0.01, Number(e.target.value) / 100)),
                              })
                            }
                            className="w-full px-2.5 py-1.5 pr-7 rounded-md bg-background border border-border text-sm"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLevel(i)}
                      className="ml-1 p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                      title="Remove level"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Preview on public site: buttons show the % value; tooltip shows the label.
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Preview</p>
              <p className="text-sm text-foreground">
                1 student at {Math.round((sponsorSettings.levels.at(-1)?.multiplier ?? 1) * 100)}% ={" "}
                <span className="font-bold text-primary">
                  KES {(sponsorSettings.costPerStudent * (sponsorSettings.levels.at(-1)?.multiplier ?? 1)).toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Levels shown: {sponsorSettings.levels.map((l) => `${Math.round(l.multiplier * 100)}% (${l.label})`).join(" · ")}
              </p>
            </div>

            <button
              onClick={saveSponsorSettings}
              disabled={settingsSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              {settingsSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Settings
            </button>
          </div>
        )}
      </div>

      {/* ── SUBMITTED SPONSORSHIPS ── */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-foreground">
            Submitted Sponsorships
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredSponsorships.length})
            </span>
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-2 rounded-lg bg-muted border border-border text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {subLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : filteredSponsorships.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No sponsorship submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {filteredSponsorships.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                {/* Row header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.sponsor_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.level ?? "No package"} · KES {Number(s.amount).toLocaleString()}
                    </p>
                  </div>
                  {statusBadge(s)}
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                  {expandedId === s.id
                    ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" />
                    : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
                  }
                </div>

                {/* Expanded detail */}
                {expandedId === s.id && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {[
                        { label: "Email",        val: s.sponsor_email },
                        { label: "Phone",        val: s.sponsor_phone },
                        { label: "M-Pesa Code",  val: s.mpesa_code },
                        { label: "Sponsor Code", val: s.sponsor_code },
                        { label: "Students",     val: s.num_students },
                        { label: "Amount (KES)", val: Number(s.amount).toLocaleString() },
                      ].map(({ label, val }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-foreground font-medium">{val ?? "—"}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap pt-1">
                      {!s.verified && s.status !== "cancelled" && (
                        <>
                          <button
                            onClick={() => approveSponsorship(s)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                          >
                            ✓ Approve Payment
                          </button>
                          <button
                            onClick={() => rejectSponsorship(s.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-orange-500/40 text-orange-400 text-sm hover:bg-orange-500/10 transition-colors"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                      {s.verified && <span className="text-sm text-emerald-400 font-semibold">✓ Payment verified</span>}
                      {s.status === "cancelled" && <span className="text-sm text-red-400 font-semibold">✕ Rejected</span>}
                      <button
                        onClick={() => deleteSponsorship(s.id)}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSponsorships;
