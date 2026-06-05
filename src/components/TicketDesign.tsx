/**
 * TicketDesign.tsx — v11
 * Pixel-perfect match to reference screenshot.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type TicketData = {
  ticket_number: string;
  purchaser_name: string;
  booking_code: string;
  ticket_type?: string;
  type_name?: string;
  total_amount: number;
  payment_status: string;
  qr_code: string;
  event_title?: string;
  event_theme?: string;
  event_venue?: string;
  event_date?: string | null;
  event_end_time?: string | null;
  event_id?: string;
};

function ordinalSuffix(n: number) {
  const m = n % 100;
  if (m >= 11 && m <= 13) return "TH";
  switch (n % 10) { case 1: return "ST"; case 2: return "ND"; case 3: return "RD"; default: return "TH"; }
}

function parseDate(s: string | null | undefined) {
  const DAYS   = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  // Start time is fixed at 7:00 PM — event_date is date-only
  const START_TIME = "7:00 PM";
  if (!s) return { dayName:"FRIDAY", day:"12", suf:"TH", month:"JUNE", year:"2026", startTime:START_TIME };
  // Parse as local date to avoid UTC offset shifting the day
  const parts = s.slice(0, 10).split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = d.getDate();
  return {
    dayName: DAYS[d.getDay()], day: String(day), suf: ordinalSuffix(day),
    month: MONTHS[d.getMonth()], year: String(d.getFullYear()),
    startTime: START_TIME,
  };
}

function fmt24(t: string | null | undefined) {
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

async function waitImgs(el: HTMLElement) {
  await Promise.all(Array.from(el.querySelectorAll("img")).map(
    img => new Promise<void>(r => {
      if (img.complete && img.naturalWidth > 0) { r(); return; }
      img.onload = () => r(); img.onerror = () => r();
    })
  ));
}

// ── Design constants ──────────────────────────────────────────────────────────
const GOLD  = "#C9A227";
const GOLD2 = "#F5C518";
const DARK  = "#0B1120";
const CREAM = "#F2EDD7";
const LOGO  = "https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg";
const BGIMG = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format";

// Ticket canvas — 8.5 × 3.5 in @ 150dpi
const TW = 1275, TH = 525;

export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const [downloading, setDownloading] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [ev, setEv] = useState<any>(null);

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

  const evTitle  = (ev?.title  || ticket.event_title  || "ANNUAL CSA GALA DINNER").toUpperCase();
  const evTheme  = (ev?.theme  || ticket.event_theme  || "LAYING THE FIRST STONE: Honoring the Past, Empowering the Present and Inspiring the Future of Construction")
                    .replace(/^["']|["']$/g, "");
  const evVenue  = (ev?.venue  || ticket.event_venue  || "KINGFISHER NEST HOTEL").toUpperCase();
  const evDate   = ev?.event_date   ?? ticket.event_date   ?? null;
  const evEndRaw = ev?.end_time     ?? ticket.event_end_time ?? null;

  const date      = parseDate(evDate);
  const endStr    = fmt24(evEndRaw);
  const timeLabel = endStr ? `${date.startTime} – ${endStr}` : date.startTime;

  const ticketType  = (ticket.type_name || ticket.ticket_type || "REGULAR").toUpperCase();
  const name        = (ticket.purchaser_name ?? "").toUpperCase();
  const bookingCode = ticket.booking_code ?? "";
  const ticketNo    = ticket.ticket_number ?? "";
  const status      = (ticket.payment_status ?? "PENDING").toUpperCase();
  const amount      = ticket.total_amount ?? 0;
  const isPaid      = ["PAID","CONFIRMED","PARTIAL"].includes(status);
  const statusLabel = isPaid ? "PAID" : status;
  // Reference shows PAID in dark text, not green
  const statusColor = isPaid ? DARK : "#b45309";

  useEffect(() => {
    if (!ticketNo && !bookingCode) return;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${encodeURIComponent(ticketNo||bookingCode)}`);
  }, [ticketNo, bookingCode]);

  function buildHTML(qr: string): string {
    // Exact proportions from reference: left 67%, right 33%
    const LW  = 855;
    const RW  = TW - LW;   // 420
    const GBW = 34;         // gold sidebar width

    // SVG icons — circular outlined, matching reference
    const icoPerson = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="margin-right:7px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><path d="M12 11c1.93 0 3.5-1.57 3.5-3.5S13.93 4 12 4 8.5 5.57 8.5 7.5 10.07 11 12 11zm0 1.5c-2.33 0-7 1.17-7 3.5V18h14v-2c0-2.33-4.67-3.5-7-3.5z" fill="${GOLD}"/></svg>`;
    const icoTag    = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="margin-right:7px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><path d="M6.5 6.5h4.5l6.5 6.5-4.5 4.5L6.5 11V6.5zm2 2a1 1 0 100 2 1 1 0 000-2z" fill="${GOLD}"/></svg>`;
    const icoTkt    = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="margin-right:7px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><path d="M17 9c0-.6-.4-1-1-1H8c-.6 0-1 .4-1 1v1.5c.8.2 1.5 1 1.5 1.5s-.7 1.3-1.5 1.5V15c0 .6.4 1 1 1h8c.6 0 1-.4 1-1v-1.5c-.8-.2-1.5-1-1.5-1.5s.7-1.3 1.5-1.5V9z" fill="${GOLD}"/></svg>`;
    const icoChk    = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="margin-right:7px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><path d="M7 12.5l3.5 3.5 6.5-7" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const icoCoin   = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="margin-right:7px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><circle cx="12" cy="12" r="5" stroke="${GOLD}" stroke-width="1.5"/><path d="M12 8v8M10 9.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5-.9 1.5-2 1.5-2 .7-2 1.5.9 1.5 2 1.5 2-.7 2-1.5" stroke="${GOLD}" stroke-width="1" stroke-linecap="round"/></svg>`;
    const icoClk    = `<svg width="11" height="11" viewBox="0 0 24 24" fill="${GOLD}" style="flex-shrink:0"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5H11v6l5.2 3.1.8-1.2-4.5-2.7V7z"/></svg>`;
    const icoPin    = `<svg width="11" height="11" viewBox="0 0 24 24" fill="${GOLD}" style="flex-shrink:0"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/></svg>`;

    const rows = [
      { ico: icoPerson, lbl: "NAME",         val: name,         vc: "#111827" },
      { ico: icoTag,    lbl: "BOOKING CODE", val: bookingCode,  vc: "#111827" },
      { ico: icoTkt,    lbl: "TICKET TYPE",  val: ticketType,   vc: "#111827" },
      { ico: icoChk,    lbl: "STATUS",       val: statusLabel,  vc: statusColor },
      { ico: icoCoin,   lbl: "AMOUNT",       val: `KSH ${amount.toLocaleString()}`, vc: "#111827" },
    ];

    const rowsHtml = rows.map(r => `
      <div style="display:flex;align-items:center;
                  border-bottom:1px solid rgba(201,162,39,0.25);
                  padding:4px 0;">
        ${r.ico}
        <span style="font-size:9px;font-weight:700;color:${GOLD};
                     letter-spacing:0.07em;text-transform:uppercase;
                     min-width:88px;flex-shrink:0;">${r.lbl}</span>
        <span style="font-size:10.5px;font-weight:700;color:${r.vc};
                     margin-left:auto;text-align:right;
                     word-break:break-word;max-width:130px;">${r.val}</span>
      </div>`).join("");

    return `<div style="width:${TW}px;height:${TH}px;display:flex;overflow:hidden;
font-family:'Montserrat',Arial,sans-serif;position:relative;box-sizing:border-box;">

<!--=== LEFT PANEL ===-->
<div style="width:${LW}px;height:${TH}px;flex-shrink:0;position:relative;overflow:hidden;">
  <img src="${BGIMG}" alt="" crossorigin="anonymous"
       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.45;"/>
  <div style="position:absolute;inset:0;
              background:linear-gradient(to right,rgba(11,17,32,0.97) 0%,rgba(11,17,32,0.92) 50%,rgba(11,17,32,0.72) 100%);"></div>
  <div style="position:absolute;right:0;top:0;bottom:0;
              border-right:2.5px dashed rgba(201,162,39,0.75);z-index:4;"></div>
  <div style="position:absolute;right:-14px;top:-14px;width:28px;height:28px;
              background:${CREAM};border-radius:50%;z-index:5;"></div>
  <div style="position:absolute;right:-14px;bottom:-14px;width:28px;height:28px;
              background:${CREAM};border-radius:50%;z-index:5;"></div>

  <!--inner content: two columns-->
  <div style="position:relative;z-index:3;display:flex;width:100%;height:100%;
              box-sizing:border-box;padding:20px 18px 16px 20px;gap:16px;">

    <!--=== COLUMN A: logo + date block + time + venue — fixed width matching reference ===-->
    <div style="width:160px;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-start;">

      <!--logo — centered in column-->
      <div style="width:70px;height:70px;border-radius:50%;border:2.5px solid ${GOLD};
                  background:white;overflow:hidden;margin-bottom:8px;align-self:center;">
        <img src="${LOGO}" alt="CSA" crossorigin="anonymous"
             style="width:88%;height:88%;object-fit:contain;display:block;margin:6% auto;"/>
      </div>

      <!--FRIDAY label-->
      <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.65);
                  letter-spacing:0.14em;margin-bottom:0;">
        ${date.dayName}
      </div>

      <!--big date number + TH superscript — reference style: huge gold number-->
      <div style="display:flex;align-items:flex-start;line-height:1;">
        <span style="font-size:90px;font-weight:900;color:${GOLD};
                     font-family:Georgia,serif;line-height:0.80;letter-spacing:-2px;">${date.day}</span>
        <span style="font-size:16px;font-weight:800;color:${GOLD};
                     margin-top:6px;margin-left:2px;font-family:Georgia,serif;">${date.suf}</span>
      </div>

      <!--JUNE / 2026 with gold left bar — flush left under the number-->
      <div style="border-left:3px solid ${GOLD};padding-left:6px;margin-top:-2px;margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;color:white;line-height:1.45;">${date.month}</div>
        <div style="font-size:11px;font-weight:700;color:white;line-height:1.45;">${date.year}</div>
      </div>

      <!--thin gold divider-->
      <div style="width:100%;border-top:1px solid rgba(201,162,39,0.4);margin-bottom:8px;"></div>

      <!--TIME-->
      <div style="margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
          ${icoClk}
          <span style="font-size:8px;font-weight:700;color:${GOLD};letter-spacing:0.14em;">TIME</span>
        </div>
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.9);line-height:1.4;">
          ${timeLabel}
        </div>
      </div>

      <!--thin gold divider-->
      <div style="width:100%;border-top:1px solid rgba(201,162,39,0.4);margin-bottom:8px;"></div>

      <!--VENUE-->
      <div>
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
          ${icoPin}
          <span style="font-size:8px;font-weight:700;color:${GOLD};letter-spacing:0.14em;">VENUE</span>
        </div>
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.9);line-height:1.4;">
          ${evVenue}
        </div>
      </div>
    </div>

    <!--=== COLUMN B: GALA DINNER + theme + ticket badge ===-->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;min-width:0;overflow:hidden;">

      <!--title block-->
      <div style="overflow:hidden;">
        <!--GALA — large italic gold serif-->
        <div style="font-family:'Playfair Display',Georgia,serif;font-weight:900;font-style:italic;
                    color:${GOLD};font-size:80px;line-height:0.83;letter-spacing:1px;
                    white-space:nowrap;overflow:hidden;">
          GALA
        </div>
        <!--DINNER 2026 — bold white serif, same line height-->
        <div style="font-family:'Playfair Display',Georgia,serif;font-weight:700;
                    color:white;font-size:58px;line-height:0.88;
                    margin-bottom:6px;letter-spacing:0px;white-space:nowrap;overflow:hidden;">
          DINNER ${date.year}
        </div>
        <!--subtitle-->
        <div style="color:${GOLD};font-size:9.5px;font-weight:700;
                    letter-spacing:0.18em;margin-bottom:9px;white-space:nowrap;">
          AWARDS &nbsp;•&nbsp; NETWORKING &nbsp;•&nbsp; ENTERTAINMENT
        </div>
        <!--theme box-->
        <div style="border:1.5px solid ${GOLD};border-radius:5px;
                    padding:7px 11px;background:rgba(11,17,32,0.55);
                    font-size:10px;line-height:1.55;color:rgba(255,255,255,0.88);">
          <span style="color:${GOLD};font-weight:700;">THEME: </span>${evTheme}
        </div>
      </div>

      <!--ticket type badge + footer-->
      <div>
        <div style="color:${GOLD};font-size:8.5px;font-weight:700;
                    letter-spacing:0.14em;margin-bottom:5px;">TICKET TYPE</div>
        <div style="background:${GOLD2};color:${DARK};border-radius:4px;
                    padding:8px 12px;font-weight:900;font-size:19px;
                    text-align:center;letter-spacing:0.18em;margin-bottom:8px;">
          ★ &nbsp;${ticketType}&nbsp; ★
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="background:${CREAM};color:${DARK};border-radius:4px;
                      padding:5px 10px;font-size:9.5px;font-weight:700;
                      white-space:nowrap;border:1px solid rgba(201,162,39,0.3);flex-shrink:0;">
            TICKET NO. ${ticketNo}
          </div>
          <div style="color:${GOLD};font-size:13px;font-style:italic;
                      font-family:Georgia,serif;white-space:nowrap;
                      overflow:hidden;text-overflow:ellipsis;flex-shrink:1;">
            Pooling Construction Students Together!
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!--=== RIGHT PANEL ===-->
<!--=== RIGHT PANEL ===-->
<div style="width:${RW}px;height:${TH}px;flex-shrink:0;background:${CREAM};
            position:relative;box-sizing:border-box;display:flex;flex-direction:column;
            padding:15px ${GBW + 10}px 12px 14px;">

  <!--gold sidebar-->
  <div style="position:absolute;right:0;top:0;bottom:0;width:${GBW}px;
              background:${GOLD};overflow:hidden;display:flex;align-items:center;justify-content:center;">
    <div style="white-space:nowrap;font-size:9px;font-weight:800;
                color:${DARK};letter-spacing:0.16em;text-transform:uppercase;
                transform:rotate(90deg);">
      ${evTitle}
    </div>
  </div>

  <!--ADMIT header-->
  <div style="text-align:center;font-size:17px;font-weight:900;
              color:${DARK};letter-spacing:0.22em;margin-bottom:4px;">
    ★ &nbsp;ADMIT&nbsp; ★
  </div>
  <div style="border-top:2px solid ${GOLD};margin-bottom:6px;"></div>

  <!--detail rows — evenly distributed-->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
    ${rowsHtml}
  </div>

  <!--QR code + label-->
  <div style="display:flex;flex-direction:column;align-items:center;padding-top:6px;gap:3px;">
    <div style="width:88px;height:88px;border:2px solid ${GOLD};
                border-radius:4px;overflow:hidden;background:white;flex-shrink:0;">
      <img src="${qr}" alt="QR" crossorigin="anonymous"
           style="width:100%;height:100%;display:block;"/>
    </div>
    <div style="font-size:7.5px;font-weight:700;color:${DARK};
                text-align:center;line-height:1.6;letter-spacing:0.08em;">
      ⊙ SCAN QR<br/>FOR ENTRY<br/>VERIFICATION
    </div>
  </div>
</div>
</div>`;
  }

  // ── PDF download ──────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (downloading || !qrUrl) return;
    setDownloading(true);
    let wrap: HTMLDivElement | null = null;
    try {
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);
      const h2c   = (window as any).html2canvas;
      const jsPDF = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
      if (!h2c || !jsPDF) throw new Error("libs missing");

      // Wait for fonts already loaded in document
      await (document.fonts?.ready ?? Promise.resolve());

      // Pre-warm fonts in the browser cache before capture
      const fontWarm = document.createElement("div");
      fontWarm.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;" +
        `font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:80px;`;
      fontWarm.textContent = "GALA DINNER 2026";
      const fontWarm2 = document.createElement("div");
      fontWarm2.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;" +
        `font-family:'Montserrat',Arial,sans-serif;font-weight:700;font-size:12px;`;
      fontWarm2.textContent = "AWARDS NETWORKING ENTERTAINMENT ADMIT NAME TICKET";
      document.body.appendChild(fontWarm);
      document.body.appendChild(fontWarm2);
      await new Promise(r => setTimeout(r, 800));
      document.body.removeChild(fontWarm);
      document.body.removeChild(fontWarm2);

      // ── KEY FIX: render off-screen with position:absolute (not fixed),
      //    well outside the viewport so it doesn't flash, but NOT clipped by
      //    the viewport width — html2canvas clips fixed elements on small screens.
      wrap = document.createElement("div");
      wrap.style.cssText =
        `position:absolute;` +
        `top:${window.scrollY + 99999}px;` +   // far below visible area
        `left:0;` +
        `width:${TW}px;height:${TH}px;` +
        `z-index:0;overflow:visible;pointer-events:none;`;
      wrap.innerHTML =
        `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,900&family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet"/>` +
        buildHTML(qrUrl);
      document.body.appendChild(wrap);

      // Target the ticket div (second child after the <link>)
      const inner = wrap.children[1] as HTMLElement;

      // Wait for all images (background + logo + QR) to load
      await waitImgs(inner);
      await (document.fonts?.ready ?? Promise.resolve());
      // Extra settle time for background image and font rendering
      await new Promise(r => setTimeout(r, 2200));

      const canvas = await h2c(inner, {
        scale: 2,             // 2× is sharper than 1× but avoids memory issues
        useCORS: true,
        allowTaint: false,
        backgroundColor: DARK,
        width: TW,
        height: TH,
        windowWidth: TW,      // ── KEY: tell h2c the "window" is ticket-wide
        windowHeight: TH,     //    so media queries / viewport units resolve correctly
        scrollX: 0,
        scrollY: 0,
        logging: false,
        imageTimeout: 30000,
      });

      document.body.removeChild(wrap); wrap = null;

      // PDF: 8.5 × 3.5 inches @ 72pt = 612 × 252 pt  (matches TW/TH ratio exactly)
      const PW = 612, PH = 252;
      const pdf = new jsPDF({ orientation:"landscape", unit:"pt", format:[PW, PH] });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, PW, PH);
      pdf.save(`CSA-Ticket-${ticketNo||"download"}.pdf`);

    } catch(err) {
      if (wrap?.parentNode) { document.body.removeChild(wrap!); wrap = null; }
      console.error("PDF error:", err);
      alert("Could not generate PDF. Please screenshot your ticket.");
    } finally {
      setDownloading(false);
    }
  };

  const placeholder = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,900&family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet"/>

      {/* Responsive preview */}
      <div style={{ width:"100%", overflowX:"auto" }}>
        <div style={{ position:"relative", width:"100%", paddingBottom:`${(TH/TW)*100}%` }}>
          <div style={{
              position:"absolute", inset:0, borderRadius:10,
              overflow:"hidden", boxShadow:"0 16px 48px rgba(0,0,0,0.65)",
            }}
            dangerouslySetInnerHTML={{ __html: buildHTML(qrUrl || placeholder) }}
          />
        </div>
      </div>

      {/* Download button */}
      <div style={{ display:"flex", justifyContent:"center", marginTop:20 }}>
        <button
          onClick={handleDownload}
          disabled={downloading || !qrUrl}
          style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"13px 36px",
            background: downloading || !qrUrl
              ? "rgba(201,162,39,0.2)"
              : "linear-gradient(135deg,#E8D57A,#C9A227)",
            color: DARK, border:"none", borderRadius:10,
            fontWeight:800, fontSize:14, letterSpacing:"0.05em",
            cursor: downloading || !qrUrl ? "not-allowed" : "pointer",
            fontFamily:"Montserrat,sans-serif",
            boxShadow: downloading || !qrUrl ? "none" : "0 4px 18px rgba(201,162,39,0.4)",
          }}
        >
          {downloading ? "⏳  Generating PDF…" : "⬇  Download PDF Ticket"}
        </button>
      </div>

      <p style={{
        textAlign:"center", marginTop:8, fontSize:11,
        color:"rgba(255,255,255,0.3)", fontFamily:"Montserrat,sans-serif",
      }}>
        8.5″ × 3.5″ landscape · Button enables once QR loads
      </p>
    </>
  );
}
