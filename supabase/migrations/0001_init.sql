-- Priority Transfers — initial schema
-- Run this in Supabase Dashboard → SQL Editor (or via `supabase db push`).
-- Creates three per-user tables (trips, drivers, vehicles), with row-level
-- security so each authenticated user can only see and modify their own rows.

create extension if not exists "pgcrypto";

-- =========================================================================
-- vehicles
-- =========================================================================
create table if not exists public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists vehicles_user_id_idx on public.vehicles(user_id);
create unique index if not exists vehicles_user_name_unique
  on public.vehicles(user_id, lower(name));

alter table public.vehicles enable row level security;

drop policy if exists "vehicles_select_own" on public.vehicles;
create policy "vehicles_select_own" on public.vehicles
  for select using (auth.uid() = user_id);

drop policy if exists "vehicles_insert_own" on public.vehicles;
create policy "vehicles_insert_own" on public.vehicles
  for insert with check (auth.uid() = user_id);

drop policy if exists "vehicles_update_own" on public.vehicles;
create policy "vehicles_update_own" on public.vehicles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "vehicles_delete_own" on public.vehicles;
create policy "vehicles_delete_own" on public.vehicles
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- drivers
-- =========================================================================
create table if not exists public.drivers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists drivers_user_id_idx on public.drivers(user_id);
create unique index if not exists drivers_user_name_unique
  on public.drivers(user_id, lower(name));

alter table public.drivers enable row level security;

drop policy if exists "drivers_select_own" on public.drivers;
create policy "drivers_select_own" on public.drivers
  for select using (auth.uid() = user_id);

drop policy if exists "drivers_insert_own" on public.drivers;
create policy "drivers_insert_own" on public.drivers
  for insert with check (auth.uid() = user_id);

drop policy if exists "drivers_update_own" on public.drivers;
create policy "drivers_update_own" on public.drivers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "drivers_delete_own" on public.drivers;
create policy "drivers_delete_own" on public.drivers
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- trips
-- =========================================================================
create table if not exists public.trips (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  customer_name              text not null default '',
  booking_reference_number   text not null default '',
  vehicle_type               text not null default '',
  pickup_location            text not null default '',
  dropoff_location           text not null default '',
  pickup_date                date,
  pickup_time                text,
  return_date                date,
  return_time                text,
  driver_name                text not null default '',
  notes                      text not null default '',
  status                     text not null default 'Scheduled',
  created_at                 timestamptz not null default now()
);

create index if not exists trips_user_id_idx        on public.trips(user_id);
create index if not exists trips_user_pickup_idx    on public.trips(user_id, pickup_date);
create index if not exists trips_user_vehicle_idx   on public.trips(user_id, vehicle_type);

alter table public.trips enable row level security;

drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_own" on public.trips
  for select using (auth.uid() = user_id);

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own" on public.trips
  for insert with check (auth.uid() = user_id);

drop policy if exists "trips_update_own" on public.trips;
create policy "trips_update_own" on public.trips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_delete_own" on public.trips
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- Realtime — turn on broadcasting of changes so clients on other devices
-- see updates immediately. Safe to run repeatedly.
-- =========================================================================
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.trips';
  exception when duplicate_object then null; end;
  begin
    execute 'alter publication supabase_realtime add table public.drivers';
  exception when duplicate_object then null; end;
  begin
    execute 'alter publication supabase_realtime add table public.vehicles';
  exception when duplicate_object then null; end;
end $$;
