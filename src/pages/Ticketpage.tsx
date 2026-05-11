import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TicketRecord {
  id: number;
  ticket_number: string;
  purchaser_name: string;
  total_amount: number;
  purchase_date: string;
  purchaser_phone: string;
  purchaser_email: string;
  payment_status: string;
}

const TicketPage = () => {
  const { ticket_number } = useParams<{ ticket_number: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticket_number) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("ticket_purchases")
        .select("id, ticket_number, purchaser_name, total_amount, purchase_date, purchaser_phone, purchaser_email, payment_status")
        .eq("ticket_number", ticket_number)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setTicket(data as TicketRecord);
      }
      setLoading(false);
    };

    fetchTicket();
  }, [ticket_number]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0A2342" }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "#D4AF37", borderTopColor: "transparent" }}
          />
          <p style={{ color: "#D4AF37" }} className="font-semibold tracking-wider text-sm">
            VERIFYING TICKET…
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#0A2342" }}
      >
        <div className="text-center max-w-md">
          <div className="text-7xl font-bold mb-4" style={{ color: "#D4AF37" }}>404</div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: "#D4AF37" }}>Ticket Not Found</h1>
          <p className="text-white/70 mb-8 text-sm leading-relaxed">
            No ticket matching <span className="font-mono font-semibold text-white">#{ticket_number}</span> was found.
            Please double-check the ticket number or contact support.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#D4AF37", color: "#0A2342" }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(ticket.purchase_date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.ticket_number)}`;

  const statusColor =
    ticket.payment_status === "paid" || ticket.payment_status === "confirmed"
      ? "#22c55e"
      : ticket.payment_status === "pending"
      ? "#eab308"
      : "#ef4444";

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
        style={{ backgroundColor: "#0A2342", fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-[0.25em] mb-2" style={{ color: "#D4AF37" }}>
            CSA GALA DINNER 2026
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#D4AF37" }}>
            Your Ticket
          </h1>
        </div>

        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: "#ffffff", border: "3px solid #D4AF37" }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: "#D4AF37" }}>
            <div>
              <p className="text-xs font-bold tracking-widest" style={{ color: "#0A2342" }}>CSA GALA DINNER</p>
              <p className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#0A2342" }}>ADMIT ONE</p>
            </div>
            <div className="text-right text-xs font-bold" style={{ color: "#0A2342" }}>
              <div>UTALII HOTEL</div>
              <div>5TH JUNE 2026</div>
              <div>7:00 PM</div>
            </div>
          </div>

          <div className="border-t-2 border-dashed mx-6" style={{ borderColor: "#D4AF37" }} />

          <div className="px-6 py-6 space-y-5">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: "#0A2342", opacity: 0.5 }}>TICKET NUMBER</p>
              <p className="text-2xl font-black tracking-wider" style={{ color: "#0A2342", fontFamily: "'Playfair Display', serif" }}>
                #{ticket.ticket_number}
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: "NAME", value: ticket.purchaser_name },
                { label: "EMAIL", value: ticket.purchaser_email },
                { label: "PHONE", value: ticket.purchaser_phone },
                { label: "AMOUNT", value: `KES ${Number(ticket.total_amount).toLocaleString()}` },
                { label: "PURCHASED", value: formattedDate },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "#D4AF3730" }}>
                  <span className="text-xs font-bold tracking-widest" style={{ color: "#0A2342", opacity: 0.45 }}>{label}</span>
                  <span className="text-sm font-semibold text-right max-w-[60%] truncate" style={{ color: "#0A2342" }} title={value}>{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest" style={{ color: "#0A2342", opacity: 0.45 }}>STATUS</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full capitalize" style={{ backgroundColor: statusColor + "20", color: statusColor }}>
                  {ticket.payment_status}
                </span>
              </div>
            </div>

            <div className="border-t-2 border-dashed" style={{ borderColor: "#D4AF37" }} />

            <div className="flex flex-col items-center gap-2 pt-1">
              <img src={qrUrl} alt={`QR code for ticket ${ticket.ticket_number}`} width={160} height={160} className="rounded-lg" style={{ border: "2px solid #D4AF3740" }} />
              <p className="text-xs font-bold tracking-[0.2em]" style={{ color: "#0A2342", opacity: 0.4 }}>SCAN FOR ENTRY VERIFICATION</p>
            </div>
          </div>

          <div className="px-6 py-3 text-center" style={{ backgroundColor: "#0A2342" }}>
            <p className="text-xs font-semibold tracking-[0.2em]" style={{ color: "#D4AF37" }}>POOLING CONSTRUCTION STUDENTS TOGETHER</p>
          </div>
        </div>

        <button onClick={() => navigate("/")} className="mt-8 text-sm font-semibold transition-opacity hover:opacity-70" style={{ color: "#D4AF37" }}>
          ← Back to Home
        </button>
      </div>
    </>
  );
};

export default TicketPage;
