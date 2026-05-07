import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert } from "lucide-react";

const SCOPES: { id: string; label: string; desc: string }[] = [
  { id: "registrations", label: "Registrations & Tickets", desc: "Wipes ALL registrations, their payments and promo redemptions." },
  { id: "payments", label: "Payments only", desc: "Removes every payment record — registrations stay." },
  { id: "promo_redemptions", label: "Promo redemption history", desc: "Clears tracking of who used which promo." },
  { id: "promos", label: "Promotions + redemptions", desc: "Removes ALL promo codes and their history." },
  { id: "sponsorships", label: "Sponsorships", desc: "Removes ALL sponsorship records." },
  { id: "all", label: "EVERYTHING", desc: "Wipes registrations, payments, promos, sponsorships." },
];

export default function AdminDangerZone() {
  const { isSuperAdmin } = useAuth();
  const [scope, setScope] = useState<string>("");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setScope(""); setStep(0); setConfirmText(""); };

  const proceed = async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error('Type DELETE exactly to confirm');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_wipe_data", { _scope: scope, _confirm: "DELETE" });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Wipe complete");
    reset();
    console.log("wipe result", data);
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <ShieldAlert className="text-destructive" />
          <div>
            <h1 className="font-display text-2xl font-bold">Danger Zone</h1>
            <p className="text-sm text-muted-foreground">Irreversible bulk deletions. Super admins only.</p>
          </div>
        </header>

        {!isSuperAdmin ? (
          <div className="glass rounded-xl p-6 text-sm">Only Super Admins can use this page.</div>
        ) : (
          <div className="glass rounded-xl p-5 space-y-4 border border-destructive/40">
            {step === 0 && (
              <div className="space-y-3">
                {SCOPES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setScope(s.id); setStep(1); }}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <p className="font-semibold text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </button>
                ))}
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex gap-2 items-start text-sm bg-destructive/10 border border-destructive/40 rounded-lg p-3">
                  <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-bold text-destructive">This action cannot be undone.</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      You are about to wipe: <span className="font-semibold">{SCOPES.find(s => s.id === scope)?.label}</span>.
                      All affected records will be permanently removed.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={reset} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
                  <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold">I understand, continue</button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm">Type <span className="font-mono font-bold">DELETE</span> to permanently wipe <span className="font-semibold">{SCOPES.find(s => s.id === scope)?.label}</span>.</p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border font-mono"
                />
                <div className="flex gap-2">
                  <button onClick={reset} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
                  <button onClick={proceed} disabled={busy} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-50">
                    {busy ? "Wiping…" : "Permanently Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
