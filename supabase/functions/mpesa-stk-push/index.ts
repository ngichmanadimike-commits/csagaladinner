const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MPESA_BASE_URL = "https://sandbox.safaricom.co.ke";

async function getAccessToken(): Promise<string> {
  const consumerKey = "1VygRg9xJuiMdbveME0RUtCdIZGNJpUqMsPbcAyYV9kiSIAG";
  const consumerSecret = "obZMBTL8frg0RGUPvtl7MWvVGmQEPuOqncK3ZeTKNagbjvRQE4AIKVS02xzQoRer";
  const auth = btoa(`${consumerKey}:${consumerSecret}`);

  const res = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { phone, amount } = await req.json();

    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ error: "phone and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone: ensure 254 prefix
    let formattedPhone = String(phone).replace(/\s+/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.slice(1);
    }

    const token = await getAccessToken();
    const shortcode = "174379"; // Safaricom sandbox shortcode
    const passkey = "jevYcqRoE9xTjXbFAZIMeF3Ih0Y8x3uvMjtv//CanzO6/H1mFSCNE04Q7xsXD2P+A++to5AYUd1P5cSK9+/UeynryRQooaM/4MIj0qE/OKNyv7e5zh+G3yVhlb49vuYXfO/J/PBV6Sz0V5DUH4KCBD4WCQaOJAi3pmn45+6M3r//fcrqUp66Fu5jfHEGH/Bg1tEu3zhHbizzW/ifR4Zsm2ORTRyde5UNJXIvGmYTM9yNSAZRvquSpYtNUMNWJtfVR93njKIbOJqoS+vrpCVsvjwGxl+ic9LJUa/vcqBII1tyns6PRH4DJz0pQjJPPSBgD26WLnJrTTIrZrXRsmDqpw==";
    const tillNumber = "6776606"; // Your till number

    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const password = btoa(shortcode + passkey + timestamp);

    console.log("STK Push request:", { shortcode, tillNumber, formattedPhone, amount: Math.round(Number(amount)) });

    const stkRes = await fetch(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.round(Number(amount)),
          PartyA: formattedPhone,
          PartyB: tillNumber,
          PhoneNumber: formattedPhone,
          CallBackURL: "https://csagaladinner.vercel.app/api/mpesa-callback",
          AccountReference: "CSAGala2026",
          TransactionDesc: "CSA Gala Dinner Ticket",
        }),
      }
    );

    const stkData = await stkRes.json();

    if (!stkRes.ok) {
      console.error("STK Push error:", stkData);
      return new Response(JSON.stringify({ error: "STK Push failed", details: stkData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(stkData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
