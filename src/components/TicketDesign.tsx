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
        .date-block .th { font-size: 18px; vertical
