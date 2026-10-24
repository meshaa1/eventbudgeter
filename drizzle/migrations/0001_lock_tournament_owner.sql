revoke update on public.tournaments from authenticated, anon;
grant update (name, total_budget) on public.tournaments to authenticated;

create or replace function public.prevent_owner_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Tournament owner cannot be changed';
  end if;
  return new;
end;
$$;

create trigger tournaments_lock_owner
before update on public.tournaments
for each row execute function public.prevent_owner_change();
