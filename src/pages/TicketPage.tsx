import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, Home, Lock, CheckCircle2 } from "lucide-react";
import TicketDesign from "@/components/TicketDesign";

const TicketPage = () => {
  const { ticket_number } = useParams<{ ticket_number: string }>();

  // Confirmation gate state
  const [confirmed, setConfirmed] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = codeInput.trim().toUpperCase();
    const expected = (ticket_number || "").toUpperCase();
    if (!entered) { setCodeError("Please enter your booking code"); return; }
    if (entered !== expected) { setCodeError("Booking code does not match. Check your confirmation email."); return; }
    setCodeError("");
    setVerifying(true);
    await loadTicket();
    setVerifying(false);
    setConfirmed(true);
  };

  const loadTicket = async () => {
    if (!ticket_number) { setNotFound(true); setLoading(false); return; }
    setLoading(true);

    const { data: reg, error: regErr } = await supabase
      .from("registrations")
      .select("id, name, email, phone, package_type, total_cost, total_paid, payment_status, ticket_code, secure_ticket_token, created_at, quantity, event_id")
      .eq("ticket_code", ticket_number.toUpperCase())
      .maybeSingle();

    if (regErr || !reg) { setNotFound(true); setLoading(false); return; }

    // Fetch linked event
    let eventData: any = null;
    if (reg.event_id) {
      const { data: ev } = await supabase
        .from("events")
        .select("title, theme, venue, event_date, end_time, description")
        .eq("id", reg.event_id)
        .maybeSingle();
      eventData = ev;
    }
    if (!eventData) {
      const { data: ev } = await supabase
        .from("events")
        .select("title, theme, venue, event_date, end_time, description")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      eventData = ev;
    }

    setTicket({
      ticket_number: reg.ticket_code,
      purchaser_name: reg.name,
      booking_code: reg.ticket_code,
      type_name: reg.package_type || "General",
      total_amount: Number(reg.total_cost),
      payment_status: reg.payment_status,
      purchase_date: reg.created_at,
      qr_code: reg.secure_ticket_token ?? reg.ticket_code ?? reg.id,
      quantity: reg.quantity ?? 1,
      email: reg.email,
      phone: reg.phone,
      event_title: eventData?.title ?? "CSA Gala Dinner 2026",
      event_theme: eventData?.theme ?? "",
      event_venue: eventData?.venue ?? "Utalii Hotel",
      event_date: eventData?.event_date ?? null,
      event_end_time: eventData?.end_time ?? null,
      event_description: eventData?.description ?? "",
    });
    setLoading(false);
  };

  // ── Booking code confirmation gate ──────────────────────────────────────
  if (!confirmed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="glass rounded-2xl max-w-sm w-full p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-primary" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Confirm Your Identity</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Enter your booking code to access and download your ticket.
            </p>
          </div>

          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Booking Code</label>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                placeholder="e.g. CSA-XXXXXXXX"
                className={`w-full px-4 py-2.5 rounded-lg bg-muted border text-foreground text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  codeError ? "border-red-500/60" : "border-border"
                }`}
              />
              {codeError && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} /> {codeError}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {verifying ? "Verifying..." : "Confirm & View Ticket"}
            </button>
          </form>

          <div className="flex gap-3 justify-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Home size={14} /> Home
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/lookup" className="text-sm text-primary hover:underline">
              Look up booking code
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading / Not found ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="text-yellow-400" size={48} />
        <h1 className="font-display text-2xl font-bold text-foreground">Ticket Not Found</h1>
        <p className="text-muted-foreground max-w-sm">
          We couldn't find a ticket with code <span className="font-mono text-primary">{ticket_number}</span>.
          Make sure you entered the correct booking code.
        </p>
        <div className="flex gap-3 mt-2">
          <Link to="/lookup" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
            Look Up Booking
          </Link>
          <Link to="/" className="px-5 py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm flex items-center gap-2">
            <Home size={16} /> Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Ticket display ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
      <div className="w-full max-w-4xl">
        <TicketDesign ticket={ticket} />
      </div>
      <div className="flex gap-3">
        <Link to="/" className="px-5 py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm flex items-center gap-2">
          <Home size={16} /> Home
        </Link>
        <Link to="/lookup" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
          Payment Status
        </Link>
      </div>
    </div>
  );
};

export default TicketPage;
