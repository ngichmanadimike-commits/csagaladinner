import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import TicketDesign from '@/components/TicketDesign'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function TicketPage({ params }: { params: { ticket_number: string } }) {
  
  const { data: ticket, error } = await supabase
    .from('ticket_purchases')
    .select('*')
    .eq('ticket_number', params.ticket_number) // FIXED: search by ticket_number, not id
    .single()

  if (error || !ticket) {
    notFound()
  }

  // Map your table columns to what the design expects
  const ticketData = {
    ticket_number: ticket.ticket_number,
    purchaser_name: ticket.purchaser_name,
    booking_code: ticket.booking_code,
    type_name: ticket.ticket_type || 'Regular', // use ticket_type column if you have it
    total_amount: ticket.total_amount,
    payment_status: ticket.payment_status,
    qr_code: ticket.qr_code || ticket.booking_code // fallback to booking_code if no qr_code column
  }

  return <TicketDesign ticket={ticketData} />
}
