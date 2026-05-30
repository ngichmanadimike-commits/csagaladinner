/**
 * TicketDesign.tsx — v5
 * Matches reference image exactly:
 *  LEFT (dark, bg photo):
 *    left-col  : logo | date block (day-name / big-day / month+year) | time | venue
 *    main-col  : "GALA" (gold) / "DINNER 2026" (white) / tagline / theme box
 *               → yellow banner "★ COUPLE ★"
 *               → TICKET NO pill  +  italic tagline
 *  RIGHT (cream):
 *    gold "★ ADMIT ★" header  →  detail rows (icon+label+value)  →  QR  →  scan label
 *    gold vertical sidebar strip (rightmost)
 */
import { useRef, useState, useEffect } from "react";

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

function ordinalSuffix(day: number) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return "TH";
  switch (day % 10) {
    case 1: return "ST";
    case 2: return "ND";
    case 3: return "RD";
    default: return "TH";
  }
}

function formatEventDate(dateStr: string | null | undefined) {
  const DAYS   = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  if (!dateStr) return { dayName:"FRIDAY", day:"12", suffix:"TH", month:"JUNE", year:"2026", startTime:"10:00 PM" };
  const d = new Date(dateStr);
  const day = d.getDate();
  const h = d.getHours(), mm = d.getMinutes().toString().padStart(2,"0");
  return {
    dayName  : DAYS[d.getDay()],
    day      : String(day),
    suffix   : ordinalSuffix(day),
    month    : MONTHS[d.getMonth()],
    year     : String(d.getFullYear()),
    startTime: `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`,
  };
}

function formatEndTime(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error(`Failed: ${src}`));
    document.head.appendChild(s);
  });
}

// Render size: 8.5 × 3.5 in @ 150 dpi
const PX_W = 1275;
const PX_H = 525;

const GOLD  = "#D4AF37";
const DARK  = "#0A1525";
const CREAM = "#F5F1E8";
const BG    = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format";

// Icon paths mapped to SVG circles to avoid emoji rendering issues in canvas capture
function DetailIcon({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: `1.5px solid ${GOLD}`,
      borderRadius: "50%",
      flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} />
  );
}

export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const renderRef  = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [qrUrl, setQrUrl]             = useState("");

  const ticketType  = (ticket.type_name || ticket.ticket_type || "Regular").toUpperCase();
  const bookingCode = ticket.booking_code ?? "";
  const name        = ticket.purchaser_name ?? "";
  const ticketNo    = ticket.ticket_number ?? "";
  const status      = (ticket.payment_status ?? "PENDING").toUpperCase();
  const amount      = ticket.total_amount ?? 0;

  const eventTitle  = ticket.event_title || "ANNUAL CSA GALA DINNER";
  const eventTheme  = ticket.event_theme
    || "LAYING THE FIRST STONE: Honoring the Past, Empowering the Present and Inspiring the Future of Construction";
  const eventVenue  = (ticket.event_venue || "KINGFISHER NEST HOTEL").toUpperCase();
  const date        = formatEventDate(ticket.event_date);
  const endTime     = formatEndTime(ticket.event_end_time);
  const timeDisplay = endTime ? `${date.startTime} – ${endTime}` : date.startTime;

  // QR payload: plain ticket code so scanner can read it directly
  const qrPayload = ticketNo || bookingCode;

  const details = [
    { label: "NAME",         val: name },
    { label: "BOOKING CODE", val: bookingCode },
    { label: "TICKET TYPE",  val: ticketType },
    { label: "STATUS",       val: status },
    { label: "AMOUNT",       val: `KSH ${amount.toLocaleString()}` },
  ];

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
          colorDark: "#000000", colorLight: "#FFFFFF", correctLevel: QRCode.CorrectLevel.H });
        const cvs = tmp.querySelector("canvas") as HTMLCanvasElement;
        const img = tmp.querySelector("img") as HTMLImageElement;
        const finish = (url: string) => {
          if (!cancelled) setQrUrl(url);
          if (document.body.contains(tmp)) document.body.removeChild(tmp);
        };
        if (cvs) finish(cvs.toDataURL("image/png"));
        else if (img) { img.onload = () => finish(img.src); if (img.complete) finish(img.src); }
        else finish(apiUrl);
      })
      .catch(() => { if (!cancelled) setQrUrl(apiUrl); });
    return () => { cancelled = true; };
  }, [qrPayload]);

  // ─────────────────────────────────────────────────────────────────────────
  // Ticket Markup — shared between preview and PDF render target
  // ─────────────────────────────────────────────────────────────────────────
  function TicketMarkup({ forPdf = false }: { forPdf?: boolean }) {
    const p = forPdf;

    // Proportional sizes
    const leftW   = p ? Math.round(PX_W * 0.655) : "65.5%";
    const rightW  = p ? Math.round(PX_W * 0.345) : "34.5%";
    const sidebarW = p ? 34 : "9%";
    const leftColW = p ? 138 : "20%";

    return (
      <div style={{
        width: p ? PX_W : "100%",
        height: p ? PX_H : "100%",
        display: "flex",
        fontFamily: "'Montserrat', 'Arial', sans-serif",
        background: DARK,
        overflow: "hidden",
        position: "relative",
      }}>

        {/* ══════════ LEFT PANEL ══════════ */}
        <div style={{
          width: leftW,
          flexShrink: 0,
          display: "flex",
          flexDirection: "row",
          backgroundImage: `linear-gradient(rgba(10,21,37,0.83),rgba(10,21,37,0.83)), url('${BG}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: p ? "22px 18px 18px 20px" : "4% 2.8% 3.5% 3.2%",
          position: "relative",
          borderRight: `2px dashed ${GOLD}`,
          boxSizing: "border-box",
          gap: p ? 18 : "2.5%",
        }}>
          {/* Notch circles */}
          <div style={{ position:"absolute", right:-14, top:-14, width:28, height:28,
            background:"#d1d1d1", borderRadius:"50%", zIndex:10 }}/>
          <div style={{ position:"absolute", right:-14, bottom:-14, width:28, height:28,
            background:"#d1d1d1", borderRadius:"50%", zIndex:10 }}/>

          {/* ── LEFT COL ── */}
          <div style={{
            width: leftColW, flexShrink: 0,
            display: "flex", flexDirection: "column", alignItems: "flex-start",
          }}>
            {/* Logo */}
            <div style={{
              width: p ? 68 : "clamp(44px,52%,68px)",
              height: p ? 68 : "clamp(44px,52%,68px)",
              borderRadius: "50%",
              border: `3px solid ${GOLD}`,
              background: "white",
              overflow: "hidden",
              marginBottom: p ? 16 : "6%",
              flexShrink: 0,
            }}>
              <img
                src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg"
                alt="CSA"
                style={{ width:"85%", height:"85%", objectFit:"contain", margin:"7.5%", display:"block" }}
              />
            </div>

            {/* Day name */}
            <div style={{
              fontSize: p ? 9.5 : "0.78em",
              fontWeight: 700,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "0.05em",
              marginBottom: p ? 2 : "0.5%",
            }}>
              {date.dayName}
            </div>

            {/* Big day number */}
            <div style={{ display:"flex", alignItems:"flex-start", lineHeight:1, marginBottom: p ? 4 : "1.5%" }}>
              <span style={{ fontSize: p ? 44 : "3.5em", fontWeight: 900, color: GOLD, lineHeight:0.9 }}>
                {date.day}
              </span>
              <sup style={{ fontSize: p ? 13 : "1em", fontWeight:700, color:GOLD, marginTop: p ? 4 : "0.3em" }}>
                {date.suffix}
              </sup>
            </div>

            {/* Month + Year */}
            <div style={{
              fontSize: p ? 9.5 : "0.78em", fontWeight:700, color:"white",
              lineHeight:1.4, marginBottom: p ? 10 : "3%",
              borderLeft: `2px solid ${GOLD}`, paddingLeft: p ? 8 : "6%",
            }}>
              {date.month}<br/>{date.year}
            </div>

            {/* Divider */}
            <div style={{ borderTop:`1px solid ${GOLD}`, width:"85%", marginBottom: p ? 10 : "3%" }}/>

            {/* Time */}
            <div style={{ marginBottom: p ? 10 : "3%" }}>
              <div style={{ fontSize: p ? 7.5 : "0.62em", color:GOLD, fontWeight:700,
                letterSpacing:"0.08em", marginBottom: p ? 2 : "1%" }}>
                🕙 TIME
              </div>
              <div style={{ fontSize: p ? 9 : "0.74em", fontWeight:700,
                color:"rgba(255,255,255,0.9)" }}>
                {timeDisplay}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop:`1px solid ${GOLD}`, width:"85%", marginBottom: p ? 10 : "3%" }}/>

            {/* Venue */}
            <div>
              <div style={{ fontSize: p ? 7.5 : "0.62em", color:GOLD, fontWeight:700,
                letterSpacing:"0.08em", marginBottom: p ? 2 : "1%" }}>
                📍 VENUE
              </div>
              <div style={{ fontSize: p ? 8.5 : "0.7em", fontWeight:700,
                color:"rgba(255,255,255,0.9)", lineHeight:1.4 }}>
                {eventVenue}
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT COL ── */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>

            {/* Top: GALA DINNER title */}
            <div>
              <div style={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                fontWeight: 900, color:GOLD, lineHeight:0.95,
                fontSize: p ? 52 : "4.1em",
                letterSpacing: "0.02em",
              }}>
                GALA
              </div>
              <div style={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                fontWeight: 700, color:"white", lineHeight:0.95,
                fontSize: p ? 40 : "3.1em",
                marginBottom: p ? 8 : "2%",
              }}>
                DINNER {date.year}
              </div>
              <div style={{
                color:GOLD, fontSize: p ? 8.5 : "0.7em", fontWeight:700,
                letterSpacing:"0.14em", marginBottom: p ? 10 : "2.5%",
              }}>
                AWARDS &nbsp;•&nbsp; NETWORKING &nbsp;•&nbsp; ENTERTAINMENT
              </div>

              {/* Theme box */}
              <div style={{
                border:`1px solid ${GOLD}`, borderRadius:5,
                padding: p ? "8px 12px" : "1.8% 2.5%",
                background:"rgba(10,21,37,0.55)",
                fontSize: p ? 8.5 : "0.7em",
                lineHeight:1.55, color:"rgba(255,255,255,0.88)",
                display:"-webkit-box",
                WebkitLineClamp:"3",
                WebkitBoxOrient:"vertical",
                overflow:"hidden",
              }}>
                <span style={{ color:GOLD, fontWeight:700 }}>THEME: </span>
                {eventTheme}
              </div>
            </div>

            {/* Middle: ticket type banner */}
            <div>
              <div style={{ color:GOLD, fontSize: p ? 8 : "0.65em", fontWeight:700,
                letterSpacing:"0.1em", marginBottom: p ? 5 : "1%" }}>
                TICKET TYPE
              </div>
              <div style={{
                background:"#FFD700", color:DARK, borderRadius:5,
                padding: p ? "10px 16px" : "2.2% 3%",
                fontWeight:900, fontSize: p ? 16 : "1.25em",
                textAlign:"center", letterSpacing:"0.15em",
                display:"flex", alignItems:"center", justifyContent:"center", gap: p ? 14 : "3%",
              }}>
                ★ &nbsp;{ticketType}&nbsp; ★
              </div>
            </div>

            {/* Bottom: ticket no + tagline */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", gap: p ? 8 : "2%" }}>
              <div style={{
                background:CREAM, color:DARK, borderRadius:4,
                padding: p ? "5px 10px" : "1.2% 2%",
                fontSize: p ? 8.5 : "0.68em", fontWeight:700, whiteSpace:"nowrap",
              }}>
                TICKET NO. {ticketNo}
              </div>
              <div style={{
                fontFamily:"'Great Vibes', 'Brush Script MT', cursive",
                color:GOLD, fontSize: p ? 15 : "1.15em", textAlign:"right",
              }}>
                Pooling Construction Students Together!
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ RIGHT PANEL ══════════ */}
        <div style={{
          width: rightW,
          flexShrink: 0,
          background: CREAM,
          color: DARK,
          padding: p ? `20px ${(p ? sidebarW as number : 0) + 16}px 20px 18px` : `3.5% ${sidebarW} 3.5% 3%`,
          position:"relative",
          display:"flex",
          flexDirection:"column",
          boxSizing:"border-box",
        }}>

          {/* Gold vertical sidebar */}
          <div style={{
            position:"absolute", right:0, top:0,
            width: sidebarW,
            height:"100%",
            background:GOLD,
            writingMode:"vertical-rl",
            textOrientation:"mixed",
            transform:"rotate(180deg)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontSize: p ? 10 : "0.72em",
            color:DARK, letterSpacing:"0.12em",
            overflow:"hidden", whiteSpace:"nowrap",
          }}>
            {eventTitle.toUpperCase()}
          </div>

          {/* ADMIT header */}
          <div style={{
            textAlign:"center", fontWeight:900,
            fontSize: p ? 18 : "1.35em", letterSpacing:"0.15em",
            color:DARK, marginBottom: p ? 6 : "1.5%",
          }}>
            ★ &nbsp;ADMIT&nbsp; ★
          </div>
          <div style={{ borderTop:`2px solid ${GOLD}`, marginBottom: p ? 10 : "2%" }}/>

          {/* Detail rows */}
          <div style={{
            flex:1, display:"flex", flexDirection:"column",
            justifyContent:"space-evenly",
          }}>
            {details.map(({ label, val }) => (
              <div key={label} style={{
                display:"flex", alignItems:"center",
                borderBottom:`1px dotted rgba(180,150,40,0.45)`,
                padding: p ? "4px 0" : "0.6% 0",
                gap: p ? 7 : "2.5%",
              }}>
                <div style={{
                  width: p ? 20 : "clamp(13px,5.5%,20px)",
                  height: p ? 20 : "clamp(13px,5.5%,20px)",
                  border:`1.5px solid ${GOLD}`,
                  borderRadius:"50%", flexShrink:0,
                }}/>
                <span style={{
                  fontSize: p ? 7.5 : "0.61em", fontWeight:700,
                  color:GOLD, letterSpacing:"0.05em", flexShrink:0,
                  textTransform:"uppercase",
                }}>
                  {label}
                </span>
                <span style={{
                  fontSize: p ? 8.5 : "0.69em", fontWeight:700,
                  color:DARK, marginLeft:"auto", textAlign:"right",
                  wordBreak:"break-word", maxWidth:"52%",
                }}>
                  {val}
                </span>
              </div>
            ))}
          </div>

          {/* QR code */}
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            gap: p ? 4 : "1%", marginTop: p ? 8 : "2%",
          }}>
            <div style={{
              border:`3px solid ${GOLD}`, borderRadius:5,
              overflow:"hidden", background:"#fff",
              width: p ? 100 : "clamp(54px,27%,100px)",
              height: p ? 100 : "clamp(54px,27%,100px)",
            }}>
              {qrUrl
                ? <img src={qrUrl} alt="QR" style={{ width:"100%", height:"100%", display:"block" }}/>
                : <div style={{ width:"100%", height:"100%", display:"flex",
                    alignItems:"center", justifyContent:"center",
                    fontSize: p ? 7 : "0.55em", color:DARK, textAlign:"center", padding:4 }}>
                    Generating…
                  </div>
              }
            </div>
            <div style={{
              textAlign:"center", fontSize: p ? 7 : "0.58em",
              fontWeight:700, color:DARK, lineHeight:1.5, letterSpacing:"0.06em",
            }}>
              🔲 SCAN QR<br/>FOR ENTRY<br/>VERIFICATION
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PDF download ─────────────────────────────────────────────────────────
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

      await new Promise(r => setTimeout(r, 200));
      const el = renderRef.current;
      if (!el) throw new Error("Render element not found");

      const canvas = await h2c(el, {
        scale: 1, useCORS: true, allowTaint: true,
        backgroundColor: DARK,
        width: PX_W, height: PX_H,
        windowWidth: PX_W, windowHeight: PX_H,
        logging: false, imageTimeout: 10000,
      });

      const PT_W = 612, PT_H = 252; // 8.5 × 3.5 in in points
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

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700;900&family=Great+Vibes&display=swap" rel="stylesheet"/>

      {/* Hidden PDF render target */}
      <div style={{ position:"fixed", top:"-9999px", left:"-9999px",
        width:PX_W, height:PX_H, overflow:"hidden", pointerEvents:"none", zIndex:-1 }}
        ref={renderRef}>
        <TicketMarkup forPdf/>
      </div>

      {/* Visible preview */}
      <div style={{ width:"100%", overflowX:"auto" }}>
        <div style={{ position:"relative", width:"100%", paddingBottom:`${(3.5/8.5)*100}%` }}>
          <div style={{ position:"absolute", inset:0, borderRadius:10,
            overflow:"hidden", boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
            <TicketMarkup/>
          </div>
        </div>
      </div>

      {/* Download button */}
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
            color:DARK, border:"none", borderRadius:10,
            fontWeight:700, fontSize:15,
            cursor:(downloading || !qrUrl) ? "not-allowed" : "pointer",
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
        8.5″ × 3.5″ landscape &nbsp;|&nbsp; Button enables once QR loads
      </p>
    </>
  );
}
