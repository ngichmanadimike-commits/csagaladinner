import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2 } from "lucide-react";
import QRCode from "qrcode";

interface TicketProps {
  ticket: {
    ticket_number: string;
    purchaser_name: string;
    booking_code: string;
    type_name: string;
    total_amount: number;
    payment_status: string;
    purchase_date: string;
    qr_code: string;
    quantity: number;
    email: string;
    phone: string;
    event_id?: string | null;
    event_title?: string;
    event_theme?: string;
    event_venue?: string;
    event_date?: string | null;
    event_end_time?: string | null;
    event_description?: string;
  };
}

interface EventData {
  title: string;
  theme: string;
  venue: string;
  event_date: string | null;
  end_time: string | null;
}

const DEFAULT_EVENT: EventData = {
  title:      "CSA Gala Dinner 2026",
  theme:      "Laying the First Stone: Honoring the Past, Empowering the Present and Inspiring the Future of Construction",
  venue:      "KingFisher Nest Hotel, Westlands, Nairobi",
  event_date: "2026-06-12T18:30:00",
  end_time:   "23:00",
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return { day: "12", month: "JUNE", year: "2026", weekday: "FRIDAY" };
  try {
    const d = new Date(dateStr);
    return {
      day:     d.getDate().toString(),
      month:   d.toLocaleString("en", { month: "long" }).toUpperCase(),
      year:    d.getFullYear().toString(),
      weekday: d.toLocaleString("en", { weekday: "long" }).toUpperCase(),
    };
  } catch {
    return { day: "12", month: "JUNE", year: "2026", weekday: "FRIDAY" };
  }
}

function formatTime(dateStr: string | null | undefined, endTime?: string | null) {
  if (!dateStr) return "6:30 PM – 11:00 PM";
  try {
    const d = new Date(dateStr);
    const start = d.toLocaleString("en", { hour: "numeric", minute: "2-digit", hour12: true });
    if (endTime) {
      const [h, m] = endTime.split(":").map(Number);
      const end = new Date(d);
      end.setHours(h, m);
      const endStr = end.toLocaleString("en", { hour: "numeric", minute: "2-digit", hour12: true });
      return `${start} – ${endStr}`;
    }
    return start;
  } catch {
    return "6:30 PM – 11:00 PM";
  }
}

export default function TicketDesign({ ticket }: TicketProps) {
  const [event, setEvent]     = useState<EventData>({
    title:      ticket.event_title      || DEFAULT_EVENT.title,
    theme:      ticket.event_theme      || DEFAULT_EVENT.theme,
    venue:      ticket.event_venue      || DEFAULT_EVENT.venue,
    event_date: ticket.event_date       || DEFAULT_EVENT.event_date,
    end_time:   ticket.event_end_time   || DEFAULT_EVENT.end_time,
  });
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Fetch live event data from Supabase
  useEffect(() => {
    async function fetchEvent() {
      let ev = null;
      if (ticket.event_id) {
        const { data } = await supabase
          .from("events")
          .select("title, theme, venue, event_date, end_time")
          .eq("id", ticket.event_id)
          .maybeSingle();
        ev = data;
      }
      if (!ev) {
        const { data } = await supabase
          .from("events")
          .select("title, theme, venue, event_date, end_time")
          .eq("status", "published")
          .order("event_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        ev = data;
      }
      if (ev) setEvent(ev);
    }
    fetchEvent();
  }, [ticket.event_id]);

  // Generate QR code
  useEffect(() => {
    const qrValue = ticket.qr_code || ticket.booking_code || ticket.ticket_number;
    QRCode.toDataURL(qrValue, {
      width: 160,
      margin: 1,
      color: { dark: "#1a1a2e", light: "#f5f0e8" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [ticket.qr_code, ticket.booking_code, ticket.ticket_number]);

  const dateInfo = formatDate(event.event_date);
  const timeStr  = formatTime(event.event_date, event.end_time);
  const isPaid   = ticket.payment_status === "paid" || ticket.payment_status === "verified";

  async function handleDownload() {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `CSA-Ticket-${ticket.booking_code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setDownloading(false);
    }
  }

  const gold   = "#c8a84b";
  const dark   = "#1a1a2e";
  const cream  = "#f5f0e8";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Ticket */}
      <div
        ref={ticketRef}
        style={{
          display: "flex",
          width: "100%",
          maxWidth: 860,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        {/* ── LEFT PANEL ── */}
        <div style={{ flex: "1.4", position: "relative", overflow: "hidden", background: "#111", minWidth: 0 }}>
          {/* Background image */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80')",
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "brightness(0.35) saturate(0.7)",
          }}/>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(10,10,20,0.75) 0%,rgba(10,10,20,0.3) 100%)" }}/>

          <div style={{ position: "relative", zIndex: 2, padding: "26px 26px 22px", height: "100%", display: "flex", flexDirection: "column" }}>

            {/* Logo + Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff", border: `2px solid ${gold}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" width="52" height="52">
                  <circle cx="50" cy="50" r="48" fill={dark} stroke={gold} strokeWidth="3"/>
                  <circle cx="50" cy="50" r="38" fill="none" stroke={gold} strokeWidth="1.5"/>
                  <rect x="30" y="38" width="40" height="28" rx="1" fill="none" stroke={gold} strokeWidth="2"/>
                  <rect x="36" y="44" width="6" height="8" fill={gold}/>
                  <rect x="47" y="44" width="6" height="8" fill={gold}/>
                  <rect x="58" y="44" width="6" height="8" fill={gold}/>
                  <rect x="43" y="55" width="14" height="11" fill={gold}/>
                  <line x1="50" x2="50" y1="25" y2="38" stroke={gold} strokeWidth="2"/>
                  <line x1="38" x2="62" y1="25" y2="25" stroke={gold} strokeWidth="2"/>
                  <line x1="62" x2="62" y1="25" y2="34" stroke={gold} strokeWidth="1.5"/>
                  <text x="50" y="78" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fontWeight="700" fill={gold} letterSpacing="2">CSA</text>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "serif", fontSize: 38, fontWeight: 900, color: gold, lineHeight: 1, letterSpacing: 2 }}>GALA</div>
                <div style={{ fontFamily: "sans-serif", fontSize: 34, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: 3 }}>DINNER 2026</div>
              </div>
            </div>

            {/* Tagline */}
            <div style={{ fontSize: 9.5, fontWeight: 600, color: gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
              Awards · Networking · Entertainment
            </div>

            {/* Theme */}
            <div style={{ border: `1px solid rgba(200,168,75,0.45)`, borderRadius: 4, padding: "9px 13px", marginBottom: 18, background: "rgba(200,168,75,0.07)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>Theme:</div>
              <div style={{ fontSize: 11, color: "#e8e0cc", lineHeight: 1.5, fontStyle: "italic" }}>{event.theme || DEFAULT_EVENT.theme}</div>
            </div>

            {/* Date + Info */}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2" strokeLinecap="round" style={{ marginTop: 4 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: gold, letterSpacing: 2, textTransform: "uppercase" }}>{dateInfo.weekday}</div>
                  <div style={{ fontFamily: "sans-serif", fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                    {dateInfo.day}<sup style={{ fontSize: 16, color: gold, verticalAlign: "super" }}>TH</sup>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 1 }}>{dateInfo.month}<br/>{dateInfo.year}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "center", paddingTop: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <div style={{ fontSize: 10.5, color: "#e0d8c8", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1, lineHeight: 1.4 }}>{timeStr}</div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <div style={{ fontSize: 10.5, color: "#e0d8c8", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1, lineHeight: 1.4 }}>{event.venue || DEFAULT_EVENT.venue}</div>
                </div>
              </div>
            </div>

            {/* Ticket type badge */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Ticket Type</div>
              <div style={{ background: gold, color: "#111", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "10px 18px", borderRadius: 4, fontFamily: "sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
                <span>★</span> {ticket.type_name} <span>★</span>
              </div>
            </div>

            {/* Bottom row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid rgba(200,168,75,0.3)`, paddingTop: 12, marginTop: "auto", flexWrap: "wrap", gap: 8 }}>
              <div style={{ border: `1px solid rgba(200,168,75,0.5)`, padding: "6px 13px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, color: gold, letterSpacing: 1, textTransform: "uppercase", background: "rgba(200,168,75,0.08)" }}>
                Ticket No. {ticket.ticket_number}
              </div>
              <div style={{ fontFamily: "cursive", fontSize: 15, color: gold, fontStyle: "italic" }}>
                Pooling Construction Students Together!
              </div>
            </div>
          </div>
        </div>

        {/* ── PERFORATION ── */}
        <div style={{ width: 20, background: "#0d0d1f", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "16px 0", position: "relative", zIndex: 3 }}>
          <div style={{ width: 14, height: 14, background: "#0d0d1f", borderRadius: "50%", flexShrink: 0 }}/>
          <div style={{ flex: 1, borderLeft: `2px dashed rgba(200,168,75,0.3)`, margin: "0 auto" }}/>
          <div style={{ width: 14, height: 14, background: "#0d0d1f", borderRadius: "50%", flexShrink: 0 }}/>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width: 230, flexShrink: 0, background: cream, display: "flex" }}>
          <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column" }}>

            {/* ADMIT header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ color: gold, fontSize: 13 }}>★</span>
              <span style={{ fontFamily: "sans-serif", fontSize: 19, fontWeight: 700, color: dark, letterSpacing: 3, textTransform: "uppercase" }}>ADMIT</span>
              <span style={{ color: gold, fontSize: 13 }}>★</span>
            </div>
            <div style={{ height: 1, background: "rgba(26,26,46,0.15)", marginBottom: 13 }}/>

            {/* Details */}
            {[
              { icon: "person", label: "Name",         value: ticket.purchaser_name },
              { icon: "code",   label: "Booking Code", value: ticket.booking_code },
              { icon: "ticket", label: "Ticket Type",  value: ticket.type_name },
              { icon: "status", label: "Status",       value: isPaid ? "PAID ✓" : (ticket.payment_status || "PENDING").toUpperCase() },
              { icon: "amount", label: "Amount",       value: `KES ${Number(ticket.total_amount || 0).toLocaleString()}` },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${gold}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {icon === "person" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
                  {icon === "code"   && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8l9 6 9-6"/></svg>}
                  {icon === "ticket" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>}
                  {icon === "status" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>}
                  {icon === "amount" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: dark, letterSpacing: 0.4, wordBreak: "break-all" }}>{value}</div>
                </div>
              </div>
            ))}

            {/* QR Code */}
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <div style={{ width: 92, height: 92, background: "#fff", border: "1px solid rgba(26,26,46,0.15)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR Code" width={84} height={84}/>
                  : <div style={{ fontSize: 8, color: dark, textAlign: "center" }}>Loading QR…</div>
                }
              </div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: dark, textAlign: "center", letterSpacing: 1, textTransform: "uppercase", lineHeight: 1.4 }}>
                SCAN QR<br/>FOR ENTRY VERIFICATION
              </div>
            </div>
          </div>

          {/* Side tab */}
          <div style={{ width: 26, background: gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "sans-serif", fontSize: 8, fontWeight: 700, color: dark, letterSpacing: 2.5, textTransform: "uppercase", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              Annual CSA Gala Dinner
            </span>
          </div>
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        style={{ background: `linear-gradient(135deg, ${gold}, #9a7415)`, color: dark, boxShadow: `0 4px 20px rgba(200,168,75,0.35)` }}
      >
        {downloading ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
        {downloading ? "Generating…" : "Download Ticket"}
      </button>
    </div>
  );
}
