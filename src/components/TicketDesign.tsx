/**
 * TicketDesign.tsx — v8
 * - Fetches live event data from Supabase (title, theme, venue, date, time)
 * - PDF uses the same HTML-injection + html2canvas approach as generateTicket.ts
 *   (body-appended visible container — the only reliable method)
 * - Canvas fallback if html2canvas fails
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  event_id?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
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
  if (!dateStr) return { dayName:"FRIDAY", day:"12", suffix:"TH", month:"JUNE", year:"2026", startTime:"10:00 PM" };
  const d = new Date(dateStr);
  const day = d.getDate();
  const h = d.getHours(), mm = d.getMinutes().toString().padStart(2,"0");
  return {
    dayName: DAYS[d.getDay()],
    day: String(day),
    suffix: ordinalSuffix(day),
    month: MONTHS[d.getMonth()],
    year: String(d.getFullYear()),
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
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

async function waitForImages(el: HTMLElement) {
  await Promise.all(
    Array.from(el.querySelectorAll("img")).map(
      (img) => new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) { resolve(); return; }
        img.onload = () => resolve();
        img.onerror = () => resolve();
      })
    )
  );
}

// ── Constants ────────────────────────────────────────────────────────────────
const GOLD  = "#D4AF37";
const DARK  = "#0A1525";
const CREAM = "#F5F0E8";
const BG_URL = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format";
const LOGO_URL = "https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg";

// PDF canvas size: 8.5 × 3.5 in @ 150 dpi
const PDF_W = 1275;
const PDF_H = 525;

// ── Component ────────────────────────────────────────────────────────────────
export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const [downloading, setDownloading] = useState(false);
  const [qrUrl, setQrUrl]             = useState("");

  // Live event data — starts with what TicketPage passed in, then refreshes from DB
  const [liveEvent, setLiveEvent] = useState<{
    title?: string; theme?: string; venue?: string;
    event_date?: string | null; end_time?: string | null; description?: string;
  } | null>(null);

  // ── Fetch live event from Supabase ─────────────────────────────────────
  useEffect(() => {
    const fetchEvent = async () => {
      let q;
      // Prefer the event linked to this ticket
      if (ticket.event_id) {
        q = supabase
          .from("events")
          .select("title, theme, venue, event_date, end_time, description")
          .eq("id", ticket.event_id)
          .maybeSingle();
      } else {
        // Fall back to latest published event
        q = supabase
          .from("events")
          .select("title, theme, venue, event_date, end_time, description")
          .eq("status", "published")
          .order("event_date", { ascending: true })
          .limit(1)
          .maybeSingle();
      }
      const { data } = await q;
      if (data) setLiveEvent(data);
    };
    fetchEvent();
  }, [ticket.event_id]);

  // Merge: live DB data wins over what was passed in ticket prop
  const eventTitle   = ((liveEvent?.title   || ticket.event_title  || "ANNUAL CSA GALA DINNER")).toUpperCase();
  const eventTheme   = liveEvent?.theme   || ticket.event_theme  || "Laying the first foundations";
  const eventVenue   = (liveEvent?.venue   || ticket.event_venue  || "KINGFISHER NEST HOTEL").toUpperCase();
  const eventDate    = liveEvent?.event_date   ?? ticket.event_date   ?? null;
  const eventEndTime = liveEvent?.end_time     ?? ticket.event_end_time ?? null;

  const ticketType  = (ticket.type_name || ticket.ticket_type || "Regular").toUpperCase();
  const bookingCode = ticket.booking_code ?? "";
  const name        = (ticket.purchaser_name ?? "").toUpperCase();
  const ticketNo    = ticket.ticket_number ?? "";
  const status      = (ticket.payment_status ?? "PENDING").toUpperCase();
  const amount      = ticket.total_amount ?? 0;
  const isPaid      = ["PAID","CONFIRMED","PARTIAL"].includes(status);

  const date        = formatEventDate(eventDate);
  const endTime     = formatEndTime(eventEndTime);
  const timeDisplay = endTime ? `${date.startTime} – ${endTime}` : date.startTime;

  // QR code URL
  const qrPayload = ticketNo || bookingCode;
  useEffect(() => {
    if (!qrPayload) return;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=260x260&ecc=H&data=${encodeURIComponent(qrPayload)}`);
  }, [qrPayload]);

  // ── Build the shared ticket HTML string (used for both preview + PDF) ───
  // We build the RIGHT panel detail rows
  const detailRows = [
    { label: "NAME",         val: name,                      color: DARK },
    { label: "BOOKING CODE", val: bookingCode,               color: DARK },
    { label: "TICKET TYPE",  val: ticketType,                color: DARK },
    { label: "STATUS",       val: isPaid ? "✓ CONFIRMED" : status,
      color: isPaid ? "#1b7a1b" : "#b8860b" },
    { label: "AMOUNT",       val: `KSH ${amount.toLocaleString()}`, color: DARK },
  ];

  function buildTicketHTML(w: number, h: number, qr: string): string {
    const LEFT_W  = Math.round(w * 0.651);  // ~830 of 1275
    const RIGHT_W = w - LEFT_W;             // ~445
    const GOLD_BAR = Math.round(w * 0.0267);// ~34

    const rowsHtml = detailRows.map(r => `
      <div style="display:flex;align-items:center;border-bottom:1px dotted rgba(180,150,40,0.35);
                  padding:${Math.round(h*0.009)}px 0;gap:${Math.round(w*0.005)}px;">
        <div style="width:${Math.round(h*0.034)}px;height:${Math.round(h*0.034)}px;
                    border:1.5px solid ${GOLD};border-radius:50%;flex-shrink:0;"></div>
        <span style="font-size:${Math.round(h*0.017)}px;font-weight:700;color:${GOLD};
                     letter-spacing:0.04em;text-transform:uppercase;
                     min-width:${Math.round(w*0.065)}px;flex-shrink:0;">${r.label}</span>
        <span style="font-size:${Math.round(h*0.019)}px;font-weight:700;color:${r.color};
                     margin-left:auto;text-align:right;word-break:break-all;
                     max-width:${Math.round(w*0.115)}px;">${r.val}</span>
      </div>`).join("");

    return `
      <div style="width:${w}px;height:${h}px;display:flex;
                  font-family:Montserrat,Arial,sans-serif;overflow:hidden;
                  position:relative;background:${DARK};">

        <!-- LEFT PANEL -->
        <div style="width:${LEFT_W}px;flex-shrink:0;display:flex;
                    background-image:linear-gradient(rgba(10,21,37,0.85),rgba(10,21,37,0.85)),url('${BG_URL}');
                    background-size:cover;background-position:center;
                    border-right:3px dashed ${GOLD};position:relative;
                    box-sizing:border-box;
                    padding:${Math.round(h*0.042)}px ${Math.round(w*0.016)}px
                            ${Math.round(h*0.034)}px ${Math.round(w*0.017)}px;
                    gap:${Math.round(w*0.016)}px;">

          <!-- Notch circles -->
          <div style="position:absolute;right:-13px;top:-13px;width:26px;height:26px;
                      background:#1a2535;border-radius:50%;z-index:10;"></div>
          <div style="position:absolute;right:-13px;bottom:-13px;width:26px;height:26px;
                      background:#1a2535;border-radius:50%;z-index:10;"></div>

          <!-- Logo + Date strip -->
          <div style="width:${Math.round(LEFT_W*0.157)}px;flex-shrink:0;
                      display:flex;flex-direction:column;align-items:center;">

            <div style="width:${Math.round(h*0.133)}px;height:${Math.round(h*0.133)}px;
                        border-radius:50%;border:3px solid ${GOLD};background:white;
                        overflow:hidden;margin-bottom:${Math.round(h*0.027)}px;flex-shrink:0;">
              <img src="${LOGO_URL}" alt="CSA" crossorigin="anonymous"
                   style="width:85%;height:85%;object-fit:contain;margin:7.5%;display:block;"/>
            </div>

            <div style="font-size:${Math.round(h*0.017)}px;font-weight:700;
                        color:rgba(255,255,255,0.7);letter-spacing:0.05em;
                        margin-bottom:${Math.round(h*0.004)}px;text-align:center;">
              ${date.dayName}
            </div>

            <div style="display:flex;align-items:flex-start;line-height:1;
                        margin-bottom:${Math.round(h*0.006)}px;">
              <span style="font-size:${Math.round(h*0.091)}px;font-weight:900;
                           color:${GOLD};line-height:0.9;">${date.day}</span>
              <sup style="font-size:${Math.round(h*0.027)}px;font-weight:700;
                          color:${GOLD};margin-top:${Math.round(h*0.01)}px;">${date.suffix}</sup>
            </div>

            <div style="font-size:${Math.round(h*0.018)}px;font-weight:700;color:white;
                        line-height:1.45;border-left:2px solid ${GOLD};
                        padding-left:${Math.round(h*0.015)}px;
                        margin-bottom:${Math.round(h*0.023)}px;align-self:flex-start;">
              ${date.month}<br/>${date.year}
            </div>

            <div style="border-top:1px solid ${GOLD};width:90%;margin-bottom:${Math.round(h*0.019)}px;"></div>

            <div style="margin-bottom:${Math.round(h*0.019)}px;align-self:flex-start;">
              <div style="font-size:${Math.round(h*0.013)}px;color:${GOLD};font-weight:700;
                          letter-spacing:0.1em;margin-bottom:${Math.round(h*0.004)}px;">
                &#9201; TIME
              </div>
              <div style="font-size:${Math.round(h*0.016)}px;font-weight:700;
                          color:rgba(255,255,255,0.9);line-height:1.4;">
                ${timeDisplay}
              </div>
            </div>

            <div style="border-top:1px solid ${GOLD};width:90%;margin-bottom:${Math.round(h*0.019)}px;"></div>

            <div style="align-self:flex-start;">
              <div style="font-size:${Math.round(h*0.013)}px;color:${GOLD};font-weight:700;
                          letter-spacing:0.1em;margin-bottom:${Math.round(h*0.004)}px;">
                &#128205; VENUE
              </div>
              <div style="font-size:${Math.round(h*0.015)}px;font-weight:700;
                          color:rgba(255,255,255,0.9);line-height:1.45;">
                ${eventVenue}
              </div>
            </div>
          </div>

          <!-- Main content -->
          <div style="flex:1;display:flex;flex-direction:column;
                      justify-content:space-between;min-width:0;">
            <div>
              <div style="font-family:Georgia,serif;font-weight:900;color:${GOLD};
                          font-size:${Math.round(h*0.107)}px;line-height:0.9;
                          letter-spacing:0.02em;">GALA</div>
              <div style="font-family:Georgia,serif;font-weight:700;color:white;
                          font-size:${Math.round(h*0.08)}px;line-height:0.9;
                          margin-bottom:${Math.round(h*0.015)}px;">
                DINNER ${date.year}
              </div>
              <div style="color:${GOLD};font-size:${Math.round(h*0.015)}px;font-weight:700;
                          letter-spacing:0.14em;margin-bottom:${Math.round(h*0.019)}px;">
                AWARDS &nbsp;&#8226;&nbsp; NETWORKING &nbsp;&#8226;&nbsp; ENTERTAINMENT
              </div>
              <div style="border:1px solid ${GOLD};border-radius:4px;
                          padding:${Math.round(h*0.013)}px ${Math.round(w*0.008)}px;
                          background:rgba(10,21,37,0.5);
                          font-size:${Math.round(h*0.015)}px;line-height:1.55;
                          color:rgba(255,255,255,0.85);
                          overflow:hidden;max-height:${Math.round(h*0.15)}px;">
                <span style="color:${GOLD};font-weight:700;">THEME: </span>${eventTheme}
              </div>
            </div>

            <div>
              <div style="color:${GOLD};font-size:${Math.round(h*0.014)}px;font-weight:700;
                          letter-spacing:0.1em;margin-bottom:${Math.round(h*0.01)}px;">
                TICKET TYPE
              </div>
              <div style="background:#FFD700;color:${DARK};border-radius:5px;
                          padding:${Math.round(h*0.017)}px ${Math.round(w*0.011)}px;
                          font-weight:900;font-size:${Math.round(h*0.029)}px;
                          text-align:center;letter-spacing:0.15em;">
                &#9733; &nbsp;${ticketType}&nbsp; &#9733;
              </div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;
                        gap:${Math.round(w*0.006)}px;flex-wrap:nowrap;">
              <div style="background:${CREAM};color:${DARK};border-radius:4px;
                          padding:${Math.round(h*0.01)}px ${Math.round(w*0.007)}px;
                          font-size:${Math.round(h*0.015)}px;font-weight:700;white-space:nowrap;">
                TICKET NO. ${ticketNo}
              </div>
              <div style="color:${GOLD};font-size:${Math.round(h*0.026)}px;font-style:italic;
                          text-align:right;overflow:hidden;white-space:nowrap;flex-shrink:1;min-width:0;">
                Pooling Construction Students Together!
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT PANEL -->
        <div style="width:${RIGHT_W}px;flex-shrink:0;background:${CREAM};color:${DARK};
                    display:flex;flex-direction:column;position:relative;
                    box-sizing:border-box;
                    padding:${Math.round(h*0.034)}px ${GOLD_BAR + Math.round(w*0.006)}px
                            ${Math.round(h*0.027)}px ${Math.round(w*0.013)}px;">

          <!-- Gold vertical sidebar -->
          <div style="position:absolute;right:0;top:0;bottom:0;width:${GOLD_BAR}px;
                      background:${GOLD};writing-mode:vertical-rl;text-orientation:mixed;
                      transform:rotate(180deg);display:flex;align-items:center;
                      justify-content:center;font-weight:800;
                      font-size:${Math.round(h*0.018)}px;color:${DARK};
                      letter-spacing:0.12em;overflow:hidden;white-space:nowrap;">
            ${eventTitle}
          </div>

          <div style="text-align:center;font-weight:900;
                      font-size:${Math.round(h*0.032)}px;letter-spacing:0.16em;
                      color:${DARK};margin-bottom:${Math.round(h*0.008)}px;">
            &#9733; ADMIT &#9733;
          </div>
          <div style="border-top:2.5px solid ${GOLD};margin-bottom:${Math.round(h*0.015)}px;"></div>

          <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;">
            ${rowsHtml}
          </div>

          <div style="display:flex;flex-direction:column;align-items:center;
                      margin-top:${Math.round(h*0.011)}px;gap:${Math.round(h*0.008)}px;">
            <div style="border:3px solid ${GOLD};border-radius:6px;overflow:hidden;
                        background:#fff;width:${Math.round(h*0.183)}px;
                        height:${Math.round(h*0.183)}px;">
              <img src="${qr}" alt="QR" crossorigin="anonymous"
                   style="width:100%;height:100%;display:block;"/>
            </div>
            <div style="text-align:center;font-size:${Math.round(h*0.012)}px;font-weight:700;
                        color:${DARK};line-height:1.5;letter-spacing:0.06em;">
              SCAN FOR ENTRY
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── PDF download ─────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (downloading || !qrUrl) return;
    setDownloading(true);

    let container: HTMLDivElement | null = null;
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
      const h2c   = (window as any).html2canvas;
      const jsPDF = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
      if (!h2c || !jsPDF) throw new Error("Libraries not loaded");

      await (document.fonts?.ready ?? Promise.resolve());

      // Inject a fresh container directly into body — fully visible so browser paints it completely
      container = document.createElement("div");
      container.style.cssText =
        `position:fixed;top:0;left:0;width:${PDF_W}px;height:${PDF_H}px;` +
        `z-index:2147483647;overflow:hidden;pointer-events:none;`;
      container.innerHTML = buildTicketHTML(PDF_W, PDF_H, qrUrl);
      document.body.appendChild(container);

      // Wait for all images (logo + QR)
      const innerEl = container.firstElementChild as HTMLElement;
      await waitForImages(innerEl);
      // Paint buffer for fonts + background-image
      await new Promise(r => setTimeout(r, 900));

      const canvas = await h2c(innerEl, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: DARK,
        width: PDF_W,
        height: PDF_H,
        logging: false,
        imageTimeout: 20000,
      });

      document.body.removeChild(container);
      container = null;

      // 8.5 × 3.5 in at 72pt/in
      const PT_W = 612, PT_H = 252;
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [PT_H, PT_W] });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, PT_W, PT_H);
      pdf.save(`CSA-Ticket-${ticketNo || "download"}.pdf`);

    } catch (err) {
      if (container && container.parentNode) {
        document.body.removeChild(container);
        container = null;
      }
      console.error("PDF error:", err);
      // Canvas fallback
      try { await canvasFallback(); }
      catch(e2) { alert("PDF generation failed. Please screenshot your ticket instead."); }
    } finally {
      setDownloading(false);
    }
  };

  // ── Canvas-only fallback PDF (no external libs required for drawing) ────
  const canvasFallback = async () => {
    const jsPDF = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
    if (!jsPDF) return;
    const W = 1960, H = 760;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!;

    // Background
    ctx.fillStyle = DARK; ctx.fillRect(0, 0, W, H);
    // Left panel gradient suggestion
    ctx.fillStyle = "#0d1a2e"; ctx.fillRect(0, 0, W * 0.651, H);
    // Dashed border line
    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W * 0.651, 0); ctx.lineTo(W * 0.651, H); ctx.stroke();
    ctx.setLineDash([]);

    // GALA text
    ctx.fillStyle = GOLD;
    ctx.font = "bold 130px Georgia, serif";
    ctx.fillText("GALA", 260, 170);
    ctx.fillStyle = "white";
    ctx.font = "bold 95px Georgia, serif";
    ctx.fillText(`DINNER ${date.year}`, 260, 270);

    // Date badge
    ctx.fillStyle = GOLD;
    ctx.font = "bold 110px Arial";
    ctx.fillText(date.day, 60, 230);
    ctx.font = "bold 36px Arial";
    ctx.fillText(date.suffix, 160, 150);
    ctx.fillStyle = "white";
    ctx.font = "bold 28px Arial";
    ctx.fillText(`${date.dayName}`, 55, 250);
    ctx.fillText(`${date.month} ${date.year}`, 55, 285);

    // Time + Venue
    ctx.fillStyle = GOLD;
    ctx.font = "bold 22px Arial";
    ctx.fillText("TIME", 55, 340);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 24px Arial";
    ctx.fillText(timeDisplay, 55, 370);
    ctx.fillStyle = GOLD;
    ctx.font = "bold 22px Arial";
    ctx.fillText("VENUE", 55, 410);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 24px Arial";
    ctx.fillText(eventVenue, 55, 440);

    // Theme
    ctx.fillStyle = GOLD;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]); ctx.strokeRect(250, 300, W * 0.4, 60);
    ctx.font = "bold 18px Arial";
    ctx.fillText("THEME: ", 262, 325);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "18px Arial";
    const themeText = eventTheme.length > 70 ? eventTheme.slice(0, 70) + "…" : eventTheme;
    ctx.fillText(themeText, 340, 325);

    // Ticket type ribbon
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(250, 380, W * 0.38, 75);
    ctx.fillStyle = DARK;
    ctx.font = "bold 42px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`★  ${ticketType}  ★`, 250 + (W * 0.38) / 2, 432);
    ctx.textAlign = "left";

    // Ticket number
    ctx.fillStyle = CREAM;
    ctx.fillRect(250, 480, 380, 50);
    ctx.fillStyle = DARK;
    ctx.font = "bold 26px Arial";
    ctx.fillText(`TICKET NO. ${ticketNo}`, 262, 512);

    // RIGHT PANEL
    const RX = Math.round(W * 0.655);
    const GW = 50;
    ctx.fillStyle = CREAM;
    ctx.fillRect(RX, 0, W - RX - GW, H);
    ctx.fillStyle = GOLD;
    ctx.fillRect(W - GW, 0, GW, H);

    // Vertical text in gold bar
    ctx.save();
    ctx.translate(W - GW / 2, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = DARK;
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText(eventTitle, 0, 8);
    ctx.restore();

    // ADMIT
    ctx.fillStyle = DARK;
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("★ ADMIT ★", RX + (W - RX - GW) / 2, 80);
    ctx.textAlign = "left";

    // Divider
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(RX + 20, 100); ctx.lineTo(W - GW - 20, 100); ctx.stroke();

    // Detail rows
    const rows = detailRows;
    rows.forEach((r, i) => {
      const y = 140 + i * 110;
      ctx.fillStyle = GOLD;
      ctx.font = "bold 22px Arial";
      ctx.fillText(r.label, RX + 30, y);
      ctx.fillStyle = r.color;
      ctx.font = "bold 28px Arial";
      ctx.fillText(r.val, RX + 30, y + 38);
      ctx.strokeStyle = "rgba(180,150,40,0.4)"; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(RX + 20, y + 55); ctx.lineTo(W - GW - 20, y + 55); ctx.stroke();
      ctx.setLineDash([]);
    });

    // QR code
    if (qrUrl) {
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrUrl;
      await new Promise<void>(r => { qrImg.onload = () => r(); qrImg.onerror = () => r(); });
      ctx.drawImage(qrImg, RX + 30, 630, 140, 140);
    }
    ctx.fillStyle = DARK;
    ctx.font = "bold 20px Arial";
    ctx.fillText("SCAN FOR ENTRY", RX + 30, 785);

    const PT_W = 612, PT_H = 252;
    const pdf2 = new jsPDF({ orientation: "landscape", unit: "pt", format: [PT_H, PT_W] });
    pdf2.addImage(cv.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, PT_W, PT_H);
    pdf2.save(`CSA-Ticket-${ticketNo || "download"}.pdf`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700;900&display=swap"
        rel="stylesheet"
      />

      {/* Responsive preview — aspect-ratio box */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <div style={{ position: "relative", width: "100%", paddingBottom: `${(PDF_H / PDF_W) * 100}%` }}>
          <div
            style={{
              position: "absolute", inset: 0, borderRadius: 10,
              overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            }}
            dangerouslySetInnerHTML={{ __html: buildTicketHTML(PDF_W, PDF_H, qrUrl || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") }}
          />
        </div>
      </div>

      {/* Download button */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <button
          onClick={handleDownload}
          disabled={downloading || !qrUrl}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "13px 32px",
            background: downloading || !qrUrl
              ? "rgba(212,175,55,0.3)"
              : "linear-gradient(135deg,#E6C875,#D4AF37)",
            color: DARK, border: "none", borderRadius: 10,
            fontWeight: 700, fontSize: 15,
            cursor: downloading || !qrUrl ? "not-allowed" : "pointer",
            fontFamily: "Montserrat,sans-serif",
            boxShadow: "0 4px 14px rgba(212,175,55,0.3)",
            transition: "opacity 0.2s",
          }}
        >
          {downloading ? "⏳ Generating PDF…" : "⬇ Download PDF Ticket"}
        </button>
      </div>

      <p style={{
        textAlign: "center", marginTop: 8, fontSize: 11,
        color: "rgba(255,255,255,0.35)", fontFamily: "Montserrat,sans-serif",
      }}>
        8.5″ × 3.5″ landscape &nbsp;·&nbsp; Button enables once QR loads
      </p>
    </>
  );
}
