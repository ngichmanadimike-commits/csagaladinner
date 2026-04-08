import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import logo from "@/assets/white_logo.jpg";

const navLinks = [
  { label: "Tickets", href: "/#tickets" },
  { label: "Sponsor", href: "/#sponsor" },
  { label: "Partners", href: "/#partners" },
  { label: "Event Insights", href: "/event-insights" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/#connect" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const handleNavClick = (href: string) => {
    setOpen(false);
    if (href.startsWith("/#")) {
      if (location.pathname === "/") {
        const el = document.querySelector(href.replace("/", ""));
        el?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = href;
      }
    } else {
      window.location.href = href;
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <a href="/" className="flex items-center gap-3">
          <img src={logo} alt="CSA Logo" className="h-12 w-12 rounded-full object-cover" />
          <span className="font-display text-lg font-bold text-foreground hidden sm:block">CSA Gala 2026</span>
        </a>
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => handleNavClick(l.href)}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => handleNavClick("/#tickets")}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:scale-105 hover:glow-sm transition-all duration-300"
          >
            Buy Ticket
          </button>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden glass border-t border-border/50 px-4 pb-4 space-y-3">
          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => handleNavClick(l.href)}
              className="block w-full text-left py-2 text-muted-foreground hover:text-primary transition-colors"
            >
              {l.label}
            </button>
          ))}
          <button onClick={() => handleNavClick("/#tickets")} className="block w-full text-left py-2 text-primary font-semibold">
            Buy Ticket
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
