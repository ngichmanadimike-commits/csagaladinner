import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Users, CreditCard, CheckCircle2, Clock } from "lucide-react";

interface Stats {
  totalRegistrations: number;
  totalRevenue: number;
  verifiedPayments: number;
  pendingPayments: number;
}

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalRegistrations: 0,
    totalRevenue: 0,
    verifiedPayments: 0,
    pendingPayments: 0,
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [regRes, payRes, recentRes] = await Promise.all([
        supabase.from("registrations").select("id, total_cost, total_paid, payment_status"),
        supabase.from("payments").select("id, amount, verified"),
        supabase.from("payments").select("*, registrations(name, email)").order("created_at", { ascending: false }).limit(10),
      ]);

      const regs = regRes.data || [];
      const pays = payRes.data || [];

      setStats({
        totalRegistrations: regs.length,
        totalRevenue: pays.filter((p) => p.verified).reduce((s, p) => s + Number(p.amount), 0),
        verifiedPayments: pays.filter((p) => p.verified).length,
        pendingPayments: pays.filter((p) => !p.verified).length,
      });

      setRecentPayments(recentRes.data || []);
    };

    fetchStats();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statCards = [
    { label: "Registrations", value: stats.totalRegistrations, icon: Users, color: "text-primary" },
    { label: "Revenue (KES)", value: stats.totalRevenue.toLocaleString(), icon: CreditCard, color: "text-emerald-400" },
    { label: "Verified", value: stats.verifiedPayments, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Pending", value: stats.pendingPayments, icon: Clock, color: "text-yellow-400" },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={18} className={card.color} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-4">
        <h2 className="font-display text-lg font-bold text-foreground mb-4">Recent Payments</h2>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Code</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-foreground">{(p.registrations as any)?.name || "—"}</td>
                    <td className="py-2 pr-4 text-foreground">KES {Number(p.amount).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{p.mpesa_code || "—"}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.verified ? "bg-emerald-400/10 text-emerald-400" : "bg-yellow-400/10 text-yellow-400"}`}>
                        {p.verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOverview;
