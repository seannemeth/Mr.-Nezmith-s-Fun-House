create extension if not exists "pgcrypto";

drop function if exists public.withdraw_recruiting_offer(uuid, uuid, uuid);
create or replace function public.withdraw_recruiting_offer(
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
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (select 1 from public.memberships m where m.league_id=p_league_id and m.user_id=v_user) then
    raise exception 'Not a league member';
  end if;
  select l.current_season into v_season from public.leagues l where l.id=p_league_id;
  if v_season is null then
    raise exception 'League not found';
  end if;
  update public.recruiting_offers o
    set is_active=false
  where o.league_id=p_league_id and o.season=v_season and o.team_id=p_team_id and o.recruit_id=p_recruit_id;
end;
$$;

drop function if exists public.set_recruit_visit(uuid, uuid, uuid, int, text);
create or replace function public.set_recruit_visit(
  p_league_id uuid,
  p_team_id uuid,
  p_recruit_id uuid,
  p_week int,
  p_visit_type text default 'official'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_season int;
  v_type text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (select 1 from public.memberships m where m.league_id=p_league_id and m.user_id=v_user) then
    raise exception 'Not a league member';
  end if;
  if p_week is null or p_week < 1 or p_week > 20 then
    raise exception 'Invalid week (%)', p_week;
  end if;
  v_type := lower(coalesce(p_visit_type,'official'));
  if v_type not in ('official','unofficial') then
    raise exception 'Invalid visit type (%)', p_visit_type;
  end if;
  select l.current_season into v_season from public.leagues l where l.id=p_league_id;
  if v_season is null then
    raise exception 'League not found';
  end if;
  delete from public.recruit_visits rv
  where rv.league_id=p_league_id and rv.season=v_season and rv.team_id=p_team_id and rv.recruit_id=p_recruit_id;
  insert into public.recruit_visits(league_id,season,week,team_id,recruit_id,visit_type)
  values (p_league_id, v_season, p_week, p_team_id, p_recruit_id, v_type);
end;
$$;
