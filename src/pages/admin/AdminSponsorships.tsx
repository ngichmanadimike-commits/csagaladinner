import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import {
  Loader2, Save, Plus, Trash2, Search, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface PkgRow {
  id?: string;
  name: string;
  price: number;
  description: string;
  perks: string[];
  display_order: number;
  active: boolean;
}

interface Sponsorship {
  id: string;
  sponsor_name: string;
  sponsor_email: string | null;
  sponsor_phone: string | null;
  package_id: string | null;
  amount: number;
  mpesa_code: string | null;
  sponsor_code: string | null;
  num_students: number | null;
  status: string | null;
  created_at: string;
  partner_packages?: { name: string; price: number } | null;
}

// ── Blank package helper ──────────────────────────────────────────────────────

const blankPkg = (): PkgRow => ({
  name: "",
  price: 0,
  description: "",
  perks: [],
  display_order: 0,
  active: true,
});

// ── Component ────────────────────────────────────────────────────────────────

const AdminSponsorships = () => {
  // Packages state
  const [packages, setPackages] = useState<PkgRow[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [pkgSaving, setPkgSaving] = useState<number | null>(null);

  // Sponsorship submissions state
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch packages ──────────────────────────────────────────────────────────
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from("partner_packages")
      .select("*")
      .order("display_order");
    if (error) toast.error("Failed to load packages: " + error.message);
    setPackages(
      ((data as PkgRow[]) || []).map((p) => ({
        ...p,
        perks: Array.isArray(p.perks) ? p.perks.filter(Boolean) : [],
      }))
    );
    setPkgLoading(false);
  };

  // ── Fetch sponsorship submissions ─────────────────────────────────────────
  const fetchSponsorships = async () => {
    const { data, error } = await supabase
      .from("sponsorships")
      .select("*, partner_packages(name, price)")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load sponsorships: " + error.message);
    setSponsorships((data as Sponsorship[]) || []);
    setSubLoading(false);
  };

  useEffect(() => {
    fetchPackages();
    fetchSponsorships();
  }, []);

  // ── Package CRUD ────────────────────────────────────────────────────────────
  const updatePkg = (i: number, patch: Partial<PkgRow>) =>
    setPackages((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const savePkg = async (i: number) => {
    const p = packages[i];
    if (!p.name.trim() || p.price < 0) {
      toast.error("Name and a non-negative price are required");
      return;
    }
    setPkgSaving(i);
    const payload = {
      name: p.name.trim(),
      price: p.price,
      description: p.description.trim() || null,
      perks: p.perks.filter(Boolean),
      display_order: p.display_order,
      active: p.active,
    };
    if (p.id) {
      const { error } = await supabase
        .from("partner_packages")
        .update(payload)
        .eq("id", p.id);
      if (error) { toast.error(error.message); setPkgSaving(null); return; }
    } else {
      const { data, error } = await supabase
        .from("partner_packages")
        .insert(payload)
        .select("id")
        .single();
      if (error) { toast.error(error.message); setPkgSaving(null); return; }
      setPackages((prev) =>
        prev.map((pkg, idx) => (idx === i ? { ...pkg, id: data.id } : pkg))
      );
    }
    toast.success("Package saved");
    setPkgSaving(null);
    fetchPackages();
  };

  const removePkg = async (i: number) => {
    const p = packages[i];
    if (!p.id) { setPackages((prev) => prev.filter((_, idx) => idx !== i)); return; }
    if (!confirm(`Delete package "${p.name}"?`)) return;
    const { error } = await supabase.from("partner_packages").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Package deleted");
    fetchPackages();
  };

  // ── Sponsorship status update ───────────────────────────────────────────────
  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("sponsorships")
      .update({ status })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSponsorships((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    toast.success("Status updated");
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
  const statusBadge = (status: string | null) => {
    const map: Record<string, string> = {
      pending:   "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
    };
    const s = status || "pending";
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[s] ?? map.pending}`}>
        {s.charAt(0).toUpperCase() + s.slice(1)}
      </span>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      {/* ── Sponsorship Packages ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sponsorships</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage sponsor packages and review submitted sponsorships
          </p>
        </div>
      </div>

      {/* ── Packages section ── */}
      <div className="glass rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-foreground">Sponsor Packages</h2>
          <button
            onClick={() =>
              setPackages((prev) => [...prev, { ...blankPkg(), display_order: prev.length + 1 }])
            }
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Plus size={15} /> New Package
          </button>
        </div>

        {pkgLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : packages.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No packages yet. Click <strong>New Package</strong> to create one.
          </p>
        ) : (
          <div className="space-y-4">
            {packages.map((p, i) => (
              <div key={p.id || `new-${i}`} className="rounded-xl border border-border bg-muted/30 p-5 grid md:grid-cols-2 gap-4">
                {/* Left */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Package Name</label>
                      <input
                        value={p.name}
                        onChange={(e) => updatePkg(i, { name: e.target.value })}
                        placeholder="Gold Sponsor"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Display Order</label>
                      <input
                        type="number"
                        value={p.display_order}
                        onChange={(e) => updatePkg(i, { display_order: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Amount (KES)</label>
                    <input
                      type="number"
                      min={0}
                      value={p.price}
                      onChange={(e) => updatePkg(i, { price: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Short Description</label>
                    <input
                      value={p.description}
                      onChange={(e) => updatePkg(i, { description: e.target.value })}
                      placeholder="e.g. Premium brand visibility"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                    />
                  </div>
                </div>
                {/* Right */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Perks (one per line)</label>
                    <textarea
                      rows={5}
                      value={p.perks.join("\n")}
                      onChange={(e) => updatePkg(i, { perks: e.target.value.split("\n") })}
                      placeholder={"Logo on banner\nSocial media mention\n2 VIP seats"}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-0.5">Empty lines stripped on save.</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.active}
                      onChange={(e) => updatePkg(i, { active: e.target.checked })}
                    />
                    Active (visible on public site)
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => savePkg(i)}
                      disabled={pkgSaving === i}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/80 transition-colors disabled:opacity-50"
                    >
                      {pkgSaving === i ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                    <button
                      onClick={() => removePkg(i)}
                      className="px-3 py-2 rounded-lg border border-border text-destructive hover:bg-destructive/10 text-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Submitted Sponsorships ── */}
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
                      {s.partner_packages?.name ?? "No package"} ·{" "}
                      KES {Number(s.amount).toLocaleString()}
                    </p>
                  </div>
                  {statusBadge(s.status)}
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                  {expandedId === s.id ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
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
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Update Status</label>
                        <select
                          value={s.status || "pending"}
                          onChange={(e) => updateStatus(s.id, e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-muted border border-border text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
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
