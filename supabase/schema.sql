-- =========================
-- Core schema + functions
-- =========================

create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  commissioner_id uuid not null,
  invite_code text not null unique default public.generate_invite_code(),
  current_season int not null default 1,
  current_week int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null,
  short_name text not null,
  conference text not null default 'Independent',
  prestige int not null default 50,
  rating_off int not null default 50,
  rating_def int not null default 50,
  rating_st int not null default 50,
  wins int not null default 0,
  losses int not null default 0,
  created_at timestamptz not null default now(),
  unique (league_id, name)
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null,
  team_id uuid references public.teams(id) on delete set null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season int not null,
  week int not null,
  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,
  home_score int,
  away_score int,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index if not exists games_league_season_week_idx
  on public.games(league_id, season, week);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.generate_week_schedule(
  p_league_id uuid,
  p_season int,
  p_week int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ids uuid[];
  n int;
  i int;
begin
  select array_agg(id order by name) into ids
  from public.teams
  where league_id = p_league_id;

  n := coalesce(array_length(ids, 1), 0);
  if n < 2 then return; end if;

  delete from public.games
  where league_id = p_league_id and season = p_season and week = p_week;

  i := 1;
  while i < n loop
    insert into public.games(league_id, season, week, home_team_id, away_team_id)
    values (p_league_id, p_season, p_week, ids[i], ids[i+1]);
    i := i + 2;
  end loop;
end;
$$;

create or replace function public.create_league_with_structure(
  p_name text,
  p_teams jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
  v_user uuid;
  t jsonb;
  v_team_name text;
  v_short text;
  v_conf text;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  insert into public.leagues(name, commissioner_id, invite_code)
  values (p_name, v_user, public.generate_invite_code())
  returning id into v_league_id;

  insert into public.memberships(league_id, user_id, role)
  values (v_league_id, v_user, 'commissioner');

  for t in select * from jsonb_array_elements(p_teams)
  loop
    v_team_name := trim(coalesce(t->>'name', ''));
    v_short := trim(coalesce(t->>'short_name', ''));
    v_conf := trim(coalesce(t->>'conference', 'Independent'));

    if v_team_name = '' then continue; end if;
    if v_short = '' then v_short := left(regexp_replace(v_team_name, '\s+', '', 'g'), 12); end if;

    insert into public.teams(league_id, name, short_name, conference, prestige, rating_off, rating_def, rating_st)
    values (v_league_id, v_team_name, v_short, v_conf, 50, 50, 50, 50);
  end loop;

  perform public.generate_week_schedule(v_league_id, 1, 1);

  insert into public.audit_log(league_id, user_id, action, meta)
  values (v_league_id, v_user, 'league_created', jsonb_build_object('name', p_name, 'teams', jsonb_array_length(p_teams)));

  return v_league_id;
end;
$$;

create or replace function public.join_league_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_league uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select id into v_league
  from public.leagues
  where invite_code = upper(p_invite_code);

  if v_league is null then raise exception 'Invalid invite code'; end if;

  insert into public.memberships(league_id, user_id, role)
  values (v_league, v_user, 'member')
  on conflict (league_id, user_id) do nothing;

  insert into public.audit_log(league_id, user_id, action, meta)
  values (v_league, v_user, 'joined_league', jsonb_build_object('invite_code', upper(p_invite_code)));

  return v_league;
end;
$$;

create or replace function public.advance_week(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_commissioner uuid;
  v_season int;
  v_week int;
  g record;
  home_power int;
  away_power int;
  hs int;
  ascore int;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select commissioner_id, current_season, current_week
    into v_commissioner, v_season, v_week
  from public.leagues
  where id = p_league_id;

  if v_commissioner is null then raise exception 'League not found'; end if;
  if v_user <> v_commissioner then raise exception 'Only commissioner can advance week'; end if;

  for g in
    select *
    from public.games
    where league_id = p_league_id and season = v_season and week = v_week and status = 'scheduled'
  loop
    select (rating_off + rating_def + rating_st + prestige) into home_power from public.teams where id = g.home_team_id;
    select (rating_off + rating_def + rating_st + prestige) into away_power from public.teams where id = g.away_team_id;

    hs := greatest(0, 17 + ((home_power - away_power) / 8) + (random()*14)::int);
    ascore := greatest(0, 17 + ((away_power - home_power) / 8) + (random()*14)::int);
    if hs = ascore then hs := hs + 3 + (random()*7)::int; end if;

    update public.games set home_score = hs, away_score = ascore, status = 'final' where id = g.id;

    if hs > ascore then
      update public.teams set wins = wins + 1 where id = g.home_team_id;
      update public.teams set losses = losses + 1 where id = g.away_team_id;
    else
      update public.teams set wins = wins + 1 where id = g.away_team_id;
      update public.teams set losses = losses + 1 where id = g.home_team_id;
    end if;
  end loop;

  update public.leagues set current_week = current_week + 1 where id = p_league_id;

  select current_season, current_week into v_season, v_week from public.leagues where id = p_league_id;
  perform public.generate_week_schedule(p_league_id, v_season, v_week);

  insert into public.audit_log(league_id, user_id, action, meta)
  values (p_league_id, v_user, 'advance_week', jsonb_build_object('season', v_season, 'week', v_week));
end;
$$;

create or replace function public.delete_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_commissioner uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select commissioner_id into v_commissioner from public.leagues where id = p_league_id;
  if v_commissioner is null then raise exception 'League not found'; end if;
  if v_commissioner <> v_user then raise exception 'Only commissioner can delete league'; end if;

  delete from public.leagues where id = p_league_id;
end;
$$;

create or replace function public.update_team(
  p_league_id uuid,
  p_team_id uuid,
  p_name text,
  p_short_name text,
  p_prestige int,
  p_rating_off int,
  p_rating_def int,
  p_rating_st int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_commissioner uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select commissioner_id into v_commissioner from public.leagues where id = p_league_id;
  if v_commissioner is null then raise exception 'League not found'; end if;
  if v_user <> v_commissioner then raise exception 'Only commissioner can edit teams'; end if;

  update public.teams
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    short_name = coalesce(nullif(trim(p_short_name), ''), short_name),
    prestige = greatest(0, least(100, p_prestige)),
    rating_off = greatest(0, least(100, p_rating_off)),
    rating_def = greatest(0, least(100, p_rating_def)),
    rating_st  = greatest(0, least(100, p_rating_st))
  where id = p_team_id and league_id = p_league_id;

  if not found then raise exception 'Team not found in league'; end if;
end;
$$;

-- =========================
-- RLS
-- =========================
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.games enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists leagues_select on public.leagues;
create policy leagues_select
on public.leagues for select
using (
  exists (
    select 1 from public.memberships
    where memberships.league_id = leagues.id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists teams_select on public.teams;
create policy teams_select
on public.teams for select
using (
  exists (
    select 1 from public.memberships
    where memberships.league_id = teams.league_id
      and memberships.user_id = auth.uid()
  )
);

do $$
declare p record;
begin
  for p in
    select polname from pg_policies where schemaname='public' and tablename='memberships'
  loop
    execute format('drop policy if exists %I on public.memberships;', p.polname);
  end loop;
end $$;

create policy memberships_select_own
on public.memberships for select
using (user_id = auth.uid());

drop policy if exists games_select on public.games;
create policy games_select
on public.games for select
using (
  exists (
    select 1 from public.memberships
    where memberships.league_id = games.league_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists audit_select on public.audit_log;
create policy audit_select
on public.audit_log for select
using (
  exists (
    select 1 from public.memberships
    where memberships.league_id = audit_log.league_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists memberships_no_direct_insert on public.memberships;
create policy memberships_no_direct_insert
on public.memberships for insert
with check (false);
