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

  // Right stub starts ~ 67% across in the supplied design
  const stubX = W * 0.685;

  // Helper to draw a value next to the label icon row
  const drawValue = (text: string, y: number, color = "#1a1a1a", size = 22, bold = true) => {
    ctx.fillStyle = color;
    ctx.font = `${bold ? "bold " : ""}${size}px Helvetica, Arial, sans-serif`;
    ctx.fillText(text, stubX + 70, y);
  };

  // Approximate Y positions of the 5 stub rows in the design
  const rows = {
    name: H * 0.255,
    code: H * 0.345,
    type: H * 0.435,
    status: H * 0.525,
    amount: H * 0.615,
  };

  drawValue(data.name, rows.name);
  drawValue(data.bookingCode, rows.code, "#1a1a1a", 20);
  drawValue(data.ticketType, rows.type);
  drawValue(
    data.status.toUpperCase(),
    rows.status,
    data.status.toLowerCase() === "paid" ? "#1f7a1f" : "#b8860b"
  );
  drawValue(`KSH ${Number(data.amount).toLocaleString()}/=`, rows.amount);

  // QR code in the bottom-left of the stub
  const qrPayload = JSON.stringify({
    code: data.bookingCode,
    token: data.secureToken,
    name: data.name,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 240 });
  const qrImg = await loadImage(qrDataUrl);
  const qrSize = H * 0.18;
  ctx.drawImage(qrImg, stubX + 30, H * 0.7, qrSize, qrSize);

  // Bottom-left ticket number (under the date/venue column on main panel)
  if (data.ticketNumber) {
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 22px Helvetica, Arial, sans-serif";
    ctx.fillText(data.ticketNumber, W * 0.21, H * 0.86);
  }

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