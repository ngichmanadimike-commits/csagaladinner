import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Ticket {
  ticket_number: string
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  number_of_tickets: number
  total_amount: number
  status: string
  payment_reference: string
  created_at: string
}

export default function TicketPage() {
  const { ticketNumber } = useParams()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketNumber) {
        setError('No ticket number provided')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
       .from('ticket_purchases')
       .select('*')
       .eq('ticket_number', ticketNumber)
       .single()

      if (error ||!data) {
        setError('Ticket not found')
        setLoading(false)
        return
      }

      if (data.status!== 'paid') {
        setError('Payment pending verification. Your ticket will be available after admin confirms payment.')
        setLoading(false)
        return
      }

      setTicket(data)
      setLoading(false)
    }

    fetchTicket()
  }, [ticketNumber])

  const handleDownload = () => {
    window.print() // Quick way - user can "Save as PDF"
  }

  if (loading) return <div className="p-8 text-center">Loading ticket...</div>

  if (error) return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
      <p>{error}</p>
    </div>
  )

  if (!ticket) return null

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white shadow-lg rounded-lg p-8 border">
        <h1 className="text-3xl font-bold text-center mb-6">Gala Dinner Ticket</h1>

        <div className="space-y-3 text-lg">
          <p><strong>Ticket #:</strong> {ticket.ticket_number}</p>
          <p><strong>Name:</strong> {ticket.buyer_name}</p>
          <p><strong>Email:</strong> {ticket.buyer_email}</p>
          <p><strong>Phone:</strong> {ticket.buyer_phone}</p>
          <p><strong>Tickets:</strong> {ticket.number_of_tickets}</p>
          <p><strong>Amount:</strong> KES {ticket.total_amount}</p>
          <p><strong>Status:</strong> <span className="text-green-600 font-semibold">Paid</span></p>
          <p><strong>Ref:</strong> {ticket.payment_reference}</p>
          <p><strong>Date:</strong> {new Date(ticket.created_at).toLocaleDateString()}</p>
        </div>

        <button
          onClick={handleDownload}
          className="mt-8 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Download Ticket / Print
        </button>
      </div>
    </div>
  )
}
