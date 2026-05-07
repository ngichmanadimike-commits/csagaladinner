import jsPDF from "jspdf";
import QRCode from "qrcode";
import ticketTemplate from "@/assets/ticket-template.jpg";

export interface TicketData {
  name: string;
  bookingCode: string;
  ticketType: string;
  amount: number;
  status: string;
  secureToken: string;
  ticketNumber?: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  time?: string;
  contact?: string;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Renders the uploaded ticket design as the background and overlays
 * dynamic fields (name, booking code, ticket type, status, amount, QR)
 * onto the right-side stub at fixed coordinates calibrated for the
 * provided template image.
 */
export async function generateTicketPdf(data: TicketData): Promise<Blob> {
  const img = await loadImage(ticketTemplate);

  // Render to canvas at the template's native resolution
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const W = canvas.width;
  const H = canvas.height;

  // Right stub layout: the cream "ADMIT" panel begins ~70% across the width
  // and the value column sits to the right of the icons (~78% across).
  const stubLabelX = W * 0.78;

  // Y positions of the 5 stub value rows in the supplied design
  const rows = {
    name: H * 0.27,
    code: H * 0.39,
    type: H * 0.51,
    status: H * 0.63,
    amount: H * 0.75,
  };

  // Draw a value with auto shrink-to-fit so long names still fit.
  const drawFitted = (text: string, x: number, y: number, maxWidth: number, color = "#0b1d3a", baseSize = 28) => {
    ctx.fillStyle = color;
    let size = baseSize;
    ctx.font = `bold ${size}px Helvetica, Arial, sans-serif`;
    while (ctx.measureText(text).width > maxWidth && size > 12) {
      size -= 1;
      ctx.font = `bold ${size}px Helvetica, Arial, sans-serif`;
    }
    ctx.fillText(text, x, y);
  };

  const stubMaxW = W * 0.18; // value column width on stub
  drawFitted(data.name, stubLabelX, rows.name, stubMaxW);
  drawFitted(data.bookingCode, stubLabelX, rows.code, stubMaxW, "#0b1d3a", 26);
  drawFitted(data.ticketType, stubLabelX, rows.type, stubMaxW);
  drawFitted(
    data.status.toUpperCase(),
    stubLabelX,
    rows.status,
    stubMaxW,
    data.status.toLowerCase() === "paid" ? "#1b7a1b" : "#b8860b"
  );
  drawFitted(`KSH ${Number(data.amount).toLocaleString()}/=`, stubLabelX, rows.amount, stubMaxW);

  // Ticket type banner on the main (left) panel — gold ribbon area
  ctx.fillStyle = "#0b1d3a";
  let bannerSize = 42;
  ctx.font = `bold ${bannerSize}px Helvetica, Arial, sans-serif`;
  const bannerMax = W * 0.35;
  while (ctx.measureText(data.ticketType.toUpperCase()).width > bannerMax && bannerSize > 18) {
    bannerSize -= 1;
    ctx.font = `bold ${bannerSize}px Helvetica, Arial, sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.fillText(data.ticketType.toUpperCase(), W * 0.46, H * 0.78);
  ctx.textAlign = "start";

  // Ticket number box (bottom-left of main panel)
  if (data.ticketNumber) {
    ctx.fillStyle = "#0b1d3a";
    ctx.font = "bold 26px Helvetica, Arial, sans-serif";
    ctx.fillText(data.ticketNumber, W * 0.27, H * 0.91);
  }

  // QR code in the SCAN area at the bottom-right of the stub
  const qrPayload = JSON.stringify({
    code: data.bookingCode,
    token: data.secureToken,
    name: data.name,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 320 });
  const qrImg = await loadImage(qrDataUrl);
  const qrSize = H * 0.16;
  ctx.drawImage(qrImg, W * 0.86, H * 0.83, qrSize, qrSize);

  // Convert to PDF (landscape, sized to image aspect ratio)
  const aspect = W / H;
  const pdfW = 297; // A4 landscape width mm
  const pdfH = pdfW / aspect;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [pdfW, pdfH] });
  const jpg = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(jpg, "JPEG", 0, 0, pdfW, pdfH);
  return pdf.output("blob");
}

export async function downloadTicketPdf(data: TicketData) {
  const blob = await generateTicketPdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `csa-ticket-${data.bookingCode}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}