'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Purchase = {
  purchaser_name: string
  booking_code: string
  ticket_number: string
  type_name: string
  total_amount: number
  payment_status: string
}

export default function TicketPage() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTicket() {
      if (!code) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('booking_code', code)
      .single()

      if (data) setPurchase(data)
      setLoading(false)
    }
    fetchTicket()
  }, [code])

  const downloadPDF = () => {
    const ticket = document.getElementById('ticket')
    if (!ticket) return
    html2canvas(ticket, { scale: 3, backgroundColor: null }).then(canvas => {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [980, 400] })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 980, 400)
      pdf.save(`CSA-Gala-2026-${purchase?.ticket_number}.pdf`)
    })
  }

  if (loading) return <div className="bg-[#e8e8e8] min-h-screen flex items-center justify-center text-white">Loading...</div>
  if (!code) return <div className="bg-[#e8e8e8] min-h-screen flex items-center justify-center text-white">Add?code=YOUR_BOOKING_CODE to the URL</div>
  if (!purchase) return <div className="bg-[#e8e8e8] min-h-screen flex items-center justify-center text-white">Ticket not found: {code}</div>

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&family=Great+Vibes&display=swap" rel="stylesheet" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />

      <div className="bg-[#e8e8e8] p-2.5 min-h-screen flex justify-center items-center font-['Montserrat']">
        <div className="w-full max-w-[980px] overflow-x-auto">
          <div id="ticket" className="w-[980px] flex flex-row bg-[#0a1128] text-white relative rounded-[10px] overflow-hidden" style={{filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.4))'}}>

            <div className="w-[665px] p-[25px] relative flex gap-[25px] bg-cover bg-center" style={{backgroundImage: `linear-gradient(rgba(10,17,40,0.82), rgba(10,17,40,0.82)), url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070')`}}>
              <div className="absolute right-0 top-0 h-full border-r-2 border-dashed border-[#D4AF37]"></div>

              <div className="w-[140px] shrink-0">
                <div className="w-[75px] h-[75px] bg-white rounded-full border-[3px] border-[#D4AF37] flex items-center justify-center mb-5 overflow-hidden">
                  <img src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg" alt="CSA Logo" className="w-[85%] h-[85%] object-contain" />
                </div>
                <div className="border-l border-[#D4AF37] pl-3 my-[15px]">
                  <i className="fa-solid fa-calendar-days text-[#D4AF37] mb-1.5 text-base"></i>
                  <div className="text-[11px] font-semibold">FRIDAY</div>
                  <div><span className="text-[38px] font-bold text-[#D4AF37] leading-none">5</span><span className="text-base align-super">TH</span></div>
                  <div className="text-[11px] font-semibold">JUNE<br/>2026</div>
                </div>
                <div className="border-t border-[#D4AF37] my-3"></div>
                <div className="text-[11px] my-[15px]"><i className="fa-solid fa-clock text-[#D4AF37] mr-1.5 w-[14px]"></i>7:00 PM<br/>– 11:00 PM</div>
                <div className="border-t border-[#D4AF37] my-3"></div>
                <div className="text-[11px] my-[15px]"><i className="fa-solid fa-location-dot text-[#D4AF37] mr-1.5 w-[14px]"></i>UTALII<br/>HOTEL</div>
              </div>

              <div className="flex-1">
                <div className="font-['Playfair_Display'] text-5xl font-black text-[#D4AF37] leading-none">GALA</div>
                <div className="font-['Playfair_Display'] text-[38px] font-bold text-white">DINNER 2026</div>
                <div className="text-[#D4AF37] text-[11px] font-semibold my-2 mb-[15px] tracking-[1.5px]">AWARDS • NETWORKING • ENTERTAINMENT</div>
                <div className="border border-[#D4AF37] rounded-md py-2.5 px-[15px] my-[15px] text-[11px] bg-[rgba(10,17,40,0.6)]">
                  <span className="text-[#D4AF37] font-bold">THEME:</span> Laying the First Stone: Honoring the Past, Empowering the Present, Inspiring the Future
                </div>
                <div className="text-[#D4AF37] text-[11px] font-bold mt-[15px]">TICKET TYPE</div>
                <div className="bg-[#FFD700] text-[#0a1128] p-2.5 my-[5px] mb-[15px] font-black text-base text-center relative rounded-[3px]">
                  <i className="fa-solid fa-star absolute top-1/2 -translate-y-1/2 left-[15px] text-[#0a1128]"></i>
                  {purchase.type_name.toUpperCase()}
                  <i className="fa-solid fa-star absolute top-1/2 -translate-y-1/2 right-[15px] text-[#0a1128]"></i>
                </div>
                <div className="flex items-end justify-between mt-[15px]">
                  <div className="bg-[#F5F1E8] text-[#0a1128] py-2 px-3 font-bold text-[11px] rounded">TICKET NO. {purchase.ticket_number}</div>
                  <div className="font-['Great_Vibes'] text-[#D4AF37] text-base">Pooling Construction Students Together!</div>
                </div>
              </div>
            </div>

            <div className="absolute right-[315px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] bg-[#e8e8e8] rounded-full z-10"></div>

            <div className="w-[315px] bg-[#F5F1E8] text-[#0a1128] py-5 pr-[42px] pl-5 relative">
              <div className="text-center font-black text-lg text-[#0a1128] mb-2">
                <i className="fa-solid fa-star text-[#D4AF37] text-xs mx-1"></i> ADMIT <i className="fa-solid fa-star text-[#D4AF37] text-xs mx-1"></i>
              </div>
              <div className="border-t border-[#D4AF37] my-2 mb-3"></div>
              <div className="flex items-center gap-2 my-2.5 text-[10px] font-bold text-[#D4AF37] border-b border-dotted border-[#D4AF37] pb-1.5">
                <i className="fa-solid fa-user w-[22px] h-[22px] border border-[#D4AF37] rounded-full flex items-center justify-center text-[11px] shrink-0"></i> NAME
                <span className="text-[#0a1128] ml-auto text-[11px] font-semibold text-right break-words max-w-[140px]">{purchase.purchaser_name}</span>
              </div>
              <div className="flex items-center gap-2 my-2.5 text-[10px] font-bold text-[#D4AF37] border-b border-dotted border-[#D4AF37] pb-1.5">
                <i className="fa-solid fa-tag w-[22px] h-[22px] border border-[#D4AF37] rounded-full flex items-center justify-center text-[11px] shrink-0"></i> BOOKING CODE
                <span className="text-[#0a1128] ml-auto text-[11px] font-semibold text-right break-words max-w-[140px]">{purchase.booking_code}</span>
              </div>
              <div className="flex items-center gap-2 my-2.5 text-[10px] font-bold text-[#D4AF37] border-b border-dotted border-[#D4AF37] pb-1.5">
                <i className="fa-solid fa-ticket w-[22px] h-[22px] border border-[#D4AF37] rounded-full flex items-center justify-center text-[11px] shrink-0"></i> TICKET TYPE
                <span className="text-[#0a1128] ml-auto text-[11px] font-semibold text-right break-words max-w-[140px]">{purchase.type_name}</span>
              </div>
              <div className="flex items-center gap-2 my-2.5 text-[10px] font-bold text-[#D4AF37] border-b border-dotted border-[#D4AF37] pb-1.5">
                <i className="fa-solid fa-wallet w-[22px] h-[22px] border border-[#D4AF37] rounded-full flex items-center justify-center text-[11px] shrink-0"></i> STATUS
                <span className="text-[#0a1128] ml-auto text-[11px] font-semibold text-right break-words max-w-[140px]">{purchase.payment_status}</span>
              </div>
              <div className="flex items-center gap-2 my-2.5 text-[10px] font-bold text-[#D4AF37] border-b border-dotted border-[#D4AF37] pb-1.5">
                <i className="fa-solid fa-coins w-[22px] h-[22px] border border-[#D4AF37] rounded-full flex items-center justify-center text-[11px] shrink-0"></i> AMOUNT
                <span className="text-[#0a1128] ml-auto text-[11px] font-semibold text-right break-words max-w-[140px]">KSH {purchase.total_amount}</span>
              </div>
              <div className="w-full h-[45px] my-3 mb-2" style={{background: 'repeating-linear-gradient(90deg, #0a1128, #0a1128 2px, transparent 2px, transparent 4px)'}}></div>
              <div className="text-right text-[9px] font-bold text-[#0a1128] leading-tight">
                <i className="fa-solid fa-play mr-[3px] text-[8px]"></i>SCAN<br/>FOR ENTRY<br/>VERIFICATION
              </div>
              <div className="absolute right-0 top-0 h-full w-8 bg-[#D4AF37] flex items-center justify-center font-bold text-[11px] text-[#0a1128] tracking-[1px]" style={{writingMode: 'vertical-rl', textOrientation: 'mixed'}}>
                CSA GALA DINNER 2026
              </div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={downloadPDF} className="fixed bottom-5 left-1/2 -translate-x-1/2 py-3 px-6 bg-[#D4AF37] text-[#0a1128] border-none rounded-lg font-bold text-base z-[999] cursor-pointer shadow-lg">
        ⬇️ Download Ticket PDF
      </button>
    </>
  )
}
