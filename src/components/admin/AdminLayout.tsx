import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, CreditCard, Users, Calendar, LogOut, Menu, Shield,
  FileText, Image, Handshake, GraduationCap, Mail, Mic, Settings,
  Ticket, Activity, Package, Tag, ShieldAlert, ScanLine,
} from "lucide-react";

const navItems: { label: string; icon: any; path: string; superOnly?: boolean }[] = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin" },
  { label: "Ticket Purchases", icon: Ticket, path: "/admin/tickets" },
  { label: "Registrations", icon: Users, path: "/admin/registrations" },
  { label: "Payments", icon: CreditCard, path: "/admin/payments" },
  { label: "Donations", icon: CreditCard, path: "/admin/donations" },
  { label: "Booking Codes", icon: Ticket, path: "/admin/codes" },
  { label: "QR Scanner", icon: ScanLine, path: "/admin/qr-scanner" },
  { label: "Ticket Packages", icon: Package, path: "/admin/packages" },
  { label: "Promotions", icon: Tag, path: "/admin/promotions" },
  { label: "Sponsorships", icon: GraduationCap, path: "/admin/sponsorships" },
  { label: "Partner Inquiries", icon: Mail, path: "/admin/inquiries" },
  { label: "Partners", icon: Handshake, path: "/admin/partners" },
  { label: "Speakers", icon: Mic, path: "/admin/speakers" },
  { label: "Documents", icon: FileText, path: "/admin/documents" },
  { label: "Event Config", icon: Calendar, path: "/admin/event" },
  { label: "Content", icon: FileText, path: "/admin/content" },
  { label: "Gallery", icon: Image, path: "/admin/gallery" },
  { label: "Site Settings", icon: Settings, path: "/admin/settings" },
  { label: "Users & Roles", icon: Shield, path: "/admin/users" },
  { label: "Admin Activity", icon: Activity, path: "/admin/activity", superOnly: true },
  { label: "Danger Zone", icon: ShieldAlert, path: "/admin/danger-zone", superOnly: true },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut, loading, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}>
        <div className="p-4 border-b border-border">
          <h2 className="font-display text-lg font-bold text-foreground">CSA Admin</h2>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <nav className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 8rem)" }}>
          {navItems.filter((it) => !it.superOnly || isSuperAdmin).map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname === item.path
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-border">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 border-b border-border flex items-center px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu size={24} />
          </button>
          <span className="ml-3 font-display font-bold text-foreground">CSA Admin</span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
