
-- =========================
-- Extensions / UUID
-- =========================
create extension if not exists "pgcrypto";

-- =========================
-- Core tables
-- =========================
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  commissioner_id uuid not null,
  invite_code text not null unique,
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
  role text not null default 'member', -- commissioner | ad | hc | oc | dc | member
  created_at timestamptz not null default now(),
  unique (league_id, user_id)
);

-- prevent two users claiming the same team (one-controller per team)
create unique index if not exists memberships_unique_team
  on public.memberships(league_id, team_id)
  where team_id is not null;

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

-- =========================
-- Dynasty systems (MVP)
-- =========================

create table if not exists public.team_budgets (
  league_id uuid not null references public.leagues(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  season int not null,
  recruiting_points int not null default 0,
  nil_budget bigint not null default 0,
  portal_points int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (league_id, team_id, season)
);

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null,
  team_id uuid references public.teams(id) on delete set null,
  role text not null default 'hc',
  level int not null default 1,
  skill_points int not null default 0,
  skill_recruiting int not null default 0,
  skill_offense int not null default 0,
  skill_defense int not null default 0,
  created_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create table if not exists public.recruits (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season int not null,
  name text not null,
  position text not null,
  stars int not null,
  rank int not null,
  committed_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.recruiting_offers (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season int not null,
  week int not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  recruit_id uuid not null references public.recruits(id) on delete cascade,
  points int not null,
  created_at timestamptz not null default now(),
  unique (league_id, season, week, team_id, recruit_id)
);

create table if not exists public.portal_players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season int not null,
  player_name text not null,
  position text not null,
  rating int not null,
  from_team_id uuid references public.teams(id) on delete set null,
  from_team_name text not null,
  status text not null default 'open', -- open | committed
  to_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_bids (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season int not null,
  week int not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  portal_id uuid not null references public.portal_players(id) on delete cascade,
  points int not null,
  created_at timestamptz not null default now(),
  unique (league_id, season, week, team_id, portal_id)
);

create table if not exists public.nil_offers (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season int not null,
  week int not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  target_type text not null, -- recruit | portal
  target_id uuid not null,
  target_name text not null,
  amount bigint not null,
  status text not null default 'active', -- active | applied | declined
  created_at timestamptz not null default now()
);

-- =========================
-- Invite code helper
-- =========================
create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

-- =========================
-- Schedule generator
-- =========================
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

-- =========================
-- League creation: league + teams(with conf) + week 1
-- =========================
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
    if v_short = '' then
      v_short := left(regexp_replace(v_team_name, '\s+', '', 'g'), 12);
    end if;

    insert into public.teams(league_id, name, short_name, conference)
    values (v_league_id, v_team_name, v_short, v_conf);
  end loop;

  perform public.generate_week_schedule(v_league_id, 1, 1);

  insert into public.audit_log(league_id, user_id, action, meta)
  values (v_league_id, v_user, 'league_created', jsonb_build_object('name', p_name, 'teams', jsonb_array_length(p_teams)));

  return v_league_id;
end;
$$;

-- =========================
-- Join league
-- =========================
create or replace function public.join_league_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_league_id uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select id into v_league_id
  from public.leagues
  where invite_code = upper(p_invite_code);

  if v_league_id is null then raise exception 'Invalid invite code'; end if;

  insert into public.memberships(league_id, user_id, role)
  values (v_league_id, v_user, 'member')
  on conflict (league_id, user_id) do nothing;

  return v_league_id;
end;
$$;

-- =========================
-- Delete league (commissioner only)
-- =========================
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

-- =========================
-- Update team (commissioner only)
-- =========================
create or replace function public.update_team(
  p_league_id uuid,
  p_team_id uuid,
  p_name text,
  p_short_name text,
  p_conference text,
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
    conference = coalesce(nullif(trim(p_conference), ''), conference),
    prestige = greatest(0, least(100, p_prestige)),
    rating_off = greatest(0, least(100, p_rating_off)),
    rating_def = greatest(0, least(100, p_rating_def)),
    rating_st  = greatest(0, least(100, p_rating_st))
  where id = p_team_id and league_id = p_league_id;

  if not found then raise exception 'Team not found in league'; end if;
end;
$$;

-- =========================
-- Set membership team + role
-- =========================
create or replace function public.set_membership_team_role(
  p_league_id uuid,
  p_team_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_role text;
  v_team uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  -- membership must exist
  if not exists (
    select 1 from public.memberships
    where league_id = p_league_id and user_id = v_user
  ) then
    raise exception 'You are not a member of this league';
  end if;

  v_role := lower(coalesce(p_role, 'member'));
  if v_role not in ('commissioner','ad','hc','oc','dc','member') then
    raise exception 'Invalid role';
  end if;

  if p_team_id is not null then
    select id into v_team from public.teams where id = p_team_id and league_id = p_league_id;
    if v_team is null then raise exception 'Invalid team'; end if;
  end if;

  -- update membership (unique index prevents duplicates)
  update public.memberships
  set team_id = p_team_id,
      role = case when role='commissioner' then role else v_role end
  where league_id = p_league_id and user_id = v_user;

  if not found then raise exception 'Membership not found'; end if;

  -- upsert coach record
  insert into public.coaches(league_id, user_id, team_id, role)
  values (p_league_id, v_user, p_team_id, v_role)
  on conflict (league_id, user_id)
  do update set team_id = excluded.team_id, role = excluded.role;
end;
$$;

-- =========================
-- Initialize recruiting/portal/nil budgets for current season
-- =========================
create or replace function public.init_season_programs(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_commissioner uuid;
  v_season int;
  t record;
  i int;
  nm text;
  pos text;
  stars int;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select commissioner_id, current_season into v_commissioner, v_season
  from public.leagues where id = p_league_id;

  if v_commissioner is null then raise exception 'League not found'; end if;
  if v_user <> v_commissioner then raise exception 'Only commissioner can initialize programs'; end if;

  -- budgets for each team
  for t in select id, prestige from public.teams where league_id = p_league_id
  loop
    insert into public.team_budgets(league_id, team_id, season, recruiting_points, nil_budget, portal_points)
    values (p_league_id, t.id, v_season, (20 + (t.prestige/5)), (t.prestige::bigint * 2000), 20)
    on conflict (league_id, team_id, season) do update
      set recruiting_points = excluded.recruiting_points,
          nil_budget = excluded.nil_budget,
          portal_points = excluded.portal_points,
          updated_at = now();
  end loop;

  -- seed recruits if none exist for season
  if not exists(select 1 from public.recruits where league_id = p_league_id and season = v_season) then
    for i in 1..250 loop
      nm := 'Prospect ' || i::text;
      pos := (array['QB','RB','WR','TE','OL','DL','LB','CB','S','K'])[1 + floor(random()*10)];
      stars := case
        when i <= 15 then 5
        when i <= 60 then 4
        when i <= 150 then 3
        else 2
      end;

      insert into public.recruits(league_id, season, name, position, stars, rank)
      values (p_league_id, v_season, nm, pos, stars, i);
    end loop;
  end if;

  -- seed portal if none
  if not exists(select 1 from public.portal_players where league_id = p_league_id and season = v_season) then
    for t in select id, name from public.teams where league_id = p_league_id order by random() limit 25
    loop
      insert into public.portal_players(league_id, season, player_name, position, rating, from_team_id, from_team_name)
      values (
        p_league_id,
        v_season,
        t.name || ' Player',
        (array['QB','RB','WR','TE','OL','DL','LB','CB','S'])[1 + floor(random()*9)],
        60 + floor(random()*30)::int,
        t.id,
        t.name
      );
    end loop;
  end if;
end;
$$;

-- =========================
-- Recruiting offer: spend points (team must be selected)
-- =========================
create or replace function public.recruiting_offer(
  p_league_id uuid,
  p_recruit_id uuid,
  p_points int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_team uuid;
  v_role text;
  v_season int;
  v_week int;
  v_budget int;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select current_season, current_week into v_season, v_week
  from public.leagues where id = p_league_id;

  select team_id, role into v_team, v_role
  from public.memberships
  where league_id = p_league_id and user_id = v_user;

  if v_team is null then raise exception 'Select a team first'; end if;
  if v_role not in ('commissioner','ad','hc','oc','dc') then raise exception 'Role cannot recruit'; end if;

  select recruiting_points into v_budget
  from public.team_budgets
  where league_id = p_league_id and team_id = v_team and season = v_season;

  if v_budget is null then raise exception 'Budgets not initialized'; end if;
  if p_points <= 0 then raise exception 'Points must be positive'; end if;
  if p_points > v_budget then raise exception 'Not enough recruiting points'; end if;

  insert into public.recruiting_offers(league_id, season, week, team_id, recruit_id, points)
  values (p_league_id, v_season, v_week, v_team, p_recruit_id, p_points)
  on conflict (league_id, season, week, team_id, recruit_id)
  do update set points = greatest(recruiting_offers.points, excluded.points);

  update public.team_budgets
    set recruiting_points = recruiting_points - p_points,
        updated_at = now()
  where league_id = p_league_id and team_id = v_team and season = v_season;
end;
$$;

-- =========================
-- Portal bid
-- =========================
create or replace function public.portal_bid(
  p_league_id uuid,
  p_portal_id uuid,
  p_points int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_team uuid;
  v_role text;
  v_season int;
  v_week int;
  v_budget int;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select current_season, current_week into v_season, v_week
  from public.leagues where id = p_league_id;

  select team_id, role into v_team, v_role
  from public.memberships where league_id = p_league_id and user_id = v_user;

  if v_team is null then raise exception 'Select a team first'; end if;
  if v_role not in ('commissioner','ad','hc','oc','dc') then raise exception 'Role cannot bid portal'; end if;

  select portal_points into v_budget
  from public.team_budgets
  where league_id = p_league_id and team_id = v_team and season = v_season;

  if v_budget is null then raise exception 'Budgets not initialized'; end if;
  if p_points <= 0 then raise exception 'Points must be positive'; end if;
  if p_points > v_budget then raise exception 'Not enough portal points'; end if;

  insert into public.portal_bids(league_id, season, week, team_id, portal_id, points)
  values (p_league_id, v_season, v_week, v_team, p_portal_id, p_points)
  on conflict (league_id, season, week, team_id, portal_id)
  do update set points = greatest(portal_bids.points, excluded.points);

  update public.team_budgets
    set portal_points = portal_points - p_points,
        updated_at = now()
  where league_id = p_league_id and team_id = v_team and season = v_season;
end;
$$;

-- =========================
-- NIL offer (spend budget)
-- =========================
create or replace function public.nil_offer(
  p_league_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_amount bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_team uuid;
  v_role text;
  v_season int;
  v_week int;
  v_budget bigint;
  v_name text;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select current_season, current_week into v_season, v_week
  from public.leagues where id = p_league_id;

  select team_id, role into v_team, v_role
  from public.memberships where league_id = p_league_id and user_id = v_user;

  if v_team is null then raise exception 'Select a team first'; end if;
  if v_role not in ('commissioner','ad','hc','oc','dc') then raise exception 'Role cannot use NIL'; end if;

  select nil_budget into v_budget
  from public.team_budgets
  where league_id = p_league_id and team_id = v_team and season = v_season;

  if v_budget is null then raise exception 'Budgets not initialized'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if p_amount > v_budget then raise exception 'Not enough NIL budget'; end if;

  if lower(p_target_type) = 'recruit' then
    select name into v_name from public.recruits where id = p_target_id and league_id = p_league_id and season = v_season;
  elsif lower(p_target_type) = 'portal' then
    select player_name into v_name from public.portal_players where id = p_target_id and league_id = p_league_id and season = v_season;
  else
    raise exception 'Invalid target type';
  end if;

  if v_name is null then raise exception 'Target not found'; end if;

  insert into public.nil_offers(league_id, season, week, team_id, target_type, target_id, target_name, amount)
  values (p_league_id, v_season, v_week, v_team, lower(p_target_type), p_target_id, v_name, p_amount);

  update public.team_budgets
    set nil_budget = nil_budget - p_amount,
        updated_at = now()
  where league_id = p_league_id and team_id = v_team and season = v_season;
end;
$$;

-- =========================
-- Coach upgrade (spend skill points)
-- =========================
create or replace function public.coach_upgrade(
  p_league_id uuid,
  p_track text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  c record;
  tr text;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select * into c from public.coaches where league_id = p_league_id and user_id = v_user;
  if c.id is null then raise exception 'No coach profile. Pick team/role then init programs.'; end if;
  if c.skill_points <= 0 then raise exception 'No skill points available yet'; end if;

  tr := lower(p_track);
  if tr not in ('recruiting','offense','defense') then raise exception 'Invalid track'; end if;

  update public.coaches
  set
    skill_points = skill_points - 1,
    skill_recruiting = case when tr='recruiting' then skill_recruiting + 1 else skill_recruiting end,
    skill_offense = case when tr='offense' then skill_offense + 1 else skill_offense end,
    skill_defense = case when tr='defense' then skill_defense + 1 else skill_defense end
  where id = c.id;
end;
$$;

-- =========================
-- Advance week: sim + apply recruiting/portal/NIL outcomes (simple)
-- =========================
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
  home_score int;
  away_score int;
  -- recruiting resolution
  r record;
  best record;
  -- portal resolution
  p record;
  bestp record;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select commissioner_id, current_season, current_week
    into v_commissioner, v_season, v_week
  from public.leagues where id = p_league_id;

  if v_commissioner is null then raise exception 'League not found'; end if;
  if v_user <> v_commissioner then raise exception 'Only commissioner can advance week'; end if;

  -- Sim scheduled games
  for g in
    select * from public.games
    where league_id = p_league_id and season = v_season and week = v_week and status = 'scheduled'
  loop
    select (rating_off + rating_def + rating_st + prestige) into home_power
    from public.teams where id = g.home_team_id;

    select (rating_off + rating_def + rating_st + prestige) into away_power
    from public.teams where id = g.away_team_id;

    home_score := greatest(0, 17 + ((home_power - away_power) / 8) + (random()*14)::int);
    away_score := greatest(0, 17 + ((away_power - home_power) / 8) + (random()*14)::int);
    if home_score = away_score then home_score := home_score + 3 + (random()*7)::int; end if;

    update public.games
      set home_score = home_score, away_score = away_score, status = 'final'
    where id = g.id;

    if home_score > away_score then
      update public.teams set wins = wins + 1 where id = g.home_team_id;
      update public.teams set losses = losses + 1 where id = g.away_team_id;
    else
      update public.teams set wins = wins + 1 where id = g.away_team_id;
      update public.teams set losses = losses + 1 where id = g.home_team_id;
    end if;

    -- award coach skill points (very small)
    update public.coaches
      set skill_points = skill_points + 1
    where league_id = p_league_id
      and team_id in (g.home_team_id, g.away_team_id);
  end loop;

  -- Resolve recruiting commitments every 2 weeks (simple)
  if v_week % 2 = 0 then
    for r in
      select id from public.recruits
      where league_id = p_league_id and season = v_season and committed_team_id is null
      order by rank asc
      limit 25
    loop
      select team_id, sum(points) as pts
      into best
      from public.recruiting_offers
      where league_id = p_league_id and season = v_season and recruit_id = r.id
      group by team_id
      order by pts desc
      limit 1;

      if best.team_id is not null and best.pts >= 20 then
        update public.recruits set committed_team_id = best.team_id where id = r.id;
      end if;
    end loop;
  end if;

  -- Resolve portal bids every 3 weeks (simple)
  if v_week % 3 = 0 then
    for p in
      select id from public.portal_players
      where league_id = p_league_id and season = v_season and status = 'open'
      limit 15
    loop
      select team_id, sum(points) as pts
      into bestp
      from public.portal_bids
      where league_id = p_league_id and season = v_season and portal_id = p.id
      group by team_id
      order by pts desc
      limit 1;

      if bestp.team_id is not null and bestp.pts >= 15 then
        update public.portal_players
          set status = 'committed', to_team_id = bestp.team_id
        where id = p.id;
      end if;
    end loop;
  end if;

  -- Advance week
  update public.leagues set current_week = current_week + 1 where id = p_league_id;

  -- next week schedule
  select current_season, current_week into v_season, v_week
  from public.leagues where id = p_league_id;

  perform public.generate_week_schedule(p_league_id, v_season, v_week);

  insert into public.audit_log(league_id, user_id, action, meta)
  values (p_league_id, v_user, 'advance_week', jsonb_build_object('season', v_season, 'week', v_week));
end;
$$;

-- =========================
-- RLS (Select-only; writes via RPC functions)
-- =========================
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.games enable row level security;
alter table public.audit_log enable row level security;

alter table public.team_budgets enable row level security;
alter table public.coaches enable row level security;
alter table public.recruits enable row level security;
alter table public.recruiting_offers enable row level security;
alter table public.portal_players enable row level security;
alter table public.portal_bids enable row level security;
alter table public.nil_offers enable row level security;

-- leagues visible to members
drop policy if exists leagues_select on public.leagues;
create policy leagues_select on public.leagues
for select
using (exists (select 1 from public.memberships m where m.league_id = leagues.id and m.user_id = auth.uid()));

-- teams visible to members
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
for select
using (exists (select 1 from public.memberships m where m.league_id = teams.league_id and m.user_id = auth.uid()));

-- memberships: user can read own row only (avoids recursion)
drop policy if exists memberships_select_own on public.memberships;
create policy memberships_select_own on public.memberships
for select
using (user_id = auth.uid());

-- games visible to members
drop policy if exists games_select on public.games;
create policy games_select on public.games
for select
using (exists (select 1 from public.memberships m where m.league_id = games.league_id and m.user_id = auth.uid()));

-- other tables visible to league members (read-only)
drop policy if exists budgets_select on public.team_budgets;
create policy budgets_select on public.team_budgets for select
using (exists (select 1 from public.memberships m where m.league_id = team_budgets.league_id and m.user_id = auth.uid()));

drop policy if exists coaches_select on public.coaches;
create policy coaches_select on public.coaches for select
using (exists (select 1 from public.memberships m where m.league_id = coaches.league_id and m.user_id = auth.uid()));

drop policy if exists recruits_select on public.recruits;
create policy recruits_select on public.recruits for select
using (exists (select 1 from public.memberships m where m.league_id = recruits.league_id and m.user_id = auth.uid()));

drop policy if exists portal_select on public.portal_players;
create policy portal_select on public.portal_players for select
using (exists (select 1 from public.memberships m where m.league_id = portal_players.league_id and m.user_id = auth.uid()));

drop policy if exists nil_select on public.nil_offers;
create policy nil_select on public.nil_offers for select
using (exists (select 1 from public.memberships m where m.league_id = nil_offers.league_id and m.user_id = auth.uid()));

-- lock down direct writes
drop policy if exists no_direct_insert_memberships on public.memberships;
create policy no_direct_insert_memberships on public.memberships for insert with check (false);
drop policy if exists no_direct_update_memberships on public.memberships;
create policy no_direct_update_memberships on public.memberships for update using (false);

-- For other tables, disallow direct inserts/updates/deletes as well
do $$
declare
  tbl text;
begin
  foreach tbl in array['team_budgets','coaches','recruits','recruiting_offers','portal_players','portal_bids','nil_offers','teams','games','leagues','audit_log']
  loop
    execute format('drop policy if exists %I_noins on public.%I;', tbl, tbl);
    execute format('create policy %I_noins on public.%I for insert with check (false);', tbl, tbl);
    execute format('drop policy if exists %I_noupd on public.%I;', tbl, tbl);
    execute format('create policy %I_noupd on public.%I for update using (false);', tbl, tbl);
    execute format('drop policy if exists %I_nodel on public.%I;', tbl, tbl);
    execute format('create policy %I_nodel on public.%I for delete using (false);', tbl, tbl);
  end loop;
end $$;
