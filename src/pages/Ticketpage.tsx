You are fixing my Next.js 13 App Router + Supabase repo for csagaladinner.co.ke. 

Keep existing design system: navy #0A2342, gold #D4AF37, Tailwind CSS. Site deploys on Vercel.

**Task 1: Fix ticket 404 + generate complete workflow**
1. Create app/ticket/[ticket_number]/page.tsx
   - Connect to Supabase using process.env.NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Query table: ticket_purchases 
   - Columns: id, ticket_number, name, amount, created_at, phone, email, status
   - Match params.ticket_number to ticket_number column
   - If no match: return notFound()
   - If found: Render CSA GALA DINNER ticket UI
   - Display: ticket_number, name, amount, date formatted, QR code from https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TICKET_NUMBER
   - Style: white card, navy text, gold border #D4AF37, navy page bg #0A2342

2. Create app/not-found.tsx
   - Centered "Ticket not found" message
   - Gold text on navy background
   - Button: "Back to Home" → /

**Task 2: Admin dashboard delete options**
In app/admin/page.tsx or current admin dashboard file:
1. Add "Delete All Tickets" button at top
   - onClick: show confirm("Delete ALL ticket records? This cannot be undone")
   - If confirmed: await supabase.from('ticket_purchases').delete().neq('id', 0)
   - Show toast "All tickets deleted" and refresh data
   
2. Add delete icon/button to each row in tickets table
   - onClick: show confirm(`Delete ticket ${row.ticket_number}?`)
   - If confirmed: await supabase.from('ticket_purchases').delete().eq('id', row.id)
   - Show toast "Ticket deleted" and refresh data
   
3. Make sure admin route is protected. If no auth exists, add comment: // TODO: Add admin auth check

**Task 3: Replace promotion code popout with event notification**
1. Search entire codebase for "promotion", "promo", "discount", "coupon" modals/popouts
2. Delete that component completely
3. Create new component: components/EventNotification.tsx
   - Modal that shows once per browser session
   - Content: "CSA Gala Dinner 2025" 
   - Subtext: "Check your registered email for venue & time details. Dress Code: Formal
