import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "../../components/admin/AdminLayout";
import { Users, CreditCard, Ticket, Heart, TrendingUp, Clock } from "lucide-react";

interface Stats {
  total_registrations: number;
  paid_registrations: number;
  pending_registrations: number;
  total_revenue: number;
  total_sponsorships: number;
  recent_registrations: any[];
}

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    total_registrations: 0,
    paid_registrations: 0,
    pending_registrations: 0,
    total_revenue: 0,
    total_sponsorships: 0,
    recent_registrations: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [regsRes, sponsorsRes, recentRes] = await Promise.all([
        supabase.from("registrations").select("payment_status, total_cost, amount"),
        supabase.from("sponsorships").select("status, amount"),
        supabase
          .from("registrations")
          .select("id, full_name, name, package_type, payment_status, created_at, total_cost, amount")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const regs = regsRes.data || [];
      const sponsors = sponsorsRes.data || [];

      const paid = regs.filter((r: any) => r.payment_status === "paid");
      const pending = regs.filter((r: any) => r.payment_status === "pending");
      const revenue = paid.reduce((sum: number, r: any) => sum + (Number(r.total_cost) || Number(r.amount) || 0), 0);
      const sponsorRevenue = sponsors.filter((s: any) => s.status === "paid").reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);

      setStats({
        total_registrations: regs.length,
        paid_registrations: paid.length,
        pending_registrations: pending.length,
        total_revenue: revenue + sponsorRevenue,
        total_sponsorships: sponsors.length,
        recent_registrations: recentRes.data || [],
      });
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Registrations", value: stats.total_registrations, icon: Users, color: "#3b82f6" },
    { label: "Paid", value: stats.paid_registrations, icon: Ticket, color: "#22c55e" },
    { label: "Pending", value: stats.pending_registrations, icon: Clock, color: "#D4AF37" },
    { label: "Total Revenue", value: `KES ${stats.total_revenue.toLocaleString()}`, icon: CreditCard, color: "#8b5cf6" },
    { label: "Sponsorships", value: stats.total_sponsorships, icon: Heart, color: "#ef4444" },
  ];

  const statusColor: Record<string, string> = {
    paid: "#22c55e", pending: "#D4AF37", failed: "#ef4444", refunded: "#8b5cf6",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">CSA Gala Dinner 2026 — Event Overview</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-xl p-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Icon size={20} style={{ color: card.color }} className="mb-2" />
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                  <p className="text-white/40 text-xs mt-0.5">{card.label}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.03)" }}>
            <TrendingUp size={16} className="text-white/40" />
            <h2 className="font-semibold text-white text-sm">Recent Registrations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                  {["Name", "Package", "Amount", "Status", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent_registrations.map((reg: any) => (
                  <tr key={reg.id} className="border-t hover:bg-white/2 transition-colors" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-3 text-white font-medium">{reg.name || reg.full_name}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{reg.package_type || "—"}</td>
                    <td className="px-4 py-3 text-white">KES {Number(reg.total_cost || reg.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ color: statusColor[reg.payment_status] || "#fff", backgroundColor: `${statusColor[reg.payment_status]}20` }}>
                        {reg.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{new Date(reg.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {stats.recent_registrations.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">No registrations yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOverview;
