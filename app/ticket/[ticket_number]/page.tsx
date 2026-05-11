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
    .eq('ticket_number', params.ticket_number)
    .single()

  if (error || !ticket) {
    notFound()
  }

  // Map your table columns to what the design expects
  const ticketData = {
    ticket_number: ticket.ticket_number,
    purchaser_name: ticket.purchaser_name,
    booking_code: ticket.booking_code,
    type_name: ticket.ticket_type || 'Regular',
    total_amount: ticket.total_amount,
    payment_status: ticket.payment_status,
    purchase_date: ticket.purchase_date,
    qr_code: ticket.qr_code || ticket.booking_code
  }

  return <TicketDesign ticket={ticketData} />
    }
