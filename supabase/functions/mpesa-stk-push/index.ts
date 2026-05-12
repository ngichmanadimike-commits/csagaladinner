import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = await req.json();

    // Get credentials from Supabase secrets
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE") || "174379";
    const passkey = Deno.env.get("MPESA_PASSKEY") || "";

    if (!consumerKey || !consumerSecret || !passkey) {
      throw new Error("Missing M-Pesa credentials in Supabase secrets");
    }

    // Get access token
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { 
        method: "GET",
        headers: { Authorization: `Basic ${auth}` } 
      }
    );
    
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token request failed: ${err}`);
    }
    
    const { access_token: accessToken } = await tokenRes.json();

    // Generate timestamp and password
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const callbackURL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    // Build payload - FIXED for PayBill
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline", // FIXED: was CustomerBuyGoodsOnline
      Amount: Number(amount),
      PartyA: phoneNumber,
      PartyB: shortcode, // FIXED: must match BusinessShortCode for PayBill
      PhoneNumber: phoneNumber,
      CallBackURL: callbackURL, // Note: capital C in CallBackURL
      AccountReference: accountReference || "CSA Gala",
      TransactionDesc: transactionDesc || "Ticket Payment",
    };

    console.log("Sending payload:", JSON.stringify(payload));

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
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
    console.log("STK Push Response:", JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("STK Push Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
