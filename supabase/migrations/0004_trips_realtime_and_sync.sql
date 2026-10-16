-- Bookings are stored in the per-user public.trips table. Idempotent.

alter table public.trips
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  add column if not exists customer_name text not null default '',
  add column if not exists booking_reference_number text not null default '',
  add column if not exists vehicle_type text not null default '',
  add column if not exists pickup_location text not null default '',
  add column if not exists dropoff_location text not null default '',
  add column if not exists pickup_date date,
  add column if not exists pickup_time text,
  add column if not exists return_date date,
  add column if not exists return_time text,
  add column if not exists has_return_trip boolean not null default false,
  add column if not exists return_pickup_date date,
  add column if not exists return_pickup_time text,
  add column if not exists return_dropoff_date date,
  add column if not exists return_dropoff_time text,
  add column if not exists driver_name text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists status text not null default 'Scheduled',
  add column if not exists created_at timestamptz not null default now();

alter table public.trips alter column user_id set default auth.uid();
alter table public.trips enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips' and policyname='trips_select_own') then
    create policy trips_select_own on public.trips for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips' and policyname='trips_insert_own') then
    create policy trips_insert_own on public.trips for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips' and policyname='trips_update_own') then
    create policy trips_update_own on public.trips for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips' and policyname='trips_delete_own') then
    create policy trips_delete_own on public.trips for delete to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;
end $$;
