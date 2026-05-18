import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface TicketData {
  purchaser_name: string;
  booking_code: string;
  ticket_type?: string;
  type_name?: string;
  total_amount: number;
  payment_status: string;
  ticket_number: string;
  ticket_code?: string;
  qr_code: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  time?: string;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export async function generateTicketPdf(data: TicketData): Promise<Blob> {
  // Safe string helper – prevents .toUpperCase/.toLowerCase crashes on null/undefined
  const safeStr = (v: unknown, fallback = ""): string =>
    v != null && String(v).trim() !== "" ? String(v) : fallback;

  const ticketType = safeStr(data.type_name || data.ticket_type, "Regular");
  const displayNumber = safeStr(data.ticket_number || data.ticket_code, "—");
  const time = safeStr(data.time, "7:00 PM – 11:00 PM");
  const venue = safeStr(data.venue, "Utalii Hotel");
  const eventDate = safeStr(data.eventDate, "Friday, 5th June 2026");
  const paymentStatus = safeStr(data.payment_status, "pending");
  const purchaserName = safeStr(data.purchaser_name, "—");
  const bookingCode = safeStr(data.booking_code, "—");
  const statusColor = paymentStatus.toLowerCase() === "paid" ? "#1b7a1b" : "#b8860b";

  const qrPayload = JSON.stringify({
    code: bookingCode,
    token: safeStr(data.qr_code),
    name: purchaserName,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 320 });

  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-9999px;top:-9999px;width:980px;z-index:-1;background:#0B0F1A;";
  document.body.appendChild(container);

  container.innerHTML = `
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&family=Great+Vibes&family=Cinzel:wght@600;700&display=swap" rel="stylesheet" />
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .ticket-wrapper { width: 980px; overflow: hidden; }
      .ticket {
        width: 980px; height: 380px; display: flex;
        background: #0B0F1A; color: white; position: relative;
        font-family: 'Montserrat', Arial, sans-serif;
      }
      .ticket::after {
        content: ''; position: absolute; right: 300px; top: 0;
        height: 100%; border-right: 2px dashed rgba(201,162,39,0.6);
      }
      .hole { position: absolute; top: 20px; left: 75px; width: 20px; height: 20px; background: #e8e8e8; border-radius: 50%; z-index: 5; }
      .left {
        width: 680px; padding: 30px 35px 25px 35px; position: relative;
        background-image: linear-gradient(rgba(11,15,26,0.88),rgba(11,15,26,0.88)),
          url('/images/csa-gala-2026.jpg');
        background-size: cover; background-position: center; display: flex; gap: 30px;
      }
      .left-col { width: 140px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; }
      .csa-logo { width: 85px; height: 85px; background: white; border-radius: 50%; border: 3px solid #C9A227; display: flex; align-items: center; justify-content: center; margin-bottom: 25px; overflow: hidden; }
      .csa-logo img { width: 90%; height: 90%; object-fit: contain; }
      .date-block { border-left: 2px solid #C9A227; padding-left: 15px; margin: 20px 0; text-align: left; width: 100%; }
      .date-block i { color: #C9A227; font-size: 18px; margin-bottom: 8px; display: block; }
      .date-block .day-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; }
      .date-block .day { font-size: 44px; font-weight: 700; color: #C9A227; line-height: 1; }
      .date-block .th { font-size: 18px; vertical-align: super; color: #C9A227; }
      .date-block .month-year { font-size: 12px; font-weight: 600; margin-top: 4px; }
      .info-block { border-top: 1px solid #C9A227; padding-top: 15px; margin-top: 15px; font-size: 11px; width: 100%; text-align: left; }
      .info-block i { color: #C9A227; margin-right: 8px; width: 16px; }
      .info-block div { margin: 12px 0; font-weight: 600; }
      .main-content { flex: 1; padding-top: 10px; }
      .gala { font-family: 'Playfair Display', serif; font-size: 68px; font-weight: 900; background: linear-gradient(180deg, #E6C875 0%, #C9A227 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 0.9; letter-spacing: 2px; }
      .dinner { font-family: 'Cinzel', serif; font-size: 42px; font-weight: 700; color: white; letter-spacing: 3px; margin-top: -5px; }
      .tagline { color: #C9A227; font-size: 12px; font-weight: 600; margin: 12px 0 20px; letter-spacing: 2px; display: flex; align-items: center; gap: 8px; }
      .tagline::before, .tagline::after { content: '◆'; font-size: 8px; }
      .theme-box { border: 1.5px solid #C9A227; border-radius: 8px; padding: 12px 18px; margin: 20px 0; font-size: 11px; background: #0B0F1A; }
      .theme-box span { color: #C9A227; font-weight: 700; }
      .theme-box .highlight { color: #C9A227; font-weight: 600; }
      .ticket-type-label { color: #C9A227; font-size: 12px; font-weight: 700; margin-top: 25px; letter-spacing: 1px; }
      .ticket-type-ribbon { background: linear-gradient(135deg, #E6C875 0%, #C9A227 100%); color: #0B0F1A; padding: 14px 20px; margin: 8px 0 20px; font-weight: 900; font-size: 20px; text-align: center; position: relative; clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%); box-shadow: 0 4px 12px rgba(201,162,39,0.3); }
      .bottom-row { display: flex; align-items: center; justify-content: space-between; margin-top: 25px; }
      .ticket-no { background: #F6F1E3; color: #0B0F1A; padding: 10px 16px; font-weight: 700; font-size: 12px; border-radius: 6px; border: 2px solid #C9A227; }
      .tagline-script { font-family: 'Great Vibes', cursive; color: #C9A227; font-size: 20px; margin-left: auto; padding-left: 20px; border-left: 1px solid #C9A227; }
      .right { width: 300px; background: #F6F1E3; color: #0B0F1A; padding: 25px 45px 25px 25px; position: relative; }
      .gold-sidebar { position: absolute; right: 0; top: 0; height: 100%; width: 35px; background: linear-gradient(180deg, #E6C875 0%, #C9A227 100%); writing-mode: vertical-rl; text-orientation: mixed; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; color: #0B0F1A; letter-spacing: 1.5px; }
      .admit { text-align: center; font-weight: 900; font-size: 20px; color: #0B0F1A; margin-bottom: 10px; letter-spacing: 1px; }
      .admit i { color: #C9A227; font-size: 14px; margin: 0 6px; }
      .detail-list { margin: 15px 0; }
      .detail-item { display: flex; align-items: center; gap: 10px; margin: 10px 0; padding-bottom: 8px; border-bottom: 1px dotted #C9A227; }
      .detail-item i { width: 26px; height: 26px; border: 1.5px solid #C9A227; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; color: #C9A227; }
      .detail-label { font-size: 10px; font-weight: 700; color: #C9A227; text-transform: uppercase; letter-spacing: 0.5px; }
      .detail-value { color: #0B0F1A; margin-left: auto; font-size: 11px; font-weight: 600; text-align: right; word-break: break-word; max-width: 120px; }
      .qr-section { width: 100%; display: flex; justify-content: center; margin: 12px 0 6px; }
      .qr-section img { width: 80px; height: 80px; }
      .scan-text { text-align: right; font-size: 10px; font-weight: 700; color: #0B0F1A; line-height: 1.3; }
    </style>
    <div class="ticket-wrapper">
      <div class="ticket">
        <div class="hole"></div>
        <div class="left">
          <div class="left-col">
            <div class="csa-logo">
              <img src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg" alt="CSA Logo" crossorigin="anonymous" />
            </div>
            <div class="date-block">
              <i class="fa-solid fa-calendar-days"></i>
              <div class="day-label">FRIDAY</div>
              <div><span class="day">5</span><span class="th">TH</span></div>
              <div class="month-year">JUNE<br/>2026</div>
            </div>
            <div class="info-block">
              <div><i class="fa-solid fa-clock"></i>${time}</div>
            </div>
            <div class="info-block">
              <div><i class="fa-solid fa-location-dot"></i>${venue.toUpperCase()}</div>
            </div>
          </div>
          <div class="main-content">
            <div class="gala">GALA</div>
            <div class="dinner">DINNER 2026</div>
            <div class="tagline">AWARDS • NETWORKING • ENTERTAINMENT</div>
            <div class="theme-box">
              <span>THEME:</span> Laying the First Stone: Honoring the Past, Empowering the <span class="highlight">Present</span>, Inspiring the Future
            </div>
            <div class="ticket-type-label">TICKET TYPE</div>
            <div class="ticket-type-ribbon">★ ${ticketType.toUpperCase()} ★</div>
            <div class="bottom-row">
              <div class="ticket-no">TICKET NO. <span>${displayNumber}</span></div>
              <div class="tagline-script">Pooling Construction Students Together!</div>
            </div>
          </div>
        </div>
        <div class="right">
          <div class="admit">★ ADMIT ★</div>
          <div style="border-top:1px solid #C9A227;margin:10px 0 15px"></div>
          <div class="detail-list">
            <div class="detail-item">
              <i class="fa-solid fa-user"></i>
              <div><div class="detail-label">Name</div></div>
              <span class="detail-value">${purchaserName}</span>
            </div>
            <div class="detail-item">
              <i class="fa-solid fa-tag"></i>
              <div><div class="detail-label">Booking Code</div></div>
              <span class="detail-value">${bookingCode}</span>
            </div>
            <div class="detail-item">
              <i class="fa-solid fa-ticket"></i>
              <div><div class="detail-label">Ticket Type</div></div>
              <span class="detail-value">${ticketType}</span>
            </div>
            <div class="detail-item">
              <i class="fa-solid fa-wallet"></i>
              <div><div class="detail-label">Status</div></div>
              <span class="detail-value" style="color:${statusColor}">${paymentStatus.toUpperCase()}</span>
            </div>
            <div class="detail-item">
              <i class="fa-solid fa-coins"></i>
              <div><div class="detail-label">Amount</div></div>
              <span class="detail-value">KSH ${Number(data.total_amount || 0).toLocaleString()}/=</span>
            </div>
          </div>
          <div class="qr-section">
            <img src="${qrDataUrl}" alt="QR Code" />
          </div>
          <div class="scan-text">▶ SCAN FOR ENTRY VERIFICATION</div>
          <div class="gold-sidebar">CSA GALA DINNER 2026</div>
        </div>
      </div>
    </div>
  `;

  await new Promise((r) => setTimeout(r, 1200));

  try {
    const html2canvas = (await import("html2canvas")).default;
    const ticketEl = container.querySelector(".ticket-wrapper") as HTMLElement;

    const canvas = await html2canvas(ticketEl, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#0B0F1A",
      width: 980,
      height: 380,
      logging: false,
    });

    document.body.removeChild(container);

    const aspect = 980 / 380;
    const pdfW = 297;
    const pdfH = pdfW / aspect;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [pdfW, pdfH] });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pdfW, pdfH);
    return pdf.output("blob");
  } catch (err) {
    document.body.removeChild(container);
    return generateFallbackPdf(data, qrDataUrl, ticketType, displayNumber);
  }
}

async function generateFallbackPdf(
  data: TicketData, 
  qrDataUrl: string, 
  ticketType: string, 
  displayNumber: string
): Promise<Blob> {
  // Safe string helper
  const safeStr = (v: unknown, fallback = ""): string =>
    v != null && String(v).trim() !== "" ? String(v) : fallback;

  const paymentStatus = safeStr(data.payment_status, "pending");
  const purchaserName = safeStr(data.purchaser_name, "—");
  const bookingCode = safeStr(data.booking_code, "—");

  const W = 1960, H = 760;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0B0F1A";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#C9A227";
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, W - 20, H - 20);

  ctx.fillStyle = "#C9A227";
  ctx.font = "bold 110px Georgia, serif";
  ctx.fillText("GALA DINNER 2026", 60, 130);

  ctx.fillStyle = "#fff";
  ctx.font = "40px Arial, sans-serif";
  ctx.fillText(`CSA-TUK Finalists & Alumni • ${data.eventDate || "Friday 5th June 2026"} • ${data.venue || "Utalii Hotel"}`, 60, 195);

  ctx.fillStyle = "#C9A227";
  ctx.fillRect(60, 220, 700, 80);
  ctx.fillStyle = "#0B0F1A";
  ctx.font = "bold 52px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(ticketType.toUpperCase(), 410, 278);
  ctx.textAlign = "left";

  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px Arial, sans-serif";
  ctx.fillText(`TICKET NO: ${displayNumber}`, 60, 360);

  const stubX = W * 0.69 + 40;
  ctx.fillStyle = "#F6F1E3";
  ctx.fillRect(W * 0.69, 0, W - W * 0.69, H);

  const drawStubRow = (label: string, value: string, y: number, valueColor = "#0B0F1A") => {
    ctx.fillStyle = "#C9A227";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText(label.toUpperCase(), stubX, y);
    ctx.fillStyle = valueColor;
    ctx.font = "bold 32px Arial, sans-serif";
    ctx.fillText(value, stubX, y + 38);
    ctx.strokeStyle = "#C9A227";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(stubX, y + 50);
    ctx.lineTo(W - 60, y + 50);
    ctx.stroke();
  };

  drawStubRow("Name", purchaserName, 80);
  drawStubRow("Booking Code", bookingCode, 180);
  drawStubRow("Ticket Type", ticketType, 280);
  drawStubRow("Status", paymentStatus.toUpperCase(), 380, paymentStatus.toLowerCase() === "paid" ? "#1b7a1b" : "#b8860b");
  drawStubRow("Amount", `KSH ${Number(data.total_amount || 0).toLocaleString()}/=`, 480);

  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, stubX, 590, 180, 180);

  ctx.fillStyle = "#0B0F1A";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("SCAN FOR ENTRY", stubX + 200, 650);
  ctx.fillText("VERIFICATION", stubX + 200, 685);

  const pdfW = 297, pdfH = 297 * (H / W);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [pdfW, pdfH] });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pdfW, pdfH);
  return pdf.output("blob");
}

export async function downloadTicketPdf(data: TicketData) {
  const blob = await generateTicketPdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `csa-ticket-${data.booking_code}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
                                                      }
