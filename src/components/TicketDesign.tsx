/**
 * TicketDesign.tsx — v6 (perfectly balanced)
 * Fixed proportions, no overflow, crisp at all sizes
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
  const m = day % 100;
  if (m >= 11 && m <= 13) return "TH";
  switch (day % 10) {
    case 1: return "ST"; case 2: return "ND"; case 3: return "RD"; default: return "TH";
  }
}

function formatEventDate(dateStr: string | null | undefined) {
  const DAYS   = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  if (!dateStr) return { dayName:"FRIDAY", day:"12", suffix:"TH", month:"JUNE", year:"2026", startTime:"7:00 PM" };
  const d = new Date(dateStr);
  const day = d.getDate();
  const h = d.getHours(), mm = d.getMinutes().toString().padStart(2,"0");
  return {
    dayName: DAYS[d.getDay()], day: String(day), suffix: ordinalSuffix(day),
    month: MONTHS[d.getMonth()], year: String(d.getFullYear()),
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
    s.src = src; s.onload = () => res(); s.onerror = () => rej();
    document.head.appendChild(s);
  });
}

// 8.5 × 3.5 in @ 150 dpi
const PX_W = 1275;
const PX_H = 525;
const GOLD  = "#D4AF37";
const DARK  = "#0A1525";
const CREAM = "#F5F0E8";
const BG    = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format";

export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const renderRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  const ticketType  = (ticket.type_name || ticket.ticket_type || "Regular").toUpperCase();
  const bookingCode = ticket.booking_code ?? "";
  const name        = (ticket.purchaser_name ?? "").toUpperCase();
  const ticketNo    = ticket.ticket_number ?? "";
  const status      = (ticket.payment_status ?? "PENDING").toUpperCase();
  const amount      = ticket.total_amount ?? 0;
  const isPaid      = ["PAID","CONFIRMED","PARTIAL"].includes(status);

  const eventTitle  = (ticket.event_title || "ANNUAL CSA GALA DINNER").toUpperCase();
  const eventTheme  = ticket.event_theme || "LAYING THE FIRST STONE: Honoring the Past, Empowering the Present and Inspiring the Future of Construction";
  const eventVenue  = (ticket.event_venue || "UTALII HOUSE, NAIROBI").toUpperCase();
  const date        = formatEventDate(ticket.event_date);
  const endTime     = formatEndTime(ticket.event_end_time);
  const timeDisplay = endTime ? `${date.startTime} – ${endTime}` : date.startTime;
  const qrPayload   = ticketNo || bookingCode;

  useEffect(() => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&ecc=H&data=${encodeURIComponent(qrPayload)}`;
    setQrUrl(url);
  }, [qrPayload]);

  // ── Shared ticket markup ─────────────────────────────────────────────────
  function TicketMarkup({ forPdf = false }: { forPdf?: boolean }) {
    const scale = forPdf ? 1 : 1;
    const s = (n: number) => forPdf ? n : n; // both use same values; CSS % handles preview

    return (
      <div style={{
        width: forPdf ? PX_W : "100%",
        height: forPdf ? PX_H : "100%",
        display: "flex",
        fontFamily: "'Montserrat','Arial',sans-serif",
        overflow: "hidden",
        position: "relative",
        background: DARK,
      }}>

        {/* ══ LEFT PANEL (65%) ══ */}
        <div style={{
          width: forPdf ? 830 : "65%",
          flexShrink: 0,
          display: "flex",
          backgroundImage: `linear-gradient(rgba(10,21,37,0.85),rgba(10,21,37,0.85)),url('${BG}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRight: `3px dashed ${GOLD}`,
          position: "relative",
          boxSizing: "border-box",
          padding: forPdf ? "22px 20px 18px 22px" : "3.8% 2.5% 3% 3%",
          gap: forPdf ? 20 : "2%",
        }}>

          {/* Notch circles on dashed border */}
          {[{top:"-12px"},{bottom:"-12px"}].map((pos,i)=>(
            <div key={i} style={{
              position:"absolute", right:-13, width:26, height:26,
              background:"#1a2535", borderRadius:"50%", zIndex:10, ...pos
            }}/>
          ))}

          {/* ── LEFT STRIP: logo + date ── */}
          <div style={{
            width: forPdf ? 130 : "19%",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            {/* Logo */}
            <div style={{
              width: forPdf ? 70 : "clamp(42px,55%,70px)",
              height: forPdf ? 70 : "clamp(42px,55%,70px)",
              borderRadius: "50%",
              border: `3px solid ${GOLD}`,
              background: "white",
              overflow: "hidden",
              marginBottom: forPdf ? 14 : "8%",
              flexShrink: 0,
            }}>
              <img
                src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg"
                alt="CSA"
                style={{ width:"85%", height:"85%", objectFit:"contain", margin:"7.5%", display:"block" }}
              />
            </div>

            {/* Day name */}
            <div style={{ fontSize: forPdf ? 9 : "0.75em", fontWeight:700,
              color:"rgba(255,255,255,0.7)", letterSpacing:"0.05em",
              marginBottom: forPdf ? 2 : "1%", textAlign:"center" }}>
              {date.dayName}
            </div>

            {/* Big day */}
            <div style={{ display:"flex", alignItems:"flex-start", lineHeight:1,
              marginBottom: forPdf ? 3 : "1%" }}>
              <span style={{ fontSize: forPdf ? 48 : "3.8em", fontWeight:900,
                color:GOLD, lineHeight:0.9 }}>
                {date.day}
              </span>
              <sup style={{ fontSize: forPdf ? 14 : "1.1em", fontWeight:700,
                color:GOLD, marginTop: forPdf ? 5 : "0.3em" }}>
                {date.suffix}
              </sup>
            </div>

            {/* Month / Year */}
            <div style={{ fontSize: forPdf ? 9.5 : "0.78em", fontWeight:700,
              color:"white", lineHeight:1.45,
              borderLeft: `2px solid ${GOLD}`,
              paddingLeft: forPdf ? 8 : "10%",
              marginBottom: forPdf ? 12 : "6%",
              alignSelf: "flex-start",
            }}>
              {date.month}<br/>{date.year}
            </div>

            <div style={{ borderTop:`1px solid ${GOLD}`, width:"90%", marginBottom: forPdf ? 10 : "5%" }}/>

            {/* Time */}
            <div style={{ marginBottom: forPdf ? 10 : "5%", alignSelf:"flex-start" }}>
              <div style={{ fontSize: forPdf ? 7 : "0.58em", color:GOLD, fontWeight:700,
                letterSpacing:"0.1em", marginBottom: forPdf ? 2 : "2%" }}>
                ⏰ TIME
              </div>
              <div style={{ fontSize: forPdf ? 8.5 : "0.7em", fontWeight:700,
                color:"rgba(255,255,255,0.9)", lineHeight:1.4 }}>
                {timeDisplay}
              </div>
            </div>

            <div style={{ borderTop:`1px solid ${GOLD}`, width:"90%", marginBottom: forPdf ? 10 : "5%" }}/>

            {/* Venue */}
            <div style={{ alignSelf:"flex-start" }}>
              <div style={{ fontSize: forPdf ? 7 : "0.58em", color:GOLD, fontWeight:700,
                letterSpacing:"0.1em", marginBottom: forPdf ? 2 : "2%" }}>
                📍 VENUE
              </div>
              <div style={{ fontSize: forPdf ? 8 : "0.66em", fontWeight:700,
                color:"rgba(255,255,255,0.9)", lineHeight:1.45 }}>
                {eventVenue}
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div style={{ flex:1, display:"flex", flexDirection:"column",
            justifyContent:"space-between", minWidth:0 }}>

            {/* Title block */}
            <div>
              <div style={{
                fontFamily:"'Playfair Display','Georgia',serif",
                fontWeight:900, color:GOLD,
                fontSize: forPdf ? 56 : "4.4em",
                lineHeight:0.9, letterSpacing:"0.02em",
              }}>GALA</div>
              <div style={{
                fontFamily:"'Playfair Display','Georgia',serif",
                fontWeight:700, color:"white",
                fontSize: forPdf ? 42 : "3.3em",
                lineHeight:0.9, marginBottom: forPdf ? 8 : "2%",
              }}>DINNER {date.year}</div>

              <div style={{ color:GOLD, fontSize: forPdf ? 8 : "0.66em",
                fontWeight:700, letterSpacing:"0.14em",
                marginBottom: forPdf ? 10 : "2.5%" }}>
                AWARDS &nbsp;•&nbsp; NETWORKING &nbsp;•&nbsp; ENTERTAINMENT
              </div>

              {/* Theme */}
              <div style={{
                border:`1px solid ${GOLD}`, borderRadius:4,
                padding: forPdf ? "7px 10px" : "1.6% 2%",
                background:"rgba(10,21,37,0.5)",
                fontSize: forPdf ? 8 : "0.66em",
                lineHeight:1.55, color:"rgba(255,255,255,0.85)",
                overflow:"hidden",
                display:"-webkit-box",
                WebkitLineClamp:"3",
                WebkitBoxOrient:"vertical",
              }}>
                <span style={{ color:GOLD, fontWeight:700 }}>THEME: </span>
                {eventTheme}
              </div>
            </div>

            {/* Ticket type banner */}
            <div>
              <div style={{ color:GOLD, fontSize: forPdf ? 7.5 : "0.62em",
                fontWeight:700, letterSpacing:"0.1em",
                marginBottom: forPdf ? 5 : "1.5%" }}>
                TICKET TYPE
              </div>
              <div style={{
                background:"#FFD700", color:DARK,
                borderRadius:5, padding: forPdf ? "9px 14px" : "2% 2.5%",
                fontWeight:900, fontSize: forPdf ? 15 : "1.2em",
                textAlign:"center", letterSpacing:"0.15em",
              }}>
                ★ &nbsp;{ticketType}&nbsp; ★
              </div>
            </div>

            {/* Bottom row */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", gap: forPdf ? 8 : "2%", flexWrap:"nowrap" }}>
              <div style={{
                background:CREAM, color:DARK, borderRadius:4,
                padding: forPdf ? "5px 9px" : "1.2% 1.8%",
                fontSize: forPdf ? 8 : "0.65em", fontWeight:700, whiteSpace:"nowrap",
              }}>
                TICKET NO. {ticketNo}
              </div>
              <div style={{
                fontFamily:"'Great Vibes','Brush Script MT',cursive",
                color:GOLD, fontSize: forPdf ? 14 : "1.1em",
                textAlign:"right", flexShrink:1, minWidth:0,
                overflow:"hidden", whiteSpace:"nowrap",
              }}>
                Pooling Construction Students Together!
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL (35%) ══ */}
        <div style={{
          width: forPdf ? 445 : "35%",
          flexShrink: 0,
          background: CREAM,
          color: DARK,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxSizing: "border-box",
          // right sidebar taken by gold strip
          paddingRight: forPdf ? 38 : "8.5%",
          paddingLeft: forPdf ? 16 : "3%",
          paddingTop: forPdf ? 18 : "3%",
          paddingBottom: forPdf ? 14 : "2.5%",
        }}>

          {/* Gold vertical sidebar */}
          <div style={{
            position:"absolute", right:0, top:0, bottom:0,
            width: forPdf ? 34 : "9%",
            background: GOLD,
            writingMode:"vertical-rl",
            textOrientation:"mixed",
            transform:"rotate(180deg)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontSize: forPdf ? 9.5 : "0.7em",
            color:DARK, letterSpacing:"0.12em",
            overflow:"hidden", whiteSpace:"nowrap",
          }}>
            {eventTitle}
          </div>

          {/* ADMIT header */}
          <div style={{ textAlign:"center", fontWeight:900,
            fontSize: forPdf ? 17 : "1.3em", letterSpacing:"0.16em",
            color:DARK, marginBottom: forPdf ? 4 : "1%" }}>
            ★ ADMIT ★
          </div>
          <div style={{ borderTop:`2.5px solid ${GOLD}`,
            marginBottom: forPdf ? 8 : "1.5%" }}/>

          {/* Detail rows */}
          <div style={{ flex:1, display:"flex", flexDirection:"column",
            justifyContent:"space-evenly" }}>
            {[
              { label:"NAME",         val: name },
              ...(isPaid && bookingCode ? [{ label:"BOOKING CODE", val: bookingCode }] : []),
              { label:"TICKET TYPE",  val: ticketType },
              { label:"STATUS",       val: isPaid ? "✓ CONFIRMED" : status },
              { label:"AMOUNT",       val: `KSH ${amount.toLocaleString()}` },
            ].map(({ label, val }) => (
              <div key={label} style={{
                display:"flex", alignItems:"center",
                borderBottom:`1px dotted rgba(180,150,40,0.4)`,
                padding: forPdf ? "4px 0" : "0.5% 0",
                gap: forPdf ? 6 : "2%",
              }}>
                <div style={{
                  width: forPdf ? 18 : "clamp(12px,5%,18px)",
                  height: forPdf ? 18 : "clamp(12px,5%,18px)",
                  border:`1.5px solid ${GOLD}`, borderRadius:"50%", flexShrink:0,
                }}/>
                <span style={{ fontSize: forPdf ? 7 : "0.58em", fontWeight:700,
                  color:GOLD, letterSpacing:"0.04em", flexShrink:0,
                  textTransform:"uppercase", minWidth: forPdf ? 70 : "22%" }}>
                  {label}
                </span>
                <span style={{ fontSize: forPdf ? 8 : "0.66em", fontWeight:700,
                  color:DARK, marginLeft:"auto", textAlign:"right",
                  wordBreak:"break-all", maxWidth:"55%" }}>
                  {val}
                </span>
              </div>
            ))}
          </div>

          {/* QR code */}
          <div style={{ display:"flex", flexDirection:"column",
            alignItems:"center", marginTop: forPdf ? 6 : "1.5%", gap: forPdf ? 4 : "1%" }}>
            <div style={{
              border:`3px solid ${GOLD}`, borderRadius:6,
              overflow:"hidden", background:"#fff",
              width: forPdf ? 96 : "clamp(52px,26%,96px)",
              height: forPdf ? 96 : "clamp(52px,26%,96px)",
            }}>
              {qrUrl
                ? <img src={qrUrl} alt="QR" style={{ width:"100%", height:"100%", display:"block" }}/>
                : <div style={{ width:"100%", height:"100%", display:"flex",
                    alignItems:"center", justifyContent:"center",
                    fontSize: forPdf ? 7 : "0.55em", color:DARK, textAlign:"center" }}>
                    Loading…
                  </div>
              }
            </div>
            <div style={{ textAlign:"center", fontSize: forPdf ? 6.5 : "0.55em",
              fontWeight:700, color:DARK, lineHeight:1.5, letterSpacing:"0.06em" }}>
              SCAN FOR ENTRY
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
      await new Promise(r => setTimeout(r, 300));
      const el = renderRef.current;
      if (!el) throw new Error("Render target missing");
      const canvas = await h2c(el, {
        scale:1, useCORS:true, allowTaint:true,
        backgroundColor:DARK, width:PX_W, height:PX_H,
        windowWidth:PX_W, windowHeight:PX_H,
        logging:false, imageTimeout:12000,
      });
      const PT_W = 612, PT_H = 252;
      const pdf = new jsPDF({ orientation:"landscape", unit:"pt", format:[PT_H, PT_W] });
      pdf.addImage(canvas.toDataURL("image/jpeg",0.98),"JPEG",0,0,PT_W,PT_H);
      pdf.save(`CSA-Ticket-${ticketNo||"download"}.pdf`);
    } catch(err) {
      console.error("PDF error:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700;900&family=Great+Vibes&display=swap" rel="stylesheet"/>

      {/* Hidden PDF render target — fixed size */}
      <div style={{ position:"fixed", top:"-9999px", left:"-9999px",
        width:PX_W, height:PX_H, overflow:"hidden", pointerEvents:"none", zIndex:-1 }}
        ref={renderRef}>
        <TicketMarkup forPdf/>
      </div>

      {/* Visible responsive preview */}
      <div style={{ width:"100%", overflowX:"auto" }}>
        <div style={{ position:"relative", width:"100%", paddingBottom:`${(3.5/8.5)*100}%` }}>
          <div style={{ position:"absolute", inset:0, borderRadius:10,
            overflow:"hidden", boxShadow:"0 12px 40px rgba(0,0,0,0.55)" }}>
            <TicketMarkup/>
          </div>
        </div>
      </div>

      {/* Download button */}
      <div style={{ display:"flex", justifyContent:"center", marginTop:18 }}>
        <button
          onClick={handleDownload}
          disabled={downloading || !qrUrl}
          style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"13px 32px",
            background: downloading || !qrUrl
              ? "rgba(212,175,55,0.3)"
              : "linear-gradient(135deg,#E6C875,#D4AF37)",
            color:DARK, border:"none", borderRadius:10,
            fontWeight:700, fontSize:15,
            cursor: downloading || !qrUrl ? "not-allowed" : "pointer",
            fontFamily:"Montserrat,sans-serif",
            boxShadow:"0 4px 14px rgba(212,175,55,0.3)",
          }}>
          {downloading ? "⏳ Generating PDF…" : "⬇ Download PDF Ticket"}
        </button>
      </div>

      <p style={{ textAlign:"center", marginTop:8, fontSize:11,
        color:"rgba(255,255,255,0.3)", fontFamily:"Montserrat,sans-serif" }}>
        8.5″ × 3.5″ landscape · Button enables once QR loads
      </p>
    </>
  );
}
