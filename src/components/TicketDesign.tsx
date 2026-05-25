import { useRef, useState, useEffect } from "react";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function formatEndTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatEventDate(dateStr: string | null | undefined) {
  if (!dateStr) {
    return { dayName: "FRIDAY", day: "5", daySuffix: "TH", month: "JUNE", year: "2026", time: "7:00 PM" };
  }
  const d = new Date(dateStr);
  const days = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const months = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  const dayNum = d.getDate();
  const mod = dayNum % 100;
  const suffixes = ["TH","ST","ND","RD"];
  const suffix = suffixes[(mod - 20) % 10] || suffixes[mod] || suffixes[0];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hh = hours % 12 || 12;
  return {
    dayName: days[d.getDay()],
    day: String(dayNum),
    daySuffix: suffix,
    month: months[d.getMonth()],
    year: String(d.getFullYear()),
    time: `${hh}:${mins} ${ampm}`,
  };
}

/* ─────────────────────────────────────────────────────────────
   Dynamically load a script (returns a promise)
───────────────────────────────────────────────────────────── */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/* ─────────────────────────────────────────────────────────────
   Standard ticket dimensions
   3.5" × 8.5" landscape  →  252 pt × 612 pt  (1 pt = 1/72 in)
   At 3× device-pixel-ratio the canvas will be very crisp.
───────────────────────────────────────────────────────────── */
const TICKET_PT_H = 252;   // height in points  (3.5 in)
const TICKET_PT_W = 612;   // width  in points  (8.5 in)
const RENDER_SCALE = 3;    // px per pt for the hidden render clone

/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl]     = useState<string>("");

  /* derived values */
  const ticketType  = (ticket.type_name || ticket.ticket_type || "Regular").toString();
  const bookingCode = ticket.booking_code ?? "";
  const qrCode      = ticket.qr_code || ticket.booking_code || "";
  const name        = ticket.purchaser_name ?? "";
  const ticketNo    = ticket.ticket_number ?? "";
  const status      = (ticket.payment_status ?? "pending").toUpperCase();
  const amount      = ticket.total_amount ?? 0;

  const eventTitle  = ticket.event_title  || "CSA Gala Dinner 2026";
  const eventTheme  = ticket.event_theme  || "Laying the First Stone: Honoring the Past, Empowering the Present, Inspiring the Future";
  const eventVenue  = ticket.event_venue  || "UTALII HOTEL";
  const date        = formatEventDate(ticket.event_date);
  const endTimeStr  = ticket.event_end_time ? formatEndTime(ticket.event_end_time) : "";
  const timeDisplay = endTimeStr ? `${date.time} – ${endTimeStr}` : date.time;

  /*
   * QR payload — a compact JSON string your admin scanner decodes.
   * Contains everything needed to look up and admit the ticket.
   */
  const qrPayload = JSON.stringify({
    t: ticketNo,      // ticket_number
    b: bookingCode,   // booking_code
    q: qrCode,        // qr_code field from DB (may be a UUID / token)
  });

  /* Generate QR code into a canvas once on mount / whenever qrPayload changes */
  useEffect(() => {
    let cancelled = false;
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js")
      .then(() => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const QRCode = (window as any).QRCode;
        /* eslint-enable @typescript-eslint/no-explicit-any */
        if (!QRCode || cancelled) return;

        /* Render into a throw-away div, extract dataURL */
        const tmp = document.createElement("div");
        tmp.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
        document.body.appendChild(tmp);

        new QRCode(tmp, {
          text: qrPayload,
          width: 300,
          height: 300,
          colorDark: "#0a1128",
          colorLight: "#F5F1E8",
          correctLevel: QRCode.CorrectLevel.H,   // high error-correction
        });

        /* QRCode.js appends a canvas or img depending on browser */
        const img = tmp.querySelector("img") as HTMLImageElement | null;
        const cvs = tmp.querySelector("canvas") as HTMLCanvasElement | null;

        const finish = (url: string) => {
          if (!cancelled) setQrDataUrl(url);
          document.body.removeChild(tmp);
        };

        if (cvs) {
          finish(cvs.toDataURL("image/png"));
        } else if (img) {
          img.onload = () => finish(img.src);
          if (img.complete) finish(img.src);
        }
      })
      .catch(() => {
        /* Fallback: use a free QR API (requires network) */
        if (!cancelled)
          setQrDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${encodeURIComponent(qrPayload)}`
          );
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrPayload]);

  /* ── PDF download ─────────────────────────────────────────── */
  const handleDownload = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);

    try {
      /* 1. Load libraries on demand */
      await Promise.all([
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      ]);

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const h2c   = (window as any).html2canvas;
      const jsPDF = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if (!h2c || !jsPDF) throw new Error("Libraries failed to load.");

      /*
       * 2. Create an off-screen clone sized to the exact render pixels.
       *    Render pixels = ticket-points × RENDER_SCALE
       *    3.5 in × 72 pt/in × 3 px/pt = 756 px  (height)
       *    8.5 in × 72 pt/in × 3 px/pt = 1836 px (width)
       */
      const pxW = TICKET_PT_W * RENDER_SCALE;  // 1836
      const pxH = TICKET_PT_H * RENDER_SCALE;  // 756

      const clone = ticketRef.current.cloneNode(true) as HTMLElement;
      clone.style.cssText = [
        `width:${pxW}px`,
        `height:${pxH}px`,
        "position:fixed",
        "top:-9999px",
        "left:-9999px",
        "overflow:hidden",
        "border-radius:0",        /* crisp edges for PDF */
        "filter:none",
        "transform:none",
        "zoom:1",
      ].join(";");

      /* Scale all inner text / sizing proportionally */
      const inner = clone.querySelector(".td-ticket") as HTMLElement | null;
      if (inner) {
        /* The preview .td-ticket is 980 px wide; scale to fill pxW */
        const s = pxW / 980;
        inner.style.cssText += [
          `transform:scale(${s})`,
          "transform-origin:top left",
          `width:980px`,
          `height:${pxH / s}px`,
        ].join(";");
      }

      document.body.appendChild(clone);

      /* 3. Rasterise */
      const canvas = await h2c(clone, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0a1128",
        width: pxW,
        height: pxH,
        logging: false,
      });

      document.body.removeChild(clone);

      /* 4. Build PDF — landscape, custom size in points */
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [TICKET_PT_H, TICKET_PT_W],   // [height, width] for landscape
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.97);
      pdf.addImage(imgData, "JPEG", 0, 0, TICKET_PT_W, TICKET_PT_H);

      /* 5. Save */
      pdf.save(`ticket-${ticketNo || "download"}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Please try again or use the HTML download fallback.");
    } finally {
      setDownloading(false);
    }
  };

  /* ── HTML fallback (Blob) — kept for environments that block scripts ── */
  const buildHtml = () => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${eventTitle} — Ticket ${ticketNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&family=Great+Vibes&display=swap" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
@page{size:8.5in 3.5in landscape;margin:0;}
body{
  background:#e8e8e8;padding:20px;
  display:flex;justify-content:center;align-items:center;min-height:100vh;
  font-family:'Montserrat',sans-serif;
}
.ticket-wrapper{width:100%;max-width:980px;overflow-x:auto;}
.ticket{
  width:980px;display:flex;flex-direction:row;
  background:#0a1128;color:white;
  position:relative;border-radius:10px;
  filter:drop-shadow(0 15px 35px rgba(0,0,0,.4));overflow:hidden;
}
.left{
  width:665px;padding:25px;position:relative;
  background-image:linear-gradient(rgba(10,17,40,.82),rgba(10,17,40,.82)),
    url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070');
  background-size:cover;background-position:center;display:flex;gap:25px;
}
.left::after{content:'';position:absolute;right:0;top:0;height:100%;border-right:2px dashed #D4AF37;}
.ticket::before{
  content:'';position:absolute;right:315px;top:50%;transform:translateY(-50%);
  width:30px;height:30px;background:#e8e8e8;border-radius:50%;z-index:10;
}
.right{width:315px;background:#F5F1E8;color:#0a1128;padding:20px 44px 20px 20px;position:relative;}
.gold-sidebar{
  position:absolute;right:0;top:0;height:100%;width:32px;
  background:#D4AF37;writing-mode:vertical-rl;text-orientation:mixed;
  display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:11px;color:#0a1128;letter-spacing:1px;overflow:hidden;
}
.csa-logo{
  width:75px;height:75px;background:white;border-radius:50%;
  border:3px solid #D4AF37;display:flex;align-items:center;justify-content:center;
  margin-bottom:20px;overflow:hidden;
}
.csa-logo img{width:85%;height:85%;object-fit:contain;}
.left-col{width:140px;flex-shrink:0;}
.date-box{border-left:1px solid #D4AF37;padding-left:12px;margin:15px 0;}
.date-box i{color:#D4AF37;margin-bottom:6px;font-size:16px;display:block;}
.date-box .day{font-size:38px;font-weight:700;color:#D4AF37;line-height:1;}
.date-box .th{font-size:16px;vertical-align:super;color:#D4AF37;}
.info-row{font-size:11px;margin:15px 0;font-weight:600;}
.info-row i{color:#D4AF37;margin-right:6px;width:14px;}
.main-content{flex:1;}
.gala{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;color:#D4AF37;line-height:1;}
.dinner{font-family:'Playfair Display',serif;font-size:38px;font-weight:700;color:white;}
.tagline{color:#D4AF37;font-size:11px;font-weight:600;margin:8px 0 15px;letter-spacing:1.5px;}
.theme-box{
  border:1px solid #D4AF37;border-radius:6px;padding:10px 15px;
  margin:15px 0;font-size:11px;background:rgba(10,17,40,.6);
  max-height:56px;overflow:hidden;
}
.theme-box span{color:#D4AF37;font-weight:700;}
.ticket-type-label{color:#D4AF37;font-size:11px;font-weight:700;margin-top:15px;}
.ticket-type-bar{
  background:#FFD700;color:#0a1128;padding:10px;margin:5px 0 15px;
  font-weight:900;font-size:16px;text-align:center;position:relative;border-radius:3px;
}
.ticket-type-bar i{position:absolute;top:50%;transform:translateY(-50%);color:#0a1128;}
.ticket-type-bar .left-star{left:15px;}
.ticket-type-bar .right-star{right:15px;}
.bottom-row{display:flex;align-items:flex-end;justify-content:space-between;margin-top:15px;}
.ticket-no{background:#F5F1E8;color:#0a1128;padding:8px 12px;font-weight:700;font-size:11px;border-radius:4px;}
.tagline-script{font-family:'Great Vibes',cursive;color:#D4AF37;font-size:16px;}
.admit{text-align:center;font-weight:900;font-size:18px;color:#0a1128;margin-bottom:8px;}
.admit i{color:#D4AF37;font-size:12px;margin:0 4px;}
.detail-item{
  display:flex;align-items:center;gap:8px;margin:10px 0;
  font-size:10px;font-weight:700;color:#D4AF37;
  border-bottom:1px dotted #D4AF37;padding-bottom:6px;
}
.detail-item i{
  width:22px;height:22px;border:1px solid #D4AF37;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;
}
.detail-value{color:#0a1128;margin-left:auto;font-size:11px;font-weight:600;text-align:right;word-break:break-word;max-width:140px;}
.qr-block{display:flex;flex-direction:column;align-items:center;margin:10px 0 6px;gap:4px;}
.qr-block img{width:110px;height:110px;border:3px solid #D4AF37;border-radius:6px;background:#F5F1E8;display:block;}
.scan-text{text-align:center;font-size:9px;font-weight:700;color:#0a1128;line-height:1.4;}
.scan-text i{margin-right:3px;font-size:8px;}
@media print{
  body{background:white;padding:0;min-height:auto;}
  .ticket{filter:none;}
}
</style>
</head>
<body>
<div class="ticket-wrapper">
<div class="ticket">
  <div class="left">
    <div class="left-col">
      <div class="csa-logo"><img src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg" alt="CSA Logo"></div>
      <div class="date-box">
        <i class="fa-solid fa-calendar-days"></i>
        <div style="font-size:11px;font-weight:600;">${date.dayName}</div>
        <div><span class="day">${date.day}</span><span class="th">${date.daySuffix}</span></div>
        <div style="font-size:11px;font-weight:600;">${date.month}<br>${date.year}</div>
      </div>
      <div style="border-top:1px solid #D4AF37;margin:12px 0;"></div>
      <div class="info-row"><i class="fa-solid fa-clock"></i>${timeDisplay}</div>
      <div style="border-top:1px solid #D4AF37;margin:12px 0;"></div>
      <div class="info-row"><i class="fa-solid fa-location-dot"></i>${eventVenue.toUpperCase()}</div>
    </div>
    <div class="main-content">
      <div class="gala">GALA</div>
      <div class="dinner">DINNER ${date.year}</div>
      <div class="tagline">AWARDS • NETWORKING • ENTERTAINMENT</div>
      <div class="theme-box"><span>THEME:</span> ${eventTheme}</div>
      <div class="ticket-type-label">TICKET TYPE</div>
      <div class="ticket-type-bar">
        <i class="fa-solid fa-star left-star"></i>
        ${ticketType.toUpperCase()}
        <i class="fa-solid fa-star right-star"></i>
      </div>
      <div class="bottom-row">
        <div class="ticket-no">TICKET NO. <span>${ticketNo}</span></div>
        <div class="tagline-script">Pooling Construction Students Together!</div>
      </div>
    </div>
  </div>
  <div class="right">
    <div class="admit"><i class="fa-solid fa-star"></i> ADMIT <i class="fa-solid fa-star"></i></div>
    <div style="border-top:1px solid #D4AF37;margin:8px 0 12px;"></div>
    <div class="detail-item"><i class="fa-solid fa-user"></i> NAME <span class="detail-value">${name}</span></div>
    <div class="detail-item"><i class="fa-solid fa-tag"></i> BOOKING CODE <span class="detail-value">${bookingCode}</span></div>
    <div class="detail-item"><i class="fa-solid fa-ticket"></i> TICKET TYPE <span class="detail-value">${ticketType}</span></div>
    <div class="detail-item"><i class="fa-solid fa-wallet"></i> STATUS <span class="detail-value">${status}</span></div>
    <div class="detail-item"><i class="fa-solid fa-coins"></i> AMOUNT <span class="detail-value">KSH ${amount.toLocaleString()}</span></div>
    <div class="qr-block">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${encodeURIComponent(qrPayload)}" alt="QR Code">
    </div>
    <div class="scan-text"><i class="fa-solid fa-qrcode"></i>SCAN QR<br>FOR ENTRY<br>VERIFICATION</div>
    <div class="gold-sidebar">${eventTitle.toUpperCase()}</div>
  </div>
</div>
</div>
</body>
</html>`;

  const handleHtmlFallback = () => {
    const blob = new Blob([buildHtml()], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `ticket-${ticketNo}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Inline preview styles ──────────────────────────────── */
  const css = `
    .td-wrapper{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
    .td-ticket{
      width:980px;display:flex;flex-direction:row;
      background:#0a1128;color:white;position:relative;
      border-radius:10px;filter:drop-shadow(0 15px 35px rgba(0,0,0,.4));overflow:hidden;
      font-family:'Montserrat',sans-serif;
    }
    .td-left{
      width:665px;padding:25px;position:relative;
      background-image:linear-gradient(rgba(10,17,40,.82),rgba(10,17,40,.82)),
        url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070');
      background-size:cover;background-position:center;display:flex;gap:25px;
    }
    .td-left::after{content:'';position:absolute;right:0;top:0;height:100%;border-right:2px dashed #D4AF37;}
    .td-ticket::before{
      content:'';position:absolute;right:315px;top:50%;transform:translateY(-50%);
      width:30px;height:30px;background:#1a1a2e;border-radius:50%;z-index:10;
    }
    .td-right{width:315px;background:#F5F1E8;color:#0a1128;padding:20px 44px 20px 20px;position:relative;}
    .td-gold-sidebar{
      position:absolute;right:0;top:0;height:100%;width:32px;background:#D4AF37;
      writing-mode:vertical-rl;text-orientation:mixed;display:flex;align-items:center;
      justify-content:center;font-weight:700;font-size:11px;color:#0a1128;
      letter-spacing:1px;overflow:hidden;
    }
    .td-logo{
      width:75px;height:75px;background:white;border-radius:50%;border:3px solid #D4AF37;
      display:flex;align-items:center;justify-content:center;margin-bottom:20px;overflow:hidden;
    }
    .td-logo img{width:85%;height:85%;object-fit:contain;}
    .td-left-col{width:140px;flex-shrink:0;}
    .td-date-box{border-left:1px solid #D4AF37;padding-left:12px;margin:15px 0;}
    .td-date-box i{color:#D4AF37;margin-bottom:6px;font-size:16px;display:block;}
    .td-day{font-size:38px;font-weight:700;color:#D4AF37;line-height:1;}
    .td-th{font-size:16px;vertical-align:super;color:#D4AF37;}
    .td-info{font-size:11px;margin:15px 0;font-weight:600;}
    .td-info i{color:#D4AF37;margin-right:6px;width:14px;}
    .td-main{flex:1;}
    .td-gala{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;color:#D4AF37;line-height:1;}
    .td-dinner{font-family:'Playfair Display',serif;font-size:38px;font-weight:700;color:white;}
    .td-tagline{color:#D4AF37;font-size:11px;font-weight:600;margin:8px 0 15px;letter-spacing:1.5px;}
    .td-theme{
      border:1px solid #D4AF37;border-radius:6px;padding:10px 15px;margin:15px 0;
      font-size:11px;background:rgba(10,17,40,.6);max-height:56px;overflow:hidden;
    }
    .td-theme span{color:#D4AF37;font-weight:700;}
    .td-type-label{color:#D4AF37;font-size:11px;font-weight:700;margin-top:15px;}
    .td-type-bar{
      background:#FFD700;color:#0a1128;padding:10px;margin:5px 0 15px;
      font-weight:900;font-size:16px;text-align:center;position:relative;border-radius:3px;
    }
    .td-type-bar i{position:absolute;top:50%;transform:translateY(-50%);color:#0a1128;}
    .td-type-bar .td-lstar{left:15px;}
    .td-type-bar .td-rstar{right:15px;}
    .td-bottom{display:flex;align-items:flex-end;justify-content:space-between;margin-top:15px;}
    .td-ticketno{background:#F5F1E8;color:#0a1128;padding:8px 12px;font-weight:700;font-size:11px;border-radius:4px;}
    .td-script{font-family:'Great Vibes',cursive;color:#D4AF37;font-size:16px;}
    .td-admit{text-align:center;font-weight:900;font-size:18px;color:#0a1128;margin-bottom:8px;}
    .td-admit i{color:#D4AF37;font-size:12px;margin:0 4px;}
    .td-detail{
      display:flex;align-items:center;gap:8px;margin:10px 0;
      font-size:10px;font-weight:700;color:#D4AF37;
      border-bottom:1px dotted #D4AF37;padding-bottom:6px;
    }
    .td-detail i{
      width:22px;height:22px;border:1px solid #D4AF37;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;
    }
    .td-dval{color:#0a1128;margin-left:auto;font-size:11px;font-weight:600;text-align:right;word-break:break-word;max-width:140px;}
    .td-qr{display:flex;flex-direction:column;align-items:center;margin:10px 0 6px;gap:4px;}
    .td-qr img,.td-qr canvas{width:110px;height:110px;border:3px solid #D4AF37;border-radius:6px;background:#F5F1E8;display:block;}
    .td-qr-placeholder{width:110px;height:110px;border:3px solid #D4AF37;border-radius:6px;background:#F5F1E8;display:flex;align-items:center;justify-content:center;font-size:9px;color:#0a1128;font-weight:700;text-align:center;padding:6px;}
    .td-scan{text-align:center;font-size:9px;font-weight:700;color:#0a1128;line-height:1.4;}
    .td-scan i{margin-right:3px;font-size:8px;}
    .td-divider{border-top:1px solid #D4AF37;margin:12px 0;}
  `;

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&family=Great+Vibes&display=swap" rel="stylesheet" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* ── Inline scrollable preview ── */}
      <div className="td-wrapper">
        <div ref={ticketRef} className="td-ticket">
          <div className="td-left">
            <div className="td-left-col">
              <div className="td-logo">
                <img src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg" alt="CSA Logo" />
              </div>
              <div className="td-date-box">
                <i className="fa-solid fa-calendar-days"></i>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{date.dayName}</div>
                <div><span className="td-day">{date.day}</span><span className="td-th">{date.daySuffix}</span></div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{date.month}<br />{date.year}</div>
              </div>
              <div className="td-divider" />
              <div className="td-info"><i className="fa-solid fa-clock"></i>{timeDisplay}</div>
              <div className="td-divider" />
              <div className="td-info"><i className="fa-solid fa-location-dot"></i>{eventVenue.toUpperCase()}</div>
            </div>

            <div className="td-main">
              <div className="td-gala">GALA</div>
              <div className="td-dinner">DINNER {date.year}</div>
              <div className="td-tagline">AWARDS • NETWORKING • ENTERTAINMENT</div>
              <div className="td-theme"><span>THEME:</span> {eventTheme}</div>
              <div className="td-type-label">TICKET TYPE</div>
              <div className="td-type-bar">
                <i className="fa-solid fa-star td-lstar"></i>
                {ticketType.toUpperCase()}
                <i className="fa-solid fa-star td-rstar"></i>
              </div>
              <div className="td-bottom">
                <div className="td-ticketno">TICKET NO. <span>{ticketNo}</span></div>
                <div className="td-script">Pooling Construction Students Together!</div>
              </div>
            </div>
          </div>

          <div className="td-right">
            <div className="td-admit"><i className="fa-solid fa-star"></i> ADMIT <i className="fa-solid fa-star"></i></div>
            <div style={{ borderTop: "1px solid #D4AF37", margin: "8px 0 12px" }} />
            <div className="td-detail"><i className="fa-solid fa-user"></i> NAME <span className="td-dval">{name}</span></div>
            <div className="td-detail"><i className="fa-solid fa-tag"></i> BOOKING CODE <span className="td-dval">{bookingCode}</span></div>
            <div className="td-detail"><i className="fa-solid fa-ticket"></i> TICKET TYPE <span className="td-dval">{ticketType}</span></div>
            <div className="td-detail"><i className="fa-solid fa-wallet"></i> STATUS <span className="td-dval">{status}</span></div>
            <div className="td-detail"><i className="fa-solid fa-coins"></i> AMOUNT <span className="td-dval">KSH {amount.toLocaleString()}</span></div>
            <div className="td-qr">
              {qrDataUrl
                ? <img src={qrDataUrl} alt={`QR – ${ticketNo}`} />
                : <div className="td-qr-placeholder">Generating QR…</div>
              }
            </div>
            <div className="td-scan"><i className="fa-solid fa-qrcode"></i>SCAN QR<br />FOR ENTRY<br />VERIFICATION</div>
            <div className="td-gold-sidebar">{eventTitle.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
        {/* Primary — PDF */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 32px",
            background: downloading
              ? "linear-gradient(135deg,#b8942a 0%,#9a7a20 100%)"
              : "linear-gradient(135deg,#E6C875 0%,#D4AF37 100%)",
            color: "#0a1128", border: "none", borderRadius: 10,
            fontWeight: 700, fontSize: 16, cursor: downloading ? "not-allowed" : "pointer",
            fontFamily: "Montserrat,sans-serif",
            boxShadow: "0 4px 15px rgba(212,175,55,.45)",
            transition: "opacity .2s",
          }}
        >
          <i className={`fa-solid ${downloading ? "fa-spinner fa-spin" : "fa-file-pdf"}`}></i>
          {downloading ? "Generating PDF…" : "Download Ticket (PDF)"}
        </button>

        {/* Secondary — HTML fallback */}
        <button
          onClick={handleHtmlFallback}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 24px",
            background: "transparent",
            color: "#D4AF37", border: "2px solid #D4AF37", borderRadius: 10,
            fontWeight: 700, fontSize: 14, cursor: "pointer",
            fontFamily: "Montserrat,sans-serif",
          }}
        >
          <i className="fa-solid fa-code"></i>
          HTML Fallback
        </button>
      </div>

      <p style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#888", fontFamily: "Montserrat,sans-serif" }}>
        PDF · Standard ticket size 3.5″ × 8.5″ landscape &nbsp;|&nbsp; HTML fallback: open in browser → Print → Save as PDF
      </p>
    </>
  );
}
