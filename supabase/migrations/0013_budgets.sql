-- Budgets: a planned amount per business, per category, per month. Expense
-- budgets are spending limits; income budgets are targets. "Actual" is never
-- stored -- the Budget tab computes it from `transactions` by category name
-- and month, so a budget always compares against the live ledger.
--
-- One row per (business, type, category, month) so seasonal budgets work.
-- `month` is always the first day of the month. The app writes a single month
-- when you edit one, and can copy a month forward across the year.
--
-- Same multi-tenant pattern as 0009/0011: owner_id defaults to auth.uid() and
-- every policy checks it. Additive only; nothing existing is touched.

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  -- matches transactions.category by name (free text, compared case-insensitively in the app)
  category text not null check (length(btrim(category)) > 0),
  month date not null check (extract(day from month) = 1),
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, type, category, month)
);

create index if not exists budgets_business_month_idx on budgets (business_id, month);

alter table budgets enable row level security;

create policy "owner read budgets" on budgets for select using (auth.uid() = owner_id);
create policy "owner write budgets" on budgets for insert with check (auth.uid() = owner_id);
create policy "owner update budgets" on budgets for update using (auth.uid() = owner_id);
create policy "owner delete budgets" on budgets for delete using (auth.uid() = owner_id);
