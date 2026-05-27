/**
 * TicketDesign.tsx — v4
 *
 * Layout mirrors the reference HTML exactly:
 *   left panel (68%): left-col (logo + date + time + venue) | main-content (title + theme + type + footer)
 *   right panel (32%): ADMIT header → detail rows (space-evenly) → QR block → gold sidebar strip
 *
 * Changes from v3:
 *   - Content spread evenly to match HTML reference layout
 *   - HTML fallback download removed; PDF-only download
 *   - Semicircle notch circles on tear line (top + bottom)
 *   - Right panel uses space-evenly flex to fill height properly
 *
 * Print size : 8.5 × 3.5 inches landscape
 * Render canvas : 1275 × 525 px (150 dpi)
 */
import { useRef, useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type TicketData = {
  ticket_number: string;
  purchaser_name: string;
  booking_code: string;
  ticket_type?: string;
  type_name?: string;
  total_amount: number;
  payment_status: string;
  qr_code: string;
  quantity?: number;
  email?: string;
  phone?: string;
  event_title?: string;
  event_theme?: string;
  event_venue?: string;
  event_date?: string | null;
  event_description?: string;
  event_end_time?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatEndTime(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatEventDate(dateStr: string | null | undefined) {
  const DAYS   = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  if (!dateStr) return { dayName:"FRIDAY", day:"12", suffix:"TH", month:"JUNE", year:"2026", time:"10:00 PM" };
  const d   = new Date(dateStr);
  const day = d.getDate();
  const mod = day % 100;
  const sfx = ["TH","ST","ND","RD"];
  const suffix = sfx[(mod - 20) % 10] ?? sfx[mod] ?? "TH";
  const h = d.getHours(), mm = d.getMinutes().toString().padStart(2,"0");
  return {
    dayName : DAYS[d.getDay()],
    day     : String(day),
    suffix,
    month   : MONTHS[d.getMonth()],
    year    : String(d.getFullYear()),
    time    : `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`,
  };
}

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error(`Failed: ${src}`));
    document.head.appendChild(s);
  });
}

// ── Render dimensions (150 dpi) ───────────────────────────────────────────────
const DPI  = 150;
const IN_W = 8.5;
const IN_H = 3.5;
const PX_W = Math.round(IN_W * DPI);  // 1275
const PX_H = Math.round(IN_H * DPI);  // 525

// ── Palette ───────────────────────────────────────────────────────────────────
const GOLD  = "#D4AF37";
const DARK  = "#0a1128";
const CREAM = "#F5F1E8";
const BG    = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200";

// ── Component ─────────────────────────────────────────────────────────────────
export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const renderRef = useRef<HTMLDivElement>(null);

  const [downloading, setDownloading] = useState(false);
  const [qrUrl, setQrUrl]             = useState("");

  // Derived values
  const ticketType  = (ticket.type_name || ticket.ticket_type || "Regular").toUpperCase();
  const bookingCode = ticket.booking_code ?? "";
  const name        = ticket.purchaser_name ?? "";
  const ticketNo    = ticket.ticket_number ?? "";
  const status      = (ticket.payment_status ?? "PENDING").toUpperCase();
  const amount      = ticket.total_amount ?? 0;

  const eventTitle = ticket.event_title || "Annual CSA Gala Dinner";
  const eventTheme = ticket.event_theme
    || "LAYING THE FIRST STONE: Honoring the Past, Empowering the Present and Inspiring the Future of Construction";
  const eventVenue = ticket.event_venue || "KINGFISHER NEST HOTEL";
  const date        = formatEventDate(ticket.event_date);
  const endTime     = formatEndTime(ticket.event_end_time);
  const timeDisplay = endTime ? `${date.time} – ${endTime}` : date.time;

  const qrPayload = JSON.stringify({ t: ticketNo, b: bookingCode, q: ticket.qr_code || bookingCode });

  const details = [
    { icon:"👤", label:"NAME",         val: name },
    { icon:"🏷", label:"BOOKING CODE", val: bookingCode },
    { icon:"🎫", label:"TICKET TYPE",  val: ticketType },
    { icon:"💳", label:"STATUS",       val: status },
    { icon:"🪙", label:"AMOUNT",       val: `KSH ${amount.toLocaleString()}` },
    ...(ticket.email ? [{ icon:"✉",  label:"EMAIL", val: ticket.email }] : []),
    ...(ticket.phone ? [{ icon:"📞", label:"PHONE", val: ticket.phone }] : []),
  ];

  // QR generation
  useEffect(() => {
    let cancelled = false;
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${encodeURIComponent(qrPayload)}`;
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js")
      .then(() => {
        const QRCode = (window as any).QRCode;
        if (!QRCode || cancelled) { setQrUrl(apiUrl); return; }
        const tmp = document.createElement("div");
        tmp.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
        document.body.appendChild(tmp);
        new QRCode(tmp, { text: qrPayload, width: 300, height: 300,
          colorDark: DARK, colorLight: CREAM, correctLevel: QRCode.CorrectLevel.H });
        const cvs = tmp.querySelector("canvas") as HTMLCanvasElement;
        const img = tmp.querySelector("img") as HTMLImageElement;
        const finish = (url: string) => { if (!cancelled) setQrUrl(url); document.body.removeChild(tmp); };
        if (cvs) finish(cvs.toDataURL("image/png"));
        else if (img) { img.onload = () => finish(img.src); if (img.complete) finish(img.src); }
        else { finish(apiUrl); document.body.removeChild(tmp); }
      })
      .catch(() => { if (!cancelled) setQrUrl(apiUrl); });
    return () => { cancelled = true; };
  }, [qrPayload]);

  // ── Ticket markup ─────────────────────────────────────────────────────────
  function TicketMarkup({ forPdf = false }: { forPdf?: boolean }) {
    const p = forPdf;

    return (
      <div style={{
        width: p ? PX_W : "100%",
        height: p ? PX_H : "100%",
        display: "flex",
        flexDirection: "row",
        background: DARK,
        color: "white",
        fontFamily: "'Montserrat', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* ══════════ LEFT PANEL (68%) ══════════ */}
        <div style={{
          width: p ? Math.round(PX_W * 0.68) : "68%",
          flexShrink: 0,
          display: "flex",
          flexDirection: "row",
          gap: p ? 24 : "2.5%",
          backgroundImage: `linear-gradient(rgba(10,17,40,.82),rgba(10,17,40,.82)), url('${BG}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: p ? "25px 20px" : "3.5% 2.5%",
          position: "relative",
          borderRight: `2px dashed ${GOLD}`,
          boxSizing: "border-box",
        }}>
          {/* Tear-line notch — top */}
          <div style={{ position:"absolute", right:-15, top:-15, width:30, height:30,
            background:"#e8e8e8", borderRadius:"50%", zIndex:10 }}/>
          {/* Tear-line notch — bottom */}
          <div style={{ position:"absolute", right:-15, bottom:-15, width:30, height:30,
            background:"#e8e8e8", borderRadius:"50%", zIndex:10 }}/>

          {/* ── LEFT COL: logo + date + time + venue ── */}
          <div style={{
            width: p ? 140 : "20%",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}>
            {/* CSA logo */}
            <div style={{
              width: p ? 75 : "clamp(44px,55%,75px)",
              height: p ? 75 : "clamp(44px,55%,75px)",
              borderRadius: "50%",
              border: `3px solid ${GOLD}`,
              background: "white",
              overflow: "hidden",
              marginBottom: p ? 18 : "8%",
              flexShrink: 0,
            }}>
              <img src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg"
                alt="CSA" style={{ width:"85%", height:"85%", objectFit:"contain",
                  margin:"7.5%", display:"block" }}/>
            </div>

            {/* Date block */}
            <div style={{ borderLeft:`2px solid ${GOLD}`, paddingLeft: p ? 12 : "9%",
              marginBottom: p ? 12 : "4%" }}>
              <div style={{ fontSize: p ? 10 : "0.82em", fontWeight:700,
                color:"rgba(255,255,255,0.8)", letterSpacing:1, marginBottom:2 }}>
                {date.dayName}
              </div>
              <div style={{ lineHeight:1 }}>
                <span style={{ fontSize: p ? 38 : "3.1em", fontWeight:900, color:GOLD }}>
                  {date.day}
                </span>
                <sup style={{ fontSize: p ? 14 : "1em", color:GOLD, fontWeight:700 }}>
                  {date.suffix}
                </sup>
              </div>
              <div style={{ fontSize: p ? 10 : "0.82em", fontWeight:700,
                color:"white", marginTop:3, lineHeight:1.5 }}>
                {date.month}<br/>{date.year}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop:`1px solid ${GOLD}`, width:"90%",
              margin: p ? "10px 0" : "3% 0" }}/>

            {/* Time */}
            <div style={{ fontSize: p ? 10 : "0.82em", fontWeight:700,
              color:"rgba(255,255,255,0.9)", marginBottom: p ? 4 : "2%" }}>
              <div style={{ fontSize: p ? 8 : "0.66em", color:GOLD,
                letterSpacing:"0.1em", marginBottom:3, fontWeight:700 }}>
                🕙 TIME
              </div>
              {timeDisplay}
            </div>

            {/* Divider */}
            <div style={{ borderTop:`1px solid ${GOLD}`, width:"90%",
              margin: p ? "10px 0" : "3% 0" }}/>

            {/* Venue */}
            <div style={{ fontSize: p ? 9 : "0.75em", fontWeight:700,
              color:"rgba(255,255,255,0.9)", lineHeight:1.5 }}>
              <div style={{ fontSize: p ? 8 : "0.66em", color:GOLD,
                letterSpacing:"0.1em", marginBottom:3, fontWeight:700 }}>
                📍 VENUE
              </div>
              {eventVenue.toUpperCase()}
            </div>
          </div>

          {/* ── MAIN CONTENT: title + theme + ticket type + footer ── */}
          <div style={{ flex:1, display:"flex", flexDirection:"column",
            justifyContent:"space-between" }}>

            {/* Top group */}
            <div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontWeight:900,
                color:GOLD, lineHeight:1, fontSize: p ? 48 : "3.8em" }}>
                GALA
              </div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontWeight:700,
                color:"white", lineHeight:1, fontSize: p ? 38 : "3em",
                marginBottom: p ? 7 : "1.5%" }}>
                DINNER {date.year}
              </div>
              <div style={{ color:GOLD, fontSize: p ? 9 : "0.72em", fontWeight:700,
                letterSpacing:"0.13em", marginBottom: p ? 10 : "2%" }}>
                AWARDS &nbsp;•&nbsp; NETWORKING &nbsp;•&nbsp; ENTERTAINMENT
              </div>

              {/* Theme box */}
              <div style={{
                border: `1px solid ${GOLD}`, borderRadius:6,
                padding: p ? "9px 13px" : "1.8% 2.5%",
                background:"rgba(10,17,40,0.6)",
                fontSize: p ? 9 : "0.72em",
                lineHeight:1.5,
                color:"rgba(255,255,255,0.9)",
                overflow:"hidden",
                maxHeight: p ? 56 : "3.4em",
              }}>
                <span style={{ color:GOLD, fontWeight:700 }}>THEME: </span>
                {eventTheme}
              </div>
            </div>

            {/* Ticket type banner */}
            <div>
              <div style={{ color:GOLD, fontSize: p ? 9 : "0.72em", fontWeight:700,
                letterSpacing:"0.08em", marginBottom: p ? 5 : "1%" }}>
                TICKET TYPE
              </div>
              <div style={{
                background:"#FFD700", color:DARK, borderRadius:4,
                padding: p ? "9px 14px" : "2% 3%",
                fontWeight:900, fontSize: p ? 15 : "1.2em",
                textAlign:"center", letterSpacing:"0.1em",
                display:"flex", alignItems:"center", justifyContent:"center", gap:12,
              }}>
                ★ {ticketType} ★
              </div>
            </div>

            {/* Bottom: ticket no + tagline */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", gap: p ? 8 : "2%" }}>
              <div style={{
                background:CREAM, color:DARK, borderRadius:4,
                padding: p ? "6px 10px" : "1.5% 2%",
                fontSize: p ? 9 : "0.7em", fontWeight:700, whiteSpace:"nowrap",
              }}>
                TICKET NO. {ticketNo}
              </div>
              <div style={{ fontFamily:"'Great Vibes', cursive", color:GOLD,
                fontSize: p ? 15 : "1.15em" }}>
                Pooling Construction Students Together!
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ RIGHT PANEL (32%) ══════════ */}
        <div style={{
          width: p ? Math.round(PX_W * 0.32) : "32%",
          flexShrink: 0,
          background: CREAM,
          color: DARK,
          // right padding leaves room for gold sidebar
          padding: p ? "20px 44px 20px 20px" : "3% 11.5% 3% 3%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}>

          {/* Gold vertical sidebar */}
          <div style={{
            position:"absolute", right:0, top:0,
            width: p ? 32 : "9%",
            height:"100%",
            background: GOLD,
            writingMode:"vertical-rl",
            textOrientation:"mixed",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize: p ? 10 : "0.7em",
            color:DARK, letterSpacing:"0.1em", overflow:"hidden",
          }}>
            {eventTitle.toUpperCase()}
          </div>

          {/* ADMIT header */}
          <div style={{ textAlign:"center", fontWeight:900,
            fontSize: p ? 17 : "1.3em", letterSpacing:"0.12em",
            color:DARK, marginBottom: p ? 6 : "1.5%" }}>
            ★ ADMIT ★
          </div>
          <div style={{ borderTop:`1.5px solid ${GOLD}`,
            marginBottom: p ? 10 : "2%" }}/>

          {/* Detail rows — evenly spread */}
          <div style={{ flex:1, display:"flex", flexDirection:"column",
            justifyContent:"space-evenly" }}>
            {details.map(({ icon, label, val }) => (
              <div key={label} style={{
                display:"flex", alignItems:"center", gap: p ? 7 : "3%",
                borderBottom:`1px dotted rgba(212,175,55,0.55)`,
                padding: p ? "4px 0" : "0.5% 0",
              }}>
                {/* Icon circle */}
                <div style={{
                  width: p ? 22 : "clamp(14px,6%,22px)",
                  height: p ? 22 : "clamp(14px,6%,22px)",
                  border: `1px solid ${GOLD}`,
                  borderRadius:"50%",
                  flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize: p ? 10 : "0.7em",
                }}>
                  {icon}
                </div>
                {/* Label */}
                <span style={{ fontSize: p ? 8 : "0.65em", fontWeight:700,
                  color:GOLD, letterSpacing:"0.04em", flexShrink:0 }}>
                  {label}
                </span>
                {/* Value */}
                <span style={{ fontSize: p ? 9 : "0.7em", fontWeight:600,
                  color:DARK, textAlign:"right", wordBreak:"break-word",
                  maxWidth:"55%", marginLeft:"auto" }}>
                  {val}
                </span>
              </div>
            ))}
          </div>

          {/* QR block */}
          <div style={{ display:"flex", flexDirection:"column",
            alignItems:"center", gap: p ? 4 : "1%",
            marginTop: p ? 8 : "2%" }}>
            <div style={{
              border:`3px solid ${GOLD}`, borderRadius:6, overflow:"hidden",
              background:CREAM,
              width: p ? 110 : "clamp(58px,30%,110px)",
              height: p ? 110 : "clamp(58px,30%,110px)",
            }}>
              {qrUrl
                ? <img src={qrUrl} alt="QR"
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                : <div style={{ width:"100%", height:"100%", display:"flex",
                    alignItems:"center", justifyContent:"center",
                    fontSize: p ? 7 : "0.55em", fontWeight:700,
                    color:DARK, textAlign:"center", padding:4 }}>
                    Generating QR…
                  </div>
              }
            </div>
            <div style={{ textAlign:"center", fontSize: p ? 7.5 : "0.6em",
              fontWeight:700, color:DARK, lineHeight:1.5, letterSpacing:"0.06em" }}>
              🔲 SCAN QR<br/>FOR ENTRY<br/>VERIFICATION
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PDF download ──────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
        document.fonts?.ready ?? Promise.resolve(),
      ]);

      const h2c   = (window as any).html2canvas;
      const jsPDF = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
      if (!h2c || !jsPDF) throw new Error("Libraries not loaded");

      await new Promise(r => setTimeout(r, 150));

      const el = renderRef.current;
      if (!el) throw new Error("Render element not found");

      const canvas = await h2c(el, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: DARK,
        width: PX_W,
        height: PX_H,
        windowWidth: PX_W,
        windowHeight: PX_H,
        logging: false,
        imageTimeout: 8000,
      });

      // 8.5 × 3.5 in → 612 × 252 pt
      const PT_W = 612, PT_H = 252;
      const pdf = new jsPDF({ orientation:"landscape", unit:"pt", format:[PT_H, PT_W] });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, PT_W, PT_H);
      pdf.save(`CSA-Ticket-${ticketNo || "download"}.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&family=Great+Vibes&display=swap" rel="stylesheet"/>

      {/* Hidden render target — exact pixel size for PDF capture */}
      <div style={{ position:"fixed", top:"-9999px", left:"-9999px",
        width:PX_W, height:PX_H, overflow:"hidden", pointerEvents:"none", zIndex:-1 }}
        ref={renderRef}>
        <TicketMarkup forPdf/>
      </div>

      {/* Visible preview — 8.5:3.5 aspect ratio maintained */}
      <div style={{ width:"100%", overflowX:"auto" }}>
        <div style={{ position:"relative", width:"100%",
          paddingBottom:`${(IN_H / IN_W) * 100}%` }}>
          <div style={{ position:"absolute", inset:0, borderRadius:10,
            overflow:"hidden", boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
            <TicketMarkup/>
          </div>
        </div>
      </div>

      {/* PDF download button — only download option */}
      <div style={{ display:"flex", justifyContent:"center", marginTop:20 }}>
        <button
          onClick={handleDownload}
          disabled={downloading || !qrUrl}
          style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"13px 32px",
            background: (downloading || !qrUrl)
              ? "rgba(212,175,55,0.3)"
              : "linear-gradient(135deg,#E6C875,#D4AF37)",
            color: DARK, border:"none", borderRadius:10,
            fontWeight:700, fontSize:15,
            cursor: (downloading || !qrUrl) ? "not-allowed" : "pointer",
            fontFamily:"Montserrat,sans-serif",
            boxShadow:"0 4px 14px rgba(212,175,55,0.35)",
            transition:"opacity 0.2s",
          }}
        >
          {downloading ? "⏳ Generating PDF…" : "⬇ Download PDF Ticket"}
        </button>
      </div>

      <p style={{ textAlign:"center", marginTop:8, fontSize:11,
        color:"rgba(255,255,255,0.35)", fontFamily:"Montserrat,sans-serif" }}>
        Standard size: 8.5″ × 3.5″ landscape &nbsp;|&nbsp; Button enables once QR code loads
      </p>
    </>
  );
}
