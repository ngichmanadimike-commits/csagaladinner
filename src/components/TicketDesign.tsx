<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>CSA Gala Dinner 2026 – Ticket</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Oswald:wght@400;600;700&family=Roboto:wght@300;400;500;700&family=Dancing+Script:wght@700&display=swap" rel="stylesheet"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a2e;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 30px 20px;
    font-family: 'Roboto', sans-serif;
  }

  .ticket-wrapper {
    display: flex;
    width: 900px;
    max-width: 100%;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    position: relative;
  }

  /* ── LEFT PANEL ── */
  .ticket-left {
    flex: 1.4;
    position: relative;
    overflow: hidden;
    background: #111;
  }

  .ticket-left .bg-img {
    position: absolute;
    inset: 0;
    background: url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80') center/cover no-repeat;
    filter: brightness(0.38) saturate(0.7);
  }

  .ticket-left .overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(10,10,20,0.7) 0%, rgba(10,10,20,0.3) 100%);
  }

  .ticket-left-content {
    position: relative;
    z-index: 2;
    padding: 28px 28px 24px 28px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* Logo row */
  .logo-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }

  .logo-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #c8a84b;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  .logo-circle svg { width: 52px; height: 52px; }

  .event-title { flex: 1; }

  .event-title .gala {
    font-family: 'Playfair Display', serif;
    font-size: 42px;
    font-weight: 900;
    color: #c8a84b;
    line-height: 1;
    letter-spacing: 2px;
  }

  .event-title .dinner {
    font-family: 'Oswald', sans-serif;
    font-size: 38px;
    font-weight: 700;
    color: #ffffff;
    line-height: 1;
    letter-spacing: 3px;
  }

  /* Tagline */
  .tagline {
    font-family: 'Roboto', sans-serif;
    font-size: 10px;
    font-weight: 500;
    color: #c8a84b;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  /* Theme box */
  .theme-box {
    border: 1px solid rgba(200,168,75,0.5);
    border-radius: 4px;
    padding: 10px 14px;
    margin-bottom: 20px;
    background: rgba(200,168,75,0.07);
  }

  .theme-box .theme-label {
    font-size: 10px;
    font-weight: 700;
    color: #c8a84b;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .theme-box .theme-text {
    font-size: 11.5px;
    color: #e8e0cc;
    line-height: 1.5;
    font-style: italic;
  }

  /* Date / Time / Location row */
  .info-row {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .date-block {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .date-icon { color: #c8a84b; font-size: 16px; margin-top: 2px; }

  .date-text .day-name {
    font-size: 10px;
    font-weight: 700;
    color: #c8a84b;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .date-text .day-num {
    font-family: 'Oswald', sans-serif;
    font-size: 44px;
    font-weight: 700;
    color: #fff;
    line-height: 1;
  }

  .date-text .day-num sup {
    font-size: 18px;
    font-weight: 400;
    vertical-align: super;
    color: #c8a84b;
  }

  .date-text .month-year {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .time-loc-block { display: flex; flex-direction: column; gap: 10px; justify-content: center; }

  .info-line {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .info-line .i-icon { color: #c8a84b; font-size: 14px; margin-top: 1px; }

  .info-line .i-text {
    font-size: 11px;
    color: #e0d8c8;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1px;
    line-height: 1.4;
  }

  /* Ticket type badge */
  .ticket-type-section { margin-bottom: 14px; }

  .ticket-type-label {
    font-size: 9px;
    font-weight: 700;
    color: #c8a84b;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .ticket-type-badge {
    background: #c8a84b;
    color: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 10px 18px;
    border-radius: 4px;
    font-family: 'Oswald', sans-serif;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
  }

  .star-icon { font-size: 16px; }

  /* Bottom row */
  .bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid rgba(200,168,75,0.3);
    padding-top: 12px;
    margin-top: auto;
  }

  .ticket-no-box {
    border: 1px solid rgba(200,168,75,0.5);
    padding: 7px 14px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    color: #c8a84b;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: rgba(200,168,75,0.08);
  }

  .slogan {
    font-family: 'Dancing Script', cursive;
    font-size: 16px;
    color: #c8a84b;
    font-style: italic;
  }

  /* Perforation */
  .perforations {
    width: 20px;
    background: #1a1a2e;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 18px 0;
    position: relative;
    z-index: 3;
  }

  .perf-dot {
    width: 14px;
    height: 14px;
    background: #1a1a2e;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .perf-line {
    flex: 1;
    border-left: 2px dashed rgba(200,168,75,0.3);
    margin: 0 auto;
  }

  /* ── RIGHT PANEL ── */
  .ticket-right {
    width: 240px;
    flex-shrink: 0;
    background: #f5f0e8;
    display: flex;
  }

  .ticket-right-inner {
    flex: 1;
    padding: 22px 18px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .admit-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .admit-star { color: #c8a84b; font-size: 14px; }

  .admit-text {
    font-family: 'Oswald', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #1a1a2e;
    letter-spacing: 3px;
    text-transform: uppercase;
  }

  .admit-divider {
    height: 1px;
    background: rgba(26,26,46,0.15);
    margin-bottom: 14px;
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 11px;
  }

  .detail-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid #c8a84b;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .detail-icon svg { width: 13px; height: 13px; stroke: #c8a84b; fill: none; stroke-width: 1.8; }

  .detail-text { flex: 1; }

  .detail-label {
    font-size: 8.5px;
    font-weight: 700;
    color: #c8a84b;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 1px;
  }

  .detail-value {
    font-size: 12px;
    font-weight: 700;
    color: #1a1a2e;
    letter-spacing: 0.5px;
  }

  .qr-section {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .qr-box {
    width: 96px;
    height: 96px;
    background: #fff;
    border: 1px solid rgba(26,26,46,0.15);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
  }

  .qr-box svg { width: 86px; height: 86px; }

  .qr-caption {
    font-size: 9px;
    font-weight: 700;
    color: #1a1a2e;
    text-align: center;
    letter-spacing: 1px;
    text-transform: uppercase;
    line-height: 1.4;
  }

  /* Vertical side tab */
  .side-tab {
    width: 28px;
    background: #c8a84b;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .side-tab span {
    font-family: 'Oswald', sans-serif;
    font-size: 9px;
    font-weight: 700;
    color: #1a1a2e;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }

  @media (max-width: 700px) {
    .ticket-wrapper { flex-direction: column; width: 100%; }
    .ticket-right { width: 100%; }
    .side-tab { width: 100%; height: 28px; }
    .side-tab span { writing-mode: horizontal-tb; transform: none; }
    .perforations { flex-direction: row; width: 100%; height: 20px; padding: 0 18px; }
    .perf-line { flex: 1; border-left: none; border-top: 2px dashed rgba(200,168,75,0.3); }
  }
</style>
</head>
<body>

<div class="ticket-wrapper">

  <!-- LEFT PANEL -->
  <div class="ticket-left">
    <div class="bg-img"></div>
    <div class="overlay"></div>
    <div class="ticket-left-content">

      <!-- Logo + Title -->
      <div class="logo-row">
        <div class="logo-circle">
          <!-- CSA Logo SVG (simplified) -->
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="48" fill="#1a1a2e" stroke="#c8a84b" stroke-width="3"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#c8a84b" stroke-width="1.5"/>
            <!-- Building icon -->
            <rect x="30" y="38" width="40" height="28" rx="1" fill="none" stroke="#c8a84b" stroke-width="2"/>
            <rect x="36" y="44" width="6" height="8" fill="#c8a84b"/>
            <rect x="47" y="44" width="6" height="8" fill="#c8a84b"/>
            <rect x="58" y="44" width="6" height="8" fill="#c8a84b"/>
            <rect x="43" y="55" width="14" height="11" fill="#c8a84b"/>
            <!-- Crane -->
            <line x1="50" x2="50" y1="25" y2="38" stroke="#c8a84b" stroke-width="2"/>
            <line x1="38" x2="62" y1="25" y2="25" stroke="#c8a84b" stroke-width="2"/>
            <line x1="62" x2="62" y1="25" y2="34" stroke="#c8a84b" stroke-width="1.5"/>
            <!-- CSA text -->
            <text x="50" y="78" text-anchor="middle" font-family="Oswald,sans-serif" font-size="10" font-weight="700" fill="#c8a84b" letter-spacing="2">CSA</text>
          </svg>
        </div>
        <div class="event-title">
          <div class="gala">GALA</div>
          <div class="dinner">DINNER 2026</div>
        </div>
      </div>

      <!-- Tagline -->
      <div class="tagline">Awards &nbsp;·&nbsp; Networking &nbsp;·&nbsp; Entertainment</div>

      <!-- Theme -->
      <div class="theme-box">
        <div class="theme-label">Theme:</div>
        <div class="theme-text">LAYING THE FIRST STONE: Honoring the Past, Empowering the Present and Inspiring the Future of Construction</div>
      </div>

      <!-- Date + Time/Location -->
      <div class="info-row">
        <div class="date-block">
          <div class="date-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8a84b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="date-text">
            <div class="day-name">Friday</div>
            <div class="day-num">12<sup>TH</sup></div>
            <div class="month-year">June<br/>2026</div>
          </div>
        </div>
        <div class="time-loc-block">
          <div class="info-line">
            <div class="i-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8a84b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="i-text">10:00 PM – 11:00 PM</div>
          </div>
          <div class="info-line">
            <div class="i-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8a84b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="i-text">Kingfisher Nest<br/>Hotel</div>
          </div>
        </div>
      </div>

      <!-- Ticket type -->
      <div class="ticket-type-section">
        <div class="ticket-type-label">Ticket Type</div>
        <div class="ticket-type-badge">
          <span class="star-icon">★</span>
          COUPLE
          <span class="star-icon">★</span>
        </div>
      </div>

      <!-- Bottom row -->
      <div class="bottom-row">
        <div class="ticket-no-box">Ticket No. CSA-AS5WDKHP4</div>
        <div class="slogan">Pooling Construction Students Together!</div>
      </div>

    </div>
  </div>

  <!-- PERFORATION -->
  <div class="perforations">
    <div class="perf-dot"></div>
    <div class="perf-line"></div>
    <div class="perf-dot"></div>
  </div>

  <!-- RIGHT PANEL -->
  <div class="ticket-right">
    <div class="ticket-right-inner">

      <!-- ADMIT header -->
      <div class="admit-header">
        <span class="admit-star">★</span>
        <span class="admit-text">ADMIT</span>
        <span class="admit-star">★</span>
      </div>
      <div class="admit-divider"></div>

      <!-- Detail rows -->
      <div class="detail-row">
        <div class="detail-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </div>
        <div class="detail-text">
          <div class="detail-label">Name</div>
          <div class="detail-value">Captain RIZZY</div>
        </div>
      </div>

      <div class="detail-row">
        <div class="detail-icon">
          <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8l9 6 9-6"/></svg>
        </div>
        <div class="detail-text">
          <div class="detail-label">Booking Code</div>
          <div class="detail-value">CSA-AS5WDKHP4</div>
        </div>
      </div>

      <div class="detail-row">
        <div class="detail-icon">
          <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>
        </div>
        <div class="detail-text">
          <div class="detail-label">Ticket Type</div>
          <div class="detail-value">Couple</div>
        </div>
      </div>

      <div class="detail-row">
        <div class="detail-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
        </div>
        <div class="detail-text">
          <div class="detail-label">Status</div>
          <div class="detail-value">PAID</div>
        </div>
      </div>

      <div class="detail-row">
        <div class="detail-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div class="detail-text">
          <div class="detail-label">Amount</div>
          <div class="detail-value">KSH 5,000</div>
        </div>
      </div>

      <!-- QR Code -->
      <div class="qr-section">
        <div class="qr-box">
          <!-- QR Code SVG -->
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <!-- Finder pattern TL -->
            <rect x="10" y="10" width="56" height="56" fill="#111" rx="4"/>
            <rect x="18" y="18" width="40" height="40" fill="#f5f0e8" rx="2"/>
            <rect x="26" y="26" width="24" height="24" fill="#111" rx="1"/>
            <!-- Finder pattern TR -->
            <rect x="134" y="10" width="56" height="56" fill="#111" rx="4"/>
            <rect x="142" y="18" width="40" height="40" fill="#f5f0e8" rx="2"/>
            <rect x="150" y="26" width="24" height="24" fill="#111" rx="1"/>
            <!-- Finder pattern BL -->
            <rect x="10" y="134" width="56" height="56" fill="#111" rx="4"/>
            <rect x="18" y="142" width="40" height="40" fill="#f5f0e8" rx="2"/>
            <rect x="26" y="150" width="24" height="24" fill="#111" rx="1"/>
            <!-- Data modules (random-looking pattern) -->
            <g fill="#111">
              <rect x="76" y="10" width="8" height="8"/><rect x="92" y="10" width="8" height="8"/><rect x="108" y="10" width="8" height="8"/><rect x="124" y="10" width="8" height="8"/>
              <rect x="76" y="26" width="8" height="8"/><rect x="108" y="26" width="8" height="8"/>
              <rect x="76" y="42" width="8" height="8"/><rect x="92" y="42" width="8" height="8"/><rect x="124" y="42" width="8" height="8"/>
              <rect x="76" y="58" width="8" height="8"/><rect x="108" y="58" width="8" height="8"/>
              <rect x="10" y="76" width="8" height="8"/><rect x="26" y="76" width="8" height="8"/><rect x="58" y="76" width="8" height="8"/><rect x="76" y="76" width="8" height="8"/><rect x="108" y="76" width="8" height="8"/><rect x="124" y="76" width="8" height="8"/><rect x="150" y="76" width="8" height="8"/><rect x="182" y="76" width="8" height="8"/>
              <rect x="10" y="92" width="8" height="8"/><rect x="42" y="92" width="8" height="8"/><rect x="76" y="92" width="8" height="8"/><rect x="92" y="92" width="8" height="8"/><rect x="134" y="92" width="8" height="8"/><rect x="166" y="92" width="8" height="8"/>
              <rect x="26" y="108" width="8" height="8"/><rect x="58" y="108" width="8" height="8"/><rect x="76" y="108" width="8" height="8"/><rect x="108" y="108" width="8" height="8"/><rect x="150" y="108" width="8" height="8"/><rect x="182" y="108" width="8" height="8"/>
              <rect x="10" y="124" width="8" height="8"/><rect x="42" y="124" width="8" height="8"/><rect x="92" y="124" width="8" height="8"/><rect x="124" y="124" width="8" height="8"/><rect x="166" y="124" width="8" height="8"/>
              <rect x="76" y="134" width="8" height="8"/><rect x="92" y="134" width="8" height="8"/><rect x="124" y="134" width="8" height="8"/><rect x="150" y="134" width="8" height="8"/><rect x="182" y="134" width="8" height="8"/>
              <rect x="76" y="150" width="8" height="8"/><rect x="108" y="150" width="8" height="8"/><rect x="124" y="150" width="8" height="8"/><rect x="166" y="150" width="8" height="8"/>
              <rect x="76" y="166" width="8" height="8"/><rect x="92" y="166" width="8" height="8"/><rect x="108" y="166" width="8" height="8"/><rect x="150" y="166" width="8" height="8"/><rect x="182" y="166" width="8" height="8"/>
              <rect x="76" y="182" width="8" height="8"/><rect x="124" y="182" width="8" height="8"/><rect x="150" y="182" width="8" height="8"/><rect x="166" y="182" width="8" height="8"/>
            </g>
            <!-- Alignment pattern -->
            <rect x="150" y="134" width="32" height="32" fill="#111" rx="2"/>
            <rect x="158" y="142" width="16" height="16" fill="#f5f0e8" rx="1"/>
            <rect x="163" y="147" width="6" height="6" fill="#111"/>
          </svg>
        </div>
        <div class="qr-caption">!! SCAN QR<br/>FOR ENTRY<br/>VERIFICATION</div>
      </div>

    </div>

    <!-- SIDE TAB -->
    <div class="side-tab">
      <span>Annual CSA Gala Dinner</span>
    </div>
  </div>

</div>

</body>
</html>
