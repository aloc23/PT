-- Cross-device bookings: make sure every booking ("trips") row is owned by
-- the signed-in user and protected by row-level security.
-- Idempotent: safe to re-run. Same policies are also created by 0001_init.sql.

alter table public.trips    alter column user_id set default auth.uid();
alter table public.drivers  alter column user_id set default auth.uid();
alter table public.vehicles alter column user_id set default auth.uid();

do $$
declare t text;
begin
  foreach t in array array['trips', 'drivers', 'vehicles'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)', t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)', t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)', t || '_delete_own', t);
  end loop;
end $$;
