import type { Budget, Category, Transaction, TxType } from './types'

/** Months are handled as 'YYYY-MM-01' strings so a timezone can never shift them a day. */
const pad = (n: number) => String(n).padStart(2, '0')

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${pad(monthIndex + 1)}-01`
}

export function currentMonth(): string {
  const d = new Date()
  return monthKey(d.getFullYear(), d.getMonth())
}

export function shiftMonth(month: string, by: number): string {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7)) - 1 + by
  return monthKey(y + Math.floor(m / 12), ((m % 12) + 12) % 12)
}

export function monthEnd(month: string): string {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`
}

export function monthLabel(month: string): string {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7)) - 1
  return new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** The months from `month` through December of the same year, inclusive. */
export function restOfYear(month: string): string[] {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7)) - 1
  return Array.from({ length: 12 - m }, (_, i) => monthKey(y, m + i))
}

/** Matching key: categories are free text on transactions, so compare ignoring case and spacing. */
export const catKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')

const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export interface BudgetRow {
  key: string
  category: string
  /** null when nothing is budgeted for this category this month. */
  budget: number | null
  actual: number
  /** budget - actual for expenses (money left), actual - budget for income (amount over target); null without a budget. */
  remaining: number | null
  /** actual / budget, null without a budget (or a $0 budget with no activity). */
  pct: number | null
}

export type Health = 'ok' | 'watch' | 'over' | 'none'

/**
 * Expenses: green until 85% of the limit, amber from 85%, red once over.
 * Income: there is no "bad" while you are short of a target, only progress, so
 * it never reads as a warning; it just turns green when the target is met.
 */
export function health(type: TxType, row: Pick<BudgetRow, 'budget' | 'actual' | 'pct'>): Health {
  if (row.budget === null) return 'none'
  if (type === 'income') return row.actual >= row.budget ? 'ok' : 'none'
  if (row.budget === 0) return row.actual > 0 ? 'over' : 'ok'
  const p = row.pct ?? 0
  return p > 1 ? 'over' : p >= 0.85 ? 'watch' : 'ok'
}

/**
 * One line per category for a month: every budgeted category, every category
 * that had activity, and (so a budget can be typed into it) every active
 * category on the user's list. `budgets` and `transactions` may span several
 * businesses (the combined view); amounts are summed per category.
 */
export function buildRows(args: {
  type: TxType
  month: string
  budgets: Budget[]
  transactions: Transaction[]
  categories: Category[]
}): BudgetRow[] {
  const { type, month, budgets, transactions, categories } = args
  const end = monthEnd(month)
  const rows = new Map<string, BudgetRow>()
  const ensure = (name: string) => {
    const key = catKey(name)
    let row = rows.get(key)
    if (!row) {
      row = { key, category: name.trim(), budget: null, actual: 0, remaining: null, pct: null }
      rows.set(key, row)
    }
    return row
  }

  for (const c of categories) if (c.type === type && c.is_active) ensure(c.name)
  for (const b of budgets) {
    if (b.type !== type || b.month !== month) continue
    const row = ensure(b.category)
    row.budget = cents((row.budget ?? 0) + Number(b.amount))
  }
  for (const t of transactions) {
    if (t.type !== type || t.date < month || t.date > end) continue
    const row = ensure(t.category)
    row.actual = cents(row.actual + Number(t.amount))
  }

  const out = [...rows.values()]
  for (const r of out) {
    if (r.budget !== null) {
      r.remaining = cents(type === 'expense' ? r.budget - r.actual : r.actual - r.budget)
      r.pct = r.budget > 0 ? r.actual / r.budget : null
    }
  }
  // Budgeted first (biggest budget first), then unbudgeted with activity, then the untouched rest.
  const rank = (r: BudgetRow) => (r.budget !== null ? 0 : r.actual > 0 ? 1 : 2)
  return out.sort((a, b) => rank(a) - rank(b) || (b.budget ?? 0) - (a.budget ?? 0) || b.actual - a.actual || a.category.localeCompare(b.category))
}

export interface BudgetTotals {
  budgeted: number
  /** Actual spending (or income) in categories that have a budget. */
  actualBudgeted: number
  /** Actual in categories with no budget at all. */
  unbudgeted: number
  actualTotal: number
}

export function totals(rows: BudgetRow[]): BudgetTotals {
  let budgeted = 0
  let actualBudgeted = 0
  let unbudgeted = 0
  for (const r of rows) {
    if (r.budget !== null) {
      budgeted += r.budget
      actualBudgeted += r.actual
    } else {
      unbudgeted += r.actual
    }
  }
  return { budgeted: cents(budgeted), actualBudgeted: cents(actualBudgeted), unbudgeted: cents(unbudgeted), actualTotal: cents(actualBudgeted + unbudgeted) }
}

/**
 * How far through the month today is (0..1) if `month` is the current month,
 * 1 for a past month and 0 for a future one. Drives the "where you should be" tick.
 */
export function monthProgress(month: string, now = new Date()): number {
  const cur = monthKey(now.getFullYear(), now.getMonth())
  if (month < cur) return 1
  if (month > cur) return 0
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return now.getDate() / days
}

/**
 * Suggested budget per category: the average actual over the three full months
 * before `month`, rounded to the nearest $5, for categories with any activity.
 */
export function suggestFromHistory(args: { type: TxType; month: string; transactions: Transaction[] }): Map<string, { category: string; amount: number }> {
  const { type, month, transactions } = args
  const start = shiftMonth(month, -3)
  const end = monthEnd(shiftMonth(month, -1))
  const sums = new Map<string, { category: string; total: number }>()
  for (const t of transactions) {
    if (t.type !== type || t.date < start || t.date > end) continue
    const key = catKey(t.category)
    const e = sums.get(key) ?? { category: t.category.trim(), total: 0 }
    e.total += Number(t.amount)
    sums.set(key, e)
  }
  const out = new Map<string, { category: string; amount: number }>()
  for (const [key, e] of sums) {
    const amount = Math.round(e.total / 3 / 5) * 5
    if (amount > 0) out.set(key, { category: e.category, amount })
  }
  return out
}
