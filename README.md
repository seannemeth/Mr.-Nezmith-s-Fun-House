# CFB Text Dynasty (MVP)

Deploy-ready Next.js 14 (App Router) + Supabase project for a text-based college football dynasty.

## Setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run: `supabase/schema.sql`
3. Enable Email/Password auth. For easiest testing, disable email confirmation (or confirm emails).
4. Set env vars in Vercel (or local):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Local
```bash
npm install
npm run dev
```

## Notes
- Uses generic, location-based teams (no real school branding).
- MVP includes league create/join/delete, teams, schedule, recruiting board, portal/NIL/coaches scaffolding.
