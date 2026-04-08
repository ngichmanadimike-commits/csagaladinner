import logo from "@/assets/white_logo.jpg";

const Footer = () => (
  <footer className="border-t border-border/50 py-8">
    <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img src={logo} alt="CSA" className="h-10 w-10 rounded-full object-cover" />
        <span className="text-sm text-muted-foreground">
          © 2026 Construction Students Association. All rights reserved.
        </span>
      </div>
      <div className="flex gap-6 text-sm text-muted-foreground">
        <a href="#tickets" className="hover:text-primary transition-colors">Tickets</a>
        <a href="#sponsor" className="hover:text-primary transition-colors">Sponsor</a>
        <a href="#partners" className="hover:text-primary transition-colors">Partners</a>
        <a href="#connect" className="hover:text-primary transition-colors">Contact</a>
      </div>
    </div>
  </footer>
);

export default Footer;
