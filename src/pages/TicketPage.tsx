import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, Home } from "lucide-react";
import TicketDesign from "@/components/TicketDesign";

const TicketPage = () => {
  const { ticket_number } = useParams<{ ticket_number: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ticket_number) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const load = async () => {
      // Fetch registration + the linked event in one go
      const { data: reg, error: regErr } = await supabase
        .from("registrations")
        .select(
          "id, name, email, phone, package_type, total_cost, total_paid, payment_status, ticket_code, secure_ticket_token, created_at, quantity, event_id"
        )
        .eq("ticket_code", ticket_number.toUpperCase())
        .maybeSingle();

      if (regErr || !reg) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch the event details (published or any — admin may preview)
      let eventData: any = null;
      if (reg.event_id) {
        const { data: ev } = await supabase
          .from("events")
          .select("title, theme, venue, event_date, description")
          .eq("id", reg.event_id)
          .maybeSingle();
        eventData = ev;
      }

      // Fallback: if no event_id, grab the latest published event
      if (!eventData) {
        const { data: ev } = await supabase
          .from("events")
          .select("title, theme, venue, event_date, description")
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
        // Event fields — live from DB
        event_title: eventData?.title ?? "CSA Gala Dinner 2026",
        event_theme: eventData?.theme ?? "",
        event_venue: eventData?.venue ?? "Utalii Hotel",
        event_date: eventData?.event_date ?? null,
        event_description: eventData?.description ?? "",
      });

      setLoading(false);
    };

    load();
  }, [ticket_number]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="text-yellow-400" size={48} />
        <h1 className="font-display text-2xl font-bold text-foreground">Ticket Not Found</h1>
        <p className="text-muted-foreground max-w-sm">
          We couldn't find a ticket with the code
          <span className="font-mono text-primary"> {ticket_number}</span>
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
