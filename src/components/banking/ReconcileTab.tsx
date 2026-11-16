import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { errMsg } from '../../lib/errors'
import { reconcileDifference, suggestStatementEnd } from '../../lib/bankMatch'
import type { BankAccount, BankReconciliation } from '../../lib/types'
import { cardCls, fmtDate, inputCls, labelCls, money, primaryBtn } from './shared'

interface PeriodSummary {
  line_count: number
  line_sum: number
  unreviewed_count: number
  first_date: string | null
  last_date: string | null
}

const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export function ReconcileTab({
  account,
  reconciliations,
  onChanged,
  onGoReview,
}: {
  account: BankAccount
  /** This account's finished reconciliations, newest first. */
  reconciliations: BankReconciliation[]
  onChanged: () => void
  onGoReview: () => void
}) {
  const latest = reconciliations[0]
  const boundary = latest ? latest.statement_end_date : (account.opening_balance_date ?? '')
  const startBalance = latest ? Number(latest.statement_end_balance) : Number(account.opening_balance)

  const [endDate, setEndDate] = useState(() => (boundary ? suggestStatementEnd(boundary, !!latest) : ''))
  const [endBalance, setEndBalance] = useState('')
  const [summary, setSummary] = useState<PeriodSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // After finishing or reopening, the period moves: suggest the next statement date again.
  useEffect(() => {
    setEndDate(boundary ? suggestStatementEnd(boundary, !!latest) : '')
    setEndBalance('')
  }, [boundary, latest])

  const validEnd = !!boundary && isYmd(endDate) && endDate > boundary

  useEffect(() => {
    if (!validEnd) {
      setSummary(null)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase.rpc('bank_period_summary', { p_account: account.id, p_after: boundary, p_through: endDate }).then(({ data, error: e }) => {
      if (cancelled) return
      setLoading(false)
      if (e) return setError(errMsg(e, 'Could not total this period.'))
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined
      setSummary({
        line_count: Number(row?.line_count ?? 0),
        line_sum: Number(row?.line_sum ?? 0),
        unreviewed_count: Number(row?.unreviewed_count ?? 0),
        first_date: (row?.first_date as string) ?? null,
        last_date: (row?.last_date as string) ?? null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [account.id, boundary, endDate, validEnd, tick])

  const typed = endBalance.trim() !== '' && Number.isFinite(Number(endBalance))
  const diff = useMemo(
    () => (summary && typed ? reconcileDifference({ startBalance, linesSum: summary.line_sum, statementEndBalance: Number(endBalance) }) : null),
    [summary, typed, startBalance, endBalance],
  )
  const canFinish = validEnd && !!summary && summary.line_count > 0 && summary.unreviewed_count === 0 && diff === 0

  const finish = useCallback(async () => {
    if (!summary || !canFinish) return
    setBusy(true)
    setError(null)
    setNotice(null)
    let createdId: string | null = null
    try {
      const { data: rec, error: e1 } = await supabase
        .from('bank_reconciliations')
        .insert({
          bank_account_id: account.id,
          business_id: account.business_id,
          period_start: boundary,
          statement_end_date: endDate,
          start_balance: startBalance,
          statement_end_balance: Number(endBalance),
          lines_count: summary.line_count,
        })
        .select('id')
        .single()
      if (e1) throw e1
      createdId = rec.id as string
      const { count, error: e2 } = await supabase
        .from('bank_transactions')
        .update({ reconciliation_id: createdId }, { count: 'exact' })
        .eq('bank_account_id', account.id)
        .gt('posted_date', boundary)
        .lte('posted_date', endDate)
        .is('reconciliation_id', null)
        .neq('status', 'pending_review')
      if (e2) throw e2
      if ((count ?? 0) !== summary.line_count) {
        throw new Error('The lines changed while finishing (another tab, or a late import). Nothing was locked. Check the numbers and try again.')
      }
      setNotice(`Reconciled through ${fmtDate(endDate)}. ${summary.line_count} line${summary.line_count === 1 ? ' is' : 's are'} now locked.`)
      onChanged()
    } catch (err) {
      if (createdId) await supabase.from('bank_reconciliations').delete().eq('id', createdId)
      setError(errMsg(err, 'Could not finish this reconciliation.'))
      setTick((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }, [summary, canFinish, account.id, account.business_id, boundary, endDate, startBalance, endBalance, onChanged])

  async function reopen(rec: BankReconciliation) {
    if (!confirm(`Reopen the reconciliation through ${fmtDate(rec.statement_end_date)}? Its ${rec.lines_count} line${rec.lines_count === 1 ? '' : 's'} become editable again.`)) return
    setBusy(true)
    setError(null)
    setNotice(null)
    // Deleting the record frees its lines (their link is set to null by the database).
    const { error: e } = await supabase.from('bank_reconciliations').delete().eq('id', rec.id)
    setBusy(false)
    if (e) return setError(errMsg(e, 'Could not reopen it.'))
    setNotice(`Reopened the reconciliation through ${fmtDate(rec.statement_end_date)}.`)
    onChanged()
  }

  return (
    <div className="space-y-5">
      <section className={cardCls}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reconcile {account.name}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Once a month, match your books to the bank's statement. Enter the statement's closing date and ending balance. Solo Books checks that your reviewed lines add up to it.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="rec-start">
              Starting balance
            </label>
            <div id="rec-start" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-slate-100">
              {money(startBalance)}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{latest ? `Ending balance of ${fmtDate(latest.statement_end_date)}.` : `Opening balance on ${fmtDate(account.opening_balance_date)}.`}</p>
          </div>
          <div>
            <label className={labelCls} htmlFor="rec-end-date">
              Statement closing date
            </label>
            <input id="rec-end-date" type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            {isYmd(endDate) && endDate <= boundary && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Pick a date after {fmtDate(boundary)}.</p>}
          </div>
          <div>
            <label className={labelCls} htmlFor="rec-end-balance">
              Statement ending balance ($)
            </label>
            <input id="rec-end-balance" type="number" inputMode="decimal" step="0.01" className={inputCls} value={endBalance} onChange={(e) => setEndBalance(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        {validEnd && (
          <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 text-sm">
            {loading || !summary ? (
              <p className="text-slate-500 dark:text-slate-400">Totaling…</p>
            ) : (
              <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 tabular-nums">
                <dt className="text-slate-600 dark:text-slate-300">Starting balance</dt>
                <dd className="text-right">{money(startBalance)}</dd>
                <dt className="text-slate-600 dark:text-slate-300">
                  {summary.line_count} line{summary.line_count === 1 ? '' : 's'} in this period
                </dt>
                <dd className="text-right">{money(summary.line_sum)}</dd>
                <dt className="text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-1.5">Your books say the balance is</dt>
                <dd className="text-right border-t border-slate-200 dark:border-slate-800 pt-1.5 font-medium">{money(startBalance + summary.line_sum)}</dd>
                <dt className="text-slate-600 dark:text-slate-300">Statement says</dt>
                <dd className="text-right">{typed ? money(Number(endBalance)) : '—'}</dd>
                <dt className="font-medium text-slate-900 dark:text-slate-100">Difference</dt>
                <dd className={`text-right font-medium ${diff === null ? 'text-slate-400' : diff === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{diff === null ? '—' : money(diff)}</dd>
              </dl>
            )}
          </div>
        )}

        {summary && validEnd && (
          <ul className="mt-4 space-y-1.5 text-sm">
            {summary.line_count === 0 && <li className="text-amber-700 dark:text-amber-400">There are no statement lines in this period. Import the statement first.</li>}
            {summary.unreviewed_count > 0 && (
              <li className="text-amber-700 dark:text-amber-400">
                {summary.unreviewed_count} line{summary.unreviewed_count === 1 ? ' still needs' : 's still need'} review.{' '}
                <button type="button" onClick={onGoReview} className="underline">
                  Go to Review
                </button>
              </li>
            )}
            {diff !== null && diff !== 0 && summary.unreviewed_count === 0 && summary.line_count > 0 && (
              <li className="text-rose-600 dark:text-rose-400">
                The books are {money(Math.abs(diff))} {diff > 0 ? 'below' : 'above'} the statement. Look for a missing or duplicated line, a wrong amount, or a mistyped balance.
              </li>
            )}
            {canFinish && <li className="text-emerald-700 dark:text-emerald-400">Everything ties out. Finishing locks these {summary.line_count} lines so they can't be changed by accident.</li>}
          </ul>
        )}

        {error && (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {notice}
          </p>
        )}

        <div className="mt-5">
          <button type="button" disabled={!canFinish || busy} onClick={finish} className={primaryBtn}>
            {busy ? 'Working…' : 'Finish reconciliation'}
          </button>
        </div>
      </section>

      {reconciliations.length > 0 && (
        <section className={cardCls}>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Finished reconciliations</h3>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {reconciliations.map((r, i) => (
              <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <div className="text-slate-800 dark:text-slate-200">
                    Through {fmtDate(r.statement_end_date)} · ending balance <span className="tabular-nums">{money(Number(r.statement_end_balance))}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {r.lines_count} line{r.lines_count === 1 ? '' : 's'} from {fmtDate(r.period_start)} · finished {fmtDate(r.finished_at.slice(0, 10))}
                  </div>
                </div>
                {i === 0 ? (
                  <button type="button" disabled={busy} onClick={() => reopen(r)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-60">
                    Reopen
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">Reopen the newer ones first</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
