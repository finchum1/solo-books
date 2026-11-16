import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusinesses } from '../lib/useBusinesses'
import { useCategories } from '../lib/useCategories'
import { StatCard } from '../components/StatCard'
import type { Budget, Transaction, TxType } from '../lib/types'
import {
  buildRows,
  catKey,
  currentMonth,
  health,
  monthEnd,
  monthLabel,
  monthProgress,
  restOfYear,
  shiftMonth,
  suggestFromHistory,
  totals,
} from '../lib/budget'
import type { BudgetRow, Health } from '../lib/budget'
import { errMsg } from '../lib/errors'

const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
const money0 = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const BAR_TONE: Record<Health, string> = {
  ok: 'bg-emerald-500',
  watch: 'bg-amber-500',
  over: 'bg-rose-500',
  none: 'bg-slate-400 dark:bg-slate-500',
}

const selectCls =
  'rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm'

function parseAmount(raw: string): number | null | 'invalid' {
  const cleaned = raw.replace(/[$,\s]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 'invalid'
}

function Bar({ type, row, progress }: { type: TxType; row: BudgetRow; progress: number | null }) {
  const h = health(type, row)
  const pct = row.budget && row.budget > 0 ? Math.min(1, row.actual / row.budget) : row.budget === 0 && row.actual > 0 ? 1 : 0
  return (
    <div
      className="relative h-2 rounded-full bg-slate-200 dark:bg-slate-800"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      aria-label={`${row.category}: ${Math.round((row.pct ?? pct) * 100)}% of ${type === 'expense' ? 'budget' : 'target'}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${BAR_TONE[h]}`} style={{ width: `${pct * 100}%` }} />
      {/* Where you "should" be if spending were even across the month. */}
      {type === 'expense' && progress !== null && progress > 0 && progress < 1 && row.budget !== null && (
        <div className="absolute -top-1 -bottom-1 w-px bg-slate-900/60 dark:bg-white/70" style={{ left: `${progress * 100}%` }} title="Today" />
      )}
    </div>
  )
}

function Section({
  title,
  type,
  rows,
  editable,
  progress,
  onSave,
}: {
  title: string
  type: TxType
  rows: BudgetRow[]
  editable: boolean
  progress: number | null
  onSave: (row: BudgetRow, raw: string) => void
}) {
  const t = totals(rows)
  const col = type === 'expense' ? 'Left' : 'To go'
  return (
    <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
          {money0(t.actualBudgeted)} of {money0(t.budgeted)}
        </span>
      </div>

      <div className="hidden md:grid grid-cols-[minmax(0,1.3fr)_8rem_7rem_7rem_minmax(0,1.2fr)] gap-4 px-1 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span>Category</span>
        <span className="text-right">{type === 'expense' ? 'Budget' : 'Target'}</span>
        <span className="text-right">{type === 'expense' ? 'Spent' : 'Received'}</span>
        <span className="text-right">{col}</span>
        <span />
      </div>

      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {rows.map((row) => {
          const h = health(type, row)
          const left = row.remaining === null ? null : type === 'expense' ? row.remaining : -row.remaining
          return (
            <li key={row.key} className="py-3 md:grid md:grid-cols-[minmax(0,1.3fr)_8rem_7rem_7rem_minmax(0,1.2fr)] md:items-center md:gap-4 px-1">
              <div className="flex items-baseline justify-between gap-3 md:block min-w-0">
                <span className="truncate text-[15px] text-slate-800 dark:text-slate-200">{row.category}</span>
                <span
                  className={`md:hidden text-sm tabular-nums ${
                    left === null ? 'text-slate-400' : left < 0 && type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {left === null ? '' : type === 'expense' ? (left < 0 ? `${money(-left)} over` : `${money(left)} left`) : left > 0 ? `${money(left)} to go` : 'Target met'}
                </span>
              </div>

              <div className="mt-2 md:mt-0 flex items-center gap-3 md:contents">
                <label className="flex-1 md:flex-none">
                  <span className="md:sr-only text-xs text-slate-500 dark:text-slate-400">{type === 'expense' ? 'Budget' : 'Target'}</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input
                      key={`${row.key}-${row.budget}-${editable}`}
                      type="text"
                      inputMode="decimal"
                      disabled={!editable}
                      defaultValue={row.budget === null ? '' : String(row.budget)}
                      placeholder="—"
                      aria-label={`${row.category} ${type === 'expense' ? 'budget' : 'target'}`}
                      onBlur={(e) => onSave(row, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className="w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 pl-6 pr-2 py-1.5 text-right text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-70 disabled:border-transparent disabled:bg-transparent"
                    />
                  </div>
                </label>
                <div className="flex-1 md:flex-none text-right">
                  <span className="md:hidden block text-xs text-slate-500 dark:text-slate-400">{type === 'expense' ? 'Spent' : 'Received'}</span>
                  <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300">{money(row.actual)}</span>
                </div>
                <div className="hidden md:block text-right text-sm tabular-nums">
                  {left === null ? (
                    <span className="text-slate-400">—</span>
                  ) : type === 'expense' ? (
                    <span className={left < 0 ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-700 dark:text-slate-300'}>{left < 0 ? `${money(-left)} over` : money(left)}</span>
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300">{left > 0 ? money(left) : 'Met'}</span>
                  )}
                </div>
              </div>

              <div className="mt-2.5 md:mt-0 md:block">
                {row.budget !== null ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Bar type={type} row={row} progress={progress} />
                    </div>
                    <span
                      className={`w-10 text-right text-xs tabular-nums ${h === 'over' ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      {row.pct === null ? '' : `${Math.round(row.pct * 100)}%`}
                    </span>
                  </div>
                ) : row.actual > 0 ? (
                  <span className="text-xs text-amber-700 dark:text-amber-400">Not budgeted</span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function BudgetPage() {
  const { businesses } = useBusinesses()
  const { categories } = useCategories()
  const [businessId, setBusinessId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  // "Loading…" is only for the first load of a business + month. A save re-reads in the
  // background without unmounting the page, so Tab can move straight from one field to the next.
  const [loadedKey, setLoadedKey] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const error = actionError ?? loadError
  const setError = setActionError
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  // Default to the first business (a budget belongs to one business); "all" is a read-only roll-up.
  const effectiveId = businessId || businesses.find((b) => b.is_active)?.id || businesses[0]?.id || ''
  const combined = effectiveId === 'all'
  const editable = !combined && !!effectiveId

  const reload = useCallback(() => setReloadTick((n) => n + 1), [])

  const dataKey = `${effectiveId}|${month}`
  const loading = loadedKey !== dataKey

  useEffect(() => {
    if (!effectiveId) return
    let cancelled = false
    async function run() {
      try {
        let bq = supabase.from('budgets').select('*').eq('month', month)
        let tq = supabase.from('transactions').select('*').gte('date', month).lte('date', monthEnd(month))
        if (!combined) {
          bq = bq.eq('business_id', effectiveId)
          tq = tq.eq('business_id', effectiveId)
        }
        const [b, t] = await Promise.all([bq, tq])
        if (b.error) throw b.error
        if (t.error) throw t.error
        if (cancelled) return
        setBudgets(b.data as Budget[])
        setTransactions(t.data as Transaction[])
        setLoadError(null)
        setLoadedKey(dataKey)
      } catch (err) {
        if (!cancelled) {
          setLoadError(errMsg(err, 'Failed to load the budget.'))
          setLoadedKey(dataKey)
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [effectiveId, combined, month, reloadTick, dataKey])

  const expenseRows = useMemo(() => buildRows({ type: 'expense', month, budgets, transactions, categories }), [month, budgets, transactions, categories])
  const incomeRows = useMemo(() => buildRows({ type: 'income', month, budgets, transactions, categories }), [month, budgets, transactions, categories])
  const exp = useMemo(() => totals(expenseRows), [expenseRows])
  const inc = useMemo(() => totals(incomeRows), [incomeRows])
  const progress = monthProgress(month)
  const isCurrent = month === currentMonth()
  const hasAnyBudget = budgets.length > 0

  async function saveAmount(row: BudgetRow, raw: string, type: TxType) {
    if (!editable) return
    const parsed = parseAmount(raw)
    setNotice(null)
    if (parsed === 'invalid') {
      setError('Enter a dollar amount of 0 or more.')
      reload() // puts the field back to its saved value
      return
    }
    if ((parsed ?? null) === row.budget) {
      setError(null)
      return // nothing changed
    }
    setError(null)
    try {
      const mine = budgets.filter((b) => b.type === type && catKey(b.category) === row.key)
      if (parsed === null) {
        if (mine.length) {
          const { error } = await supabase.from('budgets').delete().in('id', mine.map((b) => b.id))
          if (error) throw error
        }
      } else if (mine.length) {
        // Update the existing row (matched ignoring case, so "fuel" and "Fuel" never become two rows).
        const { error } = await supabase.from('budgets').update({ amount: parsed, updated_at: new Date().toISOString() }).eq('id', mine[0].id)
        if (error) throw error
        if (mine.length > 1) {
          const { error: e2 } = await supabase.from('budgets').delete().in('id', mine.slice(1).map((b) => b.id))
          if (e2) throw e2
        }
      } else {
        const { error } = await supabase.from('budgets').insert({ business_id: effectiveId, type, category: row.category, month, amount: parsed })
        if (error) throw error
      }
    } catch (err) {
      setError(errMsg(err, 'Failed to save that budget.'))
    }
    reload()
  }

  /** Fetch another month's budgets for this business. */
  async function budgetsFor(m: string) {
    const { data, error } = await supabase.from('budgets').select('*').eq('business_id', effectiveId).eq('month', m)
    if (error) throw error
    return data as Budget[]
  }

  async function copyLastMonth() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const prev = await budgetsFor(shiftMonth(month, -1))
      const have = new Set(budgets.map((b) => `${b.type}|${catKey(b.category)}`))
      const add = prev.filter((b) => !have.has(`${b.type}|${catKey(b.category)}`))
      if (add.length) {
        const { error } = await supabase.from('budgets').insert(add.map((b) => ({ business_id: effectiveId, type: b.type, category: b.category, month, amount: b.amount })))
        if (error) throw error
      }
      setNotice(add.length ? `Copied ${add.length} budget${add.length === 1 ? '' : 's'} from ${monthLabel(shiftMonth(month, -1))}. Categories you'd already budgeted were left alone.` : `Nothing to copy: ${monthLabel(shiftMonth(month, -1))} has no budgets that aren't already set here.`)
    } catch (err) {
      setError(errMsg(err, 'Failed to copy.'))
    } finally {
      setBusy(false)
      reload()
    }
  }

  async function applyToRestOfYear() {
    const later = restOfYear(month).slice(1)
    if (later.length === 0) return setNotice('This is December, so there are no later months this year.')
    if (!hasAnyBudget) return setNotice('Set at least one budget for this month first.')
    if (!confirm(`Use ${monthLabel(month)}'s budgets for ${monthLabel(later[0])} through ${monthLabel(later[later.length - 1])}?\n\nThis replaces any budgets you had set for those months.`)) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const del = await supabase.from('budgets').delete().eq('business_id', effectiveId).in('month', later)
      if (del.error) throw del.error
      const rows = later.flatMap((m) => budgets.map((b) => ({ business_id: effectiveId, type: b.type, category: b.category, month: m, amount: b.amount })))
      const ins = await supabase.from('budgets').insert(rows)
      if (ins.error) throw ins.error
      setNotice(`Applied to ${later.length} more month${later.length === 1 ? '' : 's'} (through ${monthLabel(later[later.length - 1])}).`)
    } catch (err) {
      setError(errMsg(err, 'Failed to apply to the rest of the year.'))
    } finally {
      setBusy(false)
      reload()
    }
  }

  async function fillFromHistory() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', effectiveId)
        .gte('date', shiftMonth(month, -3))
        .lte('date', monthEnd(shiftMonth(month, -1)))
      if (error) throw error
      const hist = data as Transaction[]
      const have = new Set(budgets.map((b) => `${b.type}|${catKey(b.category)}`))
      const add: { type: TxType; category: string; amount: number }[] = []
      for (const type of ['expense', 'income'] as const) {
        for (const [key, s] of suggestFromHistory({ type, month, transactions: hist })) {
          if (!have.has(`${type}|${key}`)) add.push({ type, category: s.category, amount: s.amount })
        }
      }
      if (add.length) {
        const ins = await supabase.from('budgets').insert(add.map((a) => ({ business_id: effectiveId, ...a, month })))
        if (ins.error) throw ins.error
      }
      setNotice(add.length ? `Filled ${add.length} categor${add.length === 1 ? 'y' : 'ies'} from your last three months' average. Adjust any of them.` : 'No history to go on: there were no transactions in the three months before this one, or everything is already budgeted.')
    } catch (err) {
      setError(errMsg(err, 'Failed to fill from history.'))
    } finally {
      setBusy(false)
      reload()
    }
  }

  if (businesses.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-amber-600 dark:text-amber-400">Add a business in Settings before setting a budget.</p>
      </div>
    )
  }

  const leftToSpend = exp.budgeted - exp.actualBudgeted
  const plannedNet = inc.budgeted - exp.budgeted
  const linkBtn = 'text-sm text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Budget</h1>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-medium text-slate-900 dark:text-slate-100">{monthLabel(month)}</span>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          {!isCurrent && (
            <button type="button" onClick={() => setMonth(currentMonth())} className="ml-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
              This month
            </button>
          )}
        </div>
      </div>

      <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Business</label>
            <select value={effectiveId} onChange={(e) => setBusinessId(e.target.value)} className={selectCls}>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              {businesses.length > 1 && <option value="all">All businesses (view only)</option>}
            </select>
          </div>
          {editable && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pb-2">
              <button type="button" className={linkBtn} disabled={busy} onClick={copyLastMonth}>
                Copy from last month
              </button>
              <button type="button" className={linkBtn} disabled={busy} onClick={fillFromHistory}>
                Fill blanks from my 3-month average
              </button>
              <button type="button" className={linkBtn} disabled={busy || !hasAnyBudget} onClick={applyToRestOfYear}>
                Use this month for the rest of the year
              </button>
            </div>
          )}
        </div>

        {combined && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Showing every business added together. Pick one business to change its budget.</p>}
        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
        {notice && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">{notice}</p>}
      </section>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Budgeted spending" value={money0(exp.budgeted)} />
            <StatCard label="Spent so far" value={money0(exp.actualTotal)} />
            <StatCard
              label={leftToSpend < 0 ? 'Over budget by' : 'Left to spend'}
              value={money0(Math.abs(leftToSpend))}
              tone={exp.budgeted === 0 ? 'default' : leftToSpend < 0 ? 'rose' : 'green'}
            />
            <StatCard
              label={inc.budgeted > 0 ? (plannedNet >= 0 ? 'Planned profit' : 'Planned loss') : 'Unbudgeted spending'}
              value={money0(inc.budgeted > 0 ? Math.abs(plannedNet) : exp.unbudgeted)}
              tone={inc.budgeted > 0 ? (plannedNet >= 0 ? 'green' : 'rose') : exp.unbudgeted > 0 ? 'amber' : 'default'}
            />
          </section>

          {!hasAnyBudget && editable && (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-100 mb-1">No budget for {monthLabel(month)} yet.</p>
              Type an amount next to any category below, or use <strong>Fill blanks from my 3-month average</strong> to start from what you actually spend. Once it looks right, use{' '}
              <strong>Use this month for the rest of the year</strong>.
            </div>
          )}

          <Section title="Spending" type="expense" rows={expenseRows} editable={editable} progress={isCurrent ? progress : null} onSave={(r, v) => saveAmount(r, v, 'expense')} />
          <Section title="Income targets" type="income" rows={incomeRows} editable={editable} progress={null} onSave={(r, v) => saveAmount(r, v, 'income')} />

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Spent and received come straight from your Ledger by category, so they update as you log transactions. Payroll wages and employer taxes appear under their own categories.
            {isCurrent && ' The thin line on a bar marks how far through the month today is.'}
          </p>
        </>
      )}
    </div>
  )
}
