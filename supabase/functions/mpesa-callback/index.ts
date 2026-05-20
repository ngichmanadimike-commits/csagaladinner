// supabase/functions/mpesa-callback/index.ts
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const paymentData = await req.json();
    console.log("M-PESA Callback received:", JSON.stringify(paymentData));

    const stkCallback = paymentData?.Body?.stkCallback;
    if (!stkCallback) {
      console.warn("No stkCallback in payload");
      return new Response(JSON.stringify({ message: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultCode = stkCallback.ResultCode;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const checkoutRequestId = stkCallback.CheckoutRequestID;

    // Only process successful payments
    if (resultCode !== 0) {
      console.log(`Payment failed/cancelled. ResultCode: ${resultCode}, Desc: ${stkCallback.ResultDesc}`);
      return new Response(JSON.stringify({ message: "Payment not successful, ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract metadata from callback items
    const items: Record<string, string | number> = {};
    (stkCallback.CallbackMetadata?.Item || []).forEach((item: any) => {
      if (item.Name && item.Value !== undefined) {
        items[item.Name] = item.Value;
      }
    });

    const mpesaCode    = String(items.MpesaReceiptNumber || "");
    const amount       = Number(items.Amount || 0);
    const phone        = String(items.PhoneNumber || "");
    const transDate    = String(items.TransactionDate || "");

    console.log("Parsed payment:", { mpesaCode, amount, phone, transDate });

    if (!mpesaCode) {
      console.error("No MpesaReceiptNumber in callback");
      return new Response(JSON.stringify({ message: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the pending payment by mpesa_code or find the most recent pending payment for this phone
    const normalizedPhone = phone.startsWith("254") ? "0" + phone.slice(3) : phone;

    // Try to match by mpesa code first (if STK push was already manually confirmed)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, registration_id, verified")
      .eq("mpesa_code", mpesaCode)
      .maybeSingle();

    if (existingPayment) {
      // Update existing payment to verified
      if (!existingPayment.verified) {
        await supabase
          .from("payments")
          .update({ verified: true, verified_at: new Date().toISOString() })
          .eq("id", existingPayment.id);
        console.log("Updated existing payment to verified:", existingPayment.id);
      }
    } else {
      // Find most recent unverified pending payment for this phone/amount
      const { data: pendingPayment } = await supabase
        .from("payments")
        .select("id, registration_id")
        .eq("verified", false)
        .eq("amount", amount)
        .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingPayment) {
        await supabase
          .from("payments")
          .update({
            mpesa_code: mpesaCode,
            verified: true,
            verified_at: new Date().toISOString(),
          })
          .eq("id", pendingPayment.id);
        console.log("Matched and verified pending payment:", pendingPayment.id);
      } else {
        // Insert new verified payment record (STK push that wasn't pre-registered)
        const { data: reg } = await supabase
          .from("registrations")
          .select("id")
          .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
          .eq("payment_status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (reg) {
          await supabase.from("payments").insert({
            registration_id: reg.id,
            amount,
            mpesa_code: mpesaCode,
            phone: normalizedPhone || phone,
            source: "stk",
            verified: true,
            verified_at: new Date().toISOString(),
          });
          console.log("Inserted new verified payment for registration:", reg.id);
        }
      }
    }

    return new Response(JSON.stringify({ message: "Payment confirmation received and processed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error processing M-PESA callback:", error);
    // Always return 200 to Safaricom or they will keep retrying
    return new Response(JSON.stringify({ message: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
