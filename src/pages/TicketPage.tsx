import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"

interface TicketRecord {
  id: number;
  ticket_number: string;
  purchaser_name: string;
  total_amount: number;
  purchase_date: string;
  purchaser_phone: string;
  purchaser_email: string;
  payment_status: string;
  booking_code: string;
  ticket_type: string;
}

export default function TicketPage() {
  const { ticket_number } = useParams<{ ticket_number: string }>()
  const [ticket, setTicket] = useState<TicketRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!ticket_number) return

    const fetchTicket = async () => {
      const { data, error } = await supabase
        .from('ticket_purchases')
        .select('*')
        .eq('ticket_number', ticket_number)
        .single()

      if (error) {
        console.error(error)
        setError("Ticket not found")
      } else {
        setTicket(data)
      }
      setLoading(false)
    }

    fetchTicket()
  }, [ticket_number])

  if (loading) return <div className="p-8">Loading ticket...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!ticket) return <div className="p-8">Ticket not found</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Gala Dinner Ticket</h1>
      <div className="bg-white shadow rounded p-6 space-y-2">
        <p><strong>Ticket #:</strong> {ticket.ticket_number}</p>
        <p><strong>Name:</strong> {ticket.purchaser_name}</p>
        <p><strong>Email:</strong> {ticket.purchaser_email}</p>
        <p><strong>Phone:</strong> {ticket.purchaser_phone}</p>
        <p><strong>Amount:</strong> KES {ticket.total_amount}</p>
        <p><strong>Status:</strong> {ticket.payment_status}</p>
        <p><strong>Type:</strong> {ticket.ticket_type}</p>
        <p><strong>Booking Code:</strong> {ticket.booking_code}</p>
        <p><strong>Date:</strong> {new Date(ticket.purchase_date).toLocaleString()}</p>
      </div>
    </div>
  )
}
