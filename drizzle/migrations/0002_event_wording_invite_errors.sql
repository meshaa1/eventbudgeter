create or replace function public.invite_member(_tournament_id uuid, _email text, _role public.member_role)
returns text language plpgsql security definer set search_path = public as $$
declare
  _clean text := lower(trim(_email));
  _uid uuid;
begin
  if not public.is_tournament_owner(_tournament_id) then
    raise exception 'Only the owner can invite people';
  end if;
  if _role not in ('editor', 'viewer') then
    raise exception 'Role must be editor or viewer';
  end if;
  if _clean = '' or position('@' in _clean) = 0 then
    raise exception 'Enter a valid email';
  end if;

  select id into _uid from auth.users where lower(email) = _clean limit 1;

  if _uid is not null then
    if _uid = auth.uid() then
      raise exception 'You already own this event';
    end if;
    insert into public.tournament_members (tournament_id, user_id, role)
    values (_tournament_id, _uid, _role)
    on conflict (tournament_id, user_id) do update set role = excluded.role
    where public.tournament_members.role <> 'owner';
    return 'added';
  end if;

  insert into public.tournament_invites (tournament_id, email, role)
  values (_tournament_id, _clean, _role)
  on conflict (tournament_id, email) do update set role = excluded.role;
  return 'pending';
end;
$$;

revoke execute on function public.invite_member(uuid, text, public.member_role) from public, anon;
grant execute on function public.invite_member(uuid, text, public.member_role) to authenticated;
