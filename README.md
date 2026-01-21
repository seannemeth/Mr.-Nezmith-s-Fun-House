# CFB Text Dynasty (MVP)

Clean, text-first, online dynasty scaffold using:
- Next.js (App Router)
- Supabase (Auth + Postgres)
- Vercel for hosting

## Setup
1. Create a Supabase project
2. Run `supabase/schema.sql` in Supabase SQL Editor
3. In Vercel, set env vars:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Deploy

## Auth note
If Supabase Email confirmations are enabled, users must confirm their email before they can sign in.
The app shows a friendly message instead of crashing.
