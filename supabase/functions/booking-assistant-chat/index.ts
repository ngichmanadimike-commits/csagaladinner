import { createClient } from "npm:@supabase/supabase-js@2";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "npm:ai@6";
import { z } from "npm:zod@4";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `You are the CSA Gala Dinner booking assistant. You help guests retrieve their booking code and download their ticket.

Rules:
- Greet warmly and briefly. Ask for BOTH the email address AND the phone number the guest used during registration.
- You MUST collect both pieces of information before calling any tool. Do not call the tool with only one.
- When you have both, call the lookup_booking tool to verify. The tool only returns a booking when BOTH email and phone match the same registration.
- If the tool returns no match, politely tell the user the details don't match any booking and ask them to double-check (typos, country code on phone, the email they actually used). Do NOT reveal any partial info.
- When the tool returns a booking, congratulate the user and present their booking code clearly (in bold). Mention the package, payment status, and amount paid vs total. Tell them the download button below will generate their ticket PDF. Do not paste a URL — the UI renders the download button from the tool result automatically.
- Never invent codes, prices, or statuses. Never reveal another guest's data.
- Be concise and friendly. Keep replies short.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages }: { messages: UIMessage[] } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response("messages required", { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(50),
      tools: {
        lookup_booking: tool({
          description:
            "Verify a guest's identity and retrieve their booking. Returns the booking only when BOTH the email and phone exactly match the same registration.",
          inputSchema: z.object({
            email: z.string().describe("The email used during registration"),
            phone: z.string().describe("The phone number used during registration, with or without country code"),
          }),
          execute: async ({ email, phone }) => {
            const { data, error } = await supabaseAdmin.rpc("lookup_booking_by_contact", {
              _email: email,
              _phone: phone,
            });
            if (error) return { found: false, error: error.message };
            const row = Array.isArray(data) ? data[0] : null;
            if (!row) return { found: false };
            return {
              found: true,
              name: row.name,
              ticket_code: row.ticket_code,
              secure_ticket_token: row.secure_ticket_token,
              package_type: row.package_type,
              payment_status: row.payment_status,
              ticket_issued: row.ticket_issued,
              total_cost: Number(row.total_cost),
              total_paid: Number(row.total_paid),
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});