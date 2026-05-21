```tsx id="4z8v5o"
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import TicketDesign from "@/components/TicketDesign";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function TicketPage({
  params,
}: {
  params: { ticket_number: string };
}) {
  const { data: reg, error } = await supabase
    .from("registrations")
    .select(
      "id, name, email, phone, package_type, total_cost, total_paid, payment_status, ticket_code, secure_ticket_token, created_at, quantity"
    )
    .eq(
      "ticket_code",
      params.ticket_number.toUpperCase()
    )
    .single();

  if (error || !reg) {
    notFound();
  }

  const ticketData = {
    ticket_number: reg.ticket_code,
    purchaser_name: reg.name,
    booking_code: reg.ticket_code,
    type_name: reg.package_type || "General",
    total_amount: Number(reg.total_cost),
    payment_status: reg.payment_status,
    purchase_date: reg.created_at,
    qr_code:
      reg.secure_ticket_token ??
      reg.ticket_code ??
      reg.id,
    quantity: reg.quantity ?? 1,
    email: reg.email,
    phone: reg.phone,
  };

  return <TicketDesign ticket={ticketData} />;
}
```
