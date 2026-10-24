create type public.member_role as enum ('owner', 'editor', 'viewer');

-- Tables
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null default '',
  total_budget numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.tournament_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table public.tournament_invites (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  email text not null,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (tournament_id, email)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  label text not null default '',
  icon text not null default '',
  color text not null default '#3de06e',
  created_at timestamptz not null default now()
);

create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  label text not null default '',
  icon text not null default '',
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  label text not null default '',
  budgeted numeric not null default 0,
  spent numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.income (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  source_id uuid references public.income_sources(id) on delete set null,
  label text not null default '',
  expected numeric not null default 0,
  received numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Grants
grant select, insert, delete on public.tournaments to authenticated;
grant update (name, total_budget) on public.tournaments to authenticated;
grant select on public.tournament_members to authenticated;
grant select on public.tournament_invites to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.income_sources to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.income to authenticated;
grant all on public.tournaments, public.tournament_members, public.tournament_invites,
  public.categories, public.income_sources, public.expenses, public.income to service_role;

-- RLS
alter table public.tournaments enable row level security;
alter table public.tournament_members enable row level security;
alter table public.tournament_invites enable row level security;
alter table public.categories enable row level security;
alter table public.income_sources enable row level security;
alter table public.expenses enable row level security;
alter table public.income enable row level security;

-- Helper functions (security definer to avoid RLS recursion)
create or replace function public.is_tournament_member(_tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = _tid and t.owner_id = auth.uid())
      or exists (select 1 from public.tournament_members m where m.tournament_id = _tid and m.user_id = auth.uid());
$$;

create or replace function public.can_edit_tournament(_tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = _tid and t.owner_id = auth.uid())
      or exists (select 1 from public.tournament_members m
                 where m.tournament_id = _tid and m.user_id = auth.uid() and m.role in ('owner', 'editor'));
$$;

create or replace function public.is_tournament_owner(_tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = _tid and t.owner_id = auth.uid());
$$;

-- Tournaments policies
create policy "tournaments_select" on public.tournaments for select to authenticated
  using (owner_id = auth.uid() or public.is_tournament_member(id));
create policy "tournaments_insert" on public.tournaments for insert to authenticated
  with check (owner_id = auth.uid());
create policy "tournaments_update" on public.tournaments for update to authenticated
  using (public.can_edit_tournament(id)) with check (public.can_edit_tournament(id));
create policy "tournaments_delete" on public.tournaments for delete to authenticated
  using (owner_id = auth.uid());

-- Members / invites (writes only through security definer functions)
create policy "members_select" on public.tournament_members for select to authenticated
  using (user_id = auth.uid() or public.is_tournament_member(tournament_id));
create policy "invites_select" on public.tournament_invites for select to authenticated
  using (public.is_tournament_owner(tournament_id));

-- Child table policies
create policy "categories_select" on public.categories for select to authenticated using (public.is_tournament_member(tournament_id));
create policy "categories_insert" on public.categories for insert to authenticated with check (public.can_edit_tournament(tournament_id));
create policy "categories_update" on public.categories for update to authenticated using (public.can_edit_tournament(tournament_id)) with check (public.can_edit_tournament(tournament_id));
create policy "categories_delete" on public.categories for delete to authenticated using (public.can_edit_tournament(tournament_id));

create policy "income_sources_select" on public.income_sources for select to authenticated using (public.is_tournament_member(tournament_id));
create policy "income_sources_insert" on public.income_sources for insert to authenticated with check (public.can_edit_tournament(tournament_id));
create policy "income_sources_update" on public.income_sources for update to authenticated using (public.can_edit_tournament(tournament_id)) with check (public.can_edit_tournament(tournament_id));
create policy "income_sources_delete" on public.income_sources for delete to authenticated using (public.can_edit_tournament(tournament_id));

create policy "expenses_select" on public.expenses for select to authenticated using (public.is_tournament_member(tournament_id));
create policy "expenses_insert" on public.expenses for insert to authenticated with check (public.can_edit_tournament(tournament_id));
create policy "expenses_update" on public.expenses for update to authenticated using (public.can_edit_tournament(tournament_id)) with check (public.can_edit_tournament(tournament_id));
create policy "expenses_delete" on public.expenses for delete to authenticated using (public.can_edit_tournament(tournament_id));

create policy "income_select" on public.income for select to authenticated using (public.is_tournament_member(tournament_id));
create policy "income_insert" on public.income for insert to authenticated with check (public.can_edit_tournament(tournament_id));
create policy "income_update" on public.income for update to authenticated using (public.can_edit_tournament(tournament_id)) with check (public.can_edit_tournament(tournament_id));
create policy "income_delete" on public.income for delete to authenticated using (public.can_edit_tournament(tournament_id));

-- Owner becomes a member automatically
create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.tournament_members (tournament_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (tournament_id, user_id) do nothing;
  return new;
end;
$$;

create trigger tournaments_add_owner
after insert on public.tournaments
for each row execute function public.add_owner_as_member();

-- Invite by email (owner only). Existing users are added right away; others get a pending invite.
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
      raise exception 'You already own this tournament';
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

-- Turn pending invites for the signed-in user's email into memberships
create or replace function public.accept_invites()
returns void language plpgsql security definer set search_path = public as $$
declare
  _email text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null or _email is null then
    return;
  end if;
  insert into public.tournament_members (tournament_id, user_id, role)
  select i.tournament_id, auth.uid(), i.role from public.tournament_invites i where i.email = _email
  on conflict (tournament_id, user_id) do nothing;
  delete from public.tournament_invites where email = _email;
end;
$$;

-- List people with access (any member can see)
create or replace function public.list_members(_tournament_id uuid)
returns table (email text, role public.member_role, pending boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_tournament_member(_tournament_id) then
    raise exception 'Not allowed';
  end if;
  return query
    select u.email::text, m.role, false
    from public.tournament_members m join auth.users u on u.id = m.user_id
    where m.tournament_id = _tournament_id
    union all
    select i.email, i.role, true from public.tournament_invites i where i.tournament_id = _tournament_id;
end;
$$;

revoke execute on function public.is_tournament_member(uuid), public.can_edit_tournament(uuid),
  public.is_tournament_owner(uuid), public.add_owner_as_member(),
  public.invite_member(uuid, text, public.member_role), public.accept_invites(),
  public.list_members(uuid) from public, anon;
grant execute on function public.is_tournament_member(uuid), public.can_edit_tournament(uuid),
  public.is_tournament_owner(uuid), public.invite_member(uuid, text, public.member_role),
  public.accept_invites(), public.list_members(uuid) to authenticated;
