import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Handshake,
  CreditCard,
  Package,
  Trophy,
  Ticket,
  Image,
  FileText,
  Settings,
  UserCog,
  Activity,
  Tag,
  FileArchive,
  Heart,
  MessageSquare,
  QrCode,
  Mic,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Activity Log", href: "/admin/activity", icon: Activity },
    ],
  },
  {
    group: "Event",
    items: [
      { label: "Event Config", href: "/admin/event-config", icon: CalendarDays },
      { label: "Notifications", href: "/admin/content", icon: MessageSquare },
      { label: "Gallery", href: "/admin/gallery", icon: Image },
      { label: "Speakers", href: "/admin/speakers", icon: Mic },
      { label: "Documents", href: "/admin/documents", icon: FileArchive },
    ],
  },
  {
    group: "Registrations & Tickets",
    items: [
      { label: "Registrations", href: "/admin/registrations", icon: Users },
      { label: "Tickets", href: "/admin/tickets", icon: Ticket },
      { label: "QR Scanner", href: "/admin/qr-scanner", icon: QrCode },
      { label: "Promo Codes", href: "/admin/codes", icon: Tag },
    ],
  },
  {
    group: "Payments",
    items: [
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Donations", href: "/admin/donations", icon: Heart },
      { label: "Promotions", href: "/admin/promotions", icon: Trophy },
    ],
  },
  {
    group: "Partners & Sponsors",
    items: [
      { label: "Partner Packages", href: "/admin/partner-packages", icon: Handshake },
      { label: "Packages", href: "/admin/packages", icon: Package },
      { label: "Partners", href: "/admin/partners", icon: Users },
      { label: "Sponsorships", href: "/admin/sponsorships", icon: Trophy },
    ],
  },
  {
    group: "Admin",
    items: [
      { label: "Users", href: "/admin/users", icon: UserCog },
      { label: "Inquiries", href: "/admin/inquiries", icon: MessageSquare },
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Danger Zone", href: "/admin/danger-zone", icon: ShieldAlert },
    ],
  },
];

const AdminLayout = ({ children }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isSuperAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const toggleGroup = (group: string) => {
    setCollapsed((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold">CSA Admin</h1>
        <p className="text-xs text-muted-foreground">Gala Dinner Dashboard</p>
        {isSuperAdmin && (
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full mt-1 inline-block">
            Super Admin
          </span>
        )}
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
        {navGroups.map((group) => {
          const isCollapsed = collapsed.includes(group.group);
          const hasActive = group.items.some(
            (item) => location.pathname === item.href
          );

          return (
            <div key={group.group}>
              <button
                onClick={() => toggleGroup(group.group)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                  hasActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {group.group}
                {isCollapsed ? (
                  <ChevronRight size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5 mb-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <Icon size={16} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="mt-4 pt-4 border-t border-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 hidden md:flex flex-col fixed h-full overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">CSA Admin</h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-muted"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 z-40 bg-card p-4 transform transition-transform duration-200 overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mt-14">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-6 mt-14 md:mt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
