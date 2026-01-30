-- supabase/migrations/20260201_0001_process_recruiting_week_v1.sql
--
-- Weekly recruiting processing engine (server-authoritative)
-- - Locks per league/season/week so it can’t run twice
-- - Applies contact deltas for the week
-- - Applies visit bonuses (if visits table exists)
-- - Applies competition scaling per recruit (more teams recruiting => smaller marginal gains)
-- - Applies decay to inactive interest rows
-- - Stores Top 8 snapshot per recruit per week
--
-- Assumptions / compatibility:
-- - recruiting_contacts exists with columns:
--     league_id, team_id, recruit_id, season, week, contact_type
--   (as created in 20260130_0023_recruiting_contacts_table_v1.sql)
-- - If a visits table exists, we *optionally* read it:
--     public.recruit_visits OR public.recruiting_visits
--   with columns:
--     league_id, team_id, recruit_id, season, week
--   and either visit_type/type/kind (text)
-- - If these optional tables do not exist, the function still runs.

begin;

-- ---------------------------------------------------------------------
-- 1) Week lock table (prevents double-processing)
-- ---------------------------------------------------------------------
create table if not exists public.recruiting_week_state (
  league_id uuid not null,
  season int not null,
  week int not null,
  processed_at timestamptz not null default now(),
  processed_by uuid null,
  primary key (league_id, season, week)
);

comment on table public.recruiting_week_state is
'Guards weekly recruiting processing: one row per league/season/week once processed.';

-- ---------------------------------------------------------------------
-- 2) Interest table (authoritative interest values per team/recruit)
-- ---------------------------------------------------------------------
create table if not exists public.recruiting_interest (
  league_id uuid not null,
  team_id uuid not null,
  recruit_id uuid not null,

  -- 0..100 (clamped)
  interest int not null default 0,

  -- When last modified (season/week)
  last_updated_season int not null default 1,
  last_updated_week int not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (league_id, team_id, recruit_id)
);

create index if not exists recruiting_interest_league_recruit_idx
  on public.recruiting_interest (league_id, recruit_id);

create index if not exists recruiting_interest_league_team_idx
  on public.recruiting_interest (league_id, team_id);

comment on table public.recruiting_interest is
'Authoritative interest per (league, team, recruit). Updated by weekly processing + contact RPCs.';

-- Keep updated_at fresh
create or replace function public._touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_recruiting_interest_touch on public.recruiting_interest;
create trigger trg_recruiting_interest_touch
before update on public.recruiting_interest
for each row execute function public._touch_updated_at();

-- ---------------------------------------------------------------------
-- 3) Top 8 snapshot table (per recruit per week)
-- ---------------------------------------------------------------------
create table if not exists public.recruiting_top8_snapshots (
  league_id uuid not null,
  season int not null,
  week int not null,
  recruit_id uuid not null,

  -- Ordered list of team_ids (length <= 8)
  top8 jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),

  primary key (league_id, season, week, recruit_id)
);

create index if not exists recruiting_top8_snapshots_league_week_idx
  on public.recruiting_top8_snapshots (league_id, season, week);

comment on table public.recruiting_top8_snapshots is
'Stores Top 8 teams (by interest) per recruit for a given league/season/week.';

-- ---------------------------------------------------------------------
-- 4) Weekly processing function
-- ---------------------------------------------------------------------
create or replace function public.process_recruiting_week_v1(
  p_league_id uuid,
  p_season int,
  p_week int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already_processed boolean;
  v_contacts_applied int := 0;
  v_visits_applied int := 0;
  v_decay_applied int := 0;
  v_pairs_seeded int := 0;
  v_snapshots_upserted int := 0;

  v_visits_table regclass;
  v_visits_table_name text;

  v_now timestamptz := now();
begin
  if p_league_id is null then
    raise exception 'p_league_id is required';
  end if;
  if p_season is null or p_week is null then
    raise exception 'p_season and p_week are required';
  end if;

  -- 1) Week-lock guard
  select exists(
    select 1
    from public.recruiting_week_state
    where league_id = p_league_id
      and season = p_season
      and week = p_week
  )
  into v_already_processed;

  if v_already_processed then
    return jsonb_build_object(
      'ok', true,
      'league_id', p_league_id,
      'season', p_season,
      'week', p_week,
      'status', 'already_processed'
    );
  end if;

  insert into public.recruiting_week_state (league_id, season, week, processed_at, processed_by)
  values (p_league_id, p_season, p_week, v_now, auth.uid());

  -- 2) Determine optional visits table (supports either name)
  v_visits_table := to_regclass('public.recruit_visits');
  if v_visits_table is null then
    v_visits_table := to_regclass('public.recruiting_visits');
  end if;

  if v_visits_table is not null then
    v_visits_table_name := v_visits_table::text;
  else
    v_visits_table_name := null;
  end if;

  -- 3) Seed interest rows for all (team,recruit) pairs that had activity this week
  --    Activity sources:
  --    - recruiting_contacts for this season/week
  --    - optional visits table for this season/week
  with active_pairs as (
    select rc.league_id, rc.team_id, rc.recruit_id
    from public.recruiting_contacts rc
    where rc.league_id = p_league_id
      and rc.season = p_season
      and rc.week = p_week

    union

    select v.league_id, v.team_id, v.recruit_id
    from (
      select null::uuid as league_id, null::uuid as team_id, null::uuid as recruit_id
      where false
    ) v
    where false
  ),
  active_pairs_with_visits as (
    select ap.league_id, ap.team_id, ap.recruit_id
    from active_pairs ap

    union

    select vv.league_id, vv.team_id, vv.recruit_id
    from (
      -- dynamic injection: replaced below if visits table exists
      select null::uuid as league_id, null::uuid as team_id, null::uuid as recruit_id
      where false
    ) vv
  )
  insert into public.recruiting_interest (league_id, team_id, recruit_id, interest, last_updated_season, last_updated_week)
  select p_league_id, ap.team_id, ap.recruit_id, 0, p_season, p_week
  from (
    select distinct team_id, recruit_id
    from active_pairs_with_visits
    where league_id = p_league_id
  ) ap
  on conflict (league_id, team_id, recruit_id) do nothing;

  get diagnostics v_pairs_seeded = row_count;

  -- If we have a visits table, re-run the seed step with real visit pairs via dynamic SQL
  if v_visits_table_name is not null then
    execute format($fmt$
      with visit_pairs as (
        select distinct v.team_id, v.recruit_id
        from %s v
        where v.league_id = $1
          and v.season = $2
          and v.week = $3
      )
      insert into public.recruiting_interest (league_id, team_id, recruit_id, interest, last_updated_season, last_updated_week)
      select $1, vp.team_id, vp.recruit_id, 0, $2, $3
      from visit_pairs vp
      on conflict (league_id, team_id, recruit_id) do nothing
    $fmt$, v_visits_table_name)
    using p_league_id, p_season, p_week;
  end if;

  -- 4) Apply contact deltas for this week.
  --    Base deltas by contact_type:
  --      text=1, dm=1, social=2, call=3, coach_visit=5, home_visit=4
  --
  --    Diminishing returns per team/week:
  --      factor = max(0.50, 1 - 0.05*(contacts_used_this_week-1))
  --
  --    Competition scaling per recruit/week:
  --      scale = 1 / sqrt(num_teams_with_any_activity_for_recruit_this_week)
  --
  with contact_rows as (
    select
      rc.team_id,
      rc.recruit_id,
      rc.contact_type,
      case rc.contact_type
        when 'text' then 1
        when 'dm' then 1
        when 'social' then 2
        when 'call' then 3
        when 'coach_visit' then 5
        when 'home_visit' then 4
        else 1
      end::numeric as base_delta
    from public.recruiting_contacts rc
    where rc.league_id = p_league_id
      and rc.season = p_season
      and rc.week = p_week
  ),
  team_week_counts as (
    select team_id, count(*)::numeric as used_ct
    from contact_rows
    group by team_id
  ),
  recruit_competition as (
    select recruit_id, greatest(1, count(distinct team_id))::numeric as teams_ct
    from (
      select distinct team_id, recruit_id from contact_rows
    ) t
    group by recruit_id
  ),
  contact_deltas as (
    select
      cr.team_id,
      cr.recruit_id,
      -- diminishing returns
      greatest(0.50::numeric, 1 - 0.05::numeric * greatest(0, tw.used_ct - 1)) as diminish_factor,
      -- competition scaling
      (1 / sqrt(rcmp.teams_ct)) as comp_factor,
      cr.base_delta
    from contact_rows cr
    join team_week_counts tw on tw.team_id = cr.team_id
    join recruit_competition rcmp on rcmp.recruit_id = cr.recruit_id
  ),
  summed as (
    select
      team_id,
      recruit_id,
      sum(base_delta * diminish_factor * comp_factor)::numeric as delta
    from contact_deltas
    group by team_id, recruit_id
  )
  update public.recruiting_interest ri
  set
    interest = greatest(0, least(100, ri.interest + round(s.delta)::int)),
    last_updated_season = p_season,
    last_updated_week = p_week
  from summed s
  where ri.league_id = p_league_id
    and ri.team_id = s.team_id
    and ri.recruit_id = s.recruit_id;

  get diagnostics v_contacts_applied = row_count;

  -- 5) Apply visit bonuses (optional)
  --    Visit bonus rules:
  --      official -> +8
  --      any other visit -> +4
  --
  --    We support column names: visit_type OR type OR kind (first found by COALESCE).
  if v_visits_table_name is not null then
    execute format($fmt$
      with visit_rows as (
        select
          v.team_id,
          v.recruit_id,
          coalesce(
            nullif(v.visit_type, ''),
            nullif(v.type, ''),
            nullif(v.kind, ''),
            'official'
          ) as vtype
        from %s v
        where v.league_id = $1
          and v.season = $2
          and v.week = $3
      ),
      summed as (
        select
          team_id,
          recruit_id,
          sum(
            case
              when lower(vtype) = 'official' then 8
              else 4
            end
          )::int as delta
        from visit_rows
        group by team_id, recruit_id
      )
      update public.recruiting_interest ri
      set
        interest = greatest(0, least(100, ri.interest + s.delta)),
        last_updated_season = $2,
        last_updated_week = $3
      from summed s
      where ri.league_id = $1
        and ri.team_id = s.team_id
        and ri.recruit_id = s.recruit_id
    $fmt$, v_visits_table_name)
    using p_league_id, p_season, p_week;

    get diagnostics v_visits_applied = row_count;
  end if;

  -- 6) Apply decay to rows that did NOT get updated this week (simple inactivity decay)
  --    -2 if interest >= 50
  --    -1 otherwise (but not below 0)
  update public.recruiting_interest ri
  set
    interest = greatest(
      0,
      ri.interest - case when ri.interest >= 50 then 2 else 1 end
    )
  where ri.league_id = p_league_id
    and (ri.last_updated_season < p_season
         or (ri.last_updated_season = p_season and ri.last_updated_week < p_week))
    and ri.interest > 0;

  get diagnostics v_decay_applied = row_count;

  -- 7) Snapshot Top 8 per recruit for this week
  --    Store ordered jsonb array of team_ids
  with ranked as (
    select
      ri.recruit_id,
      ri.team_id,
      ri.interest,
      row_number() over (partition by ri.recruit_id order by ri.interest desc, ri.team_id asc) as rn
    from public.recruiting_interest ri
    where ri.league_id = p_league_id
  ),
  top8 as (
    select
      recruit_id,
      jsonb_agg(team_id order by interest desc, team_id asc) as top8_json
    from ranked
    where rn <= 8
    group by recruit_id
  )
  insert into public.recruiting_top8_snapshots (league_id, season, week, recruit_id, top8)
  select p_league_id, p_season, p_week, t.recruit_id, coalesce(t.top8_json, '[]'::jsonb)
  from top8 t
  on conflict (league_id, season, week, recruit_id)
  do update set top8 = excluded.top8;

  get diagnostics v_snapshots_upserted = row_count;

  return jsonb_build_object(
    'ok', true,
    'league_id', p_league_id,
    'season', p_season,
    'week', p_week,
    'status', 'processed',
    'pairs_seeded', v_pairs_seeded,
    'contacts_applied_rows', v_contacts_applied,
    'visits_applied_rows', v_visits_applied,
    'decay_applied_rows', v_decay_applied,
    'top8_snapshots_upserted', v_snapshots_upserted
  );
end;
$$;

comment on function public.process_recruiting_week_v1(uuid,int,int) is
'Processes a league recruiting week: applies contacts/visits, competition scaling, decay, and stores Top 8 snapshots with week-lock.';

commit;
