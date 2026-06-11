import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import QRCode from "qrcode";
import csaLogo from "@/assets/white_logo.jpg";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   DEFAULTS  (only used when Supabase returns nothing)
───────────────────────────────────────────── */
const DEFAULT_EVENT: EventData = {
  title:      "CSA Gala Dinner 2026",
  theme:      "Laying the First Stone: Honoring the Past, Empowering the Present and Inspiring the Future of Construction",
  venue:      "KingFisher Nest Hotel",
  event_date: "2026-06-12T18:30:00",
  end_time:   "23:00",
};

/* ─────────────────────────────────────────────
   SAFE ISO SLICE — never touches Date(), so EAT
   timezone corruption is impossible.
   "2026-06-12T18:30:00"  →  { day:"12", … }
───────────────────────────────────────────── */
const WEEKDAYS = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
const MONTHS   = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const SUFFIX: Record<number,string> = {1:"ST",2:"ND",3:"RD",21:"ST",22:"ND",23:"RD",31:"ST"};

function parseDateParts(iso: string | null | undefined) {
  const fallback = { weekday:"FRIDAY", day:"12", suffix:"TH", month:"JUNE", year:"2026" };
  if (!iso) return fallback;
  try {
    // Slice: "2026-06-12T18:30:00" → year=2026, month=6, day=12
    const [datePart] = iso.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    // Day-of-week without timezone: build a UTC noon date so no DST shift
    const dow = new Date(Date.UTC(y, m - 1, d, 12)).getDay();
    return {
      weekday: WEEKDAYS[dow],
      day:     d.toString(),
      suffix:  SUFFIX[d] || "TH",
      month:   MONTHS[m - 1],
      year:    y.toString(),
    };
  } catch { return fallback; }
}

function parseTimeRange(iso: string | null | undefined, endTime?: string | null): string {
  if (!iso) return "6:30 PM – 11:00 PM";
  try {
    const timePart = iso.includes("T") ? iso.split("T")[1] : iso;
    const [sh, sm] = timePart.split(":").map(Number);
    const sAmPm = sh >= 12 ? "PM" : "AM";
    const s12   = sh > 12 ? sh - 12 : sh === 0 ? 12 : sh;
    const start = `${s12}:${sm.toString().padStart(2,"0")} ${sAmPm}`;
    if (endTime) {
      const [eh, em] = endTime.split(":").map(Number);
      const eAmPm = eh >= 12 ? "PM" : "AM";
      const e12   = eh > 12 ? eh - 12 : eh === 0 ? 12 : eh;
      const end   = `${e12}:${(em||0).toString().padStart(2,"0")} ${eAmPm}`;
      return `${start} – ${end}`;
    }
    return start;
  } catch { return "6:30 PM – 11:00 PM"; }
}

/* ─────────────────────────────────────────────
   ICON CIRCLES  (gold ring, SVG inside)
───────────────────────────────────────────── */
const GOLD = "#C8A84B";
const DARK = "#1A1A2E";
const CREAM = "#F5F0E8";

function IconCircle({ type }: { type: string }) {
  const s = { width:13, height:13, stroke:GOLD, fill:"none", strokeWidth:2,
              strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  return (
    <div style={{
      width:26, height:26, borderRadius:"50%",
      border:`1.5px solid ${GOLD}`,
      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
    }}>
      {type === "person" && (
        <svg style={s} viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      )}
      {type === "tag" && (
        <svg style={s} viewBox="0 0 24 24">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      )}
      {type === "ticket" && (
        <svg style={s} viewBox="0 0 24 24">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
        </svg>
      )}
      {type === "check" && (
        <svg style={s} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      )}
      {type === "amount" && (
        <svg style={s} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CANVAS DOWNLOAD  (no html2canvas)
───────────────────────────────────────────── */
async function downloadTicketCanvas(
  ticket: TicketProps["ticket"],
  event: EventData,
  qrDataUrl: string,
  logoSrc: string,
) {
  const W = 900, H = 360;
  const canvas = document.createElement("canvas");
  canvas.width  = W * 3;
  canvas.height = H * 3;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(3, 3);

  const LEFT_W  = 560;
  const PERF_W  = 18;
  const RIGHT_W = 240;
  const GOLD_TAB = 28;

  /* helpers */
  function rect(x:number,y:number,w:number,h:number,r=0,fill:string) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,r);
    ctx.fill();
  }
  function text(t:string,x:number,y:number,font:string,fill:string,align:"left"|"center"|"right"="left") {
    ctx.fillStyle = fill;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillText(t,x,y);
  }

  /* ── background ── */
  rect(0,0,W,H,12,"#111");

  /* ── LEFT BG photo ── */
  const bgImg = new Image();
  bgImg.crossOrigin = "anonymous";
  await new Promise<void>(res => {
    bgImg.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0,0,LEFT_W+PERF_W,H,12);
      ctx.clip();
      ctx.globalAlpha = 0.28;
      ctx.drawImage(bgImg,0,0,LEFT_W+PERF_W,H);
      ctx.globalAlpha = 1;
      ctx.restore();
      res();
    };
    bgImg.onerror = () => res();
    bgImg.src = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80";
  });
  /* dark overlay */
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0,0,LEFT_W+PERF_W,H,12);
  ctx.clip();
  const grad = ctx.createLinearGradient(0,0,LEFT_W,H);
  grad.addColorStop(0,"rgba(10,10,20,0.88)");
  grad.addColorStop(1,"rgba(10,10,20,0.45)");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  /* ── CSA Logo ── */
  const logo = new Image();
  logo.crossOrigin = "anonymous";
  await new Promise<void>(res => {
    logo.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(50,50,32,0,Math.PI*2);
      ctx.clip();
      ctx.drawImage(logo,18,18,64,64);
      ctx.restore();
      /* gold ring */
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(50,50,32,0,Math.PI*2); ctx.stroke();
      res();
    };
    logo.onerror = () => res();
    logo.src = logoSrc;
  });

  /* ── GALA / DINNER 2026 ── */
  text("GALA",100,62,"bold 52px Georgia",GOLD);
  text("DINNER 2026",100,95,"bold 36px 'Arial Narrow',Arial",  "#FFFFFF");

  /* tagline */
  text("AWARDS · NETWORKING · ENTERTAINMENT",24,118,"600 9px Arial",GOLD);

  /* ── calendar icon + FRIDAY ── */
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2;
  ctx.strokeRect(24,128,13,13);
  text("FRIDAY",42,139,"bold 9px Arial",GOLD);

  /* date */
  text("12",24,190,"bold 58px 'Arial Narrow',Arial","#FFFFFF");
  text("TH",80,155,"400 16px Arial",GOLD);

  /* JUNE / 2026 */
  text("JUNE",24,205,"bold 12px Arial","#FFFFFF");
  text("2026",24,220,"bold 12px Arial","#FFFFFF");

  /* ── clock icon + time ── */
  const date = parseDateParts(event.event_date);
  const timeStr = parseTimeRange(event.event_date, event.end_time);

  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(128,145,7,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(128,138); ctx.lineTo(128,145); ctx.lineTo(133,148); ctx.stroke();
  text(timeStr,140,148,"500 10px Arial","#E0D8C8");

  /* pin icon + venue */
  ctx.beginPath(); ctx.arc(128,167,6,0,Math.PI*2*0.8); ctx.stroke();
  text((event.venue||DEFAULT_EVENT.venue).toUpperCase(),140,170,"500 10px Arial","#E0D8C8");

  /* ── Theme box ── */
  ctx.strokeStyle = "rgba(200,168,75,0.5)"; ctx.lineWidth = 1;
  ctx.strokeRect(24,232,LEFT_W-50,38);
  ctx.fillStyle = "rgba(200,168,75,0.07)";
  ctx.fillRect(24,232,LEFT_W-50,38);
  text("THEME: ",28,247,"bold 9px Arial",GOLD);
  /* wrap theme text */
  ctx.fillStyle = "#E8E0CC"; ctx.font = "italic 10px Arial";
  const theme = event.theme || DEFAULT_EVENT.theme;
  const words = theme.split(" ");
  let line = ""; let ty = 247;
  const maxW = LEFT_W - 80;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, 75, ty); line = w + " "; ty += 13;
    } else { line = test; }
  }
  ctx.fillText(line, 75, ty);

  /* ── TICKET TYPE label ── */
  text("TICKET TYPE",24,284,"bold 9px Arial",GOLD);

  /* gold badge */
  rect(24,290,LEFT_W-50,28,4,GOLD);
  text(`★  ${ticket.type_name}  ★`,LEFT_W/2 - 20,309,"bold 20px 'Arial Narrow',Arial",DARK,"center");

  /* ── bottom row ── */
  ctx.strokeStyle = "rgba(200,168,75,0.3)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(24,328); ctx.lineTo(LEFT_W-26,328); ctx.stroke();
  /* ticket number box */
  ctx.strokeStyle = "rgba(200,168,75,0.55)"; ctx.lineWidth = 1;
  ctx.strokeRect(24,334,170,20);
  ctx.fillStyle = "rgba(200,168,75,0.08)";
  ctx.fillRect(24,334,170,20);
  text(`Ticket No. ${ticket.ticket_number}`,108,348,"bold 10px Arial",GOLD,"center");
  /* cursive tagline */
  text("Pooling Construction Students Together!",210,348,"italic 14px cursive","#C8A84B");

  /* ── PERFORATION ── */
  rect(LEFT_W,0,PERF_W,H,0,"#0D0D1F");
  ctx.strokeStyle = "rgba(200,168,75,0.35)"; ctx.lineWidth = 1.5;
  ctx.setLineDash([5,4]);
  ctx.beginPath(); ctx.moveTo(LEFT_W+9,14); ctx.lineTo(LEFT_W+9,H-14); ctx.stroke();
  ctx.setLineDash([]);

  /* ── RIGHT PANEL ── */
  const RX = LEFT_W + PERF_W;
  rect(RX,0,RIGHT_W,H,0,CREAM);

  /* ★ ADMIT ★ */
  text("★  ADMIT  ★",RX + (RIGHT_W - GOLD_TAB)/2, 30,"bold 20px 'Arial Narrow',Arial",DARK,"center");
  ctx.strokeStyle = "rgba(26,26,46,0.18)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(RX+10,40); ctx.lineTo(RX+RIGHT_W-GOLD_TAB-10,40); ctx.stroke();

  /* detail rows */
  const rows = [
    { icon:"person", label:"NAME",         val: ticket.purchaser_name },
    { icon:"tag",    label:"BOOKING CODE", val: ticket.booking_code },
    { icon:"ticket", label:"TICKET TYPE",  val: ticket.type_name },
    { icon:"check",  label:"STATUS",       val: ticket.payment_status === "paid" || ticket.payment_status === "verified" ? "PAID" : (ticket.payment_status||"PENDING").toUpperCase() },
    { icon:"amount", label:"AMOUNT",       val: `KSH ${Number(ticket.total_amount||0).toLocaleString()}` },
  ];
  let ry = 50;
  for (const row of rows) {
    /* gold circle */
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(RX+17, ry+7, 7, 0, Math.PI*2); ctx.stroke();
    /* label */
    text(row.label, RX+28, ry+11, "bold 8px Arial", GOLD);
    /* value */
    text(row.val, RX+RIGHT_W-GOLD_TAB-8, ry+11, "bold 10px Arial", DARK, "right");
    /* divider */
    ctx.strokeStyle = "rgba(26,26,46,0.1)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(RX+8,ry+20); ctx.lineTo(RX+RIGHT_W-GOLD_TAB-8,ry+20); ctx.stroke();
    ry += 28;
  }

  /* QR */
  if (qrDataUrl) {
    const qr = new Image();
    await new Promise<void>(res => {
      qr.onload = () => {
        const qx = RX + (RIGHT_W - GOLD_TAB)/2 - 46;
        ctx.fillStyle = "#fff";
        ctx.fillRect(qx-4, ry+2, 100, 100);
        ctx.drawImage(qr, qx, ry+6, 92, 92);
        res();
      };
      qr.onerror = () => res();
      qr.src = qrDataUrl;
    });
    ry += 104;
    text("!! SCAN QR FOR ENTRY",  RX + (RIGHT_W-GOLD_TAB)/2, ry,   "bold 8px Arial", DARK, "center");
    text("VERIFICATION",          RX + (RIGHT_W-GOLD_TAB)/2, ry+11,"bold 8px Arial", DARK, "center");
  }

  /* ── GOLD SIDE TAB ── */
  const TX = RX + RIGHT_W - GOLD_TAB;
  rect(TX,0,GOLD_TAB,H,0,GOLD);
  ctx.save();
  ctx.translate(TX + GOLD_TAB/2, H/2);
  ctx.rotate(-Math.PI/2);
  text("Annual CSA Gala Dinner", 0, 4, "bold 8px Arial", DARK, "center");
  ctx.restore();

  /* round outer corners */
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.roundRect(0,0,W,H,12);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  /* download */
  const a = document.createElement("a");
  a.download = `CSA-Ticket-${ticket.booking_code}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function TicketDesign({ ticket }: TicketProps) {
  const [event, setEvent] = useState<EventData>({
    title:      ticket.event_title    ?? DEFAULT_EVENT.title,
    theme:      ticket.event_theme    ?? DEFAULT_EVENT.theme,
    venue:      ticket.event_venue    ?? DEFAULT_EVENT.venue,
    event_date: ticket.event_date     ?? DEFAULT_EVENT.event_date,
    end_time:   ticket.event_end_time ?? DEFAULT_EVENT.end_time,
  });
  const [qrDataUrl, setQrDataUrl]     = useState("");
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  /* ── Live event fetch (same 3-step fallback chain) ── */
  useEffect(() => {
    async function fetchEvent() {
      let ev: EventData | null = null;
      if (ticket.event_id) {
        const { data } = await supabase
          .from("events")
          .select("title,theme,venue,event_date,end_time")
          .eq("id", ticket.event_id)
          .maybeSingle();
        ev = data;
      }
      if (!ev) {
        const { data } = await supabase
          .from("events")
          .select("title,theme,venue,event_date,end_time")
          .eq("status", "published")
          .order("event_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        ev = data;
      }
      if (!ev) {
        const { data } = await supabase
          .from("events")
          .select("title,theme,venue,event_date,end_time")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        ev = data;
      }
      if (ev) setEvent(ev);
    }
    fetchEvent();
  }, [ticket.event_id]);

  /* ── QR code ── */
  useEffect(() => {
    const val = ticket.qr_code || ticket.booking_code || ticket.ticket_number;
    QRCode.toDataURL(val, { width: 180, margin: 1, color: { dark:"#000000", light:"#ffffff" } })
      .then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [ticket.qr_code, ticket.booking_code, ticket.ticket_number]);

  const date    = parseDateParts(event.event_date);
  const timeStr = parseTimeRange(event.event_date, event.end_time);
  const isPaid  = ticket.payment_status === "paid" || ticket.payment_status === "verified";

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadTicketCanvas(ticket, event, qrDataUrl, csaLogo);
    } catch (e) { console.error(e); }
    finally { setDownloading(false); }
  }

  /* ── Detail rows for the right panel ── */
  const detailRows = [
    { icon:"person", label:"NAME",         value: ticket.purchaser_name },
    { icon:"tag",    label:"BOOKING CODE", value: ticket.booking_code },
    { icon:"ticket", label:"TICKET TYPE",  value: ticket.type_name },
    { icon:"check",  label:"STATUS",       value: isPaid ? "PAID" : (ticket.payment_status||"PENDING").toUpperCase() },
    { icon:"amount", label:"AMOUNT",       value: `KSH ${Number(ticket.total_amount||0).toLocaleString()}` },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, width:"100%" }}>

      {/* ══════════════ TICKET ══════════════ */}
      <div
        ref={ticketRef}
        style={{
          display: "flex",
          width: "100%",
          maxWidth: 900,
          height: 360,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
          fontFamily: "'Roboto',Arial,sans-serif",
        }}
      >

        {/* ════════ LEFT PANEL ════════ */}
        <div style={{ flex: "1 1 0", position:"relative", overflow:"hidden", background:"#111", minWidth:0 }}>

          {/* Background photo */}
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:"url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80')",
            backgroundSize:"cover", backgroundPosition:"center",
            filter:"brightness(0.28) saturate(0.5)",
          }}/>
          {/* Dark gradient overlay */}
          <div style={{
            position:"absolute", inset:0,
            background:"linear-gradient(160deg,rgba(10,10,20,0.9) 0%,rgba(10,10,20,0.45) 100%)",
          }}/>

          {/* Content */}
          <div style={{
            position:"relative", zIndex:2,
            padding:"20px 24px 16px",
            height:"100%",
            boxSizing:"border-box",
            display:"flex", flexDirection:"column",
          }}>

            {/* ── Row 1: Logo + GALA DINNER 2026 ── */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
              {/* Logo circle */}
              <div style={{
                width:68, height:68, borderRadius:"50%",
                overflow:"hidden", border:`2.5px solid ${GOLD}`,
                flexShrink:0, background:"#fff",
              }}>
                <img src={csaLogo} alt="CSA" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              </div>
              {/* Title block */}
              <div style={{ lineHeight:1 }}>
                <div style={{
                  fontFamily:"Georgia,'Times New Roman',serif",
                  fontSize:52, fontWeight:900,
                  color:GOLD, letterSpacing:2, lineHeight:1,
                }}>GALA</div>
                <div style={{
                  fontFamily:"'Arial Narrow',Arial,sans-serif",
                  fontSize:36, fontWeight:700,
                  color:"#FFFFFF", letterSpacing:4, lineHeight:1,
                }}>DINNER 2026</div>
              </div>
            </div>

            {/* ── Row 2: Tagline ── */}
            <div style={{
              fontSize:9, fontWeight:700, color:GOLD,
              letterSpacing:3.5, textTransform:"uppercase", marginBottom:10,
            }}>
              Awards · Networking · Entertainment
            </div>

            {/* ── Row 3: Date block + Time/Venue ── */}
            <div style={{ display:"flex", gap:28, alignItems:"flex-start", marginBottom:10 }}>

              {/* Date */}
              <div>
                {/* Calendar icon + weekday */}
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:2 }}>{date.weekday}</span>
                </div>
                {/* Big day number */}
                <div style={{ lineHeight:1, display:"flex", alignItems:"flex-start" }}>
                  <span style={{
                    fontFamily:"'Arial Narrow',Arial,sans-serif",
                    fontSize:62, fontWeight:700, color:"#FFFFFF", lineHeight:1,
                  }}>{date.day}</span>
                  <sup style={{ fontSize:16, color:GOLD, fontWeight:400, marginTop:8 }}>{date.suffix}</sup>
                </div>
                {/* Month / Year */}
                <div style={{ fontSize:13, fontWeight:700, color:"#FFFFFF", textTransform:"uppercase", letterSpacing:1, lineHeight:1.4 }}>
                  {date.month}<br/>{date.year}
                </div>
              </div>

              {/* Time + Venue */}
              <div style={{ display:"flex", flexDirection:"column", gap:10, paddingTop:22 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span style={{ fontSize:11, color:"#E0D8C8", fontWeight:500, textTransform:"uppercase", letterSpacing:1 }}>{timeStr}</span>
                </div>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" style={{ marginTop:1, flexShrink:0 }}>
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span style={{ fontSize:11, color:"#E0D8C8", fontWeight:500, textTransform:"uppercase", letterSpacing:1, lineHeight:1.4 }}>
                    {(event.venue||DEFAULT_EVENT.venue).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Row 4: Theme box ── */}
            <div style={{
              border:`1px solid rgba(200,168,75,0.5)`,
              borderRadius:4, padding:"8px 12px",
              background:"rgba(200,168,75,0.07)",
              marginBottom:12,
            }}>
              <span style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:2, textTransform:"uppercase" }}>Theme: </span>
              <span style={{ fontSize:10.5, color:"#E8E0CC", lineHeight:1.5, fontStyle:"italic" }}>
                {event.theme||DEFAULT_EVENT.theme}
              </span>
            </div>

            {/* ── Row 5: TICKET TYPE label ── */}
            <div style={{
              fontSize:9.5, fontWeight:700, color:GOLD,
              letterSpacing:2.5, textTransform:"uppercase", marginBottom:6,
            }}>
              Ticket Type
            </div>

            {/* ── Row 6: Gold badge ── */}
            <div style={{
              background:GOLD, color:DARK,
              display:"flex", alignItems:"center", justifyContent:"center", gap:18,
              padding:"10px 20px", borderRadius:5,
              fontFamily:"'Arial Narrow',Arial,sans-serif",
              fontSize:22, fontWeight:700, letterSpacing:5, textTransform:"uppercase",
              marginBottom:"auto",
            }}>
              <span style={{ fontSize:16 }}>★</span>
              {ticket.type_name}
              <span style={{ fontSize:16 }}>★</span>
            </div>

            {/* ── Row 7: Bottom strip ── */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              borderTop:`1px solid rgba(200,168,75,0.3)`,
              paddingTop:10, marginTop:10, gap:8, flexWrap:"wrap",
            }}>
              <div style={{
                border:`1px solid rgba(200,168,75,0.55)`,
                padding:"6px 14px", borderRadius:4,
                fontSize:10.5, fontWeight:700, color:GOLD, letterSpacing:1,
                textTransform:"uppercase", background:"rgba(200,168,75,0.08)",
                whiteSpace:"nowrap",
              }}>
                Ticket No. {ticket.ticket_number}
              </div>
              <div style={{
                fontFamily:"cursive", fontSize:14,
                color:GOLD, fontStyle:"italic", whiteSpace:"nowrap",
              }}>
                Pooling Construction Students Together!
              </div>
            </div>

          </div>
        </div>

        {/* ════════ PERFORATION ════════ */}
        <div style={{
          width:18, background:"#0D0D1F",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"space-between",
          padding:"14px 0", zIndex:3, flexShrink:0,
        }}>
          <div style={{ width:14, height:14, background:"#0D0D1F", borderRadius:"50%" }}/>
          <div style={{ flex:1, borderLeft:`2px dashed rgba(200,168,75,0.35)`, margin:"0 auto" }}/>
          <div style={{ width:14, height:14, background:"#0D0D1F", borderRadius:"50%" }}/>
        </div>

        {/* ════════ RIGHT PANEL ════════ */}
        <div style={{ width:240, flexShrink:0, background:CREAM, display:"flex" }}>

          {/* Detail column */}
          <div style={{
            flex:1, padding:"18px 14px 14px",
            display:"flex", flexDirection:"column",
            minWidth:0,
          }}>

            {/* ★ ADMIT ★ */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              marginBottom:10,
            }}>
              <span style={{ color:GOLD, fontSize:14 }}>★</span>
              <span style={{
                fontFamily:"'Arial Narrow',Arial,sans-serif",
                fontSize:22, fontWeight:700, color:DARK, letterSpacing:4, textTransform:"uppercase",
              }}>ADMIT</span>
              <span style={{ color:GOLD, fontSize:14 }}>★</span>
            </div>
            <div style={{ height:1, background:"rgba(26,26,46,0.15)", marginBottom:12 }}/>

            {/* Detail rows */}
            {detailRows.map(({ icon, label, value }) => (
              <div key={label} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                borderBottom:`1px solid rgba(26,26,46,0.09)`,
                padding:"6px 0", gap:4,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                  <IconCircle type={icon}/>
                  <span style={{ fontSize:8.5, fontWeight:700, color:GOLD, letterSpacing:1.5, textTransform:"uppercase", whiteSpace:"nowrap" }}>
                    {label}
                  </span>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:DARK, textAlign:"right", wordBreak:"break-all", maxWidth:90 }}>
                  {value}
                </span>
              </div>
            ))}

            {/* QR code */}
            <div style={{
              marginTop:"auto", paddingTop:12,
              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
            }}>
              <div style={{
                width:96, height:96,
                background:"#fff",
                border:"1px solid rgba(26,26,46,0.12)",
                borderRadius:4,
                display:"flex", alignItems:"center", justifyContent:"center",
                padding:3,
              }}>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR" width={90} height={90}/>
                  : <span style={{ fontSize:9, color:DARK }}>Loading…</span>
                }
              </div>
              <div style={{
                fontSize:8.5, fontWeight:700, color:DARK,
                textAlign:"center", letterSpacing:1,
                textTransform:"uppercase", lineHeight:1.6,
              }}>
                !! SCAN QR<br/>FOR ENTRY<br/>VERIFICATION
              </div>
            </div>

          </div>

          {/* Gold side tab */}
          <div style={{
            width:28, background:GOLD,
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0,
          }}>
            <span style={{
              fontFamily:"sans-serif", fontSize:8, fontWeight:700,
              color:DARK, letterSpacing:2.5, textTransform:"uppercase",
              writingMode:"vertical-rl", transform:"rotate(180deg)",
            }}>
              Annual CSA Gala Dinner
            </span>
          </div>

        </div>
      </div>

      {/* ── Download button ── */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          display:"flex", alignItems:"center", gap:8,
          padding:"12px 36px", borderRadius:10,
          fontWeight:700, fontSize:13,
          background:`linear-gradient(135deg,${GOLD},#9A7415)`,
          color:DARK, border:"none", cursor:"pointer",
          boxShadow:`0 4px 20px rgba(200,168,75,0.4)`,
          transition:"transform 0.15s",
          opacity: downloading ? 0.6 : 1,
        }}
        onMouseEnter={e => (e.currentTarget.style.transform="scale(1.04)")}
        onMouseLeave={e => (e.currentTarget.style.transform="scale(1)")}
      >
        {downloading
          ? <Loader2 size={16} style={{ animation:"spin 1s linear infinite" }}/>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        }
        {downloading ? "Generating…" : "Download Ticket"}
      </button>

    </div>
  );
}
