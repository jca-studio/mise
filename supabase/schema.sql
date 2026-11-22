-- Mise database. Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

-- Each person's meals, recipe bank, kitchens and notes, as one document.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
drop policy if exists "own state" on public.user_state;
create policy "own state" on public.user_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Dinner parties people choose to share with the community.
create table if not exists public.shared_meals (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  owner_name text not null default 'A Mise cook',
  title text not null,
  summary text not null default '',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shared_meals enable row level security;
drop policy if exists "anyone reads shared" on public.shared_meals;
create policy "anyone reads shared" on public.shared_meals for select to anon, authenticated using (true);
drop policy if exists "owner writes shared" on public.shared_meals;
create policy "owner writes shared" on public.shared_meals for all to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

-- Ratings and reviews of shared dinner parties: one per person per party.
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  shared_id uuid not null references public.shared_meals on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  user_name text not null default 'A Mise cook',
  stars int not null check (stars between 1 and 5),
  review text not null default '',
  created_at timestamptz not null default now(),
  unique (shared_id, user_id)
);
alter table public.ratings enable row level security;
drop policy if exists "anyone reads ratings" on public.ratings;
create policy "anyone reads ratings" on public.ratings for select to anon, authenticated using (true);
drop policy if exists "own ratings" on public.ratings;
create policy "own ratings" on public.ratings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
