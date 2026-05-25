import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, CreditCard, Users, Calendar, LogOut, Menu, Shield,
  FileText, Image, Handshake, GraduationCap, Mail, Mic, Settings,
  Ticket, Activity, Package, Tag, ShieldAlert, ScanLine, Gift,
  ChevronLeft, ChevronRight, UserSquare2,
} from "lucide-react";

const navItems: { label: string; icon: any; path: string; superOnly?: boolean }[] = [
  { label: "Overview",           icon: LayoutDashboard, path: "/admin" },
  { label: "Registrations",      icon: Users,           path: "/admin/registrations" },
  { label: "Payments",           icon: CreditCard,      path: "/admin/payments" },
  { label: "Ticket Purchases",   icon: Ticket,          path: "/admin/tickets" },
  { label: "QR Scanner",         icon: ScanLine,        path: "/admin/qr-scanner" },
  { label: "Ticket Packages",    icon: Package,         path: "/admin/packages" },
  { label: "Partner Packages",   icon: Handshake,       path: "/admin/partner-packages" },
  { label: "Promotions",         icon: Tag,             path: "/admin/promotions" },
  { label: "Booking Codes",      icon: Ticket,          path: "/admin/codes" },
  { label: "Sponsorships",       icon: GraduationCap,   path: "/admin/sponsorships" },
  { label: "Donations",          icon: Gift,            path: "/admin/donations" },
  { label: "Partner Inquiries",  icon: Mail,            path: "/admin/inquiries" },
  { label: "Partners",           icon: Handshake,       path: "/admin/partners" },
  { label: "Speakers",           icon: Mic,             path: "/admin/speakers" },
  { label: "Documents",          icon: FileText,        path: "/admin/documents" },
  { label: "Event Config",       icon: Calendar,        path: "/admin/event" },
  { label: "Organizers",         icon: UserSquare2,     path: "/admin/content" },
  { label: "Gallery",            icon: Image,           path: "/admin/gallery" },
  { label: "Site Settings",      icon: Settings,        path: "/admin/settings" },
  { label: "Users & Roles",      icon: Shield,          path: "/admin/users" },
  { label: "Admin Activity",     icon: Activity,        path: "/admin/activity",    superOnly: true },
  { label: "Danger Zone",        icon: ShieldAlert,     path: "/admin/danger-zone", superOnly: true },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut, loading, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/admin/login", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm mb-4">You do not have admin privileges.</p>
          <div className="flex gap-3 justify-center">
            <a href="/" className="px-4 py-2 rounded-lg border border-border text-foreground hover:border-primary transition-colors text-sm">
              Back to site
            </a>
            <button onClick={signOut} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const visibleItems = navItems.filter((it) => !it.superOnly || isSuperAdmin);

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`flex flex-col h-full ${mobile ? "w-72" : collapsed ? "w-16" : "w-64"} transition-all duration-200`}
      style={{ backgroundColor: "#0A1628" }}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "rgba(212,175,55,0.15)" }}>
        {(!collapsed || mobile) && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">CSA Admin</p>
            <p className="text-white/40 text-xs truncate">{user.email}</p>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" style={{ maxHeight: "calc(100vh - 8rem)" }}>
        {visibleItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              title={collapsed && !mobile ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? "font-semibold" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
              style={active ? { backgroundColor: "rgba(212,175,55,0.12)", color: "#D4AF37" } : {}}
            >
              <item.icon size={17} className="flex-shrink-0" />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t" style={{ borderColor: "rgba(212,175,55,0.1)" }}>
        <button
          onClick={async () => { await signOut(); navigate("/admin/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:flex flex-col flex-shrink-0" style={{ borderRight: "1px solid rgba(212,175,55,0.1)" }}>
        <SidebarContent />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex flex-col shadow-2xl" style={{ borderRight: "1px solid rgba(212,175,55,0.15)" }}>
            <SidebarContent mobile />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 border-b h-14"
          style={{ backgroundColor: "#0A1628", borderColor: "rgba(212,175,55,0.15)" }}
        >
          <p className="font-bold text-white text-sm">CSA Admin</p>
          <button onClick={() => setMobileOpen(true)} className="p-2 text-white/60 hover:text-white">
            <Menu size={20} />
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
