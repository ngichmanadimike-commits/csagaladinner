import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Users, CreditCard, CheckCircle2, Clock, Image, FileText, Calendar, Shield, ArrowRight, Handshake, GraduationCap, Mail, Mic, Settings } from "lucide-react";

interface Stats {
  totalRegistrations: number;
  totalRevenue: number;
  verifiedPayments: number;
  pendingPayments: number;
  totalGalleryImages: number;
  totalContentSections: number;
  totalEvents: number;
  totalAdmins: number;
  totalSponsorships: number;
  pendingSponsorships: number;
  totalInquiries: number;
  newInquiries: number;
  totalPartners: number;
  totalSpeakers: number;
  totalDocuments: number;
}

const AdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalRegistrations: 0,
    totalRevenue: 0,
    verifiedPayments: 0,
    pendingPayments: 0,
    totalGalleryImages: 0,
    totalContentSections: 0,
    totalEvents: 0,
    totalAdmins: 0,
    totalSponsorships: 0,
    pendingSponsorships: 0,
    totalInquiries: 0,
    newInquiries: 0,
    totalPartners: 0,
    totalSpeakers: 0,
    totalDocuments: 0,
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [regRes, payRes, recentRes, galleryRes, contentRes, eventsRes, adminsRes, sponRes, inqRes, partRes, spkRes, docRes] = await Promise.all([
        supabase.from("registrations").select("id, total_cost, total_paid, payment_status"),
        supabase.from("payments").select("id, amount, verified"),
        supabase.from("payments").select("*, registrations(name, email)").order("created_at", { ascending: false }).limit(10),
        supabase.from("gallery_images").select("id", { count: "exact", head: true }),
        supabase.from("site_content").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }),
        supabase.from("sponsorships").select("id, verified"),
        supabase.from("partner_inquiries").select("id, status"),
        supabase.from("partners").select("id", { count: "exact", head: true }),
        supabase.from("speakers").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
      ]);

      const pays = payRes.data || [];
      const spons = sponRes.data || [];
      const inqs = inqRes.data || [];

      setStats({
        totalRegistrations: (regRes.data || []).length,
        totalRevenue: pays.filter((p) => p.verified).reduce((s, p) => s + Number(p.amount), 0),
        verifiedPayments: pays.filter((p) => p.verified).length,
        pendingPayments: pays.filter((p) => !p.verified).length,
        totalGalleryImages: galleryRes.count || 0,
        totalContentSections: contentRes.count || 0,
        totalEvents: eventsRes.count || 0,
        totalAdmins: adminsRes.count || 0,
        totalSponsorships: spons.length,
        pendingSponsorships: spons.filter((s: any) => !s.verified).length,
        totalInquiries: inqs.length,
        newInquiries: inqs.filter((i: any) => i.status === "new").length,
        totalPartners: partRes.count || 0,
        totalSpeakers: spkRes.count || 0,
        totalDocuments: docRes.count || 0,
      });

      setRecentPayments(recentRes.data || []);
    };

    fetchStats();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsorships" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_inquiries" }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statCards = [
    { label: "Registrations", value: stats.totalRegistrations, icon: Users, color: "text-primary" },
    { label: "Revenue (KES)", value: stats.totalRevenue.toLocaleString(), icon: CreditCard, color: "text-emerald-400" },
    { label: "Verified", value: stats.verifiedPayments, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Pending", value: stats.pendingPayments, icon: Clock, color: "text-yellow-400" },
    { label: "Sponsorships", value: stats.totalSponsorships, icon: GraduationCap, color: "text-primary" },
    { label: "Pending Sponsors", value: stats.pendingSponsorships, icon: Clock, color: "text-yellow-400" },
    { label: "New Inquiries", value: stats.newInquiries, icon: Mail, color: "text-primary" },
    { label: "Partners", value: stats.totalPartners, icon: Handshake, color: "text-primary" },
    { label: "Speakers", value: stats.totalSpeakers, icon: Mic, color: "text-primary" },
    { label: "Documents", value: stats.totalDocuments, icon: FileText, color: "text-muted-foreground" },
    { label: "Gallery", value: stats.totalGalleryImages, icon: Image, color: "text-primary" },
    { label: "Events", value: stats.totalEvents, icon: Calendar, color: "text-primary" },
    { label: "Admins", value: stats.totalAdmins, icon: Shield, color: "text-primary" },
  ];

  const quickActions = [
    { label: "Registrations", desc: "View and export attendees", path: "/admin/registrations", icon: Users },
    { label: "Manage Payments", desc: "View and verify M-Pesa payments", path: "/admin/payments", icon: CreditCard },
    { label: "Sponsorships", desc: "Verify sponsor-a-student payments", path: "/admin/sponsorships", icon: GraduationCap },
    { label: "Partner Inquiries", desc: "Review partnership requests", path: "/admin/inquiries", icon: Mail },
    { label: "Manage Partners", desc: "Logos, links and ordering", path: "/admin/partners", icon: Handshake },
    { label: "Speakers", desc: "Add speaker profiles & photos", path: "/admin/speakers", icon: Mic },
    { label: "Documents", desc: "Upload program PDFs", path: "/admin/documents", icon: FileText },
    { label: "Edit Content", desc: "Update website text and images", path: "/admin/content", icon: FileText },
    { label: "Gallery Management", desc: "Upload and manage gallery images", path: "/admin/gallery", icon: Image },
    { label: "Event Configuration", desc: "Create and configure events", path: "/admin/event", icon: Calendar },
    { label: "Site Settings", desc: "Contact info & social links", path: "/admin/settings", icon: Settings },
    { label: "Users & Roles", desc: "Manage admins and user roles", path: "/admin/users", icon: Shield },
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

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="glass rounded-xl p-4 text-left hover:border-primary/50 border border-transparent transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <action.icon size={20} className="text-primary" />
                <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </button>
          ))}
        </div>
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
