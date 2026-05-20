import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = await req.json();

    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      const missing = [
        !consumerKey && "MPESA_CONSUMER_KEY",
        !consumerSecret && "MPESA_CONSUMER_SECRET",
        !shortcode && "MPESA_SHORTCODE",
        !passkey && "MPESA_PASSKEY",
      ].filter(Boolean).join(", ");
      throw new Error(`Missing Supabase secrets: ${missing}. Add them in Supabase → Edge Functions → Secrets.`);
    }

    const digits = phoneNumber.replace(/\D/g, "");
    let normalizedPhone = digits;
    if (digits.startsWith("0") && digits.length === 10) {
      normalizedPhone = "254" + digits.slice(1);
    } else if (digits.startsWith("7") && digits.length === 9) {
      normalizedPhone = "254" + digits;
    } else if (digits.startsWith("1") && digits.length === 9) {
      normalizedPhone = "254" + digits;
    }
    if (!/^2547\d{8}$|^2541\d{8}$/.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ error: `Invalid phone number format: ${phoneNumber}. Use 07XX or 01XX format.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeAmount = Math.max(1, Math.round(Number(amount)));
    if (isNaN(safeAmount)) {
      return new Response(
        JSON.stringify({ error: "Invalid amount." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const isSandbox = shortcode === "174379";
    const baseUrl = isSandbox
      ? "https://sandbox.safaricom.co.ke"
      : "https://api.safaricom.co.ke";

    const tokenRes = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { method: "GET", headers: { Authorization: `Basic ${auth}` } }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token request failed (${tokenRes.status}): ${err}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error("No access_token in Safaricom response. Check consumer key/secret.");
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const callbackURL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    const tillNumber = Deno.env.get("MPESA_TILL_NUMBER") || shortcode;
    const transactionType = Deno.env.get("MPESA_TRANSACTION_TYPE") || "CustomerBuyGoodsOnline";

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: safeAmount,
      PartyA: normalizedPhone,
      PartyB: transactionType === "CustomerBuyGoodsOnline" ? tillNumber : shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackURL,
      AccountReference: (accountReference || "CSA Gala").slice(0, 12),
      TransactionDesc: (transactionDesc || "Ticket Payment").slice(0, 13),
    };

    console.log("STK payload:", JSON.stringify({ ...payload, Password: "***" }));

    const response = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    console.log("STK Response:", JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("STK Push Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
