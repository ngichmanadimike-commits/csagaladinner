/**
 * TicketDesign.tsx — v9
 * Pixel-perfect match to reference design image.
 * Live event data from Supabase (time, theme, venue, date all from event config).
 * PDF uses body-injected HTML + html2canvas at scale:3 for crisp output.
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
    dayName: DAYS[d.getDay()],
    day: String(day),
    suf: ordinalSuffix(day),
    month: MONTHS[d.getMonth()],
    year: String(d.getFullYear()),
    startTime: `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`,
  };
}

function fmt24to12(t: string | null | undefined) {
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

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD   = "#D4AF37";
const GOLD2  = "#FFD700";
const DARK   = "#0B1120";
const CREAM  = "#F5F0E4";
const LOGO   = "https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg";
const BG     = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format";

// Ticket fixed pixel dimensions (8.5 × 3.5 in @ 150 dpi)
const TW = 1275, TH = 525;

// ── Main component ────────────────────────────────────────────────────────────
export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const [downloading, setDownloading] = useState(false);
  const [qrUrl, setQrUrl]             = useState("");
  const [ev, setEv] = useState<{
    title?:string; theme?:string; venue?:string;
    event_date?:string|null; end_time?:string|null;
  } | null>(null);

  // ── Live event fetch (always fresh from DB) ───────────────────────────
  useEffect(() => {
    (async () => {
      let data: any = null;
      if (ticket.event_id) {
        ({ data } = await supabase.from("events")
          .select("title,theme,venue,event_date,end_time")
          .eq("id", ticket.event_id).maybeSingle());
      }
      if (!data) {
        ({ data } = await supabase.from("events")
          .select("title,theme,venue,event_date,end_time")
          .eq("status","published")
          .order("event_date",{ascending:true}).limit(1).maybeSingle());
      }
      if (!data) {
        ({ data } = await supabase.from("events")
          .select("title,theme,venue,event_date,end_time")
          .order("created_at",{ascending:false}).limit(1).maybeSingle());
      }
      if (data) setEv(data);
    })();
  }, [ticket.event_id]);

  // Merge live data wins over ticket props
  const evTitle   = (ev?.title   || ticket.event_title  || "ANNUAL CSA GALA DINNER").toUpperCase();
  const evTheme   = ev?.theme    || ticket.event_theme   || "Laying the first foundations";
  const evVenue   = (ev?.venue   || ticket.event_venue   || "KINGFISHER NEST HOTEL").toUpperCase();
  const evDate    = ev?.event_date   ?? ticket.event_date   ?? null;
  const evEndRaw  = ev?.end_time     ?? ticket.event_end_time ?? null;

  const date       = parseDate(evDate);
  const endTimeStr = fmt24to12(evEndRaw);
  const timeLabel  = endTimeStr ? `${date.startTime} – ${endTimeStr}` : date.startTime;

  const ticketType  = (ticket.type_name || ticket.ticket_type || "REGULAR").toUpperCase();
  const name        = (ticket.purchaser_name ?? "").toUpperCase();
  const bookingCode = ticket.booking_code ?? "";
  const ticketNo    = ticket.ticket_number ?? "";
  const status      = (ticket.payment_status ?? "PENDING").toUpperCase();
  const amount      = ticket.total_amount ?? 0;
  const isPaid      = ["PAID","CONFIRMED","PARTIAL"].includes(status);
  const statusLabel = isPaid ? "PAID" : status;
  const statusColor = isPaid ? "#16a34a" : "#b45309";

  // QR code
  useEffect(() => {
    if (!ticketNo && !bookingCode) return;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${encodeURIComponent(ticketNo || bookingCode)}`);
  }, [ticketNo, bookingCode]);

  // ── HTML builder — pixel-accurate to reference image ─────────────────
  function html(qr: string): string {
    // Column widths matching reference: left≈67%, right≈33%
    const LW = 855, RW = TW - LW; // 855 + 420 = 1275
    const GB = 36; // gold sidebar width

    // Icon SVGs (inline so they work in html2canvas)
    const iconStyle = `display:inline-block;width:18px;height:18px;vertical-align:middle;margin-right:6px;flex-shrink:0;`;
    const iconPerson = `<svg style="${iconStyle}" viewBox="0 0 24 24" fill="${GOLD}"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`;
    const iconTag    = `<svg style="${iconStyle}" viewBox="0 0 24 24" fill="${GOLD}"><path d="M21.41 11.58l-9-9A2 2 0 0011 2H4a2 2 0 00-2 2v7a2 2 0 00.59 1.42l9 9a2 2 0 002.82 0l7-7a2 2 0 000-2.84zM5.5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>`;
    const iconTicket = `<svg style="${iconStyle}" viewBox="0 0 24 24" fill="${GOLD}"><path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2z"/></svg>`;
    const iconCheck  = `<svg style="${iconStyle}" viewBox="0 0 24 24" fill="${GOLD}"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
    const iconCoin   = `<svg style="${iconStyle}" viewBox="0 0 24 24" fill="${GOLD}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>`;

    const rows = [
      { icon: iconPerson, label: "NAME",         val: name,          vc: "#1a1a2e" },
      { icon: iconTag,    label: "BOOKING CODE", val: bookingCode,   vc: "#1a1a2e" },
      { icon: iconTicket, label: "TICKET TYPE",  val: ticketType,    vc: "#1a1a2e" },
      { icon: iconCheck,  label: "STATUS",       val: statusLabel,   vc: statusColor },
      { icon: iconCoin,   label: "AMOUNT",       val: `KSH ${amount.toLocaleString()}`, vc: "#1a1a2e" },
    ];

    const rowsHtml = rows.map(r => `
      <div style="display:flex;align-items:center;padding:7px 0;
                  border-bottom:1px solid rgba(212,175,55,0.25);gap:0;">
        ${r.icon}
        <span style="font-size:11px;font-weight:700;color:${GOLD};letter-spacing:0.06em;
                     text-transform:uppercase;min-width:100px;">${r.label}</span>
        <span style="font-size:12px;font-weight:700;color:${r.vc};
                     margin-left:auto;text-align:right;">${r.val}</span>
      </div>`).join("");

    return `
<div style="width:${TW}px;height:${TH}px;display:flex;overflow:hidden;
            font-family:'Montserrat',Arial,sans-serif;box-sizing:border-box;">

  <!-- ═══ LEFT PANEL ═══ -->
  <div style="width:${LW}px;flex-shrink:0;position:relative;overflow:hidden;
              background:${DARK};display:flex;flex-direction:column;">

    <!-- Background photo -->
    <div style="position:absolute;inset:0;
                background:url('${BG}') center/cover no-repeat;
                opacity:0.35;"></div>
    <!-- Dark overlay -->
    <div style="position:absolute;inset:0;
                background:linear-gradient(135deg,rgba(11,17,32,0.92) 55%,rgba(11,17,32,0.75) 100%);"></div>

    <!-- Dashed right border -->
    <div style="position:absolute;right:0;top:0;bottom:0;width:0;
                border-right:3px dashed ${GOLD};z-index:5;"></div>
    <!-- Notch top -->
    <div style="position:absolute;right:-14px;top:-14px;width:28px;height:28px;
                background:white;border-radius:50%;z-index:6;"></div>
    <!-- Notch bottom -->
    <div style="position:absolute;right:-14px;bottom:-14px;width:28px;height:28px;
                background:white;border-radius:50%;z-index:6;"></div>

    <!-- Content row -->
    <div style="position:relative;z-index:2;display:flex;height:100%;
                padding:28px 28px 24px 28px;gap:24px;">

      <!-- ── LEFT COLUMN: logo + date + time + venue ── -->
      <div style="width:145px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding-top:4px;">

        <!-- Logo circle -->
        <div style="width:80px;height:80px;border-radius:50%;border:3px solid ${GOLD};
                    background:white;overflow:hidden;margin-bottom:14px;flex-shrink:0;">
          <img src="${LOGO}" alt="CSA" crossorigin="anonymous"
               style="width:90%;height:90%;object-fit:contain;margin:5%;display:block;"/>
        </div>

        <!-- Day name -->
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.65);
                    letter-spacing:0.08em;margin-bottom:0px;text-align:center;">
          ${date.dayName}
        </div>

        <!-- Big date number -->
        <div style="display:flex;align-items:flex-start;line-height:1;">
          <span style="font-size:72px;font-weight:900;color:${GOLD};line-height:0.85;
                       font-family:Georgia,serif;">${date.day}</span>
          <sup style="font-size:18px;font-weight:800;color:${GOLD};margin-top:10px;">
            ${date.suf}
          </sup>
        </div>

        <!-- Month / Year -->
        <div style="border-left:2px solid ${GOLD};padding-left:8px;margin-top:4px;
                    align-self:flex-start;margin-bottom:14px;">
          <div style="font-size:12px;font-weight:700;color:white;line-height:1.5;">
            ${date.month}
          </div>
          <div style="font-size:12px;font-weight:700;color:white;line-height:1.5;">
            ${date.year}
          </div>
        </div>

        <!-- Divider -->
        <div style="width:100%;border-top:1px solid rgba(212,175,55,0.5);margin-bottom:12px;"></div>

        <!-- Time -->
        <div style="align-self:flex-start;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:5px;
                      font-size:9.5px;font-weight:700;color:${GOLD};
                      letter-spacing:0.08em;margin-bottom:3px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="${GOLD}">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
            </svg>
            TIME
          </div>
          <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.9);line-height:1.4;">
            ${timeLabel}
          </div>
        </div>

        <!-- Divider -->
        <div style="width:100%;border-top:1px solid rgba(212,175,55,0.5);margin-bottom:12px;"></div>

        <!-- Venue -->
        <div style="align-self:flex-start;">
          <div style="display:flex;align-items:center;gap:5px;
                      font-size:9.5px;font-weight:700;color:${GOLD};
                      letter-spacing:0.08em;margin-bottom:3px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="${GOLD}">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            VENUE
          </div>
          <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.9);line-height:1.45;">
            ${evVenue}
          </div>
        </div>
      </div>

      <!-- ── MAIN CONTENT ── -->
      <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;min-width:0;padding-top:4px;">

        <!-- Title block -->
        <div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-weight:900;
                      color:${GOLD};font-size:82px;line-height:0.88;letter-spacing:1px;">
            GALA
          </div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-weight:700;
                      color:white;font-size:60px;line-height:0.92;margin-bottom:10px;">
            DINNER ${date.year}
          </div>
          <div style="color:${GOLD};font-size:11px;font-weight:700;
                      letter-spacing:0.18em;margin-bottom:13px;">
            AWARDS &nbsp;·&nbsp; NETWORKING &nbsp;·&nbsp; ENTERTAINMENT
          </div>

          <!-- Theme box -->
          <div style="border:1.5px solid ${GOLD};border-radius:6px;
                      padding:9px 14px;background:rgba(11,17,32,0.55);
                      font-size:11.5px;line-height:1.6;color:rgba(255,255,255,0.88);">
            <span style="color:${GOLD};font-weight:700;">THEME: </span>${evTheme}
          </div>
        </div>

        <!-- Ticket type + bottom row -->
        <div>
          <div style="color:${GOLD};font-size:10px;font-weight:700;
                      letter-spacing:0.12em;margin-bottom:7px;">TICKET TYPE</div>
          <div style="background:${GOLD2};color:${DARK};border-radius:6px;
                      padding:11px 16px;font-weight:900;font-size:22px;
                      text-align:center;letter-spacing:0.2em;margin-bottom:12px;">
            ★ &nbsp;${ticketType}&nbsp; ★
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div style="background:${CREAM};color:${DARK};border-radius:5px;
                        padding:7px 13px;font-size:11px;font-weight:700;
                        letter-spacing:0.04em;white-space:nowrap;border:1px solid rgba(212,175,55,0.3);">
              TICKET NO. ${ticketNo}
            </div>
            <div style="color:${GOLD};font-size:17px;font-style:italic;
                        font-family:Georgia,serif;white-space:nowrap;overflow:hidden;">
              Pooling Construction Students Together!
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ RIGHT PANEL ═══ -->
  <div style="width:${RW}px;flex-shrink:0;background:${CREAM};
              display:flex;flex-direction:column;position:relative;
              box-sizing:border-box;
              padding:20px ${GB + 10}px 16px 18px;">

    <!-- Gold sidebar -->
    <div style="position:absolute;right:0;top:0;bottom:0;width:${GB}px;
                background:${GOLD};display:flex;align-items:center;justify-content:center;
                writing-mode:vertical-rl;transform:rotate(180deg);
                font-size:10px;font-weight:800;color:${DARK};
                letter-spacing:0.14em;white-space:nowrap;overflow:hidden;">
      ${evTitle}
    </div>

    <!-- ADMIT header -->
    <div style="text-align:center;font-size:20px;font-weight:900;
                color:${DARK};letter-spacing:0.18em;margin-bottom:6px;">
      ★ &nbsp;ADMIT&nbsp; ★
    </div>
    <div style="border-top:2px solid ${GOLD};margin-bottom:10px;"></div>

    <!-- Detail rows -->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;">
      ${rowsHtml}
    </div>

    <!-- QR code -->
    <div style="display:flex;flex-direction:column;align-items:center;
                margin-top:8px;gap:5px;">
      <div style="width:100px;height:100px;border:2.5px solid ${GOLD};
                  border-radius:6px;overflow:hidden;background:white;flex-shrink:0;">
        <img src="${qr}" alt="QR" crossorigin="anonymous"
             style="width:100%;height:100%;display:block;"/>
      </div>
      <div style="font-size:9px;font-weight:700;color:${DARK};
                  letter-spacing:0.08em;text-align:center;line-height:1.4;">
        ⬡ SCAN QR<br/>FOR ENTRY<br/>VERIFICATION
      </div>
    </div>
  </div>

</div>`;
  }

  // ── PDF download ─────────────────────────────────────────────────────────
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

      // Mount fully-visible container at top of page
      wrap = document.createElement("div");
      wrap.style.cssText =
        `position:fixed;top:0;left:0;width:${TW}px;height:${TH}px;` +
        `z-index:2147483647;overflow:hidden;pointer-events:none;`;
      wrap.innerHTML = html(qrUrl);
      document.body.appendChild(wrap);

      const inner = wrap.firstElementChild as HTMLElement;
      await waitImgs(inner);
      await new Promise(r => setTimeout(r, 1000)); // paint fonts + bg-image

      const canvas = await h2c(inner, {
        scale: 3,              // high DPI — crisp text and images
        useCORS: true,
        allowTaint: false,
        backgroundColor: DARK,
        width: TW,
        height: TH,
        logging: false,
        imageTimeout: 20000,
      });

      document.body.removeChild(wrap); wrap = null;

      // 8.5 × 3.5 in landscape PDF
      const PW = 612, PH = 252;
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [PH, PW] });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, PW, PH);
      pdf.save(`CSA-Ticket-${ticketNo || "download"}.pdf`);

    } catch (err) {
      if (wrap?.parentNode) { document.body.removeChild(wrap); wrap = null; }
      console.error("PDF error:", err);
      alert("Could not generate PDF. Please screenshot your ticket.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const placeholder = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet"/>

      {/* Responsive aspect-ratio preview */}
      <div style={{ width:"100%", overflowX:"auto" }}>
        <div style={{ position:"relative", width:"100%", paddingBottom:`${(TH/TW)*100}%` }}>
          <div
            style={{
              position:"absolute", inset:0, borderRadius:12,
              overflow:"hidden", boxShadow:"0 16px 48px rgba(0,0,0,0.6)",
            }}
            dangerouslySetInnerHTML={{ __html: html(qrUrl || placeholder) }}
          />
        </div>
      </div>

      {/* Download button */}
      <div style={{ display:"flex", justifyContent:"center", marginTop:20 }}>
        <button
          onClick={handleDownload}
          disabled={downloading || !qrUrl}
          style={{
            display:"flex", alignItems:"center", gap:10, padding:"14px 36px",
            background: downloading || !qrUrl
              ? "rgba(212,175,55,0.25)"
              : "linear-gradient(135deg,#E8D080,#D4AF37)",
            color: DARK, border:"none", borderRadius:10,
            fontWeight:800, fontSize:15, letterSpacing:"0.04em",
            cursor: downloading || !qrUrl ? "not-allowed" : "pointer",
            fontFamily:"Montserrat,sans-serif",
            boxShadow: downloading || !qrUrl ? "none" : "0 4px 18px rgba(212,175,55,0.4)",
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
        8.5″ × 3.5″ landscape &nbsp;·&nbsp; Button enables once QR loads
      </p>
    </>
  );
}
