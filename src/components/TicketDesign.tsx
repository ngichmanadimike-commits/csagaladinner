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
  const START_TIME = "7:00 PM";
  if (!s) return { dayName:"FRIDAY", day:"12", suf:"TH", month:"JUNE", year:"2026", startTime:START_TIME };
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

const GOLD  = "#C9A227";
const GOLD2 = "#F5C518";
const DARK  = "#0B1120";
const CREAM = "#F2EDD7";
const LOGO  = "https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg";
const BGIMG = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format";

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
  const statusColor = isPaid ? DARK : "#b45309";

  useEffect(() => {
    if (!ticketNo && !bookingCode) return;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${encodeURIComponent(ticketNo||bookingCode)}`);
  }, [ticketNo, bookingCode]);

  function buildHTML(qr: string): string {
    const LW  = 850;
    const RW  = TW - LW;
    const GBW = 36;

    const icoPerson = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right:8px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><path d="M12 11c1.93 0 3.5-1.57 3.5-3.5S13.93 4 12 4 8.5 5.57 8.5 7.5 10.07 11 12 11zm0 1.5c-2.33 0-7 1.17-7 3.5V18h14v-2c0-2.33-4.67-3.5-7-3.5z" fill="${GOLD}"/></svg>`;
    const icoTag    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right:8px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><path d="M6.5 6.5h4.5l6.5 6.5-4.5 4.5L6.5 11V6.5zm2 2a1 1 0 100 2 1 1 0 000-2z" fill="${GOLD}"/></svg>`;
    const icoTkt    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right:8px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><path d="M17 9c0-.6-.4-1-1-1H8c-.6 0-1 .4-1 1v1.5c.8.2 1.5 1 1.5 1.5s-.7 1.3-1.5 1.5V15c0 .6.4 1 1 1h8c.6 0 1-.4 1-1v-1.5c-.8-.2-1.5-1-1.5-1.5s.7-1.3 1.5-1.5V9z" fill="${GOLD}"/></svg>`;
    const icoChk    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right:8px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><path d="M7 12.5l3.5 3.5 6.5-7" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const icoCoin   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right:8px;flex-shrink:0"><circle cx="12" cy="12" r="11" stroke="${GOLD}" stroke-width="1.5"/><circle cx="12" cy="12" r="5" stroke="${GOLD}" stroke-width="1.5"/><path d="M12 8v8M10 9.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5-.9 1.5-2 1.5-2 .7-2 1.5.9 1.5 2 1.5 2-.7 2-1.5" stroke="${GOLD}" stroke-width="1" stroke-linecap="round"/></svg>`;
    const icoClk    = `<svg width="12" height="12" viewBox="0 0 24 24" fill="${GOLD}" style="flex-shrink:0"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5H11v6l5.2 3.1.8-1.2-4.5-2.7V7z"/></svg>`;
    const icoPin    = `<svg width="12" height="12" viewBox="0 0 24 24" fill="${GOLD}" style="flex-shrink:0"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/></svg>`;

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
                  padding:5px 0;">
        ${r.ico}
        <span style="font-size:9.5px;font-weight:700;color:${GOLD};
                     letter-spacing:0.07em;text-transform:uppercase;
                     min-width:90px;flex-shrink:0;">${r.lbl}</span>
        <span style="font-size:11px;font-weight:700;color:${r.vc};
                     margin-left:auto;text-align:right;
                     word-break:break-word;max-width:145px;">${r.val}</span>
      </div>`).join("");

    return `<div style="width:${TW}px;height:${TH}px;display:flex;overflow:hidden;
font-family:'Montserrat',Arial,sans-serif;position:relative;box-sizing:border-box;">

<!--=== LEFT PANEL ===-->
<div style="width:${LW}px;height:${TH}px;flex-shrink:0;position:relative;overflow:hidden;">
  <img src="${BGIMG}" alt="" crossorigin="anonymous"
       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.45;"/>
  <div style="position:absolute;inset:0;
              background:linear-gradient(to right,rgba(11,17,32,0.97) 0%,rgba(11,17,32,0.90) 55%,rgba(11,17,32,0.70) 100%);"></div>
  <div style="position:absolute;right:0;top:0;bottom:0;
              border-right:2.5px dashed rgba(201,162,39,0.75);z-index:4;"></div>
  <div style="position:absolute;right:-14px;top:-14px;width:28px;height:28px;
              background:${CREAM};border-radius:50%;z-index:5;"></div>
  <div style="position:absolute;right:-14px;bottom:-14px;width:28px;height:28px;
              background:${CREAM};border-radius:50%;z-index:5;"></div>

  <div style="position:relative;z-index:3;display:flex;width:100%;height:100%;
              box-sizing:border-box;padding:22px 20px 18px 22px;gap:18px;">

    <div style="width:145px;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-start;">
      <div style="width:72px;height:72px;border-radius:50%;border:2.5px solid ${GOLD};
                  background:white;overflow:hidden;margin-bottom:10px;align-self:center;">
        <img src="${LOGO}" alt="CSA" crossorigin="anonymous"
             style="width:88%;height:88%;object-fit:contain;display:block;margin:6% auto;"/>
      </div>
      <div style="font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.7);
                  letter-spacing:0.12em;align-self:flex-start;margin-bottom:0px;">
        ${date.dayName}
      </div>
      <div style="display:flex;align-items:flex-start;line-height:1;margin-bottom:2px;">
        <span style="font-size:82px;font-weight:900;color:${GOLD};
                     font-family:Georgia,serif;line-height:0.82;">${date.day}</span>
        <span style="font-size:18px;font-weight:800;color:${GOLD};
                     margin-top:8px;font-family:Georgia,serif;">${date.suf}</span>
      </div>
      <div style="border-left:3px solid ${GOLD};padding-left:7px;
                  margin-left:4px;margin-bottom:12px;">
        <div style="font-size:11.5px;font-weight:700;color:white;line-height:1.5;">${date.month}</div>
        <div style="font-size:11.5px;font-weight:700;color:white;line-height:1.5;">${date.year}</div>
      </div>
      <div style="width:115px;border-top:1px solid rgba(201,162,39,0.45);margin-bottom:9px;"></div>
      <div style="margin-bottom:9px;">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
          ${icoClk}
          <span style="font-size:8.5px;font-weight:700;color:${GOLD};letter-spacing:0.12em;">TIME</span>
        </div>
        <div style="font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.9);line-height:1.4;">
          ${timeLabel}
        </div>
      </div>
      <div style="width:115px;border-top:1px solid rgba(201,162,39,0.45);margin-bottom:9px;"></div>
      <div>
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
          ${icoPin}
          <span style="font-size:8.5px;font-weight:700;color:${GOLD};letter-spacing:0.12em;">VENUE</span>
        </div>
        <div style="font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.9);line-height:1.4;">
          ${evVenue}
        </div>
      </div>
    </div>

    <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;min-width:0;">
      <div>
        <div style="font-family:'Playfair Display',Georgia,serif;font-weight:900;font-style:italic;
                    color:${GOLD};font-size:88px;line-height:0.82;letter-spacing:2px;">
          GALA
        </div>
        <div style="font-family:'Playfair Display',Georgia,serif;font-weight:700;
                    color:white;font-size:64px;line-height:0.88;margin-bottom:7px;letter-spacing:1px;">
          DINNER ${date.year}
        </div>
        <div style="color:${GOLD};font-size:10px;font-weight:700;
                    letter-spacing:0.2em;margin-bottom:10px;">
          AWARDS &nbsp;•&nbsp; NETWORKING &nbsp;•&nbsp; ENTERTAINMENT
        </div>
        <div style="border:1.5px solid ${GOLD};border-radius:5px;
                    padding:7px 12px;background:rgba(11,17,32,0.55);
                    font-size:10.5px;line-height:1.55;color:rgba(255,255,255,0.88);">
          <span style="color:${GOLD};font-weight:700;font-size:10.5px;">THEME: </span>${evTheme}
        </div>
      </div>
      <div>
        <div style="color:${GOLD};font-size:9px;font-weight:700;
                    letter-spacing:0.14em;margin-bottom:5px;text-transform:uppercase;">
          TICKET TYPE
        </div>
        <div style="background:${GOLD2};color:${DARK};border-radius:5px;
                    padding:9px 14px;font-weight:900;font-size:20px;
                    text-align:center;letter-spacing:0.2em;margin-bottom:9px;">
          ★ &nbsp;${ticketType}&nbsp; ★
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="background:${CREAM};color:${DARK};border-radius:4px;
                      padding:5px 11px;font-size:10px;font-weight:700;
                      white-space:nowrap;border:1px solid rgba(201,162,39,0.3);">
            TICKET NO. ${ticketNo}
          </div>
          <div style="color:${GOLD};font-size:14px;font-style:italic;
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
            padding:16px ${GBW + 10}px 12px 14px;">
  <div style="position:absolute;right:0;top:0;bottom:0;width:${GBW}px;
              background:${GOLD};overflow:hidden;display:flex;align-items:center;justify-content:center;">
    <div style="white-space:nowrap;font-size:9.5px;font-weight:800;
                color:${DARK};letter-spacing:0.16em;text-transform:uppercase;
                transform:rotate(90deg);">
      ${evTitle}
    </div>
  </div>
  <div style="text-align:center;font-size:18px;font-weight:900;
              color:${DARK};letter-spacing:0.22em;margin-bottom:4px;">
    ★ &nbsp;ADMIT&nbsp; ★
  </div>
  <div style="border-top:2px solid ${GOLD};margin-bottom:7px;"></div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
    ${rowsHtml}
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;padding-top:6px;gap:3px;">
    <div style="width:92px;height:92px;border:2px solid ${GOLD};
                border-radius:4px;overflow:hidden;background:white;flex-shrink:0;">
      <img src="${qr}" alt="QR" crossorigin="anonymous"
           style="width:100%;height:100%;display:block;"/>
    </div>
    <div style="font-size:8px;font-weight:700;color:${DARK};
                text-align:center;line-height:1.6;letter-spacing:0.08em;">
      ⊙ SCAN QR<br/>FOR ENTRY<br/>VERIFICATION
    </div>
  </div>
</div>
</div>`;
  }

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

      const fontWarm = document.createElement("div");
      fontWarm.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:80px;";
      fontWarm.textContent = "GALA DINNER 2026 Pooling Construction Students Together!";
      const fontWarm2 = document.createElement("div");
      fontWarm2.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;font-family:'Montserrat',Arial,sans-serif;font-weight:700;font-size:12px;";
      fontWarm2.textContent = "AWARDS NETWORKING ENTERTAINMENT ADMIT NAME TICKET";
      document.body.appendChild(fontWarm);
      document.body.appendChild(fontWarm2);
      await new Promise(r => setTimeout(r, 600));
      document.body.removeChild(fontWarm);
      document.body.removeChild(fontWarm2);

      wrap = document.createElement("div");
      wrap.style.cssText = `position:fixed;top:0;left:0;width:${TW}px;height:${TH}px;z-index:2147483647;overflow:hidden;pointer-events:none;`;
      wrap.innerHTML =
        `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,900&family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet"/>` +
        buildHTML(qrUrl);
      document.body.appendChild(wrap);

      const inner = wrap.children[1] as HTMLElement;
      await waitImgs(inner);
      await (document.fonts?.ready ?? Promise.resolve());
      await new Promise(r => setTimeout(r, 1800));

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
      <div style={{ width:"100%", overflowX:"auto" }}>
        <div style={{ position:"relative", width:"100%", paddingBottom:`${(TH/TW)*100}%` }}>
          <div style={{ position:"absolute", inset:0, borderRadius:10, overflow:"hidden", boxShadow:"0 16px 48px rgba(0,0,0,0.65)" }}
            dangerouslySetInnerHTML={{ __html: buildHTML(qrUrl || placeholder) }}
          />
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"center", marginTop:20 }}>
        <button
          onClick={handleDownload}
          disabled={downloading || !qrUrl}
          style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"13px 36px",
            background: downloading || !qrUrl ? "rgba(201,162,39,0.2)" : "linear-gradient(135deg,#E8D57A,#C9A227)",
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
      <p style={{ textAlign:"center", marginTop:8, fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"Montserrat,sans-serif" }}>
        8.5″ × 3.5″ landscape · Button enables once QR loads
      </p>
    </>
  );
}
