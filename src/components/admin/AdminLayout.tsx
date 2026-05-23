import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Users, CreditCard, Package, Handshake,
  Heart, Tag, Ticket, Image, FileText, Settings, LogOut,
  QrCode, Gift, MessageSquare, Shield, Activity, UserCog,
  Calendar, ChevronLeft, ChevronRight, Menu,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Registrations", icon: Users, path: "/admin/registrations" },
  { label: "Payments", icon: CreditCard, path: "/admin/payments" },
  { label: "Tickets", icon: Ticket, path: "/admin/tickets" },
  { label: "QR Scanner", icon: QrCode, path: "/admin/qr-scanner" },
  { label: "Packages", icon: Package, path: "/admin/packages" },
  { label: "Partner Packages", icon: Handshake, path: "/admin/partner-packages" },
  { label: "Partners", icon: Handshake, path: "/admin/partners" },
  { label: "Sponsorships", icon: Heart, path: "/admin/sponsorships" },
  { label: "Donations", icon: Gift, path: "/admin/donations" },
  { label: "Promotions", icon: Tag, path: "/admin/promotions" },
  { label: "Gallery", icon: Image, path: "/admin/gallery" },
  { label: "Content", icon: FileText, path: "/admin/content" },
  { label: "Event Config", icon: Calendar, path: "/admin/event-config" },
  { label: "Inquiries", icon: MessageSquare, path: "/admin/inquiries" },
  { label: "Users", icon: UserCog, path: "/admin/users" },
  { label: "Activity", icon: Activity, path: "/admin/activity" },
  { label: "Codes", icon: Tag, path: "/admin/codes" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
  { label: "Danger Zone", icon: Shield, path: "/admin/danger-zone" },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`flex flex-col h-full ${mobile ? "w-72" : collapsed ? "w-16" : "w-64"} transition-all duration-300`}
      style={{ backgroundColor: "#0A1628" }}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "rgba(212,175,55,0.15)" }}>
        {!collapsed && (
          <div>
            <p className="font-bold text-white text-sm">CSA Gala Admin</p>
            <p className="text-white/40 text-xs truncate">{user?.email}</p>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? "text-yellow-500" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
              style={active ? { backgroundColor: "rgba(212,175,55,0.12)", color: "#D4AF37" } : {}}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={17} className="flex-shrink-0" />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t" style={{ borderColor: "rgba(212,175,55,0.1)" }}>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={17} className="flex-shrink-0" />
          {(!collapsed || mobile) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:flex flex-col" style={{ borderRight: "1px solid rgba(212,175,55,0.1)" }}>
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex flex-col shadow-2xl" style={{ borderRight: "1px solid rgba(212,175,55,0.15)" }}>
            <Sidebar mobile />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="md:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ backgroundColor: "#0A1628", borderColor: "rgba(212,175,55,0.15)" }}
        >
          <p className="font-bold text-white text-sm">CSA Admin</p>
          <button onClick={() => setMobileOpen(true)} className="p-2 text-white/60 hover:text-white">
            <Menu size={20} />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-6 text-white">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
