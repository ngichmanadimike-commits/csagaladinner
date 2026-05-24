import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Users, CreditCard, CheckCircle2, Clock, Image, FileText,
  Calendar, Shield, ArrowRight, Handshake, GraduationCap,
  Mail, Mic, Settings, Download, TrendingUp,
} from "lucide-react";
import { exportToXlsx } from "@/lib/exportXlsx";

interface Stats {
  totalRegistrations: number;
  confirmedTicketRevenue: number;
  sponsorRevenue: number;
  combinedRevenue: number;
  pendingRevenue: number;
  outstandingBalance: number;
  ticketsIssued: number;
  fullyPaid: number;
  partialPaid: number;
  avgTicket: number;
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalRegistrations: 0,
    confirmedTicketRevenue: 0,
    sponsorRevenue: 0,
    combinedRevenue: 0,
    pendingRevenue: 0,
    outstandingBalance: 0,
    ticketsIssued: 0,
    fullyPaid: 0,
    partialPaid: 0,
    avgTicket: 0,
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
  const [chartData, setChartData] = useState
    { day: string; confirmed: number; pending: number }[]
  >([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        regRes, payRes, recentRes, galleryRes, contentRes,
        eventsRes, adminsRes, sponRes, inqRes, partRes, spkRes, docRes,
      ] = await Promise.all([
        supabase.from("registrations").select("id, total_cost, total_paid, payment_status, ticket_issued"),
        supabase.from("payments").select("id, amount, verified, created_at"),
        supabase
          .from("payments")
          .select("*, registrations(name, email)")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("gallery_images").select("id", { count: "exact", head: true }),
        supabase.from("site_content").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }),
        supabase.from("sponsorships").select("id, verified, amount"),
        supabase.from("partner_inquiries").select("id, status"),
        supabase.from("partners").select("id", { count: "exact", head: true }),
        supabase.from("speakers").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
      ]);

      const pays = payRes.data || [];
      const spons = sponRes.data || [];
      const inqs = inqRes.data || [];
      const regs = regRes.data || [];

      const confirmedRegs = regs.filter(
        (r: any) => r.payment_status === "paid" || r.payment_status === "confirmed"
      );
      const confirmedTicketRevenue = confirmedRegs.reduce(
        (s: number, r: any) => s + Number(r.total_paid), 0
      );
      const partialRegs = regs.filter((r: any) => r.payment_status === "partial");
      const partialRevenue = partialRegs.reduce(
        (s: number, r: any) => s + Number(r.total_paid), 0
      );
      const outstandingBalance = regs.reduce(
        (s: number, r: any) => s + Math.max(0, Number(r.total_cost) - Number(r.total_paid)), 0
      );
      const sponsorRevenue = spons
        .filter((s: any) => s.verified)
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const pendingRevenue = pays
        .filter((p: any) => !p.verified)
        .reduce((s: number, p: any) => s + Number(p.amount), 0);

      setStats({
        totalRegistrations: regs.length,
        confirmedTicketRevenue,
        sponsorRevenue,
        combinedRevenue: confirmedTicketRevenue + sponsorRevenue + partialRevenue,
        pendingRevenue,
        outstandingBalance,
        ticketsIssued: regs.filter((r: any) => r.ticket_issued).length,
        fullyPaid: confirmedRegs.length,
        partialPaid: partialRegs.length,
        avgTicket: confirmedRegs.length > 0
          ? Math.round(confirmedTicketRevenue / confirmedRegs.length) : 0,
        verifiedPayments: pays.filter((p: any) => p.verified).length,
        pendingPayments: pays.filter((p: any) => !p.verified).length,
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

      const buckets: Record<string, { confirmed: number; pending: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        buckets[d.toISOString().slice(0, 10)] = { confirmed: 0, pending: 0 };
      }
      pays.forEach((p: any) => {
        const k = (p.created_at || "").slice(0, 10);
        if (buckets[k]) {
          if (p.verified) buckets[k].confirmed += Number(p.amount);
          else buckets[k].pending += Number(p.amount);
        }
      });
      setChartData(
        Object.entries(buckets).map(([day, v]) => ({ day: day.slice(5), ...v }))
      );
      setLoading(false);
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
    { label: "Total Registrations", value: stats.totalRegistrations, icon: Users, color: "text-primary" },
    { label: "Combined Revenue", value: `KES ${stats.combinedRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Ticket Revenue (Paid)", value: `KES ${stats.confirmedTicketRevenue.toLocaleString()}`, icon: CreditCard, color: "text-emerald-400" },
    { label: "Sponsor Revenue", value: `KES ${stats.sponsorRevenue.toLocaleString()}`, icon: GraduationCap, color: "text-emerald-400" },
    { label: "Pending (Unverified)", value: `KES ${stats.pendingRevenue.toLocaleString()}`, icon: Clock, color: "text-yellow-400" },
    { label: "Outstanding Balance", value: `KES ${stats.outstandingBalance.toLocaleString()}`, icon: Clock, color: "text-orange-400" },
    { label: "Tickets Issued", value: stats.ticketsIssued, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Fully Paid", value: stats.fullyPaid, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Partial Paid", value: stats.partialPaid, icon: Clock, color: "text-blue-400" },
    { label: "Avg Ticket (KES)", value: stats.avgTicket.toLocaleString(), icon: TrendingUp, color: "text-primary" },
    { label: "Verified Payments", value: stats.verifiedPayments, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Pending Payments", value: stats.pendingPayments, icon: Clock, color: "text-yellow-400" },
    { label: "Sponsorships", value: stats.totalSponsorships, icon: GraduationCap, color: "text-primary" },
    { label: "Pending Sponsors", value: stats.pendingSponsorships, icon: Clock, color: "text-yellow-400" },
    { label: "New Inquiries", value: stats.newInquiries, icon: Mail, color: "text-primary" },
    { label: "Partners", value: stats.totalPartners, icon: Handshake, color: "text-primary" },
    { label: "Speakers", value: stats.totalSpeakers, icon: Mic, color: "text-primary" },
    { label: "Documents", value: stats.totalDocuments, icon: FileText, color: "text-muted-foreground" },
    { label: "Gallery Images", value: stats.totalGalleryImages, icon: Image, color: "text-primary" },
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

  const downloadAll = async () => {
    const [reg, pay, spon, inq] = await Promise.all([
      supabase.from("registrations").select("*"),
      supabase.from("payments").select("*, registrations(name,email,phone)"),
      supabase.from("sponsorships").select("*"),
      supabase.from("partner_inquiries").select("*"),
    ]);
    exportToXlsx((reg.data as any) || [], "registrations", "Registrations");
    exportToXlsx(
      ((pay.data as any) || []).map((p: any) => ({
        ...p, name: p.registrations?.name, email: p.registrations?.email,
      })), "payments", "Payments"
    );
    exportToXlsx((spon.data as any) || [], "sponsorships", "Sponsorships");
    exportToXlsx((inq.data as any) || [], "inquiries", "Inquiries");
  };

  return (
    <AdminLayout>
      {loading ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-9 w-36 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-7 w-16 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 h-56 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </div>
      ) : (
      <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <button
          onClick={downloadAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Download size={16} /> Download All
        </button>
      </div>

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

      <div className="glass rounded-xl p-4 mb-8">
        <h2 className="font-display text-lg font-bold text-foreground mb-4">
          Payment Activity — Last 7 Days
        </h2>
        <div className="flex items-end gap-2 h-40">
          {chartData.map((d) => {
            const max = Math.max(1, ...chartData.map((x) => x.confirmed + x.pending));
            const cH = (d.confirmed / max) * 100;
            const pH = (d.pending / max) * 100;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse gap-px h-32">
                  <div className="bg-emerald-400/70 rounded-sm" style={{ height: `${cH}%` }}
                    title={`Confirmed: KES ${d.confirmed.toLocaleString()}`} />
                  <div className="bg-yellow-400/70 rounded-sm" style={{ height: `${pH}%` }}
                    title={`Pending: KES ${d.pending.toLocaleString()}`} />
                </div>
                <span className="text-[10px] text-muted-foreground">{d.day}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-400/70" /> Confirmed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-400/70" /> Pending
          </span>
        </div>
      </div>

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
                  <th className="pb-2 pr-4">M-Pesa Code</th>
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
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.verified ? "bg-emerald-400/10 text-emerald-400" : "bg-yellow-400/10 text-yellow-400"
                      }`}>
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
      </>
      )}
    </AdminLayout>
  );
};

export default AdminOverview;
