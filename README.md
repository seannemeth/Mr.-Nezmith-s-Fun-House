
# CFB Dynasty (Text-Based)

A minimal, text-first college-football dynasty manager inspired by modern sports sims.

## Deploy
1. Create a Supabase project.
2. Supabase SQL Editor: run `supabase/schema.sql`.
3. Vercel env vars:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Deploy to Vercel.

## Notes
- All writes happen via Supabase RPC functions (security definer) to avoid RLS pain.
- Team/role selection is in League -> Settings.
- Commissioner initializes Recruiting/Portal/NIL from the League dashboard (button).
