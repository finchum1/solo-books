-- Matching statement lines to Ledger entries, and reconciling an account month by month.
--
-- A MATCH is a group: any number of statement lines (bank_transactions.match_id) linked to any
-- number of Ledger entries (transactions.bank_match_id). That one shape covers
--   * 1 line  <-> 1 entry   (a normal expense or deposit)
--   * 1 line  <-> N entries (one deposit that paid several invoices)
--   * N lines <-> 1 entry   (payroll: several net-pay and tax-deposit lines against one wages entry)
-- `difference` records lines minus entries at the moment of matching, so a deliberate mismatch
-- (e.g. withheld payroll taxes) is visible and explained instead of hidden.
--
-- A RECONCILIATION is one finished statement period for one account. Lines inside it are locked.
--
-- Additive except for widening one CHECK constraint. Same multi-tenant pattern as before.

-- 1. Reconciliations first (lines point at them).
create table if not exists bank_reconciliations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bank_account_id uuid not null references bank_accounts(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  -- The period is (period_start, statement_end_date]: lines dated after period_start, up to and including the end.
  period_start date not null,
  statement_end_date date not null,
  start_balance numeric(14,2) not null,
  statement_end_balance numeric(14,2) not null,
  lines_count integer not null default 0,
  finished_at timestamptz not null default now(),
  check (statement_end_date > period_start),
  unique (bank_account_id, statement_end_date)
);
create index if not exists bank_reconciliations_account_idx on bank_reconciliations (bank_account_id, statement_end_date desc);
alter table bank_reconciliations enable row level security;
create policy "owner read bank_reconciliations" on bank_reconciliations for select using (auth.uid() = owner_id);
create policy "owner write bank_reconciliations" on bank_reconciliations for insert with check (auth.uid() = owner_id);
create policy "owner update bank_reconciliations" on bank_reconciliations for update using (auth.uid() = owner_id);
create policy "owner delete bank_reconciliations" on bank_reconciliations for delete using (auth.uid() = owner_id);

-- 2. Match groups.
create table if not exists bank_matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  difference numeric(14,2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);
alter table bank_matches enable row level security;
create policy "owner read bank_matches" on bank_matches for select using (auth.uid() = owner_id);
create policy "owner write bank_matches" on bank_matches for insert with check (auth.uid() = owner_id);
create policy "owner update bank_matches" on bank_matches for update using (auth.uid() = owner_id);
create policy "owner delete bank_matches" on bank_matches for delete using (auth.uid() = owner_id);

-- 3. Link columns. Deleting a match or reconciliation just clears the link.
alter table bank_transactions add column if not exists match_id uuid references bank_matches(id) on delete set null;
alter table bank_transactions add column if not exists transfer_pair_id uuid references bank_transactions(id) on delete set null;
alter table bank_transactions add column if not exists reconciliation_id uuid references bank_reconciliations(id) on delete set null;
alter table transactions add column if not exists bank_match_id uuid references bank_matches(id) on delete set null;

-- Statuses: unreviewed -> matched (to existing entries) | imported (a new Ledger entry was made from it)
--           | transfer (moved between your own accounts; not income or expense) | ignored.
alter table bank_transactions drop constraint if exists bank_transactions_status_check;
alter table bank_transactions add constraint bank_transactions_status_check
  check (status in ('pending_review', 'matched', 'imported', 'transfer', 'ignored'));

create index if not exists bank_transactions_match_idx on bank_transactions (match_id) where match_id is not null;
create index if not exists bank_transactions_recon_idx on bank_transactions (reconciliation_id) where reconciliation_id is not null;
create index if not exists bank_transactions_review_idx on bank_transactions (bank_account_id, posted_date) where status = 'pending_review';
create index if not exists transactions_match_idx on transactions (bank_match_id) where bank_match_id is not null;
create index if not exists transactions_unmatched_idx on transactions (business_id, date) where bank_match_id is null;

-- 4. A finished reconciliation locks its lines. Changing a locked line's status, match, transfer
--    pair, amount or date is refused; clearing reconciliation_id itself (reopening) is allowed.
--    There is deliberately no DELETE guard: deleting a user or an account must still cascade.
create or replace function bank_lines_guard_reconciled()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.reconciliation_id is not null and new.reconciliation_id is not distinct from old.reconciliation_id then
    if new.status is distinct from old.status
       or new.match_id is distinct from old.match_id
       or new.transfer_pair_id is distinct from old.transfer_pair_id
       or new.amount is distinct from old.amount
       or new.posted_date is distinct from old.posted_date then
      raise exception 'This statement line is part of a finished reconciliation. Reopen that reconciliation first.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bank_lines_guard_reconciled on bank_transactions;
create trigger bank_lines_guard_reconciled before update on bank_transactions
  for each row execute function bank_lines_guard_reconciled();

-- 5. Totals for one statement period, computed in the database (a request returns at most 1000 rows,
--    so the screen must never add lines up itself). SECURITY INVOKER: row-level security applies.
create or replace function bank_period_summary(p_account uuid, p_after date, p_through date)
returns table (line_count bigint, line_sum numeric, unreviewed_count bigint, first_date date, last_date date)
language sql
stable
security invoker
set search_path = public
as $$
  select count(t.id),
         coalesce(sum(t.amount), 0),
         count(t.id) filter (where t.status = 'pending_review'),
         min(t.posted_date),
         max(t.posted_date)
  from bank_transactions t
  where t.bank_account_id = p_account
    and t.posted_date > p_after
    and t.posted_date <= p_through;
$$;

revoke execute on function bank_period_summary(uuid, date, date) from public, anon;
grant execute on function bank_period_summary(uuid, date, date) to authenticated;

-- The earliest month that still has unreviewed lines, per account, so the Review screen opens where the work is.
create or replace function bank_first_unreviewed(p_account uuid, p_after date)
returns date
language sql
stable
security invoker
set search_path = public
as $$
  select min(posted_date) from bank_transactions
  where bank_account_id = p_account and status = 'pending_review' and posted_date > p_after;
$$;

revoke execute on function bank_first_unreviewed(uuid, date) from public, anon;
grant execute on function bank_first_unreviewed(uuid, date) to authenticated;

-- 6. "To review" must not include lines dated on or before the opening balance date: they are saved
--    but never counted, so there is nothing to reconcile them against. Same signature, so this replaces
--    the version from 0014.
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
         count(t.id) filter (where t.status = 'pending_review' and (a.opening_balance_date is null or t.posted_date > a.opening_balance_date))
  from bank_accounts a
  left join bank_transactions t on t.bank_account_id = a.id
  group by a.id;
$$;
