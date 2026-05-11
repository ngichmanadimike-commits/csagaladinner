type TicketData = {
  ticket_number: string
  purchaser_name: string
  booking_code: string
  ticket_type?: string
  type_name?: string
  total_amount: number
  payment_status: string
  qr_code: string
}

export default function TicketDesign({ ticket }: { ticket: TicketData }) {
  const ticketType = ticket.type_name || ticket.ticket_type || 'Regular'
  
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&family=Great+Vibes&display=swap" rel="stylesheet" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #e8e8e8; padding: 10px; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Montserrat', sans-serif; }
        .ticket-wrapper { width: 100%; max-width: 980px; overflow-x: auto; }
        .ticket { width: 980px; display: flex; flex-direction: row; background: #0a1128; color: white; position: relative; border-radius: 10px; filter: drop-shadow(0 15px 35px rgba(0,0,0,0.4)); overflow: hidden; }
        .left { width: 665px; padding: 25px; position: relative; background-image: linear-gradient(rgba(10,17,40,0.82), rgba(10,17,40,0.82)), url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070'); background-size: cover; background-position: center; display: flex; gap: 25px; }
        .left::after { content: ''; position: absolute; right: 0; top: 0; height: 100%; border-right: 2px dashed #D4AF37; }
        .ticket::before { content: ''; position: absolute; right: 315px; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; background: #e8e8e8; border-radius: 50%; z-index: 10; }
        .right { width: 315px; background: #F5F1E8; color: #0a1128; padding: 20px 42px 20px 20px; position: relative; }
        .gold-sidebar { position: absolute; right: 0; top: 0; height: 100%; width: 32px; background: #D4AF37; writing-mode: vertical-rl; text-orientation: mixed; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; color: #0a1128; letter-spacing: 1px; }
        .csa-logo { width: 75px; height: 75px; background: white; border-radius: 50%; border: 3px solid #D4AF37; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; overflow: hidden; }
        .csa-logo img { width: 85%; height: 85%; object-fit: contain; }
        .left-col { width: 140px; flex-shrink: 0; }
        .date-box { border-left: 1px solid #D4AF37; padding-left: 12px; margin: 15px 0; }
        .date-box i { color: #D4AF37; margin-bottom: 6px; font-size: 16px; }
        .date-box .day { font-size: 38px; font-weight: 700; color: #D4AF37; line-height: 1; }
        .date-box .th { font-size: 16px; vertical-align: super; }
        .info-row { font-size: 11px; margin: 15px 0; }
        .info-row i { color: #D4AF37; margin-right: 6px; width: 14px; }
        .main-content { flex: 1; }
        .gala { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 900; color: #D4AF37; line-height: 1; }
        .dinner { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 700; color: white; }
        .tagline { color: #D4AF37; font-size: 11px; font-weight: 600; margin: 8px 0 15px; letter-spacing: 1.5px; }
        .theme-box { border: 1px solid #D4AF37; border-radius: 6px; padding: 10px 15px; margin: 15px 0; font-size: 11px; background: rgba(10,17,40,0.6); }
        .theme-box span { color: #D4AF37; font-weight: 700; }
        .ticket-type-label { color: #D4AF37; font-size: 11px; font-weight: 700; margin-top: 15px; }
        .ticket-type-bar { background: #FFD700; color: #0a1128; padding: 10px; margin: 5px 0 15px; font-weight: 900; font-size: 16px; text-align: center; position: relative; border-radius: 3px; }
        .ticket-type-bar i { position: absolute; top: 50%; transform: translateY(-50%); color: #0a1128; }
        .ticket-type-bar .fa-star:first-child { left: 15px; }
        .ticket-type-bar .fa-star:last-child { right: 15px; }
        .bottom-row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 15px; }
        .ticket-no { background: #F5F1E8; color: #0a1128; padding: 8px 12px; font-weight: 700; font-size: 11px; border-radius: 4px; }
        .tagline-script { font-family: 'Great Vibes', cursive; color: #D4AF37; font-size: 16px; }
        .admit { text-align: center; font-weight: 900; font-size: 18px; color: #0a1128; margin-bottom: 8px; }
        .admit i { color: #D4AF37; font-size: 12px; margin: 0 4px; }
        .detail-item { display: flex; align-items: center; gap: 8px; margin: 10px 0; font-size: 10px; font-weight: 700; color: #D4AF37; border-bottom: 1px dotted #D4AF37; padding-bottom: 6px; }
        .detail-item i { width: 22px; height: 22px; border: 1px solid #D4AF37; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
        .detail-value { color: #0a1128; margin-left: auto; font-size: 11px; font-weight: 600; text-align: right; word-break: break-word; max-width: 140px; }
        .barcode { width: 100%; height: 45px; margin: 12px 0 8px; display: flex; justify-content: center; }
        .scan-text { text-align: right; font-size: 9px; font-weight: 700; color: #0a1128; line-height: 1.2; }
        .scan-text i { margin-right: 3px; font-size: 8px; }
      `}} />
      
      <div className="ticket-wrapper">
        <div className="ticket">
          <div className="left">
            <div className="left-col">
              <div className="csa-logo">
                <img src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg" alt="CSA Logo" />
              </div>
              <div className="date-box">
                <i className="fa-solid fa-calendar-days"></i>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>FRIDAY</div>
                <div><span className="day">5</span><span className="th">TH</span></div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>JUNE<br />2026</div>
              </div>
              <div style={{ borderTop: '1px solid #D4AF37', margin: '12px 0' }}></div>
              <div className="info-row"><i className="fa-solid fa-clock"></i>7:00 PM<br />– 11:00 PM</div>
              <div style={{ borderTop: '1px solid #D4AF37', margin: '12px 0' }}></div>
              <div className="info-row"><i className="fa-solid fa-location-dot"></i>UTALII<br />HOTEL</div>
            </div>
            
            <div className="main-content">
              <div className="gala">GALA</div>
              <div className="dinner">DINNER 2026</div>
              <div className="tagline">AWARDS • NETWORKING • ENTERTAINMENT</div>
              <div className="theme-box">
                <span>THEME:</span> Laying the First Stone: Honoring the Past, Empowering the Present, Inspiring the Future
              </div>
              <div className="ticket-type-label">TICKET TYPE</div>
              <div className="ticket-type-bar">
                <i className="fa-solid fa-star"></i>{ticketType.toUpperCase()}<i className="fa-solid fa-star"></i>
              </div>
              <div className="bottom-row">
                <div className="ticket-no">TICKET NO. <span>{ticket.ticket_number}</span></div>
                <div className="tagline-script">Pooling Construction Students Together!</div>
              </div>
            </div>
          </div>
          
          <div className="right">
            <div className="admit"><i className="fa-solid fa-star"></i> ADMIT <i className="fa-solid fa-star"></i></div>
            <div style={{ borderTop: '1px solid #D4AF37', margin: '8px 0 12px' }}></div>
            <div className="detail-item"><i className="fa-solid fa-user"></i> NAME <span className="detail-value">{ticket.purchaser_name}</span></div>
            <div className="detail-item"><i className="fa-solid fa-tag"></i> BOOKING CODE <span className="detail-value">{ticket.booking_code}</span></div>
            <div className="detail-item"><i className="fa-solid fa-ticket"></i> TICKET TYPE <span className="detail-value">{ticketType}</span></div>
            <div className="detail-item"><i className="fa-solid fa-wallet"></i> STATUS <span className="detail-value">{ticket.payment_status}</span></div>
            <div className="detail-item"><i className="fa-solid fa-coins"></i> AMOUNT <span className="detail-value">KSH {ticket.total_amount}</span></div>
            <div className="barcode">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x45&data=${ticket.qr_code}`} 
                alt="QR Code"
                style={{ height: '45px' }}
              />
            </div>
            <div className="scan-text"><i className="fa-solid fa-play"></i>SCAN<br />FOR ENTRY<br />VERIFICATION</div>
            <div className="gold-sidebar">CSA GALA DINNER 2026</div>
          </div>
        </div>
      </div>
    </>
  )
}
