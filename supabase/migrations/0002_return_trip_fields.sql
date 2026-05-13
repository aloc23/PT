alter table public.trips
  add column if not exists has_return_trip boolean not null default false,
  add column if not exists return_pickup_date date,
  add column if not exists return_pickup_time text,
  add column if not exists return_dropoff_date date,
  add column if not exists return_dropoff_time text;
