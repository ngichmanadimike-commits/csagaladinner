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
    const checkoutRequestId = stkCallback.CheckoutRequestID;

    // Only process successful payments
    if (resultCode !== 0) {
      console.log(`Payment failed/cancelled. ResultCode: ${resultCode}`);
      // Mark any pending STK payment as failed
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      if (checkoutRequestId) {
        await supabase
          .from("payments")
          .update({ source: "stk_failed" })
          .eq("source", "stk_pending")
          .contains("mpesa_code", checkoutRequestId);
      }
      return new Response(JSON.stringify({ message: "Payment not successful, ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract metadata
    const items: Record<string, string | number> = {};
    (stkCallback.CallbackMetadata?.Item || []).forEach((item: any) => {
      if (item.Name && item.Value !== undefined) items[item.Name] = item.Value;
    });

    const mpesaCode = String(items.MpesaReceiptNumber || "");
    const amount = Number(items.Amount || 0);
    const phone = String(items.PhoneNumber || "");

    console.log("Parsed STK payment:", { mpesaCode, amount, phone });

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

    const normalizedPhone = phone.startsWith("254") ? "0" + phone.slice(3) : phone;

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, verified")
      .eq("mpesa_code", mpesaCode)
      .maybeSingle();

    if (existingPayment) {
      console.log("Payment already recorded:", existingPayment.id);
      return new Response(JSON.stringify({ message: "already recorded" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find matching registration (by phone + pending status)
    const { data: reg } = await supabase
      .from("registrations")
      .select("id")
      .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
      .in("payment_status", ["pending", "partial"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reg) {
      // Insert as UNVERIFIED — admin must approve
      await supabase.from("payments").insert({
        registration_id: reg.id,
        amount,
        mpesa_code: mpesaCode,
        phone: normalizedPhone || phone,
        source: "stk",
        verified: false, // ← ALWAYS false; admin approves
        payment_method: "mpesa_stk",
      });
      console.log("Inserted STK payment (pending admin approval) for registration:", reg.id);
    } else {
      console.warn("No matching registration found for phone:", normalizedPhone);
    }

    return new Response(JSON.stringify({ message: "Payment received — pending admin approval" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error processing M-PESA callback:", error);
    return new Response(JSON.stringify({ message: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
