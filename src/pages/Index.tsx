import { corsHeaders } from "../_shared/cors.ts";

// ── Types ────────────────────────────────────────────────────────────────────
interface EmailPayload {
  to: string;
  name: string;
  booking_code: string;
  payment_status: "partial" | "paid" | "confirmed";
  amount_paid: number;
  total_cost: number;
  ticket_type: string;
  ticket_download_url?: string; // only when fully paid
}

// ── Email HTML builder ───────────────────────────────────────────────────────
function buildEmail(p: EmailPayload): { subject: string; html: string } {
  const balance = Math.max(0, p.total_cost - p.amount_paid);
  const isPaid = p.payment_status === "paid" || p.payment_status === "confirmed";

  const subject = isPaid
    ? `🎟️ Your CSA Gala Ticket is Ready — ${p.booking_code}`
    : `✅ Payment Received — CSA Gala Dinner 2026 (${p.booking_code})`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0A2342;border-radius:16px;overflow:hidden;max-width:600px;">
          
          <!-- Header -->
          <tr>
            <td style="background:#D4AF37;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;color:#0A2342;text-transform:uppercase;">Construction Students Association</p>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:900;color:#0A2342;font-family:Georgia,serif;">
                CSA Gala Dinner 2026
              </h1>
              <p style="margin:4px 0 0;font-size:13px;color:#0A2342;opacity:0.8;">Friday, 5th June 2026 · Utalii Hotel, Nairobi</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#fff;font-size:16px;margin:0 0 8px;">Hello <strong>${p.name}</strong>,</p>
              
              ${isPaid ? `
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0 0 24px;">
                🎉 Your payment is confirmed and your ticket is ready! We can't wait to see you at the Gala.
              </p>
              ` : `
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0 0 24px;">
                We've received your payment. Here's a summary of your current booking status.
              </p>
              `}

              <!-- Status Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.07);border:1px solid rgba(212,175,55,0.4);border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(212,175,55,0.2);">
                          <span style="color:#D4AF37;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Booking Code</span><br/>
                          <span style="color:#fff;font-size:20px;font-weight:900;font-family:monospace;letter-spacing:3px;">${p.booking_code}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(212,175,55,0.2);">
                          <span style="color:#D4AF37;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Ticket Type</span><br/>
                          <span style="color:#fff;font-size:14px;font-weight:600;">${p.ticket_type}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(212,175,55,0.2);">
                          <span style="color:#D4AF37;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Amount Paid</span><br/>
                          <span style="color:#4ade80;font-size:16px;font-weight:700;">KES ${p.amount_paid.toLocaleString()}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:${balance > 0 ? "1px solid rgba(212,175,55,0.2)" : "none"};">
                          <span style="color:#D4AF37;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Total Cost</span><br/>
                          <span style="color:#fff;font-size:14px;font-weight:600;">KES ${p.total_cost.toLocaleString()}</span>
                        </td>
                      </tr>
                      ${balance > 0 ? `
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#D4AF37;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Outstanding Balance</span><br/>
                          <span style="color:#fbbf24;font-size:16px;font-weight:700;">KES ${balance.toLocaleString()}</span>
                        </td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>

              ${isPaid && p.ticket_download_url ? `
              <!-- Download Ticket Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${p.ticket_download_url}" 
                       style="display:inline-block;background:#D4AF37;color:#0A2342;font-weight:900;font-size:15px;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">
                      🎟️ Download My Ticket
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:rgba(255,255,255,0.5);font-size:12px;text-align:center;margin:0 0 24px;">
                Or visit: <a href="${p.ticket_download_url}" style="color:#D4AF37;">${p.ticket_download_url}</a>
              </p>
              ` : ""}

              ${!isPaid ? `
              <!-- Balance reminder -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="color:#fbbf24;font-size:13px;margin:0;font-weight:600;">⚠️ Remaining Balance: KES ${balance.toLocaleString()}</p>
                    <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:6px 0 0;">
                      Pay the remaining balance to receive your ticket. Use your booking code <strong style="color:#fff;">${p.booking_code}</strong> on the lookup page to make additional payments.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- Event Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="color:#D4AF37;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Event Details</p>
                    <p style="color:#fff;font-size:13px;margin:4px 0;">📅 <strong>Date:</strong> Friday, 5th June 2026</p>
                    <p style="color:#fff;font-size:13px;margin:4px 0;">⏰ <strong>Time:</strong> 7:00 PM – 11:00 PM</p>
                    <p style="color:#fff;font-size:13px;margin:4px 0;">📍 <strong>Venue:</strong> Utalii Hotel, Nairobi</p>
                    <p style="color:#fff;font-size:13px;margin:4px 0;">👔 <strong>Dress Code:</strong> Navy Blue &amp; White</p>
                  </td>
                </tr>
              </table>

              <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">
                Questions? Contact us at <a href="tel:0758647130" style="color:#D4AF37;">0758647130</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(0,0,0,0.3);padding:16px 32px;text-align:center;">
              <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">
                CSA Gala Dinner 2026 · Construction Students Association – TUK<br/>
                This email was sent to ${p.to}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.name || !payload.booking_code) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, name, booking_code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "CSA Gala <noreply@csagaladinner.co.ke>";

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set in Supabase secrets");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Set RESEND_API_KEY in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = buildEmail(payload);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.to],
        subject,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ error: result }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
