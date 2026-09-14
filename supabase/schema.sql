-- ============================================================================
-- L2 MIAGE — Plateforme de vote — schéma Supabase
-- ============================================================================
-- À exécuter une fois dans Supabase Dashboard > SQL Editor > New query.
-- Ce script est idempotent (peut être relancé sans dupliquer les objets).
-- ============================================================================

-- Nécessaire pour digest() (hash SHA-256) et gen_random_bytes() (RNG sécurisé).
-- Supabase installe pgcrypto dans le schéma `extensions` (pas `public`) par
-- défaut — chaque fonction ci-dessous met donc `extensions` dans son
-- search_path pour pouvoir résoudre digest()/gen_random_bytes().
create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

create table if not exists public.election_config (
  id smallint primary key default 1,
  title text not null default 'Élection des représentants de classe',
  description text not null default 'Bienvenue sur la plateforme officielle de vote de la L2 MIAGE.',
  status text not null default 'closed' check (status in ('open', 'closed')),
  start_date timestamptz,
  end_date timestamptz,
  max_choices integer not null default 1,
  logo_url text,
  student_message text not null default 'Entrez votre code de vote pour accéder au bulletin.',
  total_voters integer not null default 88,
  updated_at timestamptz not null default now(),
  constraint election_config_singleton check (id = 1)
);

-- Seed the single config row if it doesn't exist yet.
insert into public.election_config (id) values (1)
on conflict (id) do nothing;

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  photo_url text,
  slogan text not null default '',
  description text not null default '',
  program text not null default '',
  active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- The code is stored in plaintext (admin-only, for CSV export) AND hashed
-- (code_hash) — only the hash is ever looked up during voting, computed
-- server-side inside the RPC functions below.
create table if not exists public.voter_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  code_hash text not null unique,
  status text not null default 'UNUSED' check (status in ('UNUSED', 'USED')),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Anonymous ballots — deliberately contains nothing but the candidate
-- choice. Never joined with voter_codes in application code.
create table if not exists public.ballots (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id),
  created_at timestamptz not null default now()
);

create index if not exists ballots_candidate_id_idx on public.ballots (candidate_id);

-- ----------------------------------------------------------------------------
-- 2. ADMIN ROLES
-- ----------------------------------------------------------------------------
-- Two levels: 'admin' (full access) and 'sous_admin' (read-only tracking
-- page — candidate names + percentages only, nothing else). There is no
-- sign-up UI for either: you create the Supabase Auth user manually
-- (Authentication > Users > Add user), same as the main admin account. A
-- user with NO row here is a full admin by default — this preserves the
-- original single-admin account with zero migration needed. Only add a row
-- here to *downgrade* a specific user to 'sous_admin'.

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'sous_admin')),
  created_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

-- A signed-in user may only ever read their OWN role row (needed so the
-- frontend can tell which dashboard to show after login).
drop policy if exists "admin_profiles_select_own" on public.admin_profiles;
create policy "admin_profiles_select_own" on public.admin_profiles
  for select to authenticated using (user_id = auth.uid());

-- True for any signed-in user who is NOT explicitly downgraded to
-- 'sous_admin'. Used throughout the RLS policies and functions below as the
-- single source of truth for "is this a full admin".
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select auth.uid() is not null
    and not exists (
      select 1 from public.admin_profiles
      where user_id = auth.uid() and role = 'sous_admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Students always connect with the anon key and never sign in.

alter table public.election_config enable row level security;
alter table public.candidates enable row level security;
alter table public.voter_codes enable row level security;
alter table public.ballots enable row level security;

-- election_config: readable by everyone (home page, vote page), writable by full admin only.
drop policy if exists "election_config_select_all" on public.election_config;
create policy "election_config_select_all" on public.election_config
  for select to anon, authenticated using (true);

drop policy if exists "election_config_write_admin" on public.election_config;
create policy "election_config_write_admin" on public.election_config
  for all to authenticated using (is_admin()) with check (is_admin());

-- candidates: readable by everyone (ballot), writable by full admin only.
drop policy if exists "candidates_select_all" on public.candidates;
create policy "candidates_select_all" on public.candidates
  for select to anon, authenticated using (true);

drop policy if exists "candidates_write_admin" on public.candidates;
create policy "candidates_write_admin" on public.candidates
  for all to authenticated using (is_admin()) with check (is_admin());

-- voter_codes: NO direct access for the anon role at all, and not even for a
-- sous_admin — only a full admin can list codes (Gestion des codes).
-- Students only ever interact with this table through the SECURITY DEFINER
-- functions below, which bypass RLS in a tightly controlled way. Codes are
-- only ever created/replaced via the admin_generate_voter_codes() function.
drop policy if exists "voter_codes_select_admin" on public.voter_codes;
create policy "voter_codes_select_admin" on public.voter_codes
  for select to authenticated using (is_admin());

-- ballots: readable by full admin only (Résultats page) — a sous_admin gets
-- percentages only, through get_results_percentages() below, never raw
-- ballot rows. No insert/update/delete policy at all for anon/authenticated
-- — rows are only ever written by the submit_vote() SECURITY DEFINER function.
drop policy if exists "ballots_select_admin" on public.ballots;
create policy "ballots_select_admin" on public.ballots
  for select to authenticated using (is_admin());

-- ----------------------------------------------------------------------------
-- 4. FUNCTIONS (SECURITY DEFINER — the only way to touch voter_codes/ballots
--    as a student, and the only way to (re)generate codes as an admin)
-- ----------------------------------------------------------------------------

-- Secure random character generator using pgcrypto (not the weaker random()).
create or replace function public._random_code_chars(p_length integer)
returns text
language plpgsql
set search_path = public, extensions
as $$
declare
  v_alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- no 0/O, 1/I
  v_out text := '';
  v_i integer;
begin
  for v_i in 1..p_length loop
    v_out := v_out || substr(v_alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(v_alphabet)), 1);
  end loop;
  return v_out;
end;
$$;

-- Generates and stores `p_count` unique vote codes in the format L2M-XXXX-XX,
-- replacing any existing codes. Admin-only (checks auth.uid()). Returns the
-- plaintext codes — the only time they are ever readable in bulk — for the
-- admin to export as CSV immediately after generation.
create or replace function public.admin_generate_voter_codes(p_count integer default 88)
returns table(code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_generated text[] := '{}';
  v_attempts integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if p_count < 1 or p_count > 1000 then
    raise exception 'Invalid count';
  end if;

  -- TRUNCATE, not DELETE: Supabase enables pg-safeupdate, which rejects any
  -- DELETE/UPDATE with no real WHERE clause — and the planner optimizes a
  -- literal `WHERE true` away entirely, so even that still gets rejected.
  -- TRUNCATE is a different command that pg-safeupdate doesn't guard at all.
  truncate public.voter_codes;

  while coalesce(array_length(v_generated, 1), 0) < p_count loop
    v_attempts := v_attempts + 1;
    if v_attempts > p_count * 50 then
      raise exception 'Unable to generate unique codes';
    end if;

    v_code := 'L2M-' || public._random_code_chars(4) || '-' || public._random_code_chars(2);

    if not (v_code = any(v_generated)) then
      v_generated := array_append(v_generated, v_code);
    end if;
  end loop;

  insert into public.voter_codes (code, code_hash, status)
  select c, encode(digest(c, 'sha256'), 'hex'), 'UNUSED'
  from unnest(v_generated) as c;

  return query select unnest(v_generated);
end;
$$;

revoke all on function public.admin_generate_voter_codes(integer) from public;
grant execute on function public.admin_generate_voter_codes(integer) to authenticated;

-- Validates a code WITHOUT consuming it (code entry step). Callable by
-- anyone (students are never signed in).
create or replace function public.validate_vote_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_status text;
  v_election_status text;
  v_end_date timestamptz;
begin
  select status, end_date into v_election_status, v_end_date from public.election_config where id = 1;
  if v_election_status is distinct from 'open' or (v_end_date is not null and v_end_date < now()) then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  if p_code !~ '^L2M-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{2}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_hash := encode(digest(upper(trim(p_code)), 'sha256'), 'hex');
  select status into v_status from public.voter_codes where code_hash = v_hash;

  if v_status is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  elsif v_status = 'USED' then
    return jsonb_build_object('ok', false, 'reason', 'used');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.validate_vote_code(text) from public;
grant execute on function public.validate_vote_code(text) to anon, authenticated;

-- Atomically consumes a code and records an anonymous ballot. `for update`
-- row-locks the voter_codes row for the duration of this function's
-- transaction, so two concurrent calls with the same code can never both
-- succeed — the second sees status = 'USED' once the first commits.
create or replace function public.submit_vote(p_code text, p_candidate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_code_id uuid;
  v_status text;
  v_election_status text;
  v_end_date timestamptz;
  v_candidate_active boolean;
begin
  select status, end_date into v_election_status, v_end_date from public.election_config where id = 1;
  if v_election_status is distinct from 'open' or (v_end_date is not null and v_end_date < now()) then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  if p_code !~ '^L2M-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{2}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select active into v_candidate_active from public.candidates where id = p_candidate_id;
  if v_candidate_active is distinct from true then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_hash := encode(digest(upper(trim(p_code)), 'sha256'), 'hex');

  select id, status into v_code_id, v_status
  from public.voter_codes
  where code_hash = v_hash
  for update;

  if v_code_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  elsif v_status = 'USED' then
    return jsonb_build_object('ok', false, 'reason', 'used');
  end if;

  insert into public.ballots (candidate_id) values (p_candidate_id);
  update public.voter_codes set status = 'USED', used_at = now() where id = v_code_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_vote(text, uuid) from public;
grant execute on function public.submit_vote(text, uuid) to anon, authenticated;

-- Read-only tracking view for the "sous_admin" dashboard: rounded
-- percentages per active candidate, computed from ballots — but never the
-- raw vote counts, the total, or the participation. Any signed-in user
-- (admin or sous_admin) can call this; it's the sous_admin's *only* window
-- into results, since ballots_select_admin above requires is_admin().
create or replace function public.get_results_percentages()
returns table(candidate_id uuid, first_name text, last_name text, photo_url text, percentage numeric)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with vote_counts as (
    select b.candidate_id, count(*)::numeric as votes
    from public.ballots b
    group by b.candidate_id
  ),
  total as (
    select coalesce(sum(votes), 0) as total_votes from vote_counts
  )
  select
    c.id as candidate_id,
    c.first_name,
    c.last_name,
    c.photo_url,
    case when (select total_votes from total) > 0
      then round(coalesce(vc.votes, 0) / (select total_votes from total) * 100, 1)
      else 0
    end as percentage
  from public.candidates c
  left join vote_counts vc on vc.candidate_id = c.id
  where c.active = true
  order by c.order_index asc;
$$;

revoke all on function public.get_results_percentages() from public;
grant execute on function public.get_results_percentages() to authenticated;

-- Opens/closes the vote. Callable by ANY signed-in user (admin or
-- sous_admin) — it only ever touches the `status` column, nothing else, so
-- a sous_admin still can't edit the title, dates, logo, etc. (those stay
-- behind election_config_write_admin above, which requires is_admin()).
create or replace function public.set_election_status(p_status text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('open', 'closed') then
    raise exception 'Invalid status';
  end if;

  update public.election_config set status = p_status, updated_at = now() where id = 1;
end;
$$;

revoke all on function public.set_election_status(text) from public;
grant execute on function public.set_election_status(text) to authenticated;

-- Public winner announcement — callable by anyone (students included), but
-- only ever reveals anything once voting is genuinely over (status closed,
-- or the configured end_date has passed). Returns the candidate(s) tied for
-- the most votes — NEVER the vote counts themselves, keeping the same
-- "no raw numbers for students" rule as the rest of the app.
create or replace function public.get_election_winners()
returns table(candidate_id uuid, first_name text, last_name text, photo_url text, slogan text)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_status text;
  v_end_date timestamptz;
  v_max_votes bigint;
begin
  select status, end_date into v_status, v_end_date from public.election_config where id = 1;

  if v_status = 'open' and (v_end_date is null or v_end_date >= now()) then
    return;
  end if;

  select count(*) into v_max_votes
  from public.ballots
  group by candidate_id
  order by count(*) desc
  limit 1;

  if v_max_votes is null or v_max_votes = 0 then
    return;
  end if;

  return query
    select c.id, c.first_name, c.last_name, c.photo_url, c.slogan
    from public.candidates c
    where c.active = true
      and (select count(*) from public.ballots b where b.candidate_id = c.id) = v_max_votes
    order by c.order_index asc;
end;
$$;

revoke all on function public.get_election_winners() from public;
grant execute on function public.get_election_winners() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. REALTIME (live status badge / dashboard without manual refresh)
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'election_config'
  ) then
    alter publication supabase_realtime add table public.election_config;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'candidates'
  ) then
    alter publication supabase_realtime add table public.candidates;
  end if;

  -- Safe to broadcast: Realtime enforces the table's RLS per subscriber, so
  -- only a full admin's session (which passes voter_codes_select_admin,
  -- i.e. is_admin()) ever receives these change events — a sous_admin or an
  -- anonymous student gets nothing, exactly like a direct query would.
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'voter_codes'
  ) then
    alter publication supabase_realtime add table public.voter_codes;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 7. STORAGE BUCKETS (photos des candidats + logo)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('candidates', 'candidates', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "candidates_bucket_public_read" on storage.objects;
create policy "candidates_bucket_public_read" on storage.objects
  for select using (bucket_id = 'candidates');

drop policy if exists "candidates_bucket_admin_write" on storage.objects;
create policy "candidates_bucket_admin_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'candidates');

drop policy if exists "candidates_bucket_admin_update" on storage.objects;
create policy "candidates_bucket_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'candidates');

drop policy if exists "candidates_bucket_admin_delete" on storage.objects;
create policy "candidates_bucket_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'candidates');

drop policy if exists "branding_bucket_public_read" on storage.objects;
create policy "branding_bucket_public_read" on storage.objects
  for select using (bucket_id = 'branding');

drop policy if exists "branding_bucket_admin_write" on storage.objects;
create policy "branding_bucket_admin_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'branding');

drop policy if exists "branding_bucket_admin_update" on storage.objects;
create policy "branding_bucket_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'branding');

drop policy if exists "branding_bucket_admin_delete" on storage.objects;
create policy "branding_bucket_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'branding');

-- ============================================================================
-- Fin du script.
-- ============================================================================
