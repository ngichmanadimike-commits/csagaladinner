```tsx id="r7m6k1"
import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Handshake,
} from "lucide-react";

interface Props {
  children: ReactNode;
}

const AdminLayout = ({ children }: Props) => {
  const location = useLocation();

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Event Config",
      href: "/admin/event-config",
      icon: CalendarDays,
    },
    {
      label: "Registrations",
      href: "/admin/registrations",
      icon: Users,
    },
    {
      label: "Partner Packages",
      href: "/admin/partner-packages",
      icon: Handshake,
    },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-5 hidden md:block">
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display">
            CSA Admin
          </h1>

          <p className="text-sm text-muted-foreground">
            Gala Dinner Dashboard
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            const active =
              location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
```
