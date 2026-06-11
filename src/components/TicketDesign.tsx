import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import csaLogo from "@/assets/white_logo.jpg";

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
  venue:      "KingFisher Nest Hotel",
  event_date: "2026-06-12T18:30:00",
  end_time:   "23:00",
};

function formatDateParts(dateStr: string | null | undefined) {
  if (!dateStr) return { weekday: "FRIDAY", day: "12", suffix: "TH", month: "JUNE", year: "2026" };
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const suffixes: Record<number, string> = { 1:"ST",2:"ND",3:"RD",21:"ST",22:"ND",23:"RD",31:"ST" };
    return {
      weekday: d.toLocaleString("en", { weekday: "long" }).toUpperCase(),
      day:     day.toString(),
      suffix:  suffixes[day] || "TH",
      month:   d.toLocaleString("en", { month: "long" }).toUpperCase(),
      year:    d.getFullYear().toString(),
    };
  } catch {
    return { weekday: "FRIDAY", day: "12", suffix: "TH", month: "JUNE", year: "2026" };
  }
}

function formatTimeRange(dateStr: string | null | undefined, endTime?: string | null) {
  if (!dateStr) return "6:30 PM – 11:00 PM";
  try {
    const d = new Date(dateStr);
    const startH = d.getHours();
    const startM = d.getMinutes();
    const startAmPm = startH >= 12 ? "PM" : "AM";
    const start12 = startH > 12 ? startH - 12 : startH === 0 ? 12 : startH;
    const startStr = `${start12}:${startM.toString().padStart(2,"0")} ${startAmPm}`;
    if (endTime) {
      const [h, m] = endTime.split(":").map(Number);
      const endAmPm = h >= 12 ? "PM" : "AM";
      const end12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const endStr = `${end12}:${(m||0).toString().padStart(2,"0")} ${endAmPm}`;
      return `${startStr} – ${endStr}`;
    }
    return startStr;
  } catch {
    return "6:30 PM – 11:00 PM";
  }
}

export default function TicketDesign({ ticket }: TicketProps) {
  const [event, setEvent] = useState<EventData>({
    title:      ticket.event_title    || DEFAULT_EVENT.title,
    theme:      ticket.event_theme    || DEFAULT_EVENT.theme,
    venue:      ticket.event_venue    || DEFAULT_EVENT.venue,
    event_date: ticket.event_date     || DEFAULT_EVENT.event_date,
    end_time:   ticket.event_end_time || DEFAULT_EVENT.end_time,
  });
  const [qrDataUrl, setQrDataUrl]     = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Fetch live event data from Supabase
  useEffect(() => {
    async function fetchEvent() {
      let ev = null;
      if (ticket.event_id) {
        const { data } = await supabase.from("events")
          .select("title,theme,venue,event_date,end_time")
          .eq("id", ticket.event_id).maybeSingle();
        ev = data;
      }
      if (!ev) {
        const { data } = await supabase.from("events")
          .select("title,theme,venue,event_date,end_time")
          .eq("status","published").order("event_date",{ascending:true}).limit(1).maybeSingle();
        ev = data;
      }
      if (!ev) {
        const { data } = await supabase.from("events")
          .select("title,theme,venue,event_date,end_time")
          .order("created_at",{ascending:false}).limit(1).maybeSingle();
        ev = data;
      }
      if (ev) setEvent(ev);
    }
    fetchEvent();
  }, [ticket.event_id]);

  // Generate real QR code
  useEffect(() => {
    const val = ticket.qr_code || ticket.booking_code || ticket.ticket_number;
    QRCode.toDataURL(val, { width: 180, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [ticket.qr_code, ticket.booking_code, ticket.ticket_number]);

  const date    = formatDateParts(event.event_date);
  const timeStr = formatTimeRange(event.event_date, event.end_time);
  const isPaid  = ticket.payment_status === "paid" || ticket.payment_status === "verified";

  async function handleDownload() {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(ticketRef.current, { scale: 3, useCORS: true, backgroundColor: null });
      const a = document.createElement("a");
      a.download = `CSA-Ticket-${ticket.booking_code}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (e) { console.error(e); }
    finally { setDownloading(false); }
  }

  const GOLD  = "#c8a84b";
  const DARK  = "#1a1a2e";
  const CREAM = "#f5f0e8";

  const IconCircle = ({ type }: { type: string }) => {
    const s = { width:14, height:14, stroke:GOLD, fill:"none", strokeWidth:2, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
    return (
      <div style={{ width:28, height:28, borderRadius:"50%", border:`1.5px solid ${GOLD}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {type === "person"  && <svg style={s} viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
        {type === "tag"     && <svg style={s} viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}
        {type === "ticket"  && <svg style={s} viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>}
        {type === "check"   && <svg style={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>}
        {type === "amount"  && <svg style={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:24, width:"100%" }}>

      {/* ── TICKET ── */}
      <div ref={ticketRef} style={{
        display:"flex", width:"100%", maxWidth:900,
        borderRadius:12, overflow:"hidden",
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
        fontFamily:"'Roboto',Arial,sans-serif",
      }}>

        {/* ════ LEFT PANEL ════ */}
        <div style={{ flex:"1.4", position:"relative", overflow:"hidden", background:"#111", minWidth:0 }}>
          {/* BG photo */}
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:"url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80')",
            backgroundSize:"cover", backgroundPosition:"center",
            filter:"brightness(0.30) saturate(0.55)",
          }}/>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,rgba(10,10,20,0.85) 0%,rgba(10,10,20,0.4) 100%)" }}/>

          <div style={{ position:"relative", zIndex:2, padding:"24px 26px 20px", height:"100%", display:"flex", flexDirection:"column" }}>

            {/* ── Logo + GALA DINNER title ── */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
              {/* Real CSA logo */}
              <div style={{ width:68, height:68, borderRadius:"50%", overflow:"hidden", border:`2.5px solid ${GOLD}`, flexShrink:0, background:"#fff" }}>
                <img src={csaLogo} alt="CSA Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              </div>
              {/* GALA / DINNER 2026 */}
              <div>
                <div style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:48, fontWeight:900, color:GOLD, lineHeight:1, letterSpacing:2 }}>GALA</div>
                <div style={{ fontFamily:"'Arial Narrow',Arial,sans-serif", fontSize:38, fontWeight:700, color:"#fff", lineHeight:1, letterSpacing:4 }}>DINNER 2026</div>
              </div>
            </div>

            {/* Tagline */}
            <div style={{ fontSize:10, fontWeight:600, color:GOLD, letterSpacing:3.5, textTransform:"uppercase", marginBottom:14 }}>
              Awards · Networking · Entertainment
            </div>

            {/* ── Date + Time/Venue ── */}
            <div style={{ display:"flex", gap:24, alignItems:"flex-start", marginBottom:14 }}>
              {/* Date */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:2, textTransform:"uppercase", marginBottom:2 }}>{date.weekday}</div>
                <div style={{ fontFamily:"'Arial Narrow',Arial,sans-serif", fontSize:54, fontWeight:700, color:"#fff", lineHeight:1 }}>
                  {date.day}<sup style={{ fontSize:20, color:GOLD, verticalAlign:"super", fontWeight:400 }}>{date.suffix}</sup>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:1, lineHeight:1.3 }}>{date.month}<br/>{date.year}</div>
              </div>
              {/* Time + Venue */}
              <div style={{ display:"flex", flexDirection:"column", gap:10, paddingTop:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span style={{ fontSize:11, color:"#e0d8c8", fontWeight:500, textTransform:"uppercase", letterSpacing:1 }}>{timeStr}</span>
                </div>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" style={{ marginTop:1, flexShrink:0 }}>
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span style={{ fontSize:11, color:"#e0d8c8", fontWeight:500, textTransform:"uppercase", letterSpacing:1, lineHeight:1.4 }}>
                    {(event.venue || DEFAULT_EVENT.venue).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Theme box ── */}
            <div style={{ border:`1px solid rgba(200,168,75,0.5)`, borderRadius:4, padding:"9px 13px", marginBottom:16, background:"rgba(200,168,75,0.07)" }}>
              <span style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:2, textTransform:"uppercase" }}>Theme: </span>
              <span style={{ fontSize:11, color:"#e8e0cc", lineHeight:1.5, fontStyle:"italic" }}>
                {event.theme || DEFAULT_EVENT.theme}
              </span>
            </div>

            {/* ── Ticket Type label ── */}
            <div style={{ fontSize:9.5, fontWeight:700, color:GOLD, letterSpacing:2.5, textTransform:"uppercase", marginBottom:7 }}>Ticket Type</div>

            {/* ── Gold ticket type badge ── */}
            <div style={{
              background:GOLD, color:DARK,
              display:"flex", alignItems:"center", justifyContent:"center", gap:16,
              padding:"11px 20px", borderRadius:5,
              fontFamily:"'Arial Narrow',Arial,sans-serif",
              fontSize:22, fontWeight:700, letterSpacing:5, textTransform:"uppercase",
              marginBottom:16,
            }}>
              <span style={{ fontSize:18 }}>★</span>
              {ticket.type_name}
              <span style={{ fontSize:18 }}>★</span>
            </div>

            {/* ── Bottom row ── */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:`1px solid rgba(200,168,75,0.3)`, paddingTop:12, marginTop:"auto", gap:8, flexWrap:"wrap" }}>
              <div style={{ border:`1px solid rgba(200,168,75,0.55)`, padding:"7px 14px", borderRadius:4, fontSize:11, fontWeight:700, color:GOLD, letterSpacing:1, textTransform:"uppercase", background:"rgba(200,168,75,0.08)" }}>
                Ticket No. {ticket.ticket_number}
              </div>
              <div style={{ fontFamily:"cursive", fontSize:16, color:GOLD, fontStyle:"italic" }}>
                Pooling Construction Students Together!
              </div>
            </div>

          </div>
        </div>

        {/* ════ PERFORATION ════ */}
        <div style={{ width:18, background:"#0d0d1f", display:"flex", flexDirection:"column", justifyContent:"space-between", alignItems:"center", padding:"16px 0", zIndex:3 }}>
          <div style={{ width:14, height:14, background:"#0d0d1f", borderRadius:"50%" }}/>
          <div style={{ flex:1, borderLeft:`2px dashed rgba(200,168,75,0.35)`, margin:"0 auto" }}/>
          <div style={{ width:14, height:14, background:"#0d0d1f", borderRadius:"50%" }}/>
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div style={{ width:240, flexShrink:0, background:CREAM, display:"flex" }}>
          <div style={{ flex:1, padding:"20px 16px 16px", display:"flex", flexDirection:"column" }}>

            {/* ★ ADMIT ★ */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:12 }}>
              <span style={{ color:GOLD, fontSize:16 }}>★</span>
              <span style={{ fontFamily:"'Arial Narrow',Arial,sans-serif", fontSize:23, fontWeight:700, color:DARK, letterSpacing:4, textTransform:"uppercase" }}>ADMIT</span>
              <span style={{ color:GOLD, fontSize:16 }}>★</span>
            </div>
            <div style={{ height:1, background:"rgba(26,26,46,0.15)", marginBottom:14 }}/>

            {/* Detail rows */}
            {[
              { icon:"person", label:"NAME",         value: ticket.purchaser_name },
              { icon:"tag",    label:"BOOKING CODE", value: ticket.booking_code },
              { icon:"ticket", label:"TICKET TYPE",  value: ticket.type_name },
              { icon:"check",  label:"STATUS",       value: isPaid ? "PAID" : (ticket.payment_status||"PENDING").toUpperCase() },
              { icon:"amount", label:"AMOUNT",       value: `KSH ${Number(ticket.total_amount||0).toLocaleString()}` },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid rgba(26,26,46,0.08)`, padding:"7px 0", gap:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <IconCircle type={icon}/>
                  <span style={{ fontSize:9, fontWeight:700, color:GOLD, letterSpacing:1.5, textTransform:"uppercase" }}>{label}</span>
                </div>
                <span style={{ fontSize:11.5, fontWeight:700, color:DARK, textAlign:"right", wordBreak:"break-all", maxWidth:95 }}>{value}</span>
              </div>
            ))}

            {/* QR code */}
            <div style={{ marginTop:"auto", paddingTop:14, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
              <div style={{ width:100, height:100, background:"#fff", border:"1px solid rgba(26,26,46,0.12)", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", padding:4 }}>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR Code" width={92} height={92}/>
                  : <span style={{ fontSize:9, color:DARK }}>Loading…</span>
                }
              </div>
              <div style={{ fontSize:9, fontWeight:700, color:DARK, textAlign:"center", letterSpacing:1, textTransform:"uppercase", lineHeight:1.5 }}>
                !! SCAN QR<br/>FOR ENTRY<br/>VERIFICATION
              </div>
            </div>

          </div>

          {/* ── Gold side tab ── */}
          <div style={{ width:28, background:GOLD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontFamily:"sans-serif", fontSize:8.5, fontWeight:700, color:DARK, letterSpacing:2.5, textTransform:"uppercase", writingMode:"vertical-rl", transform:"rotate(180deg)" }}>
              Annual CSA Gala Dinner
            </span>
          </div>
        </div>

      </div>

      {/* ── Download button ── */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        style={{ background:`linear-gradient(135deg,${GOLD},#9a7415)`, color:DARK, boxShadow:`0 4px 20px rgba(200,168,75,0.4)` }}
      >
        {downloading ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
        {downloading ? "Generating…" : "Download Ticket"}
      </button>
    </div>
  );
}
