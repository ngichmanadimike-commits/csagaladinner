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
  const ticketType = (ticket.type_name || ticket.ticket_type || 'Regular').toString()
  const safeBookingCode = ticket.booking_code ?? ''
  const safeQrCode = ticket.qr_code || ticket.booking_code || ''
  const safePurchaserName = ticket.purchaser_name ?? ''
  const safeTicketNumber = ticket.ticket_number ?? ''
  const safePaymentStatus = ticket.payment_status ?? 'pending'
  const safeTotalAmount = ticket.total_amount ?? 0

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&family=Great+Vibes&family=Cinzel:wght@600;700&display=swap" rel="stylesheet" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ticket-wrapper { width: 100%; max-width: 980px; margin: 0 auto; overflow-x: auto; }
        .ticket {
          width: 980px;
          height: 380px;
          display: flex;
          background: #0B0F1A;
          color: white;
          position: relative;
          filter: drop-shadow(0 15px 35px rgba(0,0,0,0.4));
          font-family: 'Montserrat', sans-serif;
          clip-path: polygon(0 0, 0 100%, 15px 100%, 15px calc(100% - 15px), 0 calc(100% - 15px), 0 calc(100% - 30px), 15px calc(100% - 30px), 15px 30px, 0 30px, 0 15px, 15px 15px, 15px 0, calc(100% - 15px) 0, calc(100% - 15px) 15px, 100% 15px, 100% 30px, calc(100% - 15px) 30px, calc(100% - 15px) calc(100% - 30px), 100% calc(100% - 30px), 100% calc(100% - 15px), calc(100% - 15px) calc(100% - 15px), calc(100% - 15px) 100%, 100% 100%, 100% 0);
        }
        .ticket::after {
          content: '';
          position: absolute;
          right: 300px;
          top: 0;
          height: 100%;
          border-right: 2px dashed rgba(201,162,39,0.6);
        }
        .hole {
          position: absolute;
          top: 20px;
          left: 75px;
          width: 20px;
          height: 20px;
          background: #e8e8e8;
          border-radius: 50%;
          z-index: 5;
        }
        
        .left {
          width: 680px;
          padding: 30px 35px 25px 35px;
          position: relative;
          background-image: linear-gradient(rgba(11,15,26,0.88), rgba(11,15,26,0.88)), url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070');
          background-size: cover;
          background-position: center;
          display: flex;
          gap: 30px;
        }
        .left-col {
          width: 140px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .csa-logo {
          width: 85px;
          height: 85px;
          background: white;
          border-radius: 50%;
          border: 3px solid #C9A227;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 25px;
          overflow: hidden;
        }
        .csa-logo img { width: 90%; height: 90%; object-fit: contain; }
        
        .date-block {
          border-left: 2px solid #C9A227;
          padding-left: 15px;
          margin: 20px 0;
          text-align: left;
          width: 100%;
        }
        .date-block i { color: #C9A227; font-size: 18px; margin-bottom: 8px; display: block; }
        .date-block .day-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; }
        .date-block .day { font-size: 44px; font-weight: 700; color: #C9A227; line-height: 1; }
        .date-block .th { font-size: 18px; vertical-align: super; color: #C9A227; }
        .date-block .month-year { font-size: 12px; font-weight: 600; margin-top: 4px; }
        
        .info-block {
          border-top: 1px solid #C9A227;
          padding-top: 15px;
          margin-top: 15px;
          font-size: 11px;
          width: 100%;
          text-align: left;
        }
        .info-block i { color: #C9A227; margin-right: 8px; width: 16px; }
        .info-block div { margin: 12px 0; font-weight: 600; }
        
        .main-content { flex: 1; padding-top: 10px; }
        .gala {
          font-family: 'Playfair Display', serif;
          font-size: 68px;
          font-weight: 900;
          background: linear-gradient(180deg, #E6C875 0%, #C9A227 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 0.9;
          letter-spacing: 2px;
        }
        .dinner {
          font-family: 'Cinzel', serif;
          font-size: 42px;
          font-weight: 700;
          color: white;
          letter-spacing: 3px;
          margin-top: -5px;
        }
        .tagline {
          color: #C9A227;
          font-size: 12px;
          font-weight: 600;
          margin: 12px 0 20px;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tagline::before, .tagline::after {
          content: '◆';
          font-size: 8px;
        }
        .theme-box {
          border: 1.5px solid #C9A227;
          border-radius: 8px;
          padding: 12px 18px;
          margin: 20px 0;
          font-size: 11px;
          background: #0B0F1A;
        }
        .theme-box span { color: #C9A227; font-weight: 700; }
        .theme-box .highlight { color: #C9A227; font-weight: 600; }
        
        .ticket-type-label {
          color: #C9A227;
          font-size: 12px;
          font-weight: 700;
          margin-top: 25px;
          letter-spacing: 1px;
        }
        .ticket-type-ribbon {
          background: linear-gradient(135deg, #E6C875 0%, #C9A227 100%);
          color: #0B0F1A;
          padding: 14px 20px;
          margin: 8px 0 20px;
          font-weight: 900;
          font-size: 20px;
          text-align: center;
          position: relative;
          clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%);
          box-shadow: 0 4px 12px rgba(201,162,39,0.3);
        }
        .ticket-type-ribbon i {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
        }
        .ticket-type-ribbon .fa-star:first-child { left: 20px; }
        .ticket-type-ribbon .fa-star:last-child { right: 35px; }
        
        .bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 25px;
        }
        .ticket-no {
          background: #F6F1E3;
          color: #0B0F1A;
          padding: 10px 16px;
          font-weight: 700;
          font-size: 12px;
          border-radius: 6px;
          border: 2px solid #C9A227;
        }
        .tagline-script {
          font-family: 'Great Vibes', cursive;
          color: #C9A227;
          font-size: 20px;
          margin-left: auto;
          padding-left: 20px;
          border-left: 1px solid #C9A227;
        }
        
        .right {
          width: 300px;
          background: #F6F1E3;
          color: #0B0F1A;
          padding: 25px 45px 25px 25px;
          position: relative;
        }
        .gold-sidebar {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: 35px;
          background: linear-gradient(180deg, #E6C875 0%, #C9A227 100%);
          writing-mode: vertical-rl;
          text-orientation: mixed;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 11px;
          color: #0B0F1A;
          letter-spacing: 1.5px;
        }
        .admit {
          text-align: center;
          font-weight: 900;
          font-size: 20px;
          color: #0B0F1A;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }
        .admit i { color: #C9A227; font-size: 14px; margin: 0 6px; }
        
        .detail-list { margin: 15px 0; }
        .detail-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 12px 0;
          padding-bottom: 10px;
          border-bottom: 1px dotted #C9A227;
        }
        .detail-item i {
          width: 26px;
          height: 26px;
          border: 1.5px solid #C9A227;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          flex-shrink: 0;
          color: #C9A227;
        }
        .detail-label {
          font-size: 10px;
          font-weight: 700;
          color: #C9A227;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .detail-value {
          color: #0B0F1A;
          margin-left: auto;
          font-size: 12px;
          font-weight: 600;
          text-align: right;
          word-break: break-word;
          max-width: 130px;
        }
        
        .barcode {
          width: 100%;
          height: 50px;
          margin: 20px 0 10px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .barcode img { height: 50px; max-width: 100%; }
        
        .scan-text {
          text-align: right;
          font-size: 10px;
          font-weight: 700;
          color: #0B0F1A;
          line-height: 1.3;
        }
        .scan-text i { margin-right: 4px; font-size: 9px; }
      `}} />
      
      <div className="ticket-wrapper">
        <div className="ticket">
          <div className="hole"></div>
          
          <div className="left">
            <div className="left-col">
              <div className="csa-logo">
                <img src="https://i.postimg.cc/Y4nqnP2p/IMG-20260420-WA0002.jpg" alt="CSA Logo" />
              </div>
              
              <div className="date-block">
                <i className="fa-solid fa-calendar-days"></i>
                <div className="day-label">FRIDAY</div>
                <div><span className="day">5</span><span className="th">TH</span></div>
                <div className="month-year">JUNE<br/>2026</div>
              </div>
              
              <div className="info-block">
                <div><i className="fa-solid fa-clock"></i>7:00 PM<br/>– 11:00 PM</div>
              </div>
              
              <div className="info-block">
                <div><i className="fa-solid fa-location-dot"></i>UTALII<br/>HOTEL</div>
              </div>
            </div>
            
            <div className="main-content">
              <div className="gala">GALA</div>
              <div className="dinner">DINNER 2026</div>
              <div className="tagline">AWARDS • NETWORKING • ENTERTAINMENT</div>
              
              <div className="theme-box">
                <span>THEME:</span> Laying the First Stone: Honoring the Past, Empowering the <span className="highlight">Present</span>, Inspiring the Future
              </div>
              
              <div className="ticket-type-label">TICKET TYPE</div>
              <div className="ticket-type-ribbon">
                <i className="fa-solid fa-star"></i>{ticketType.toUpperCase()}<i className="fa-solid fa-star"></i>
              </div>
              
              <div className="bottom-row">
                <div className="ticket-no">TICKET NO. <span>{safeTicketNumber}</span></div>
                <div className="tagline-script">Pooling Construction Students Together!</div>
              </div>
            </div>
          </div>
          
          <div className="right">
            <div className="admit"><i className="fa-solid fa-star"></i> ADMIT <i className="fa-solid fa-star"></i></div>
            <div style={{ borderTop: '1px solid #C9A227', margin: '10px 0 15px' }}></div>
            
            <div className="detail-list">
              <div className="detail-item">
                <i className="fa-solid fa-user"></i>
                <div>
                  <div className="detail-label">Name</div>
                </div>
                <span className="detail-value">{safePurchaserName}</span>
              </div>
              
              <div className="detail-item">
                <i className="fa-solid fa-tag"></i>
                <div>
                  <div className="detail-label">Booking Code</div>
                </div>
                <span className="detail-value">{safeBookingCode}</span>
              </div>
              
              <div className="detail-item">
                <i className="fa-solid fa-ticket"></i>
                <div>
                  <div className="detail-label">Ticket Type</div>
                </div>
                <span className="detail-value">{ticketType}</span>
              </div>
              
              <div className="detail-item">
                <i className="fa-solid fa-wallet"></i>
                <div>
                  <div className="detail-label">Status</div>
                </div>
                <span className="detail-value">{safePaymentStatus}</span>
              </div>
              
              <div className="detail-item">
                <i className="fa-solid fa-coins"></i>
                <div>
                  <div className="detail-label">Amount</div>
                </div>
                <span className="detail-value">KSH {safeTotalAmount}</span>
              </div>
            </div>
            
            <div className="barcode">
              <img 
                src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(safeQrCode)}&code=Code128&translate-esc=false`}
                alt="Barcode"
              />
            </div>
            
            <div className="scan-text">
              <i className="fa-solid fa-play"></i>SCAN<br/>FOR ENTRY<br/>VERIFICATION
            </div>
            
            <div className="gold-sidebar">CSA GALA DINNER 2026</div>
          </div>
        </div>
      </div>
    </>
  )
                  }
