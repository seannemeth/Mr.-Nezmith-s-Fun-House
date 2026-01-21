-- Supabase schema for CFB Text Dynasty MVP
-- Paste into Supabase SQL Editor and run.

create extension if not exists "pgcrypto";

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

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.leagues where invite_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.generate_week_schedule(
  p_league_id uuid,
  p_season int,
  p_week int
)
returns void
language plpgsql
security definer
as $$
declare
  ids uuid[];
  n int;
  k int;
begin
  select array_agg(id order by name) into ids
  from public.teams
  where league_id = p_league_id;

  n := coalesce(array_length(ids, 1), 0);
  if n < 2 then
    return;
  end if;

  delete from public.games
  where league_id = p_league_id and season = p_season and week = p_week;

  k := 1;
  while k < n loop
    insert into public.games(league_id, season, week, home_team_id, away_team_id)
    values (p_league_id, p_season, p_week, ids[k], ids[k+1]);
    k := k + 2;
  end loop;
end;
$$;

create or replace function public.create_league_with_teams(
  p_name text,
  p_team_names text[]
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_league_id uuid;
  v_user uuid;
  i int;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.leagues(name, commissioner_id, invite_code)
  values (p_name, v_user, public.generate_invite_code())
  returning id into v_league_id;

  insert into public.memberships(league_id, user_id, role)
  values (v_league_id, v_user, 'commissioner');

  for i in array_lower(p_team_names, 1)..array_upper(p_team_names, 1) loop
    insert into public.teams(league_id, name, short_name, prestige, rating_off, rating_def, rating_st)
    values (
      v_league_id,
      p_team_names[i],
      left(regexp_replace(p_team_names[i], '\s+', '', 'g'), 12),
      50, 50, 50, 50
    );
  end loop;

  perform public.generate_week_schedule(v_league_id, 1, 1);

  insert into public.audit_log(league_id, user_id, action, meta)
  values (v_league_id, v_user, 'league_created', jsonb_build_object('name', p_name));

  return v_league_id;
end;
$$;

create or replace function public.advance_week(p_league_id uuid)
returns void
language plpgsql
security definer
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
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select commissioner_id, current_season, current_week
    into v_commissioner, v_season, v_week
  from public.leagues
  where id = p_league_id;

  if v_commissioner is null then
    raise exception 'League not found';
  end if;

  if v_user <> v_commissioner then
    raise exception 'Only commissioner can advance week';
  end if;

  for g in
    select *
    from public.games
    where league_id = p_league_id
      and season = v_season
      and week = v_week
      and status = 'scheduled'
  loop
    select (rating_off + rating_def + rating_st + prestige) into home_power
      from public.teams where id = g.home_team_id;

    select (rating_off + rating_def + rating_st + prestige) into away_power
      from public.teams where id = g.away_team_id;

    home_score := greatest(0, 17 + ((home_power - away_power) / 8) + (random()*14)::int);
    away_score := greatest(0, 17 + ((away_power - home_power) / 8) + (random()*14)::int);

    if home_score = away_score then
      home_score := home_score + 3 + (random()*7)::int;
    end if;

    update public.games
      set home_score = home_score,
          away_score = away_score,
          status = 'final'
    where id = g.id;

    if home_score > away_score then
      update public.teams set wins = wins + 1 where id = g.home_team_id;
      update public.teams set losses = losses + 1 where id = g.away_team_id;
    else
      update public.teams set wins = wins + 1 where id = g.away_team_id;
      update public.teams set losses = losses + 1 where id = g.home_team_id;
    end if;
  end loop;

  update public.leagues
    set current_week = current_week + 1
  where id = p_league_id;

  select current_season, current_week into v_season, v_week
  from public.leagues where id = p_league_id;

  perform public.generate_week_schedule(p_league_id, v_season, v_week);

  insert into public.audit_log(league_id, user_id, action, meta)
  values (p_league_id, v_user, 'advance_week', jsonb_build_object('season', v_season, 'week', v_week));
end;
$$;

-- RLS
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.games enable row level security;
alter table public.audit_log enable row level security;

create policy "leagues_select_member"
on public.leagues for select
using (
  exists (
    select 1 from public.memberships m
    where m.league_id = leagues.id and m.user_id = auth.uid()
  )
);

create policy "teams_select_member"
on public.teams for select
using (
  exists (
    select 1 from public.memberships m
    where m.league_id = teams.league_id and m.user_id = auth.uid()
  )
);

create policy "memberships_select_member"
on public.memberships for select
using (
  exists (
    select 1 from public.memberships m2
    where m2.league_id = memberships.league_id and m2.user_id = auth.uid()
  )
);

create policy "games_select_member"
on public.games for select
using (
  exists (
    select 1 from public.memberships m
    where m.league_id = games.league_id and m.user_id = auth.uid()
  )
);

create policy "audit_select_member"
on public.audit_log for select
using (
  exists (
    select 1 from public.memberships m
    where m.league_id = audit_log.league_id and m.user_id = auth.uid()
  )
);

create policy "memberships_no_direct_insert"
on public.memberships for insert
with check (false);

create or replace function public.join_league_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user uuid;
  v_league_id uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_league_id
  from public.leagues
  where invite_code = upper(p_invite_code);

  if v_league_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.memberships(league_id, user_id, role)
  values (v_league_id, v_user, 'member')
  on conflict (league_id, user_id) do nothing;

  insert into public.audit_log(league_id, user_id, action, meta)
  values (v_league_id, v_user, 'joined_league', jsonb_build_object('invite_code', upper(p_invite_code)));

  return v_league_id;
end;
$$;
