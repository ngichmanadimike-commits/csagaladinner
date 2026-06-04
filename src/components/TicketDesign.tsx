/**
 * TicketDesign.tsx — v10
 * Exact match to reference. All event data (time, theme, venue, date) from Supabase.
 * PDF: body-injected HTML + html2canvas scale:3.
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
  if (!s) return { dayName:"FRIDAY", day:"12", suf:"TH", month:"JUNE", year:"2026", startTime:"10:00 PM" };
  const d = new Date(s);
  const day = d.getDate();
  const h = d.getHours(), mm = d.getMinutes().toString().padStart(2,"0");
  return {
    dayName: DAYS[d.getDay()], day: String(day), suf: ordinalSuffix(day),
    month: MONTHS[d.getMonth()], year: String(d.getFullYear()),
    startTime: `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`,
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

// Ticket canvas: 8.5 × 3.5 in @ 150dpi
const TW = 1275, TH = 525;

export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const [downloading, setDownloading] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [ev, setEv] = useState<any>(null);

  // ── Live event data ───────────────────────────────────────────────────────
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

  // Merge: live DB wins
  const evTitle  = (ev?.title  || ticket.event_title  || "ANNUAL CSA GALA DINNER").toUpperCase();
  const evTheme  = (ev?.theme  || ticket.event_theme  || "Laying the first foundations")
                    .replace(/^["']|["']$/g, ""); // strip any accidental quotes
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
  const statusColor = isPaid ? "#16a34a" : "#b45309";

  useEffect(() => {
    if (!ticketNo && !bookingCode) return;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${encodeURIComponent(ticketNo||bookingCode)}`);
  }, [ticketNo, bookingCode]);

  // ── Ticket HTML builder ───────────────────────────────────────────────────
  // Left panel = 67%, Right panel = 33% (matching reference proportions)
  // All sizes in px — fixed at TW × TH so preview & PDF are identical
  function buildHTML(qr: string): string {
    const LW = 855;       // left panel width
    const RW = TW - LW;   // right panel = 420
    const GBW = 38;        // gold sidebar width

    // Inline SVG icons (safe for html2canvas — no external resources)
    const icoClk  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="${GOLD}" style="flex-shrink:0"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5H11v6l5.2 3.1.8-1.2-4.5-2.7V7z"/></svg>`;
    const icoPin  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="${GOLD}" style="flex-shrink:0"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/></svg>`;
    const icoPerson = `<svg width="15" height="15" viewBox="0 0 24 24" fill="${GOLD}" style="margin-right:7px;flex-shrink:0"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`;
    const icoTag  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="${GOLD}" style="margin-right:7px;flex-shrink:0"><path d="M21.4 11.6l-9-9A2 2 0 0011 2H4a2 2 0 00-2 2v7c0 .5.2 1 .6 1.4l9 9a2 2 0 002.8 0l7-7a2 2 0 000-2.8zM5.5 7A1.5 1.5 0 115.5 4 1.5 1.5 0 015.5 7z"/></svg>`;
    const icoTkt  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="${GOLD}" style="margin-right:7px;flex-shrink:0"><path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2z"/></svg>`;
    const icoChk  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="${GOLD}" style="margin-right:7px;flex-shrink:0"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;
    const icoCoin = `<svg width="15" height="15" viewBox="0 0 24 24" fill="${GOLD}" style="margin-right:7px;flex-shrink:0"><circle cx="12" cy="12" r="10" fill="none" stroke="${GOLD}" stroke-width="2"/><path d="M12 6v12M9 8.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2.5-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5"/></svg>`;

    const rows = [
      { ico: icoPerson, lbl: "NAME",         val: name,         vc: "#111827" },
      { ico: icoTag,    lbl: "BOOKING CODE", val: bookingCode,  vc: "#111827" },
      { ico: icoTkt,    lbl: "TICKET TYPE",  val: ticketType,   vc: "#111827" },
      { ico: icoChk,    lbl: "STATUS",       val: statusLabel,  vc: statusColor },
      { ico: icoCoin,   lbl: "AMOUNT",       val: `KSH ${amount.toLocaleString()}`, vc: "#111827" },
    ];

    const rowsHtml = rows.map(r => `
      <div style="display:flex;align-items:center;
                  border-bottom:1px solid rgba(201,162,39,0.3);
                  padding:6px 0;min-height:0;">
        ${r.ico}
        <span style="font-size:10px;font-weight:700;color:${GOLD};
                     letter-spacing:0.07em;text-transform:uppercase;
                     min-width:95px;flex-shrink:0;">${r.lbl}</span>
        <span style="font-size:11px;font-weight:700;color:${r.vc};
                     margin-left:auto;text-align:right;
                     word-break:break-word;max-width:140px;">${r.val}</span>
      </div>`).join("");

    return `<div style="width:${TW}px;height:${TH}px;display:flex;overflow:hidden;
  font-family:'Montserrat',Arial,sans-serif;position:relative;box-sizing:border-box;">

  <!--=== LEFT PANEL ===-->
  <div style="width:${LW}px;height:${TH}px;flex-shrink:0;position:relative;overflow:hidden;">
    <!--background photo-->
    <img src="${BGIMG}" alt="" crossorigin="anonymous"
         style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.4;"/>
    <!--dark overlay-->
    <div style="position:absolute;inset:0;
                background:linear-gradient(to right,rgba(11,17,32,0.97) 0%,rgba(11,17,32,0.88) 70%,rgba(11,17,32,0.75) 100%);"></div>
    <!--dashed separator-->
    <div style="position:absolute;right:0;top:0;bottom:0;
                border-right:3px dashed rgba(201,162,39,0.8);z-index:4;"></div>
    <!--notch top-->
    <div style="position:absolute;right:-15px;top:-15px;width:30px;height:30px;
                background:#f0f0e8;border-radius:50%;z-index:5;"></div>
    <!--notch bottom-->
    <div style="position:absolute;right:-15px;bottom:-15px;width:30px;height:30px;
                background:#f0f0e8;border-radius:50%;z-index:5;"></div>

    <!--inner content-->
    <div style="position:relative;z-index:3;display:flex;width:100%;height:100%;
                box-sizing:border-box;padding:24px 22px 20px 24px;gap:20px;">

      <!--=== COLUMN A: logo + date + time + venue ===-->
      <div style="width:148px;flex-shrink:0;display:flex;flex-direction:column;
                  align-items:flex-start;">

        <!--logo-->
        <div style="width:76px;height:76px;border-radius:50%;border:2.5px solid ${GOLD};
                    background:white;overflow:hidden;margin-bottom:12px;align-self:center;">
          <img src="${LOGO}" alt="CSA" crossorigin="anonymous"
               style="width:88%;height:88%;object-fit:contain;
                      display:block;margin:6% auto;"/>
        </div>

        <!--day name-->
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.65);
                    letter-spacing:0.1em;align-self:center;margin-bottom:1px;">
          ${date.dayName}
        </div>

        <!--big number + suffix-->
        <div style="display:flex;align-items:flex-start;align-self:center;line-height:1;">
          <span style="font-size:78px;font-weight:900;color:${GOLD};
                       font-family:Georgia,serif;line-height:0.85;">${date.day}</span>
          <span style="font-size:20px;font-weight:800;color:${GOLD};
                       margin-top:9px;font-family:Georgia,serif;">${date.suf}</span>
        </div>

        <!--month / year with gold left bar-->
        <div style="border-left:3px solid ${GOLD};padding-left:8px;
                    align-self:flex-start;margin-left:8px;margin-bottom:14px;">
          <div style="font-size:12px;font-weight:700;color:white;line-height:1.5;">${date.month}</div>
          <div style="font-size:12px;font-weight:700;color:white;line-height:1.5;">${date.year}</div>
        </div>

        <!--divider-->
        <div style="width:120px;border-top:1px solid rgba(201,162,39,0.5);margin-bottom:10px;"></div>

        <!--time-->
        <div style="margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:5px;
                      font-size:9px;font-weight:700;color:${GOLD};
                      letter-spacing:0.12em;margin-bottom:3px;">
            ${icoClk} TIME
          </div>
          <div style="font-size:11px;font-weight:700;
                      color:rgba(255,255,255,0.9);line-height:1.45;">
            ${timeLabel}
          </div>
        </div>

        <!--divider-->
        <div style="width:120px;border-top:1px solid rgba(201,162,39,0.5);margin-bottom:10px;"></div>

        <!--venue-->
        <div>
          <div style="display:flex;align-items:center;gap:5px;
                      font-size:9px;font-weight:700;color:${GOLD};
                      letter-spacing:0.12em;margin-bottom:3px;">
            ${icoPin} VENUE
          </div>
          <div style="font-size:11px;font-weight:700;
                      color:rgba(255,255,255,0.9);line-height:1.45;">
            ${evVenue}
          </div>
        </div>
      </div>

      <!--=== COLUMN B: title + theme + ticket type + footer ===-->
      <div style="flex:1;display:flex;flex-direction:column;
                  justify-content:space-between;min-width:0;">

        <!--title block-->
        <div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-weight:900;
                      color:${GOLD};font-size:86px;line-height:0.85;letter-spacing:1px;">
            GALA
          </div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-weight:700;
                      color:white;font-size:62px;line-height:0.9;margin-bottom:8px;">
            DINNER ${date.year}
          </div>
          <div style="color:${GOLD};font-size:10.5px;font-weight:700;
                      letter-spacing:0.18em;margin-bottom:11px;">
            AWARDS &nbsp;•&nbsp; NETWORKING &nbsp;•&nbsp; ENTERTAINMENT
          </div>
          <!--theme-->
          <div style="border:1.5px solid ${GOLD};border-radius:6px;
                      padding:8px 13px;background:rgba(11,17,32,0.6);
                      font-size:11px;line-height:1.6;
                      color:rgba(255,255,255,0.88);">
            <span style="color:${GOLD};font-weight:700;">THEME: </span>${evTheme}
          </div>
        </div>

        <!--ticket type + bottom-->
        <div>
          <div style="color:${GOLD};font-size:9.5px;font-weight:700;
                      letter-spacing:0.12em;margin-bottom:6px;">TICKET TYPE</div>
          <div style="background:${GOLD2};color:${DARK};border-radius:5px;
                      padding:10px 14px;font-weight:900;font-size:21px;
                      text-align:center;letter-spacing:0.18em;margin-bottom:10px;">
            ★ &nbsp;${ticketType}&nbsp; ★
          </div>
          <div style="display:flex;align-items:center;
                      justify-content:space-between;gap:8px;">
            <div style="background:${CREAM};color:${DARK};border-radius:4px;
                        padding:6px 12px;font-size:10.5px;font-weight:700;
                        white-space:nowrap;border:1px solid rgba(201,162,39,0.35);">
              TICKET NO. ${ticketNo}
            </div>
            <div style="color:${GOLD};font-size:15px;font-style:italic;
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
  <div style="width:${RW}px;height:${TH}px;flex-shrink:0;background:${CREAM};
              position:relative;box-sizing:border-box;display:flex;flex-direction:column;
              padding:18px ${GBW + 8}px 14px 16px;">

    <!--gold sidebar — uses a canvas-friendly approach: rotated absolutely-->
    <div style="position:absolute;right:0;top:0;bottom:0;width:${GBW}px;
                background:${GOLD};overflow:hidden;">
      <!--rotated text inside sidebar-->
      <div style="position:absolute;top:50%;left:50%;
                  transform:translate(-50%,-50%) rotate(90deg);
                  white-space:nowrap;font-size:10px;font-weight:800;
                  color:${DARK};letter-spacing:0.14em;text-transform:uppercase;">
        ${evTitle}
      </div>
    </div>

    <!--ADMIT header-->
    <div style="text-align:center;font-size:19px;font-weight:900;
                color:${DARK};letter-spacing:0.2em;margin-bottom:5px;">
      ★ &nbsp;ADMIT&nbsp; ★
    </div>
    <div style="border-top:2px solid ${GOLD};margin-bottom:8px;"></div>

    <!--detail rows — fixed height container so they're evenly spaced-->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;
                overflow:hidden;">
      ${rowsHtml}
    </div>

    <!--QR code-->
    <div style="display:flex;flex-direction:column;align-items:center;
                padding-top:8px;gap:4px;">
      <div style="width:96px;height:96px;border:2.5px solid ${GOLD};
                  border-radius:5px;overflow:hidden;background:white;flex-shrink:0;">
        <img src="${qr}" alt="QR" crossorigin="anonymous"
             style="width:100%;height:100%;display:block;"/>
      </div>
      <div style="font-size:8.5px;font-weight:700;color:${DARK};
                  text-align:center;line-height:1.5;letter-spacing:0.06em;">
        ⬡ SCAN QR<br/>FOR ENTRY<br/>VERIFICATION
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

      await (document.fonts?.ready ?? Promise.resolve());

      wrap = document.createElement("div");
      wrap.style.cssText =
        `position:fixed;top:0;left:0;width:${TW}px;height:${TH}px;` +
        `z-index:2147483647;overflow:hidden;pointer-events:none;`;
      wrap.innerHTML = buildHTML(qrUrl);
      document.body.appendChild(wrap);

      const inner = wrap.firstElementChild as HTMLElement;
      await waitImgs(inner);
      await new Promise(r => setTimeout(r, 1200));

      const canvas = await h2c(inner, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: DARK,
        width: TW,
        height: TH,
        logging: false,
        imageTimeout: 25000,
      });

      document.body.removeChild(wrap); wrap = null;

      const PW = 612, PH = 252; // 8.5 × 3.5 in @ 72pt
      const pdf = new jsPDF({ orientation:"landscape", unit:"pt", format:[PH,PW] });
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
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet"/>

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
        8.5″ × 3.5″ landscape &nbsp;·&nbsp; Button enables once QR loads
      </p>
    </>
  );
}
