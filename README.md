# CFB Text Dynasty (MVP)

Clean, text-first, online dynasty scaffold using:
- Next.js (App Router)
- Supabase (Auth + Postgres)
- Vercel for hosting

## Quick Start
1. Create a Supabase project
2. Run the SQL in `supabase/schema.sql` in Supabase SQL Editor
3. Copy `.env.example` to `.env.local` and fill in values
4. `npm install`
5. `npm run dev`

## Deploy to Vercel
- Import this repo into Vercel
- Add env vars:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
- Deploy

## Notes
- League creation creates teams and a simple schedule (pairing teams alphabetically).
- Commissioner can "Advance Week" to simulate games and generate the next week.

