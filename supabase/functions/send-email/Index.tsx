// supabase/functions/send-email/index.ts
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      to, name, booking_code, payment_status,
      amount_paid, total_cost, ticket_type, ticket_download_url
    } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL    = Deno.env.get("FROM_EMAIL") || "noreply@csagaladinner.co.ke";

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — email not sent");
      return new Response(JSON.stringify({ message: "Email skipped: no API key configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPaid = payment_status === "paid" || payment_status === "confirmed";
    const remaining = Math.max(0, Number(total_cost) - Number(amount_paid));

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>CSA Gala Dinner 2026</title></head>
      <body style="font-family:Arial,sans-serif;background:#0B0F1A;color:#ffffff;margin:0;padding:0;">
        <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#C9A227;font-size:28px;margin:0;">CSA Gala Dinner 2026</h1>
            <p style="color:#999;margin:4px 0 0;">Utalii House · 5 June 2026 · 7:00 PM</p>
          </div>

          <p style="font-size:16px;">Dear <strong>${name}</strong>,</p>

          ${isPaid
            ? `<p>Your payment has been <strong style="color:#22c55e;">confirmed</strong>! We look forward to seeing you at the gala.</p>`
            : `<p>We have received your payment of <strong>KES ${Number(amount_paid).toLocaleString()}</strong>. Your booking is under review.</p>`
          }

          <div style="background:#1a2035;border:1px solid #C9A227;border-radius:12px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 8px;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px;">Booking Code</p>
            <p style="font-size:28px;font-weight:bold;color:#C9A227;letter-spacing:4px;margin:0;font-family:monospace;">${booking_code}</p>
            <p style="font-size:12px;color:#999;margin:8px 0 0;">Keep this code — use it to check your status at csagaladinner.co.ke</p>
          </div>

          <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:24px;">
            <tr><td style="padding:6px 0;color:#999;">Ticket Type</td><td style="padding:6px 0;text-align:right;">${ticket_type}</td></tr>
            <tr><td style="padding:6px 0;color:#999;">Amount Paid</td><td style="padding:6px 0;text-align:right;color:#22c55e;">KES ${Number(amount_paid).toLocaleString()}</td></tr>
            <tr><td style="padding:6px 0;color:#999;">Total Cost</td><td style="padding:6px 0;text-align:right;">KES ${Number(total_cost).toLocaleString()}</td></tr>
            ${remaining > 0 ? `<tr><td style="padding:6px 0;color:#999;">Balance Due</td><td style="padding:6px 0;text-align:right;color:#f59e0b;">KES ${remaining.toLocaleString()}</td></tr>` : ""}
          </table>

          ${ticket_download_url ? `
          <div style="text-align:center;margin:24px 0;">
            <a href="${ticket_download_url}" style="background:#C9A227;color:#0B0F1A;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
              Download Your Ticket
            </a>
          </div>` : ""}

          <p style="font-size:13px;color:#666;border-top:1px solid #333;padding-top:16px;margin-top:24px;">
            For queries, contact us at the details on our website.<br>
            <a href="https://csagaladinner.co.ke" style="color:#C9A227;">csagaladinner.co.ke</a>
          </p>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: isPaid
          ? `✅ Payment Confirmed — CSA Gala 2026 (${booking_code})`
          : `📋 Payment Received — CSA Gala 2026 (${booking_code})`,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Resend API error:", result);
      return new Response(JSON.stringify({ error: result }), {
        status: 500,
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
