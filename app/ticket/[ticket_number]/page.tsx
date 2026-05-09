import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function TicketPage({ params }: { params: { ticket_number: string } }) {
  
  const { data: ticket, error } = await supabase
    .from('ticket_purchases')
    .select('*')
    .eq('id', Number(params.ticket_number))
    .single()

  if (error || !ticket) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Ticket not found</h1>
      <p>No ticket exists with ID: {params.ticket_number}</p>
    </div>
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>CSA Gala Dinner 2026</h1>
      <h2>Ticket ID: {ticket.id}</h2> {/* Changed this line */}
      <hr />
      <p><strong>Name:</strong> {ticket.purchaser_name}</p>
      <p><strong>Email:</strong> {ticket.purchaser_email}</p>
      <p><strong>Phone:</strong> {ticket.purchaser_phone}</p>
      <p><strong>Quantity:</strong> {ticket.quantity}</p>
      <p><strong>Total:</strong> KES {ticket.total_amount}</p>
      <p><strong>Status:</strong> {ticket.payment_status}</p>
      <p><strong>Booking Code:</strong> {ticket.booking_code}</p>
      <p><strong>Purchase Date:</strong> {new Date(ticket.purchase_date).toLocaleString()}</p>
    </div>
  )
