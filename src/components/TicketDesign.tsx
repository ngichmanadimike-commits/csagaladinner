/**
 * TicketDesign.tsx — v3
 *
 * Standard ticket: 8.5 × 3.5 inches landscape
 * PDF render canvas: 1275 × 525 px (150 dpi)
 * Preview: same HTML, CSS-scaled to fit the container
 */
import { useRef, useState, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatEndTime(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatEventDate(dateStr: string | null | undefined) {
  const DAYS   = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  if (!dateStr) return { dayName:"FRIDAY", day:"12", suffix:"TH", month:"JUNE", year:"2026", time:"6:30 PM" };
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

// ── Exact render dimensions (150 dpi × 8.5" × 3.5") ────────────────────────
const DPI    = 150;
const IN_W   = 8.5;
const IN_H   = 3.5;
const PX_W   = Math.round(IN_W * DPI);   // 1275
const PX_H   = Math.round(IN_H * DPI);   // 525

// ── Component ────────────────────────────────────────────────────────────────
export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const renderRef  = useRef<HTMLDivElement>(null);   // hidden fixed-size div for PDF
  const previewRef = useRef<HTMLDivElement>(null);   // visible scaled preview

  const [downloading, setDownloading] = useState(false);
  const [qrUrl, setQrUrl]             = useState("");

  // ── Derived values ─────────────────────────────────────────────────────────
  const ticketType  = (ticket.type_name || ticket.ticket_type || "Regular").toUpperCase();
  const bookingCode = ticket.booking_code ?? "";
  const name        = ticket.purchaser_name ?? "";
  const ticketNo    = ticket.ticket_number ?? "";
  const status      = (ticket.payment_status ?? "PENDING").toUpperCase();
  const amount      = ticket.total_amount ?? 0;
  const qty         = ticket.quantity ?? 1;

  const eventTitle  = ticket.event_title || "CSA Gala Dinner 2026";
  const eventTheme  = ticket.event_theme
    || "Laying the First Stone: Honoring the Past, Empowering the Present, Inspiring the Future of Construction";
  const eventVenue  = ticket.event_venue || "KingFisher Nest Hotel, Westlands";
  const date        = formatEventDate(ticket.event_date);
  const endTime     = formatEndTime(ticket.event_end_time);
  const timeDisplay = endTime ? `${date.time} – ${endTime}` : date.time;

  const qrPayload = JSON.stringify({ t: ticketNo, b: bookingCode, q: ticket.qr_code || bookingCode });

  // ── QR generation ─────────────────────────────────────────────────────────
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
        new QRCode(tmp, { text: qrPayload, width: 300, height: 300, colorDark: "#0a1128", colorLight: "#F5F1E8", correctLevel: QRCode.CorrectLevel.H });
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

  // ── HTML that draws the ticket ─────────────────────────────────────────────
  // Written as a render function so both the preview and the PDF render clone
  // receive identical markup; sizing is controlled purely by the wrapper.
  function TicketMarkup({ forPdf = false }: { forPdf?: boolean }) {
    // At 150 dpi: 1275 × 525.  Left panel = 68% = 867 px, Right = 32% = 408 px.
    const S = forPdf
      ? { ticket: { width: PX_W, height: PX_H, fontSize: 10 } }
      : { ticket: { width: "100%", height: "100%", fontSize: "clamp(8px,1.1vw,11px)" } };

    const gold = "#D4AF37";
    const dark = "#0a1128";
    const cream = "#F5F1E8";

    return (
      <div style={{
        width: forPdf ? PX_W : "100%",
        height: forPdf ? PX_H : "100%",
        display: "flex",
        flexDirection: "row",
        background: dark,
        color: "white",
        fontFamily: "'Montserrat', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* ── LEFT PANEL ── */}
        <div style={{
          flex: "0 0 68%",
          display: "flex",
          flexDirection: "row",
          backgroundImage: `linear-gradient(rgba(10,17,40,.85),rgba(10,17,40,.85)),
            url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRight: `3px dashed ${gold}`,
          padding: forPdf ? "20px 24px" : "4% 3.5%",
          gap: forPdf ? 24 : "3%",
          position: "relative",
        }}>
          {/* Semicircle cut-out (top) */}
          <div style={{ position:"absolute", right:-15, top:-15, width:30, height:30,
            background: cream, borderRadius:"50%", zIndex:10 }}/>
          {/* Semicircle cut-out (bottom) */}
          <div style={{ position:"absolute", right:-15, bottom:-15, width:30, height:30,
            background: cream, borderRadius:"50%", zIndex:10 }}/>

          {/* LEFT COL — logo + date + time + venue */}
          <div style={{ flexShrink:0, width: forPdf ? 130 : "19%", display:"flex",
            flexDirection:"column", alignItems:"flex-start" }}>

            {/* Logo */}
            <div style={{ width: forPdf ? 70 : "54px", height: forPdf ? 70 : "54px",
              borderRadius:"50%", border:`3px solid ${gold}`, background:"white",
              overflow:"hidden", marginBottom: forPdf ? 14 : "8%" }}>
              <img src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg"
                alt="CSA" style={{ width:"90%", height:"90%", objectFit:"contain",
                  margin:"5%", display:"block" }}/>
            </div>

            {/* Date block */}
            <div style={{ borderLeft:`2px solid ${gold}`, paddingLeft: forPdf ? 10 : "8%",
              marginBottom: forPdf ? 12 : "6%" }}>
              <div style={{ fontSize: forPdf ? 9 : "0.75em", fontWeight:700,
                color: "rgba(255,255,255,0.7)", letterSpacing:1, marginBottom:2 }}>
                {date.dayName}
              </div>
              <div style={{ lineHeight:1 }}>
                <span style={{ fontSize: forPdf ? 34 : "2.8em", fontWeight:900, color:gold }}>
                  {date.day}
                </span>
                <sup style={{ fontSize: forPdf ? 13 : "1em", color:gold, fontWeight:700 }}>
                  {date.suffix}
                </sup>
              </div>
              <div style={{ fontSize: forPdf ? 9 : "0.75em", fontWeight:700, color:"white",
                marginTop:2, lineHeight:1.4 }}>
                {date.month}<br/>{date.year}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop:`1px solid rgba(212,175,55,0.4)`, width:"100%",
              margin:`${forPdf ? 6 : "3%"} 0` }}/>

            {/* Time */}
            <div style={{ fontSize: forPdf ? 9 : "0.75em", fontWeight:700,
              color:"rgba(255,255,255,0.85)", marginBottom: forPdf ? 4 : "3%" }}>
              <span style={{ color:gold, display:"block", fontSize: forPdf ? 8 : "0.7em",
                letterSpacing:1, marginBottom:2 }}>TIME</span>
              {timeDisplay}
            </div>

            {/* Divider */}
            <div style={{ borderTop:`1px solid rgba(212,175,55,0.4)`, width:"100%",
              margin:`${forPdf ? 6 : "3%"} 0` }}/>

            {/* Venue */}
            <div style={{ fontSize: forPdf ? 8 : "0.7em", fontWeight:700,
              color:"rgba(255,255,255,0.85)", lineHeight:1.4 }}>
              <span style={{ color:gold, display:"block", fontSize: forPdf ? 8 : "0.65em",
                letterSpacing:1, marginBottom:2 }}>VENUE</span>
              {eventVenue.toUpperCase()}
            </div>
          </div>

          {/* MAIN COL — title + theme + ticket type + footer */}
          <div style={{ flex:1, display:"flex", flexDirection:"column",
            justifyContent:"space-between" }}>

            {/* Top: Title */}
            <div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontWeight:900,
                color:gold, lineHeight:1, fontSize: forPdf ? 42 : "3.4em" }}>
                GALA
              </div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontWeight:700,
                color:"white", lineHeight:1, fontSize: forPdf ? 32 : "2.6em",
                marginBottom: forPdf ? 6 : "1.5%" }}>
                DINNER {date.year}
              </div>
              <div style={{ color:gold, fontSize: forPdf ? 8 : "0.7em", fontWeight:700,
                letterSpacing:"0.15em", marginBottom: forPdf ? 10 : "2.5%" }}>
                AWARDS &nbsp;•&nbsp; NETWORKING &nbsp;•&nbsp; ENTERTAINMENT
              </div>

              {/* Theme */}
              <div style={{ border:`1px solid rgba(212,175,55,0.5)`, borderRadius:5,
                padding: forPdf ? "8px 12px" : "2% 3%",
                background:"rgba(10,17,40,0.6)", fontSize: forPdf ? 8.5 : "0.72em",
                lineHeight:1.5, color:"rgba(255,255,255,0.85)",
                marginBottom: forPdf ? 10 : "2%" }}>
                <span style={{ color:gold, fontWeight:700 }}>THEME: </span>
                {eventTheme}
              </div>
            </div>

            {/* Middle: Ticket type banner */}
            <div>
              <div style={{ color:gold, fontSize: forPdf ? 8 : "0.7em", fontWeight:700,
                letterSpacing:1, marginBottom:4 }}>TICKET TYPE</div>
              <div style={{ background:"#FFD700", color:dark, borderRadius:4,
                padding: forPdf ? "8px 14px" : "2% 3%",
                fontWeight:900, fontSize: forPdf ? 15 : "1.2em",
                textAlign:"center", letterSpacing:"0.1em",
                display:"flex", alignItems:"center", justifyContent:"center",
                gap: forPdf ? 12 : "3%" }}>
                ★ {ticketType} ★
              </div>
            </div>

            {/* Bottom: Ticket no + tagline */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginTop: forPdf ? 8 : "2%" }}>
              <div style={{ background:cream, color:dark, borderRadius:4,
                padding: forPdf ? "5px 10px" : "1.5% 2.5%",
                fontSize: forPdf ? 8 : "0.68em", fontWeight:700 }}>
                TICKET&nbsp;NO.&nbsp;{ticketNo}
              </div>
              {qty > 1 && (
                <div style={{ background:`rgba(212,175,55,0.15)`, border:`1px solid ${gold}`,
                  color:gold, borderRadius:4,
                  padding: forPdf ? "5px 10px" : "1.5% 2.5%",
                  fontSize: forPdf ? 8 : "0.68em", fontWeight:700 }}>
                  QTY: {qty}
                </div>
              )}
              <div style={{ fontFamily:"'Great Vibes', cursive", color:gold,
                fontSize: forPdf ? 14 : "1.1em" }}>
                Pooling Construction Students Together!
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex:"0 0 32%", background:cream, color:dark,
          padding: forPdf ? "18px 40px 18px 20px" : "3.5% 6% 3.5% 3.5%",
          position:"relative", display:"flex", flexDirection:"column",
          justifyContent:"space-between" }}>

          {/* Gold sidebar strip */}
          <div style={{ position:"absolute", right:0, top:0, width: forPdf ? 28 : "8%",
            height:"100%", background:gold, writingMode:"vertical-rl",
            textOrientation:"mixed", display:"flex", alignItems:"center",
            justifyContent:"center", fontWeight:700,
            fontSize: forPdf ? 9 : "0.7em", color:dark,
            letterSpacing:"0.1em", overflow:"hidden" }}>
            {eventTitle.toUpperCase()}
          </div>

          {/* ADMIT header */}
          <div>
            <div style={{ textAlign:"center", fontWeight:900,
              fontSize: forPdf ? 16 : "1.25em",
              letterSpacing:"0.15em", color:dark, marginBottom: forPdf ? 6 : "2%" }}>
              ★ ADMIT ★
            </div>
            <div style={{ borderTop:`1.5px solid ${gold}`,
              marginBottom: forPdf ? 10 : "3%" }}/>
          </div>

          {/* Detail rows */}
          <div style={{ flex:1, display:"flex", flexDirection:"column",
            justifyContent:"space-evenly" }}>
            {[
              { label:"NAME",         val: name },
              { label:"BOOKING CODE", val: bookingCode },
              { label:"TICKET TYPE",  val: ticketType },
              { label:"STATUS",       val: status },
              { label:"AMOUNT",       val: `KES ${amount.toLocaleString()}` },
              ...(ticket.email ? [{ label:"EMAIL", val: ticket.email }] : []),
              ...(ticket.phone ? [{ label:"PHONE", val: ticket.phone }] : []),
            ].map(({ label, val }) => (
              <div key={label} style={{ display:"flex", alignItems:"flex-start",
                justifyContent:"space-between",
                borderBottom:`1px dotted rgba(212,175,55,0.5)`,
                padding: forPdf ? "4px 0" : "0.8% 0",
                gap:8 }}>
                <span style={{ fontSize: forPdf ? 7.5 : "0.63em", fontWeight:700,
                  color:gold, letterSpacing:"0.05em", flexShrink:0 }}>
                  {label}
                </span>
                <span style={{ fontSize: forPdf ? 8 : "0.67em", fontWeight:600,
                  color:dark, textAlign:"right", wordBreak:"break-word",
                  maxWidth:"60%" }}>
                  {val}
                </span>
              </div>
            ))}
          </div>

          {/* QR code */}
          <div style={{ display:"flex", flexDirection:"column",
            alignItems:"center", gap: forPdf ? 5 : "1.5%",
            marginTop: forPdf ? 10 : "2%" }}>
            <div style={{ border:`3px solid ${gold}`, borderRadius:6,
              overflow:"hidden", background:cream,
              width: forPdf ? 95 : "clamp(60px,25%,95px)",
              height: forPdf ? 95 : "clamp(60px,25%,95px)" }}>
              {qrUrl
                ? <img src={qrUrl} alt="QR"
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                : <div style={{ width:"100%", height:"100%", display:"flex",
                    alignItems:"center", justifyContent:"center",
                    fontSize: forPdf ? 7 : "0.6em", fontWeight:700, color:dark,
                    textAlign:"center", padding:4 }}>
                    Generating QR…
                  </div>
              }
            </div>
            <div style={{ textAlign:"center", fontSize: forPdf ? 7 : "0.58em",
              fontWeight:700, color:dark, lineHeight:1.5, letterSpacing:"0.05em" }}>
              SCAN FOR ENTRY<br/>VERIFICATION
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PDF download ────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
        // Ensure fonts are loaded
        document.fonts?.ready ?? Promise.resolve(),
      ]);

      const h2c   = (window as any).html2canvas;
      const jsPDF = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
      if (!h2c || !jsPDF) throw new Error("Libraries not loaded");

      // Wait a tick for the render div to paint
      await new Promise(r => setTimeout(r, 120));

      const el = renderRef.current;
      if (!el) throw new Error("Render element not found");

      const canvas = await h2c(el, {
        scale        : 1,           // div is already pixel-perfect size
        useCORS      : true,
        allowTaint   : true,
        backgroundColor: "#0a1128",
        width        : PX_W,
        height       : PX_H,
        windowWidth  : PX_W,
        windowHeight : PX_H,
        logging      : false,
        imageTimeout : 8000,
      });

      // PDF in points: 1pt = 1/72 in  →  8.5in × 72 = 612pt, 3.5in × 72 = 252pt
      const PT_W = 612, PT_H = 252;
      const pdf = new jsPDF({ orientation:"landscape", unit:"pt", format:[PT_H, PT_W] });
      const img = canvas.toDataURL("image/jpeg", 0.98);
      pdf.addImage(img, "JPEG", 0, 0, PT_W, PT_H);
      pdf.save(`CSA-Ticket-${ticketNo || "download"}.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
      alert("PDF generation failed — please try the HTML fallback.");
    } finally {
      setDownloading(false);
    }
  };

  // ── HTML fallback ───────────────────────────────────────────────────────────
  const handleHtmlFallback = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${eventTitle} — Ticket ${ticketNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&family=Great+Vibes&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
@page{size:8.5in 3.5in landscape;margin:0;}
html,body{width:8.5in;height:3.5in;overflow:hidden;background:#0a1128;}
body{display:flex;justify-content:center;align-items:center;}
.ticket{width:100%;height:100%;display:flex;}
</style>
</head>
<body>
<div class="ticket">
  <!-- Open this file in Chrome → Print → Save as PDF → Paper size: Custom 8.5×3.5 in, Landscape -->
  <!-- All details: Name: ${name} | Type: ${ticketType} | Code: ${bookingCode} | Ticket: ${ticketNo} | Status: ${status} | Amount: KES ${amount.toLocaleString()} -->
</div>
<p style="font-family:Montserrat;font-size:12px;color:#D4AF37;text-align:center;padding:20px;">
  Open in Chrome → File → Print → Paper size: Custom 8.5×3.5 in → Landscape → Save as PDF
</p>
</body>
</html>`;
    const blob = new Blob([html], { type:"text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `CSA-Ticket-${ticketNo}.html`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&family=Great+Vibes&display=swap" rel="stylesheet"/>

      {/* Hidden render target — exact pixel dimensions for PDF capture */}
      <div style={{ position:"fixed", top:"-9999px", left:"-9999px",
        width:PX_W, height:PX_H, overflow:"hidden", pointerEvents:"none",
        zIndex:-1 }} ref={renderRef}>
        <TicketMarkup forPdf/>
      </div>

      {/* Visible preview — scales to fill available width */}
      <div style={{ width:"100%", overflowX:"auto" }}>
        <div style={{ position:"relative", width:"100%",
          paddingBottom:`${(IN_H / IN_W) * 100}%` /* 3.5/8.5 aspect ratio */ }}>
          <div ref={previewRef} style={{ position:"absolute", inset:0,
            borderRadius:10, overflow:"hidden",
            boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
            <TicketMarkup/>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", justifyContent:"center", gap:12,
        marginTop:20, flexWrap:"wrap" }}>
        <button onClick={handleDownload} disabled={downloading || !qrUrl}
          style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"13px 28px",
            background: (downloading || !qrUrl)
              ? "rgba(212,175,55,0.3)"
              : "linear-gradient(135deg,#E6C875,#D4AF37)",
            color:"#0a1128", border:"none", borderRadius:10,
            fontWeight:700, fontSize:15, cursor:(downloading || !qrUrl) ? "not-allowed":"pointer",
            fontFamily:"Montserrat,sans-serif",
            boxShadow:"0 4px 14px rgba(212,175,55,0.35)",
          }}>
          {downloading ? "⏳ Generating PDF…" : "⬇ Download PDF Ticket"}
        </button>

        <button onClick={handleHtmlFallback}
          style={{
            padding:"13px 22px",
            background:"transparent", color:"#D4AF37",
            border:"2px solid #D4AF37", borderRadius:10,
            fontWeight:700, fontSize:14, cursor:"pointer",
            fontFamily:"Montserrat,sans-serif",
          }}>
          HTML Fallback
        </button>
      </div>

      <p style={{ textAlign:"center", marginTop:8, fontSize:11,
        color:"rgba(255,255,255,0.35)", fontFamily:"Montserrat,sans-serif" }}>
        Standard size: 8.5″ × 3.5″ landscape &nbsp;|&nbsp;
        PDF button waits for QR code to load before enabling
      </p>
    </>
  );
}
