/**
 * TicketDesign.tsx — v12
 *
 * PDF strategy: pure Canvas 2D API — no html2canvas, no external capture lib.
 * Draws every element directly onto an OffscreenCanvas / regular Canvas.
 * 100% reliable on all browsers and mobile devices.
 *
 * Preview: React JSX (HTML/CSS) that exactly mirrors the canvas drawing.
 * Both use the same data so what-you-see = what-you-get in the PDF.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type TicketData = {
  ticket_number: string;
  purchaser_name: string;
  booking_code: string;
  ticket_type?: string;
  type_name?: string;
  total_amount: number;
  payment_status: string;
  qr_code?: string;
  event_title?: string;
  event_theme?: string;
  event_venue?: string;
  event_date?: string | null;
  event_end_time?: string | null;
  event_id?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ordSuffix(n: number) {
  const m = n % 100;
  if (m >= 11 && m <= 13) return "TH";
  switch (n % 10) { case 1: return "ST"; case 2: return "ND"; case 3: return "RD"; default: return "TH"; }
}
function parseDate(s: string | null | undefined) {
  const DAYS = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  if (!s) return { dayName:"FRIDAY", day:"12", suf:"TH", month:"JUNE", year:"2026", h:19, mi:0 };
  const d = new Date(s);
  return { dayName:DAYS[d.getDay()], day:String(d.getDate()), suf:ordSuffix(d.getDate()),
           month:MONTHS[d.getMonth()], year:String(d.getFullYear()), h:d.getHours(), mi:d.getMinutes() };
}
function to12(h: number, mi: number) {
  return `${h%12||12}:${mi.toString().padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}
function parseEnd(t: string | null | undefined) {
  if (!t) return null;
  const [h,m] = t.split(":").map(Number);
  return to12(h, m??0);
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => res(img); img.onerror = () => rej(new Error("img load: "+src));
    img.src = src;
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((res,rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = ()=>res(); s.onerror = ()=>rej();
    document.head.appendChild(s);
  });
}

// Wrap text into lines fitting maxWidth
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" "); const lines: string[] = []; let line = "";
  for (const w of words) {
    const test = line ? line+" "+w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD   = "#C9A227";
const GOLD2  = "#F5C000";
const DARK   = "#0B1322";
const DARK2  = "#0f1b30";
const CREAM  = "#F2EDD7";
const WHITE  = "#FFFFFF";
const LOGO_URL = "https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg";
const BG_URL   = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format";
const QR_BASE  = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=";

// Canvas dimensions — 8.5×3.5 in @ 150dpi, then scale×2 for crispness
const W = 1275, H = 525;
const LW = 860;   // left panel width
const RW = W-LW;  // right panel = 415
const GBW = 38;   // gold sidebar width

// ─── Canvas drawing function ─────────────────────────────────────────────────
async function drawTicket(
  canvas: HTMLCanvasElement,
  data: {
    dayName:string; day:string; suf:string; month:string; year:string;
    timeStr:string; venue:string; theme:string; evTitle:string;
    ticketType:string; name:string; bookingCode:string; ticketNo:string;
    statusLabel:string; statusColor:string; amount:string;
    logoImg: HTMLImageElement | null;
    bgImg:   HTMLImageElement | null;
    qrImg:   HTMLImageElement | null;
  }
) {
  const scale = 2; // retina
  canvas.width  = W * scale;
  canvas.height = H * scale;
  canvas.style.width  = W+"px";
  canvas.style.height = H+"px";
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const { dayName,day,suf,month,year,timeStr,venue,theme,evTitle,
          ticketType,name,bookingCode,ticketNo,statusLabel,statusColor,amount,
          logoImg,bgImg,qrImg } = data;

  // ── LEFT PANEL ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath(); ctx.rect(0,0,LW,H); ctx.clip();

  // background photo
  ctx.fillStyle = DARK;
  ctx.fillRect(0,0,LW,H);
  if (bgImg) {
    ctx.globalAlpha = 0.38;
    // cover-fit the image
    const iR = bgImg.width/bgImg.height, cR = LW/H;
    let sw=bgImg.width, sh=bgImg.height, sx=0, sy=0;
    if (iR > cR) { sw = sh*cR; sx = (bgImg.width-sw)/2; }
    else         { sh = sw/cR; sy = (bgImg.height-sh)/2; }
    ctx.drawImage(bgImg, sx,sy,sw,sh, 0,0,LW,H);
    ctx.globalAlpha = 1;
  }
  // dark gradient overlay
  const grad = ctx.createLinearGradient(0,0,LW,0);
  grad.addColorStop(0,   "rgba(11,19,34,0.97)");
  grad.addColorStop(0.6, "rgba(11,19,34,0.93)");
  grad.addColorStop(1,   "rgba(11,19,34,0.78)");
  ctx.fillStyle = grad; ctx.fillRect(0,0,LW,H);

  ctx.restore();

  // dashed right border
  ctx.save();
  ctx.setLineDash([12,8]); ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(201,162,39,0.8)";
  ctx.beginPath(); ctx.moveTo(LW,0); ctx.lineTo(LW,H); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // notch circles
  ctx.fillStyle = CREAM;
  ctx.beginPath(); ctx.arc(LW,0,16,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(LW,H,16,0,Math.PI*2); ctx.fill();

  // ── Left column (logo · date · time · venue) ────────────────────────────
  const LC = 22;  // left column x-start
  const LCW = 162; // left column width

  // Logo circle
  const logoR = 36, logoCX = LC+LCW/2, logoCY = 62;
  ctx.save();
  ctx.beginPath(); ctx.arc(logoCX, logoCY, logoR, 0, Math.PI*2);
  ctx.fillStyle = WHITE; ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
  if (logoImg) {
    ctx.clip();
    const lpad = 4;
    ctx.drawImage(logoImg, logoCX-(logoR-lpad), logoCY-(logoR-lpad), (logoR-lpad)*2, (logoR-lpad)*2);
  }
  ctx.restore();

  // Day name
  ctx.font = "700 11px 'Montserrat',Arial"; ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.fillText(dayName, logoCX, 112);

  // Big date + suffix
  ctx.font = "900 72px Georgia"; ctx.fillStyle = GOLD; ctx.textAlign = "left";
  const dayX = LC+8;
  ctx.fillText(day, dayX, 186);
  const dayW = ctx.measureText(day).width;
  ctx.font = "800 18px Georgia"; ctx.fillStyle = GOLD;
  ctx.fillText(suf, dayX+dayW+2, 152);

  // Gold bar + month/year
  const barX = LC+6, barY = 194, barH = 38;
  ctx.fillStyle = GOLD; ctx.fillRect(barX,barY,3,barH);
  ctx.font = "700 12px 'Montserrat',Arial"; ctx.fillStyle = WHITE; ctx.textAlign = "left";
  ctx.fillText(month, barX+9, barY+13);
  ctx.fillText(year,  barX+9, barY+29);

  // Divider
  let divY = 246;
  ctx.strokeStyle = "rgba(201,162,39,0.45)"; ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(LC,divY); ctx.lineTo(LC+130,divY); ctx.stroke();

  // Clock icon + TIME label
  let infoY = divY + 16;
  ctx.font = "700 9px 'Montserrat',Arial"; ctx.fillStyle = GOLD;
  ctx.fillText("⏰  TIME", LC, infoY);
  infoY += 16;
  ctx.font = "700 11px 'Montserrat',Arial"; ctx.fillStyle = "rgba(255,255,255,0.92)";
  // wrap time if needed
  const timeLines = wrapText(ctx, timeStr, 138);
  for (const tl of timeLines) { ctx.fillText(tl, LC, infoY); infoY += 15; }

  // Divider
  divY = infoY + 8;
  ctx.strokeStyle = "rgba(201,162,39,0.45)";
  ctx.beginPath(); ctx.moveTo(LC,divY); ctx.lineTo(LC+130,divY); ctx.stroke();

  // Pin icon + VENUE label
  infoY = divY + 15;
  ctx.font = "700 9px 'Montserrat',Arial"; ctx.fillStyle = GOLD;
  ctx.fillText("📍  VENUE", LC, infoY);
  infoY += 16;
  ctx.font = "700 11px 'Montserrat',Arial"; ctx.fillStyle = "rgba(255,255,255,0.92)";
  const venueLines = wrapText(ctx, venue, 138);
  for (const vl of venueLines) { ctx.fillText(vl, LC, infoY); infoY += 15; }

  // ── Main content column ──────────────────────────────────────────────────
  const MX = LC + LCW + 14; // main column x
  const MW = LW - MX - 16;  // main column width

  // GALA
  ctx.font = "900 72px 'Playfair Display',Georgia"; ctx.fillStyle = GOLD; ctx.textAlign = "left";
  ctx.fillText("GALA", MX, 82);
  // DINNER 2026
  ctx.font = "700 52px 'Playfair Display',Georgia"; ctx.fillStyle = WHITE;
  ctx.fillText("DINNER "+year, MX, 136);
  // tagline
  ctx.font = "700 10px 'Montserrat',Arial"; ctx.fillStyle = GOLD;
  ctx.letterSpacing = "0.18em";
  ctx.fillText("AWARDS  •  NETWORKING  •  ENTERTAINMENT", MX, 158);
  ctx.letterSpacing = "0";

  // Theme box
  const themeBoxY = 168, themeBoxH = 68;
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
  ctx.fillStyle = "rgba(11,19,34,0.6)";
  roundRect(ctx, MX, themeBoxY, MW, themeBoxH, 5);
  ctx.fill(); ctx.stroke();
  // theme text
  ctx.font = "700 11px 'Montserrat',Arial"; ctx.fillStyle = GOLD;
  ctx.fillText("THEME: ", MX+11, themeBoxY+18);
  const themeLabelW = ctx.measureText("THEME: ").width;
  ctx.font = "500 11px 'Montserrat',Arial"; ctx.fillStyle = "rgba(255,255,255,0.88)";
  // wrap theme text
  const themeMaxW = MW - 22;
  ctx.font = "500 11px 'Montserrat',Arial";
  const fullTheme = theme;
  // First line starts after "THEME: "
  const firstLineMaxW = themeMaxW - themeLabelW;
  const allWords = fullTheme.split(" ");
  let firstLine = ""; let rest = "";
  for (let i=0; i<allWords.length; i++) {
    const test = firstLine ? firstLine+" "+allWords[i] : allWords[i];
    if (ctx.measureText(test).width > firstLineMaxW) {
      rest = allWords.slice(i).join(" "); break;
    }
    firstLine = test;
  }
  ctx.fillText(firstLine, MX+11+themeLabelW, themeBoxY+18);
  if (rest) {
    const restLines = wrapText(ctx, rest, themeMaxW);
    restLines.slice(0,2).forEach((rl,i) => ctx.fillText(rl, MX+11, themeBoxY+18+16*(i+1)));
  }

  // TICKET TYPE label
  const ttY = themeBoxY + themeBoxH + 16;
  ctx.font = "700 9.5px 'Montserrat',Arial"; ctx.fillStyle = GOLD;
  ctx.fillText("TICKET TYPE", MX, ttY);

  // Yellow ribbon
  const ribY = ttY+6, ribH = 44;
  ctx.fillStyle = GOLD2;
  roundRect(ctx, MX, ribY, MW, ribH, 5); ctx.fill();
  ctx.font = "900 20px 'Montserrat',Arial"; ctx.fillStyle = DARK; ctx.textAlign = "center";
  ctx.fillText("★  "+ticketType+"  ★", MX+MW/2, ribY+ribH/2+7);
  ctx.textAlign = "left";

  // Footer row: ticket no box + italic tagline
  const footY = ribY + ribH + 10;
  // ticket no box
  ctx.fillStyle = CREAM; ctx.strokeStyle = "rgba(201,162,39,0.35)"; ctx.lineWidth = 1;
  const tnLabel = "TICKET NO. "+ticketNo;
  ctx.font = "700 10.5px 'Montserrat',Arial";
  const tnW = ctx.measureText(tnLabel).width + 22;
  roundRect(ctx, MX, footY-14, tnW, 24, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = DARK; ctx.fillText(tnLabel, MX+11, footY+2);
  // italic tagline
  ctx.font = "italic 700 14px Georgia"; ctx.fillStyle = GOLD;
  ctx.textAlign = "right";
  ctx.fillText("Pooling Construction Students Together!", LW-18, footY+4);
  ctx.textAlign = "left";

  // ── RIGHT PANEL ─────────────────────────────────────────────────────────
  const RX = LW; // right panel x-start
  ctx.fillStyle = CREAM; ctx.fillRect(RX, 0, RW, H);

  // Gold sidebar
  ctx.fillStyle = GOLD; ctx.fillRect(W-GBW, 0, GBW, H);
  // Sidebar text — rotated
  ctx.save();
  ctx.translate(W - GBW/2, H/2);
  ctx.rotate(-Math.PI/2);
  ctx.font = "800 9.5px 'Montserrat',Arial";
  ctx.fillStyle = DARK; ctx.textAlign = "center";
  ctx.fillText(evTitle, 0, 4);
  ctx.restore();

  // ★ ADMIT ★
  ctx.font = "900 20px 'Montserrat',Arial"; ctx.fillStyle = DARK;
  ctx.textAlign = "center";
  ctx.fillText("★  ADMIT  ★", RX + (RW-GBW)/2, 38);
  ctx.textAlign = "left";

  // Gold divider under ADMIT
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(RX+10, 48); ctx.lineTo(W-GBW-10, 48); ctx.stroke();

  // Detail rows
  const rows = [
    { l:"NAME",         v: name,          vc: DARK },
    { l:"BOOKING CODE", v: bookingCode,   vc: DARK },
    { l:"TICKET TYPE",  v: ticketType,    vc: DARK },
    { l:"STATUS",       v: statusLabel,   vc: statusColor },
    { l:"AMOUNT",       v: amount,        vc: DARK },
  ];
  const rowAreaH = 240; // height for 5 rows
  const rowH = rowAreaH / rows.length;
  const rowStartY = 58;
  const rContentW = RW - GBW - 20;

  rows.forEach((row, i) => {
    const ry = rowStartY + i*rowH;
    // separator line
    ctx.strokeStyle = "rgba(201,162,39,0.28)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(RX+10, ry+rowH-2); ctx.lineTo(W-GBW-10, ry+rowH-2); ctx.stroke();
    // label
    ctx.font = "700 9.5px 'Montserrat',Arial"; ctx.fillStyle = GOLD;
    ctx.fillText(row.l, RX+30, ry + rowH/2 + 4);
    // value
    ctx.font = "700 11px 'Montserrat',Arial"; ctx.fillStyle = row.vc;
    ctx.textAlign = "right";
    ctx.fillText(row.v, RX + rContentW + 10, ry + rowH/2 + 4);
    ctx.textAlign = "left";
  });

  // QR code
  const qrSize = 108;
  const qrX = RX + (RW - GBW - qrSize)/2 + 6;
  const qrY = rowStartY + rowAreaH + 8;
  // white bg + gold border
  ctx.fillStyle = WHITE;
  roundRect(ctx, qrX-3, qrY-3, qrSize+6, qrSize+6, 5); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5;
  roundRect(ctx, qrX-3, qrY-3, qrSize+6, qrSize+6, 5); ctx.stroke();
  if (qrImg) ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // SCAN QR label
  ctx.font = "700 8px 'Montserrat',Arial"; ctx.fillStyle = DARK;
  ctx.textAlign = "center";
  const scanX = qrX + qrSize/2;
  ctx.fillText("⬡ SCAN QR", scanX, qrY+qrSize+14);
  ctx.fillText("FOR ENTRY", scanX, qrY+qrSize+24);
  ctx.fillText("VERIFICATION", scanX, qrY+qrSize+34);
  ctx.textAlign = "left";
}

// ─── Rounded rect helper ──────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [ev, setEv] = useState<any>(null);

  // Live event fetch
  useEffect(() => {
    (async () => {
      let d: any = null;
      if (ticket.event_id) {
        ({ data: d } = await supabase.from("events")
          .select("title,theme,venue,event_date,end_time")
          .eq("id", ticket.event_id).maybeSingle());
      }
      if (!d) {
        ({ data: d } = await supabase.from("events")
          .select("title,theme,venue,event_date,end_time")
          .eq("status","published").order("event_date",{ascending:true}).limit(1).maybeSingle());
      }
      if (!d) {
        ({ data: d } = await supabase.from("events")
          .select("title,theme,venue,event_date,end_time")
          .order("created_at",{ascending:false}).limit(1).maybeSingle());
      }
      if (d) setEv(d);
    })();
  }, [ticket.event_id]);

  const evTitle  = (ev?.title || ticket.event_title || "ANNUAL CSA GALA DINNER").toUpperCase();
  const evTheme  = (ev?.theme || ticket.event_theme || "Laying the first foundations").replace(/^["']+|["']+$/g,"");
  const evVenue  = (ev?.venue || ticket.event_venue || "KINGFISHER NEST HOTEL").toUpperCase();
  const evDate   = ev?.event_date   ?? ticket.event_date   ?? null;
  const evEndRaw = ev?.end_time     ?? ticket.event_end_time ?? null;

  const dt      = parseDate(evDate);
  const endStr  = parseEnd(evEndRaw);
  const timeStr = endStr ? `${to12(dt.h,dt.mi)} – ${endStr}` : to12(dt.h,dt.mi);

  const ticketType  = (ticket.type_name || ticket.ticket_type || "REGULAR").toUpperCase();
  const name        = (ticket.purchaser_name ?? "").toUpperCase();
  const bookingCode = ticket.booking_code ?? "";
  const ticketNo    = ticket.ticket_number ?? "";
  const status      = (ticket.payment_status ?? "PENDING").toUpperCase();
  const amount      = ticket.total_amount ?? 0;
  const isPaid      = ["PAID","CONFIRMED","PARTIAL"].includes(status);
  const statusLabel = isPaid ? "PAID" : status;
  const statusColor = isPaid ? "#16a34a" : "#b45309";
  const amountStr   = `KSH ${amount.toLocaleString()}`;
  const qrUrl       = (ticketNo || bookingCode)
    ? `${QR_BASE}${encodeURIComponent(ticketNo||bookingCode)}`
    : "";

  const drawData = {
    dayName:dt.dayName, day:dt.day, suf:dt.suf, month:dt.month, year:dt.year,
    timeStr, venue:evVenue, theme:evTheme, evTitle,
    ticketType, name, bookingCode, ticketNo,
    statusLabel, statusColor, amount:amountStr,
    logoImg:null as any, bgImg:null as any, qrImg:null as any,
  };

  // Load images + draw preview on canvas
  useEffect(() => {
    if (!previewRef.current || !qrUrl || !ev) return;
    let cancelled = false;
    (async () => {
      const [logoImg, bgImg, qrImg] = await Promise.all([
        loadImg(LOGO_URL).catch(()=>null),
        loadImg(BG_URL).catch(()=>null),
        loadImg(qrUrl).catch(()=>null),
      ]);
      if (cancelled) return;
      setQrReady(!!qrImg);
      await drawTicket(previewRef.current!, { ...drawData, logoImg, bgImg, qrImg });
    })();
    return () => { cancelled = true; };
  }, [ev, qrUrl, name, bookingCode, ticketNo, ticketType, statusLabel, amountStr, evTitle]);

  // ─── PDF download — same canvas, just save via jsPDF ───────────────────
  const handleDownload = async () => {
    if (downloading || !qrReady) return;
    setDownloading(true);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const jsPDF = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
      if (!jsPDF) throw new Error("jsPDF missing");

      // Draw onto a fresh high-res canvas
      const cv = document.createElement("canvas");
      const [logoImg, bgImg, qrImg] = await Promise.all([
        loadImg(LOGO_URL).catch(()=>null),
        loadImg(BG_URL).catch(()=>null),
        loadImg(qrUrl).catch(()=>null),
      ]);
      await drawTicket(cv, { ...drawData, logoImg, bgImg, qrImg });

      // Export at 8.5 × 3.5 in landscape
      const PW = 612, PH = 252;
      const pdf = new jsPDF({ orientation:"landscape", unit:"pt", format:[PH,PW] });
      // Use PNG for lossless quality
      const imgData = cv.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, PW, PH);
      pdf.save(`CSA-Ticket-${ticketNo||"download"}.pdf`);

    } catch(err) {
      console.error("PDF error:", err);
      alert("Could not generate PDF — please screenshot your ticket.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet"/>

      {/* Responsive canvas preview */}
      <div style={{ width:"100%", overflowX:"auto" }}>
        <div style={{ position:"relative", width:"100%", paddingBottom:`${(H/W)*100}%` }}>
          <canvas
            ref={previewRef}
            style={{
              position:"absolute", inset:0, width:"100%", height:"100%",
              borderRadius:10, boxShadow:"0 16px 48px rgba(0,0,0,0.7)",
              display:"block",
            }}
          />
          {!qrReady && (
            <div style={{
              position:"absolute", inset:0, display:"flex",
              alignItems:"center", justifyContent:"center",
              background:"rgba(11,19,34,0.85)", borderRadius:10,
            }}>
              <div style={{ color:GOLD, fontFamily:"Montserrat,sans-serif",
                            fontSize:14, fontWeight:700 }}>
                Loading ticket…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Download button */}
      <div style={{ display:"flex", justifyContent:"center", marginTop:20 }}>
        <button
          onClick={handleDownload}
          disabled={downloading || !qrReady}
          style={{
            display:"flex", alignItems:"center", gap:10, padding:"13px 36px",
            background: downloading || !qrReady
              ? "rgba(201,162,39,0.2)"
              : "linear-gradient(135deg,#E8D06A,#C9A227)",
            color: DARK, border:"none", borderRadius:10,
            fontWeight:800, fontSize:14, letterSpacing:"0.05em",
            cursor: downloading || !qrReady ? "not-allowed" : "pointer",
            fontFamily:"Montserrat,sans-serif",
            boxShadow: downloading||!qrReady ? "none" : "0 4px 18px rgba(201,162,39,0.4)",
            transition:"all 0.2s",
          }}
        >
          {downloading ? "⏳  Generating PDF…" : "⬇  Download PDF Ticket"}
        </button>
      </div>

      <p style={{
        textAlign:"center", marginTop:8, fontSize:11,
        color:"rgba(255,255,255,0.3)", fontFamily:"Montserrat,sans-serif",
      }}>
        8.5″ × 3.5″ landscape &nbsp;·&nbsp; Button enables once ticket loads
      </p>
    </>
  );
}
