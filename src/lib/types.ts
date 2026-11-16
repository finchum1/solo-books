export type TxType = 'income' | 'expense'

export interface Business {
  id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
  logo_path: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  payment_instructions: string | null
}

export interface Category {
  id: string
  name: string
  type: TxType
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Contractor {
  id: string
  business_id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Client {
  id: string
  business_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Transaction {
  id: string
  business_id: string
  date: string // YYYY-MM-DD
  type: TxType
  category: string
  amount: number
  description: string | null
  receipt_path: string | null
  contractor: string | null
  client: string | null
  /** Set when this entry is matched to bank statement line(s). */
  bank_match_id?: string | null
  created_at: string
}

export interface Employee {
  id: string
  business_id: string
  name: string
  is_active: boolean
  hire_date: string | null
  pay_type: 'hourly' | 'salary'
  /** Hourly rate for hourly employees, annual salary for salaried ones. */
  pay_rate: number
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
  federal_filing_status: 'single' | 'married' | 'head_of_household'
  w4_step2_checked: boolean
  w4_step3_credits: number
  w4_step4a_other_income: number
  w4_step4b_deductions: number
  w4_step4c_extra: number
  oklahoma_filing_status: 'single' | 'married' | 'married_higher_single'
  oklahoma_allowances: number
  created_at: string
}

export interface PayrollSettings {
  business_id: string
  suta_rate: number
  suta_wage_base: number
}

export interface PayrollRun {
  id: string
  business_id: string
  pay_date: string
  period_start: string | null
  period_end: string | null
  wage_transaction_id: string | null
  tax_transaction_id: string | null
  created_at: string
}

export interface PayStub {
  id: string
  run_id: string
  business_id: string
  employee_id: string
  employee_name: string
  pay_date: string
  regular_hours: number
  overtime_hours: number
  /** Included in `gross`. */
  bonus: number
  gross: number
  federal_withholding: number
  social_security_employee: number
  medicare_employee: number
  additional_medicare: number
  state_withholding: number
  net: number
  social_security_employer: number
  medicare_employer: number
  futa: number
  suta: number
  created_at: string
}

export interface Budget {
  id: string
  business_id: string
  type: TxType
  category: string
  /** First day of the month, YYYY-MM-DD. */
  month: string
  amount: number
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id: string
  business_id: string
  name: string
  org_name: string | null
  account_type: 'checking' | 'savings'
  opening_balance: number
  opening_balance_date: string | null
  mask: string | null
  is_active: boolean
  connection_id: string | null
  created_at: string
}

export interface BankImport {
  id: string
  bank_account_id: string
  filename: string | null
  source: 'csv' | 'ofx'
  rows_in_file: number
  lines_added: number
  lines_skipped: number
  first_date: string | null
  last_date: string | null
  created_at: string
}

export type BankLineStatus = 'pending_review' | 'matched' | 'imported' | 'transfer' | 'ignored'

export interface BankLine {
  id: string
  bank_account_id: string
  business_id: string
  posted_date: string | null
  amount: number
  description: string | null
  status: BankLineStatus
  import_id: string | null
  match_id: string | null
  transfer_pair_id: string | null
  reconciliation_id: string | null
}

export interface BankReconciliation {
  id: string
  bank_account_id: string
  period_start: string
  statement_end_date: string
  start_balance: number
  statement_end_balance: number
  lines_count: number
  finished_at: string
}

export interface BankAccountSummary {
  bank_account_id: string
  line_count: number
  counted_count: number
  counted_sum: number
  first_date: string | null
  last_date: string | null
  unreviewed_count: number
}
