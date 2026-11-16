-- Bank accounts you add yourself (checking or savings) and statement lines you
-- upload from the bank's CSV/OFX download. This reuses the tables the retired
-- SimpleFIN feed created in 0008 (all empty), so a live feed can feed the very
-- same tables later: a feed account has a connection_id, a manual one does not.
--
-- What is deliberately NOT stored: full account numbers (only an optional last
-- 4 digits), bank logins, or any bank credential.

-- 1. Accounts do not need a feed connection.
alter table bank_accounts alter column connection_id drop not null;
alter table bank_accounts alter column external_account_id drop not null;

alter table bank_accounts add column if not exists account_type text not null default 'checking'
  check (account_type in ('checking', 'savings'));
-- The balance on `opening_balance_date` (end of that day). Only statement lines dated AFTER it
-- count toward the account's running balance, so importing older history never double counts.
alter table bank_accounts add column if not exists opening_balance numeric(14,2) not null default 0;
alter table bank_accounts add column if not exists opening_balance_date date;
alter table bank_accounts add column if not exists mask text check (mask is null or mask ~ '^[0-9]{1,4}$');

create unique index if not exists bank_accounts_business_name_key on bank_accounts (business_id, lower(name));

-- 2. One row per file imported, so an import can be listed and undone as a unit.
create table if not exists bank_imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bank_account_id uuid not null references bank_accounts(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  filename text,
  source text not null default 'csv' check (source in ('csv', 'ofx')),
  rows_in_file integer not null default 0,
  lines_added integer not null default 0,
  lines_skipped integer not null default 0,
  first_date date,
  last_date date,
  created_at timestamptz not null default now()
);

create index if not exists bank_imports_account_idx on bank_imports (bank_account_id, created_at desc);

alter table bank_imports enable row level security;
create policy "owner read bank_imports" on bank_imports for select using (auth.uid() = owner_id);
create policy "owner write bank_imports" on bank_imports for insert with check (auth.uid() = owner_id);
create policy "owner update bank_imports" on bank_imports for update using (auth.uid() = owner_id);
create policy "owner delete bank_imports" on bank_imports for delete using (auth.uid() = owner_id);

-- 3. Statement lines remember which import brought them in (deleting an import removes its lines).
alter table bank_transactions add column if not exists import_id uuid references bank_imports(id) on delete cascade;
create index if not exists bank_transactions_account_date_idx on bank_transactions (bank_account_id, posted_date desc);
create index if not exists bank_transactions_import_idx on bank_transactions (import_id);

-- 4. Running totals computed by the database. An account can hold more lines than the API
--    returns in one request (1000), so the page must not add them up client-side.
--    SECURITY INVOKER: row-level security still applies, so it only sees the caller's own rows.
create or replace function bank_account_summaries()
returns table (
  bank_account_id uuid,
  line_count bigint,
  counted_count bigint,
  counted_sum numeric,
  first_date date,
  last_date date,
  unreviewed_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select a.id,
         count(t.id),
         count(t.id) filter (where a.opening_balance_date is null or t.posted_date > a.opening_balance_date),
         coalesce(sum(t.amount) filter (where a.opening_balance_date is null or t.posted_date > a.opening_balance_date), 0),
         min(t.posted_date),
         max(t.posted_date),
         count(t.id) filter (where t.status = 'pending_review')
  from bank_accounts a
  left join bank_transactions t on t.bank_account_id = a.id
  group by a.id;
$$;

revoke execute on function bank_account_summaries() from public, anon;
grant execute on function bank_account_summaries() to authenticated;
