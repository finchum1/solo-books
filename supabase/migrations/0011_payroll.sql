-- Payroll for W-2 employees: a per-business employee roster (with federal W-4
-- and Oklahoma OK-W-4 tax setup), per-business state unemployment settings,
-- payroll runs, and one pay stub per employee per run. All additive -- no
-- existing table is touched. Same multi-tenant pattern as 0009: owner_id
-- defaults to auth.uid() and every policy checks it.
--
-- Deliberately NOT stored: Social Security numbers, bank/direct-deposit
-- details. Solo Books calculates and records payroll; it does not move money
-- or file returns.

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  hire_date date,
  pay_type text not null default 'hourly' check (pay_type in ('hourly', 'salary')),
  -- hourly rate for hourly employees, annual salary for salaried ones
  pay_rate numeric(12,2) not null check (pay_rate >= 0),
  pay_frequency text not null default 'biweekly'
    check (pay_frequency in ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  -- Federal Form W-4 (2020 or later)
  federal_filing_status text not null default 'single'
    check (federal_filing_status in ('single', 'married', 'head_of_household')),
  w4_step2_checked boolean not null default false,
  w4_step3_credits numeric(12,2) not null default 0,
  w4_step4a_other_income numeric(12,2) not null default 0,
  w4_step4b_deductions numeric(12,2) not null default 0,
  w4_step4c_extra numeric(12,2) not null default 0,
  -- Oklahoma Form OK-W-4
  oklahoma_filing_status text not null default 'single'
    check (oklahoma_filing_status in ('single', 'married', 'married_higher_single')),
  oklahoma_allowances integer not null default 0 check (oklahoma_allowances >= 0),
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

-- State unemployment (SUTA) is employer-specific, so the user enters their own
-- rate and wage base from their Oklahoma Employment Security Commission notice.
create table if not exists payroll_settings (
  business_id uuid primary key references businesses(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  suta_rate numeric(7,5) not null default 0 check (suta_rate >= 0 and suta_rate < 1),
  suta_wage_base numeric(12,2) not null default 0 check (suta_wage_base >= 0),
  created_at timestamptz not null default now()
);

create table if not exists payroll_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  pay_date date not null,
  period_start date,
  period_end date,
  -- the two ledger expense rows this run created (so deleting the run can remove them)
  wage_transaction_id uuid references transactions(id) on delete set null,
  tax_transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists pay_stubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  run_id uuid not null references payroll_runs(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete restrict,
  -- name and pay date are copied so a stub still reads correctly if the employee is renamed later
  employee_name text not null,
  pay_date date not null,
  regular_hours numeric(8,2) not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  -- gross includes bonus; bonus is tracked separately because it is taxed as supplemental wages
  bonus numeric(12,2) not null default 0,
  gross numeric(12,2) not null,
  federal_withholding numeric(12,2) not null,
  social_security_employee numeric(12,2) not null,
  medicare_employee numeric(12,2) not null,
  additional_medicare numeric(12,2) not null default 0,
  state_withholding numeric(12,2) not null,
  net numeric(12,2) not null,
  social_security_employer numeric(12,2) not null,
  medicare_employer numeric(12,2) not null,
  futa numeric(12,2) not null,
  suta numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists employees_business_idx on employees (business_id);
create index if not exists payroll_runs_business_date_idx on payroll_runs (business_id, pay_date);
create index if not exists pay_stubs_run_idx on pay_stubs (run_id);
create index if not exists pay_stubs_employee_date_idx on pay_stubs (employee_id, pay_date);

alter table employees enable row level security;
alter table payroll_settings enable row level security;
alter table payroll_runs enable row level security;
alter table pay_stubs enable row level security;

create policy "owner read employees" on employees for select using (auth.uid() = owner_id);
create policy "owner write employees" on employees for insert with check (auth.uid() = owner_id);
create policy "owner update employees" on employees for update using (auth.uid() = owner_id);
create policy "owner delete employees" on employees for delete using (auth.uid() = owner_id);

create policy "owner read payroll_settings" on payroll_settings for select using (auth.uid() = owner_id);
create policy "owner write payroll_settings" on payroll_settings for insert with check (auth.uid() = owner_id);
create policy "owner update payroll_settings" on payroll_settings for update using (auth.uid() = owner_id);
create policy "owner delete payroll_settings" on payroll_settings for delete using (auth.uid() = owner_id);

create policy "owner read payroll_runs" on payroll_runs for select using (auth.uid() = owner_id);
create policy "owner write payroll_runs" on payroll_runs for insert with check (auth.uid() = owner_id);
create policy "owner update payroll_runs" on payroll_runs for update using (auth.uid() = owner_id);
create policy "owner delete payroll_runs" on payroll_runs for delete using (auth.uid() = owner_id);

create policy "owner read pay_stubs" on pay_stubs for select using (auth.uid() = owner_id);
create policy "owner write pay_stubs" on pay_stubs for insert with check (auth.uid() = owner_id);
create policy "owner update pay_stubs" on pay_stubs for update using (auth.uid() = owner_id);
create policy "owner delete pay_stubs" on pay_stubs for delete using (auth.uid() = owner_id);
