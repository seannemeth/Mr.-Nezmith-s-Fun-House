-- =========================================================
-- Recruiting Visits RPCs (DROP-IN)
--
-- Fixes:
-- - Avoids brittle client-side inserts/deletes to public.recruit_visits
-- - Derives season from public.leagues.current_season (prevents NULL season errors)
-- - Handles column drift: visit_bonus vs bonus
-- - Enforces league/team membership (auth.uid())
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- schedule_recruit_visit_v1 ----------

drop function if exists public.schedule_recruit_visit_v1(uuid, uuid, uuid, int, int);
create or replace function public.schedule_recruit_visit_v1(
  p_league_id uuid,
  p_team_id uuid,
  p_recruit_id uuid,
  p_week int,
  p_bonus int default 5
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_season int;

  has_season boolean;
  has_visit_bonus boolean;
  has_bonus boolean;

  sql_delete text;
  sql_insert text;
begin
  -- auth
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- authorization: MUST be member of this league + team
  if not exists (
    select 1
    from public.memberships m
    where m.league_id = p_league_id
      and m.user_id  = v_user
      and m.team_id  = p_team_id
  ) then
    raise exception 'Not authorized for this team';
  end if;

  -- validate week
  if p_week is null or p_week < 1 or p_week > 20 then
    raise exception 'Invalid week (%)', p_week;
  end if;

  -- league season
  select l.current_season into v_season
  from public.leagues l
  where l.id = p_league_id;

  if v_season is null then
    raise exception 'League not found (or missing current_season)';
  end if;

  -- detect columns (defensive against schema drift)
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='recruit_visits' and column_name='season'
  ) into has_season;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='recruit_visits' and column_name='visit_bonus'
  ) into has_visit_bonus;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='recruit_visits' and column_name='bonus'
  ) into has_bonus;

  -- delete existing visit first (idempotent)
  if has_season then
    sql_delete := $q$
      delete from public.recruit_visits
      where league_id = $1
        and team_id   = $2
        and recruit_id= $3
        and season    = $4
    $q$;
    execute sql_delete using p_league_id, p_team_id, p_recruit_id, v_season;
  else
    sql_delete := $q$
      delete from public.recruit_visits
      where league_id = $1
        and team_id   = $2
        and recruit_id= $3
    $q$;
    execute sql_delete using p_league_id, p_team_id, p_recruit_id;
  end if;

  -- insert new visit (choose best bonus column available)
  if has_season then
    if has_visit_bonus then
      sql_insert := $q$
        insert into public.recruit_visits (league_id, team_id, recruit_id, season, week, visit_bonus)
        values ($1, $2, $3, $4, $5, $6)
      $q$;
      execute sql_insert using p_league_id, p_team_id, p_recruit_id, v_season, p_week, coalesce(p_bonus, 5);
    elsif has_bonus then
      sql_insert := $q$
        insert into public.recruit_visits (league_id, team_id, recruit_id, season, week, bonus)
        values ($1, $2, $3, $4, $5, $6)
      $q$;
      execute sql_insert using p_league_id, p_team_id, p_recruit_id, v_season, p_week, coalesce(p_bonus, 5);
    else
      -- no bonus column at all
      sql_insert := $q$
        insert into public.recruit_visits (league_id, team_id, recruit_id, season, week)
        values ($1, $2, $3, $4, $5)
      $q$;
      execute sql_insert using p_league_id, p_team_id, p_recruit_id, v_season, p_week;
    end if;
  else
    if has_visit_bonus then
      sql_insert := $q$
        insert into public.recruit_visits (league_id, team_id, recruit_id, week, visit_bonus)
        values ($1, $2, $3, $4, $5)
      $q$;
      execute sql_insert using p_league_id, p_team_id, p_recruit_id, p_week, coalesce(p_bonus, 5);
    elsif has_bonus then
      sql_insert := $q$
        insert into public.recruit_visits (league_id, team_id, recruit_id, week, bonus)
        values ($1, $2, $3, $4, $5)
      $q$;
      execute sql_insert using p_league_id, p_team_id, p_recruit_id, p_week, coalesce(p_bonus, 5);
    else
      sql_insert := $q$
        insert into public.recruit_visits (league_id, team_id, recruit_id, week)
        values ($1, $2, $3, $4)
      $q$;
      execute sql_insert using p_league_id, p_team_id, p_recruit_id, p_week;
    end if;
  end if;

end;
$$;

grant execute on function public.schedule_recruit_visit_v1(uuid, uuid, uuid, int, int) to authenticated;

-- ---------- remove_recruit_visit_v1 ----------

drop function if exists public.remove_recruit_visit_v1(uuid, uuid, uuid);
create or replace function public.remove_recruit_visit_v1(
  p_league_id uuid,
  p_team_id uuid,
  p_recruit_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_season int;
  has_season boolean;
  sql_delete text;
begin
  -- auth
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- authorization: MUST be member of this league + team
  if not exists (
    select 1
    from public.memberships m
    where m.league_id = p_league_id
      and m.user_id  = v_user
      and m.team_id  = p_team_id
  ) then
    raise exception 'Not authorized for this team';
  end if;

  -- detect season column
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='recruit_visits' and column_name='season'
  ) into has_season;

  if has_season then
    select l.current_season into v_season
    from public.leagues l
    where l.id = p_league_id;

    if v_season is null then
      raise exception 'League not found (or missing current_season)';
    end if;

    sql_delete := $q$
      delete from public.recruit_visits
      where league_id = $1
        and team_id   = $2
        and recruit_id= $3
        and season    = $4
    $q$;
    execute sql_delete using p_league_id, p_team_id, p_recruit_id, v_season;
  else
    sql_delete := $q$
      delete from public.recruit_visits
      where league_id = $1
        and team_id   = $2
        and recruit_id= $3
    $q$;
    execute sql_delete using p_league_id, p_team_id, p_recruit_id;
  end if;

end;
$$;

grant execute on function public.remove_recruit_visit_v1(uuid, uuid, uuid) to authenticated;
