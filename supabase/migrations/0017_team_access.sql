-- Teams: several people sharing one business.
--
-- Until now every row belonged to the one login that created it (owner_id = auth.uid()). A business can now have a TEAM:
--   owner       the login that created the business (businesses.owner_id). Can do everything, including delete it.
--   admin       everything except deleting the business, plus adding and removing people.
--   bookkeeper  everything except managing people: ledger, receipts, contractors, clients, budgets, banking AND payroll.
--   viewer      can read the books and reports, but never payroll or pay stubs, and can change nothing.
-- Access is decided by the ROW'S BUSINESS (business_id), not by who created it, so a bookkeeper's entries are visible to the
-- whole team and to the owner. owner_id stays as "created by". Someone with no role on a business can see none of it.
--
-- People join through an invite: an admin makes an invite (a secret token in a link), the invitee signs in and accepts it.
-- Sign-up does not verify email addresses, so the secret link, not the address, is what grants access.
--
-- Categories become shareable too: a category may belong to one business (business_id), so everyone on that team uses the same list.
-- Categories with no business stay personal, exactly as before.

-- 1. The team and its invites (tables first: the functions below read them).
create table if not exists business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'bookkeeper', 'viewer')),
  -- Copied at join time (and refreshed at sign-in) so teammates can see who is who without reading auth.users.
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists business_members_user_idx on business_members (user_id);
alter table business_members enable row level security;

create table if not exists business_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'bookkeeper', 'viewer')),
  token text not null unique,
  invited_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  last_sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);
create index if not exists business_invites_business_idx on business_invites (business_id);
alter table business_invites enable row level security;

-- 2. Who can do what. Set-returning, so a policy evaluates it once per query instead of once per row.
create or replace function readable_business_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from businesses where owner_id = auth.uid()
  union
  select business_id from business_members where user_id = auth.uid()
$$;
create or replace function writable_business_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from businesses where owner_id = auth.uid()
  union
  select business_id from business_members where user_id = auth.uid() and role in ('admin', 'bookkeeper')
$$;
create or replace function managed_business_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from businesses where owner_id = auth.uid()
  union
  select business_id from business_members where user_id = auth.uid() and role = 'admin'
$$;
create or replace function business_role(p_business uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from businesses where id = p_business and owner_id = auth.uid()) then 'owner'
    else (select role from business_members where business_id = p_business and user_id = auth.uid())
  end
$$;

revoke execute on function readable_business_ids(), writable_business_ids(), managed_business_ids(), business_role(uuid) from public, anon;
grant execute on function readable_business_ids(), writable_business_ids(), managed_business_ids(), business_role(uuid) to authenticated;

-- Team members can see each other; admins manage them; anyone can leave. Rows are only ever ADDED by accept_business_invite().
create policy "team read members" on business_members for select using (business_id in (select readable_business_ids()));
create policy "admin update members" on business_members for update
  using (business_id in (select managed_business_ids())) with check (business_id in (select managed_business_ids()));
create policy "admin or self delete members" on business_members for delete
  using (business_id in (select managed_business_ids()) or user_id = auth.uid());
create policy "admin read invites" on business_invites for select using (business_id in (select managed_business_ids()));
create policy "admin update invites" on business_invites for update
  using (business_id in (select managed_business_ids())) with check (business_id in (select managed_business_ids()));
create policy "admin delete invites" on business_invites for delete using (business_id in (select managed_business_ids()));

-- An admin may change someone's ROLE, never who or where the membership is (that would add people without an invite).
create or replace function business_members_only_role() returns trigger language plpgsql as $$
begin
  if new.business_id is distinct from old.business_id or new.user_id is distinct from old.user_id then
    raise exception 'Only a member''s role can be changed.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists business_members_only_role on business_members;
create trigger business_members_only_role before update on business_members for each row execute function business_members_only_role();

-- Nobody but the owner can hand a business to someone else.
create or replace function businesses_keep_owner() returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'The owner of a business cannot be changed.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists businesses_keep_owner on businesses;
create trigger businesses_keep_owner before update on businesses for each row execute function businesses_keep_owner();

-- 3. Invitations.
create or replace function create_business_invite(p_business uuid, p_email text, p_role text)
returns table (invite_id uuid, invite_token text, invite_expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  if p_business not in (select managed_business_ids()) then
    raise exception 'Only an admin of this business can invite people.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'bookkeeper', 'viewer') then raise exception 'Choose a role.' using errcode = '22023'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address.' using errcode = '22023'; end if;
  if exists (select 1 from business_members m where m.business_id = p_business and lower(coalesce(m.email, '')) = v_email) then
    raise exception 'That person is already on the team.' using errcode = '23505';
  end if;
  -- A new invite replaces any earlier one still waiting for the same address.
  update business_invites set revoked_at = now()
    where business_id = p_business and lower(email) = v_email and accepted_at is null and revoked_at is null;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  return query
    insert into business_invites (business_id, email, role, token) values (p_business, v_email, p_role, v_token)
    returning id, token, expires_at;
end $$;

-- What the invite link says, for someone who may not have an account yet. Reveals only the business name, role and who invited.
create or replace function invite_preview(p_token text)
returns table (business_name text, role text, inviter text, status text)
language plpgsql stable security definer set search_path = public as $$
declare i business_invites%rowtype;
begin
  select * into i from business_invites where token = p_token;
  if not found then
    return query select null::text, null::text, null::text, 'unknown'::text;
    return;
  end if;
  return query
    select b.name, i.role,
           (select coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), u.email) from auth.users u where u.id = i.invited_by),
           case when i.accepted_at is not null then 'used'
                when i.revoked_at is not null then 'revoked'
                when i.expires_at < now() then 'expired'
                else 'valid' end
    from businesses b where b.id = i.business_id;
end $$;

create or replace function accept_business_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i business_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  select * into i from business_invites where token = p_token for update;
  if not found or i.revoked_at is not null or i.accepted_at is not null or i.expires_at < now() then
    raise exception 'This invite link is no longer valid. Ask for a new one.' using errcode = 'P0001';
  end if;
  -- The owner already has full access; accepting their own invite changes nothing.
  if not exists (select 1 from businesses where id = i.business_id and owner_id = auth.uid()) then
    insert into business_members (business_id, user_id, role, email, display_name)
    values (i.business_id, auth.uid(), i.role, auth.jwt() ->> 'email', nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''))
    on conflict (business_id, user_id) do update set role = excluded.role;
  end if;
  update business_invites set accepted_at = now(), accepted_by = auth.uid() where id = i.id;
  return i.business_id;
end $$;

-- Called by the server function that emails an invite. Admin-only, pending-only, and no more than once every 20 seconds.
create or replace function prepare_invite_email(p_invite uuid)
returns table (business_name text, invite_email text, invite_role text, invite_token text, inviter text)
language plpgsql security definer set search_path = public as $$
declare i business_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  select * into i from business_invites where id = p_invite for update;
  if not found or i.business_id not in (select managed_business_ids()) then
    raise exception 'Only an admin of this business can send invites.' using errcode = '42501';
  end if;
  if i.accepted_at is not null or i.revoked_at is not null or i.expires_at < now() then
    raise exception 'That invite is no longer waiting.' using errcode = 'P0001';
  end if;
  if i.last_sent_at is not null and i.last_sent_at > now() - interval '20 seconds' then
    raise exception 'That invite was just sent. Wait a few seconds.' using errcode = 'P0001';
  end if;
  update business_invites set last_sent_at = now() where id = i.id;
  return query
    select b.name, i.email, i.role, i.token,
           (select coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), u.email) from auth.users u where u.id = auth.uid())
    from businesses b where b.id = i.business_id;
end $$;

-- Who is on a business's team, owner included, with names and addresses read live from the accounts. Only teammates can ask.
create or replace function business_team(p_business uuid)
returns table (user_id uuid, role text, email text, display_name text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.owner_id, 'owner'::text, u.email::text,
         coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)), b.created_at
    from businesses b join auth.users u on u.id = b.owner_id
   where b.id = p_business and p_business in (select readable_business_ids())
  union all
  select m.user_id, m.role, u.email::text,
         coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)), m.created_at
    from business_members m join auth.users u on u.id = m.user_id
   where m.business_id = p_business and p_business in (select readable_business_ids())
$$;

revoke execute on function create_business_invite(uuid, text, text), accept_business_invite(text), prepare_invite_email(uuid), business_team(uuid) from public, anon;
grant execute on function create_business_invite(uuid, text, text), accept_business_invite(text), prepare_invite_email(uuid), business_team(uuid) to authenticated;
revoke execute on function invite_preview(text) from public;
grant execute on function invite_preview(text) to anon, authenticated;

-- 4. Categories can belong to a business.
alter table categories add column if not exists business_id uuid references businesses(id) on delete cascade;
alter table categories drop constraint if exists categories_owner_id_name_type_key;
drop index if exists categories_owner_id_name_type_key;
create unique index if not exists categories_personal_key on categories (owner_id, name, type) where business_id is null;
create unique index if not exists categories_business_key on categories (business_id, name, type) where business_id is not null;
create index if not exists categories_business_idx on categories (business_id) where business_id is not null;

drop policy if exists "owner read categories" on categories;
drop policy if exists "owner write categories" on categories;
drop policy if exists "owner update categories" on categories;
drop policy if exists "owner delete categories" on categories;
create policy "team read categories" on categories for select
  using ((business_id is null and owner_id = auth.uid()) or business_id in (select readable_business_ids()));
create policy "team insert categories" on categories for insert
  with check (owner_id = auth.uid() and (business_id is null or business_id in (select writable_business_ids())));
create policy "team update categories" on categories for update
  using ((business_id is null and owner_id = auth.uid()) or business_id in (select writable_business_ids()))
  with check ((business_id is null and owner_id = auth.uid()) or business_id in (select writable_business_ids()));
create policy "team delete categories" on categories for delete
  using ((business_id is null and owner_id = auth.uid()) or business_id in (select writable_business_ids()));

-- 5. The books themselves: access follows the business.
do $$
declare t text;
begin
  -- Everyone on the team can read; owner, admins and bookkeepers can write.
  foreach t in array array['transactions', 'contractors', 'customers', 'budgets', 'bank_accounts', 'bank_imports', 'bank_matches', 'bank_reconciliations', 'bank_transactions'] loop
    execute format('drop policy if exists "owner read %1$s" on %1$s', t);
    execute format('drop policy if exists "owner write %1$s" on %1$s', t);
    execute format('drop policy if exists "owner update %1$s" on %1$s', t);
    execute format('drop policy if exists "owner delete %1$s" on %1$s', t);
    execute format('create policy "team read %1$s" on %1$s for select using (business_id in (select readable_business_ids()))', t);
    execute format('create policy "team insert %1$s" on %1$s for insert with check (business_id in (select writable_business_ids()) and owner_id = auth.uid())', t);
    execute format('create policy "team update %1$s" on %1$s for update using (business_id in (select writable_business_ids())) with check (business_id in (select writable_business_ids()))', t);
    execute format('create policy "team delete %1$s" on %1$s for delete using (business_id in (select writable_business_ids()))', t);
  end loop;
  -- Payroll is sensitive (pay rates, tax withholdings): owner, admins and bookkeepers only, for reading as well as writing.
  foreach t in array array['employees', 'payroll_settings', 'payroll_runs', 'pay_stubs'] loop
    execute format('drop policy if exists "owner read %1$s" on %1$s', t);
    execute format('drop policy if exists "owner write %1$s" on %1$s', t);
    execute format('drop policy if exists "owner update %1$s" on %1$s', t);
    execute format('drop policy if exists "owner delete %1$s" on %1$s', t);
    execute format('create policy "team read %1$s" on %1$s for select using (business_id in (select writable_business_ids()))', t);
    execute format('create policy "team insert %1$s" on %1$s for insert with check (business_id in (select writable_business_ids()) and owner_id = auth.uid())', t);
    execute format('create policy "team update %1$s" on %1$s for update using (business_id in (select writable_business_ids())) with check (business_id in (select writable_business_ids()))', t);
    execute format('create policy "team delete %1$s" on %1$s for delete using (business_id in (select writable_business_ids()))', t);
  end loop;
end $$;

-- The business record: the team can see it; owner and admins can edit it; only the owner can delete it.
drop policy if exists "owner read businesses" on businesses;
drop policy if exists "owner update businesses" on businesses;
create policy "team read businesses" on businesses for select using (id in (select readable_business_ids()));
create policy "admin update businesses" on businesses for update
  using (id in (select managed_business_ids())) with check (id in (select managed_business_ids()));
-- ("owner write businesses" for INSERT and "owner delete businesses" for DELETE stay as they were.)

-- 6. Files follow the business too.
drop policy if exists "owner read receipts" on storage.objects;
drop policy if exists "owner update receipts" on storage.objects;
drop policy if exists "owner delete receipts" on storage.objects;
create policy "team read receipts" on storage.objects for select using (
  bucket_id = 'receipts' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.transactions t where t.receipt_path = storage.objects.name and t.business_id in (select public.readable_business_ids()))
  )
);
create policy "team update receipts" on storage.objects for update using (
  bucket_id = 'receipts' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.transactions t where t.receipt_path = storage.objects.name and t.business_id in (select public.writable_business_ids()))
  )
);
create policy "team delete receipts" on storage.objects for delete using (
  bucket_id = 'receipts' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.transactions t where t.receipt_path = storage.objects.name and t.business_id in (select public.writable_business_ids()))
  )
);
drop policy if exists "owner read logos" on storage.objects;
drop policy if exists "owner update logos" on storage.objects;
drop policy if exists "owner delete logos" on storage.objects;
create policy "team read logos" on storage.objects for select using (
  bucket_id = 'logos' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.businesses b where b.logo_path = storage.objects.name and b.id in (select public.readable_business_ids()))
  )
);
create policy "admin update logos" on storage.objects for update using (
  bucket_id = 'logos' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.businesses b where b.logo_path = storage.objects.name and b.id in (select public.managed_business_ids()))
  )
);
create policy "admin delete logos" on storage.objects for delete using (
  bucket_id = 'logos' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.businesses b where b.logo_path = storage.objects.name and b.id in (select public.managed_business_ids()))
  )
);
