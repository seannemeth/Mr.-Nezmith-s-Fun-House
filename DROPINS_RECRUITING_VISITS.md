# Recruiting Visits: Full Drop-In

## 1) Run the migration SQL
File: `supabase/migrations/20260130_0001_recruit_visit_rpcs.sql`

Paste into Supabase SQL editor (or apply via migrations) and run.

## 2) Deploy
After running SQL, ensure these functions exist:

- `public.schedule_recruit_visit_v1`
- `public.remove_recruit_visit_v1`

## 3) UI already wired
Your `app/league/[leagueId]/recruiting/recruiting-client.tsx` already calls these RPCs.

If you still get schema-cache errors, something else in the UI is still trying to write to `recruit_visits` directly.
Search the codebase for `.from("recruit_visits")` and remove/replace with RPC calls.
