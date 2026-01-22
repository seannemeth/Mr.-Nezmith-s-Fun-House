-- =========================================================
-- CFB Text Dynasty - Supabase Schema (MVP)
-- =========================================================

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
  conference_name text not null default 'Independent',
  name text not null,
  short_name text not null,
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
  role text not null default 'Head Coach',
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

create index if not exists games_league_season_week_idx on public.games(league_id, season, week);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- Gameplay tables
-- =========================

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  full_name text not null,
  position text not null,
  archetype text not null,
  state text not null,
  height_in int not null,
  weight_lb int not null,
  year int not null,
  overall int not null,
  attrs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists players_team_idx on public.players(team_id);

create table if not exists public.recruits (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season int not null,
  full_name text not null,
  position text not null,
  archetype text not null,
  state text not null,
  height_in int not null,
  weight_lb int not null,
  stars int not null,
  quality int not null,
  attrs jsonb not null default '{}'::jsonb,
  committed_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists recruits_league_season_idx on public.recruits(league_id, season);

create table if not exists public.portal_players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season int not null,
  from_team_id uuid references public.teams(id) on delete set null,
  from_team_name text not null default '',
  full_name text not null,
  position text not null,
  year int not null,
  overall int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_budgets (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  team_name text not null,
  season int not null,
  nil_budget int not null default 0,
  nil_spent int not null default 0,
  recruiting_budget int not null default 0,
  created_at timestamptz not null default now(),
  unique (league_id, team_id, season)
);

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  team_name text not null default '',
  role text not null default 'Head Coach',
  full_name text not null,
  overall int not null default 50,
  hot_seat int not null default 0,
  objective_wins int not null default 6,
  objective_text text not null default 'Win 6 games',
  created_at timestamptz not null default now()
);

-- =========================
-- Name and attribute helpers
-- =========================

create or replace function public.random_name()
returns text
language plpgsql
as $$
declare
  first_names text[] := array[
    'Aiden','Brayden','Carter','Dylan','Ethan','Gavin','Hudson','Isaiah','Jackson','Jalen',
    'Kai','Liam','Mason','Noah','Owen','Parker','Quinn','Ryan','Sawyer','Tyler',
    'Amari','DeAndre','Jamar','Malik','Tariq','Xavier','Zion','Caleb','Micah','Jordan'
  ];
  last_names text[] := array[
    'Adams','Baker','Carter','Davis','Edwards','Foster','Garcia','Harris','Irving','Johnson',
    'King','Lewis','Miller','Nelson','Owens','Patterson','Reed','Stewart','Turner',
    'Underwood','Vaughn','Walker','Young','Zimmerman','Brooks','Price','Coleman','Sanchez'
  ];
begin
  return first_names[1 + floor(random() * array_length(first_names,1))::int]
         || ' ' ||
         last_names[1 + floor(random() * array_length(last_names,1))::int];
end;
$$;

create or replace function public._rand_state()
returns text
language plpgsql
as $$
declare
  sts text[] := array[
    'Alabama','Arizona','Arkansas','California','Colorado','Florida','Georgia','Illinois','Indiana','Iowa',
    'Kansas','Kentucky','Louisiana','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Nebraska',
    'Nevada','New Jersey','New Mexico','New York','North Carolina','Ohio','Oklahoma','Oregon','Pennsylvania','South Carolina',
    'Tennessee','Texas','Utah','Virginia','Washington','West Virginia','Wisconsin'
  ];
begin
  return sts[1 + floor(random() * array_length(sts,1))::int];
end;
$$;

create or replace function public._rand_pos()
returns text
language plpgsql
as $$
declare
  pos text[] := array['QB','RB','WR','TE','OL','DL','LB','CB','S','K','P'];
begin
  return pos[1 + floor(random() * array_length(pos,1))::int];
end;
$$;

create or replace function public._rand_archetype(p_pos text)
returns text
language plpgsql
as $$
declare
  a text[];
begin
  if p_pos = 'QB' then a := array['Pocket','Scrambler','Cannon Arm'];
  elsif p_pos = 'RB' then a := array['Power','Elusive','Receiving'];
  elsif p_pos = 'WR' then a := array['Deep Threat','Route Runner','Slot'];
  elsif p_pos = 'TE' then a := array['Blocking','Receiving','Balanced'];
  elsif p_pos = 'OL' then a := array['Pass Pro','Run Block','Mauler'];
  elsif p_pos = 'DL' then a := array['Speed Rush','Power Rush','Run Stop'];
  elsif p_pos = 'LB' then a := array['Field General','Pass Rush','Coverage'];
  elsif p_pos in ('CB','S') then a := array['Man','Zone','Ball Hawk'];
  else a := array['Specialist'];
  end if;
  return a[1 + floor(random() * array_length(a,1))::int];
end;
$$;

create or replace function public._gen_attrs(p_position text, p_archetype text, p_quality int)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  base int := greatest(20, least(99, p_quality));
  spd int;
  acc int;
  agi int;
  str int;
  thr int;
  cov int;
begin
  spd := greatest(30, least(99, base + (random()*20)::int - 10));
  acc := greatest(30, least(99, base + (random()*20)::int - 10));
  agi := greatest(30, least(99, base + (random()*20)::int - 10));
  str := greatest(30, least(99, base + (random()*20)::int - 10));
  thr := greatest(30, least(99, base + (random()*20)::int - 10));
  cov := greatest(30, least(99, base + (random()*20)::int - 10));

  if p_position = 'QB' then
    if p_archetype = 'Scrambler' then spd := greatest(spd, base + 10); end if;
    if p_archetype = 'Cannon Arm' then thr := greatest(thr, base + 12); end if;
  end if;

  if p_position in ('CB','S') then
    cov := greatest(cov, base + 8);
    spd := greatest(spd, base + 6);
  end if;

  if p_position in ('OL','DL','LB') then
    str := greatest(str, base + 8);
  end if;

  return jsonb_build_object('speed', spd,'accel', acc,'agility', agi,'strength', str,'throw', thr,'coverage', cov);
end;
$$;

-- =========================
-- Invite code
-- =========================
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.leagues where invite_code = code);
  end loop;
  return code;
end;
$$;

-- =========================
-- Seeding
-- =========================
create or replace function public.seed_team_rosters(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  t record;
  i int;
  pos text;
  arch text;
  q int;
  yr int;
  ht int;
  wt int;
  nm text;
begin
  delete from public.players where league_id = p_league_id;

  for t in select id from public.teams where league_id = p_league_id loop
    for i in 1..85 loop
      pos := public._rand_pos();
      arch := public._rand_archetype(pos);

      q := greatest(35, least(95,
        (50 + (random()*30)::int) +
        (case when random() < 0.04 then 20 else 0 end) -
        (case when random() < 0.10 then 10 else 0 end)
      ));

      yr := 1 + (random()*4)::int;
      ht := 66 + (random()*12)::int;
      wt := 170 + (random()*130)::int;
      nm := public.random_name();

      insert into public.players(league_id, team_id, full_name, position, archetype, state, height_in, weight_lb, year, overall, attrs)
      values(p_league_id, t.id, nm, pos, arch, public._rand_state(), ht, wt, yr, q, public._gen_attrs(pos, arch, q));
    end loop;
  end loop;
end;
$$;

create or replace function public.seed_recruits_players(p_league_id uuid, p_season int, p_count int)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  i int;
  pos text;
  arch text;
  q int;
  stars int;
  ht int;
  wt int;
  nm text;
begin
  delete from public.recruits where league_id = p_league_id and season = p_season;

  for i in 1..greatest(200, p_count) loop
    pos := public._rand_pos();
    arch := public._rand_archetype(pos);

    if random() < 0.01 then stars := 5; q := 90 + (random()*9)::int;
    elsif random() < 0.08 then stars := 4; q := 78 + (random()*12)::int;
    elsif random() < 0.30 then stars := 3; q := 65 + (random()*14)::int;
    elsif random() < 0.80 then stars := 2; q := 52 + (random()*13)::int;
    else stars := 1; q := 40 + (random()*12)::int;
    end if;

    ht := 66 + (random()*13)::int;
    wt := 165 + (random()*140)::int;
    nm := public.random_name();

    insert into public.recruits(league_id, season, full_name, position, archetype, state, height_in, weight_lb, stars, quality, attrs)
    values(p_league_id, p_season, nm, pos, arch, public._rand_state(), ht, wt, stars, q, public._gen_attrs(pos, arch, q));
  end loop;
end;
$$;

create or replace function public.seed_team_budgets(p_league_id uuid, p_season int)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  t record;
  base int;
begin
  delete from public.team_budgets where league_id = p_league_id and season = p_season;

  for t in select id, name, prestige from public.teams where league_id = p_league_id loop
    base := 500000 + (t.prestige * 25000);
    insert into public.team_budgets(league_id, team_id, team_name, season, nil_budget, recruiting_budget)
    values(p_league_id, t.id, t.name, p_season, base, 200000 + (t.prestige*5000));
  end loop;
end;
$$;

create or replace function public.seed_coaches(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  t record;
  nm text;
  ovr int;
  obj int;
begin
  delete from public.coaches where league_id = p_league_id;

  for t in select id, name, prestige from public.teams where league_id = p_league_id loop
    nm := public.random_name();
    ovr := greatest(35, least(95, 40 + (t.prestige/2) + (random()*20)::int - 10));
    obj := greatest(3, least(12, 4 + (t.prestige/10) + (random()*3)::int));

    insert into public.coaches(league_id, team_id, team_name, role, full_name, overall, hot_seat, objective_wins, objective_text)
    values(p_league_id, t.id, t.name, 'Head Coach', nm, ovr, 0, obj, 'Win '||obj||' games');
  end loop;
end;
$$;

create or replace function public.seed_portal(p_league_id uuid, p_season int)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  p record;
  cnt int := 0;
begin
  delete from public.portal_players where league_id = p_league_id and season = p_season;

  for p in
    select pl.full_name, pl.position, pl.year, pl.overall, t.id as team_id, t.name as team_name
    from public.players pl
    join public.teams t on t.id = pl.team_id
    where pl.league_id = p_league_id
    order by random()
  loop
    exit when cnt >= 120;
    if random() < 0.02 then
      insert into public.portal_players(league_id, season, from_team_id, from_team_name, full_name, position, year, overall)
      values(p_league_id, p_season, p.team_id, p.team_name, p.full_name, p.position, p.year, p.overall);
      cnt := cnt + 1;
    end if;
  end loop;
end;
$$;

-- =========================
-- Schedule generator
-- =========================
create or replace function public.generate_week_schedule(p_league_id uuid, p_season int, p_week int)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  ids uuid[];
  n int;
  i int;
begin
  select array_agg(id order by name) into ids
  from public.teams where league_id = p_league_id;

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
-- Create league + seed everything
-- =========================
create or replace function public.create_league_with_teams(p_name text, p_team_names text[])
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_league_id uuid;
  v_user uuid;
  i int;
  nm text;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  insert into public.leagues(name, commissioner_id, invite_code)
  values (p_name, v_user, public.generate_invite_code())
  returning id into v_league_id;

  insert into public.memberships(league_id, user_id, role)
  values (v_league_id, v_user, 'Head Coach');

  for i in array_lower(p_team_names, 1)..array_upper(p_team_names, 1) loop
    nm := p_team_names[i];

    insert into public.teams(league_id, conference_name, name, short_name, prestige, rating_off, rating_def, rating_st)
    values (
      v_league_id,
      case
        when i <= 14 then 'Atlantic Coast'
        when i <= 28 then 'Big Plains'
        when i <= 40 then 'Coastal Gulf'
        when i <= 54 then 'Great Lakes'
        when i <= 66 then 'Heartland'
        when i <= 78 then 'Mountain West'
        when i <= 90 then 'Northeast'
        when i <= 104 then 'Pacific'
        when i <= 118 then 'Southeast'
        else 'Southwest'
      end,
      nm,
      left(regexp_replace(nm, '\s+', '', 'g'), 12),
      40 + (random()*40)::int,
      40 + (random()*40)::int,
      40 + (random()*40)::int,
      40 + (random()*40)::int
    );
  end loop;

  perform public.generate_week_schedule(v_league_id, 1, 1);
  perform public.seed_team_rosters(v_league_id);
  perform public.seed_recruits_players(v_league_id, 1, 1200);
  perform public.seed_team_budgets(v_league_id, 1);
  perform public.seed_coaches(v_league_id);
  perform public.seed_portal(v_league_id, 1);

  insert into public.audit_log(league_id, user_id, action, meta)
  values (v_league_id, v_user, 'league_created', jsonb_build_object('name', p_name));

  return v_league_id;
end;
$$;

-- =========================
-- Advance week (commissioner-only)
-- =========================
create or replace function public.advance_week(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
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
  as int;
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
    select * from public.games
    where league_id = p_league_id and season = v_season and week = v_week and status = 'scheduled'
  loop
    select (rating_off + rating_def + rating_st + prestige) into home_power from public.teams where id = g.home_team_id;
    select (rating_off + rating_def + rating_st + prestige) into away_power from public.teams where id = g.away_team_id;

    hs := greatest(0, 17 + ((home_power - away_power) / 8) + (random()*14)::int);
    as := greatest(0, 17 + ((away_power - home_power) / 8) + (random()*14)::int);
    if hs = as then hs := hs + 3 + (random()*7)::int; end if;

    update public.games set home_score = hs, away_score = as, status = 'final' where id = g.id;

    if hs > as then
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

-- =========================
-- Join league by invite code
-- =========================
create or replace function public.join_league_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid;
  v_league_id uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select id into v_league_id from public.leagues where invite_code = upper(p_invite_code);
  if v_league_id is null then raise exception 'Invalid invite code'; end if;

  insert into public.memberships(league_id, user_id, role)
  values (v_league_id, v_user, 'Head Coach')
  on conflict (league_id, user_id) do nothing;

  insert into public.audit_log(league_id, user_id, action, meta)
  values (v_league_id, v_user, 'joined_league', jsonb_build_object('invite_code', upper(p_invite_code)));

  return v_league_id;
end;
$$;

-- =========================
-- Set membership team + role
-- =========================
create or replace function public.set_membership_team_role(p_league_id uuid, p_team_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_user uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  update public.memberships
    set team_id = p_team_id,
        role = coalesce(nullif(p_role,''), role)
  where league_id = p_league_id and user_id = v_user;

  if not found then raise exception 'Membership not found'; end if;
end;
$$;

-- =========================
-- Delete league (commissioner-only)
-- =========================
create or replace function public.delete_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_user uuid; v_commissioner uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Not authenticated'; end if;

  select commissioner_id into v_commissioner from public.leagues where id = p_league_id;
  if v_commissioner is null then raise exception 'League not found'; end if;
  if v_user <> v_commissioner then raise exception 'Only commissioner can delete league'; end if;

  delete from public.leagues where id = p_league_id;
end;
$$;

-- =========================
-- Recruiting helper: distinct states
-- =========================
create or replace function public.distinct_recruit_states(p_league_id uuid, p_season int)
returns text[]
language sql
security definer
set search_path to 'public'
as $$
  select coalesce(array_agg(distinct state order by state), array[]::text[])
  from public.recruits
  where league_id = p_league_id and season = p_season;
$$;

-- =========================
-- RLS (no recursive membership policy)
-- =========================
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.games enable row level security;
alter table public.audit_log enable row level security;
alter table public.players enable row level security;
alter table public.recruits enable row level security;
alter table public.portal_players enable row level security;
alter table public.team_budgets enable row level security;
alter table public.coaches enable row level security;

-- Drop any existing policies (safe reset)
do $$
declare p record;
begin
  for p in select schemaname, tablename, polname from pg_policies where schemaname='public' loop
    execute format('drop policy if exists %I on public.%I;', p.polname, p.tablename);
  end loop;
end $$;

-- memberships: user can see only their own rows
create policy memberships_select_own on public.memberships
for select using (user_id = auth.uid());

-- leagues/teams/etc: visible to league members (safe because memberships policy is not recursive)
create policy leagues_select_member on public.leagues
for select using (exists (select 1 from public.memberships m where m.league_id = leagues.id and m.user_id = auth.uid()));

create policy teams_select_member on public.teams
for select using (exists (select 1 from public.memberships m where m.league_id = teams.league_id and m.user_id = auth.uid()));

create policy games_select_member on public.games
for select using (exists (select 1 from public.memberships m where m.league_id = games.league_id and m.user_id = auth.uid()));

create policy players_select_member on public.players
for select using (exists (select 1 from public.memberships m where m.league_id = players.league_id and m.user_id = auth.uid()));

create policy recruits_select_member on public.recruits
for select using (exists (select 1 from public.memberships m where m.league_id = recruits.league_id and m.user_id = auth.uid()));

create policy portal_select_member on public.portal_players
for select using (exists (select 1 from public.memberships m where m.league_id = portal_players.league_id and m.user_id = auth.uid()));

create policy budgets_select_member on public.team_budgets
for select using (exists (select 1 from public.memberships m where m.league_id = team_budgets.league_id and m.user_id = auth.uid()));

create policy coaches_select_member on public.coaches
for select using (exists (select 1 from public.memberships m where m.league_id = coaches.league_id and m.user_id = auth.uid()));

create policy audit_select_member on public.audit_log
for select using (exists (select 1 from public.memberships m where m.league_id = audit_log.league_id and m.user_id = auth.uid()));

-- Block direct client writes (use RPC/security definer)
create policy memberships_no_direct_insert on public.memberships for insert with check (false);
create policy leagues_no_direct_write on public.leagues for insert with check (false);
create policy leagues_no_direct_update on public.leagues for update using (false);
create policy teams_no_direct_write on public.teams for insert with check (false);
create policy teams_no_direct_update on public.teams for update using (false);
create policy games_no_direct_write on public.games for insert with check (false);
create policy games_no_direct_update on public.games for update using (false);
create policy players_no_direct_write on public.players for insert with check (false);
create policy players_no_direct_update on public.players for update using (false);
create policy recruits_no_direct_write on public.recruits for insert with check (false);
create policy recruits_no_direct_update on public.recruits for update using (false);
create policy portal_no_direct_write on public.portal_players for insert with check (false);
create policy portal_no_direct_update on public.portal_players for update using (false);
create policy budgets_no_direct_write on public.team_budgets for insert with check (false);
create policy budgets_no_direct_update on public.team_budgets for update using (false);
create policy coaches_no_direct_write on public.coaches for insert with check (false);
create policy coaches_no_direct_update on public.coaches for update using (false);
create policy audit_no_direct_write on public.audit_log for insert with check (false);
create policy audit_no_direct_update on public.audit_log for update using (false);
