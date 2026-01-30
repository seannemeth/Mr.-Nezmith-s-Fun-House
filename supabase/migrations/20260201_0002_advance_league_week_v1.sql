-- supabase/migrations/20260201_0002_advance_league_week_v1.sql
--
-- Advances a league forward by 1 week (server-authoritative).
-- - Optional commissioner/admin validation (if a membership table exists)
-- - Calls process_recruiting_week_v1(league_id, season, week) BEFORE advancing week
-- - Then increments leagues.week by 1
--
-- Assumptions / compatibility:
-- - public.leagues exists with columns: id (uuid), season (int), week (int)
-- - process_recruiting_week_v1(uuid,int,int) exists (from prior migration)
-- - Optional membership table:
--     public.league_members OR public.league_memberships
--   with columns:
--     league_id uuid, user_id uuid, role text
--   role values include 'commissioner' and/or 'admin'
--
-- If the membership table doesn't exist, function will NOT block on auth (useful for service/admin flows).

begin;

create or replace function public.advance_league_week_v1(
  p_league_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season int;
  v_week int;
  v_new_week int;

  v_leagues_lock record;

  v_members_table regclass;
  v_members_table_name text;

  v_role text;
  v_uid uuid := auth.uid();

  v_processed jsonb;
begin
  if p_league_id is null then
    raise exception 'p_league_id is required';
  end if;

  -- 0) Lock league row so concurrent calls don't double-advance
  select l.season, l.week
  into v_season, v_week
  from public.leagues l
  where l.id = p_league_id
  for update;

  if v_season is null or v_week is null then
    raise exception 'League not found or missing season/week: %', p_league_id;
  end if;

  -- 1) Optional auth check (commissioner/admin)
  --    Detect table name:
  v_members_table := to_regclass('public.league_members');
  if v_members_table is null then
    v_members_table := to_regclass('public.league_memberships');
  end if;

  if v_members_table is not null then
    v_members_table_name := v_members_table::text;

    -- If auth.uid() is null, we cannot validate and should block.
    if v_uid is null then
      raise exception 'Not authenticated';
    end if;

    -- Pull role dynamically (supports either members table)
    execute format($fmt$
      select m.role
      from %s m
      where m.league_id = $1
        and m.user_id = $2
      limit 1
    $fmt$, v_members_table_name)
    into v_role
    using p_league_id, v_uid;

    if v_role is null then
      raise exception 'Not a member of this league';
    end if;

    if lower(v_role) not in ('commissioner', 'admin') then
      raise exception 'Only commissioner/admin can advance the week';
    end if;
  end if;

  -- 2) Process recruiting for the CURRENT week before advancing
  v_processed := public.process_recruiting_week_v1(p_league_id, v_season, v_week);

  -- 3) Advance the week (simple +1; season rollover handled later)
  v_new_week := v_week + 1;

  update public.leagues
  set week = v_new_week
  where id = p_league_id;

  return jsonb_build_object(
    'ok', true,
    'league_id', p_league_id,
    'from', jsonb_build_object('season', v_season, 'week', v_week),
    'to',   jsonb_build_object('season', v_season, 'week', v_new_week),
    'recruiting_processed', v_processed
  );
end;
$$;

comment on function public.advance_league_week_v1(uuid) is
'Locks league row, optionally validates commissioner/admin, processes recruiting for current week, then increments week by 1.';

commit;
