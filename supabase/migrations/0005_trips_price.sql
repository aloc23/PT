alter table public.trips
  add column if not exists price numeric(10, 2);

notify pgrst, 'reload schema';
