import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { errMsg } from '../../lib/errors'
import { useCategories } from '../../lib/useCategories'
import { useContractors } from '../../lib/useContractors'
import { useClients } from '../../lib/useClients'
import { Combobox } from '../Combobox'
import { currentMonth, monthEnd, monthLabel, shiftMonth } from '../../lib/budget'
import { addDays, groupDifference, signedAmount, suggestMatches, suggestTransfers } from '../../lib/bankMatch'
import type { MatchEntry, MatchLine, Suggestion, TransferPair } from '../../lib/bankMatch'
import { addLineToLedger, createMatch, markTransfer, setIgnored, undoLine } from '../../lib/bankActions'
import type { BankAccount, BankLine, Transaction } from '../../lib/types'
import { cardCls, fetchAllRows, fmtDate, ghostBtn, inputCls, money, primaryBtn } from './shared'

const STATUS_LABEL: Record<BankLine['status'], string> = {
  pending_review: 'To review',
  matched: 'Matched',
  imported: 'Added to Ledger',
  transfer: 'Transfer',
  ignored: 'Ignored',
}

const toLine = (l: BankLine): MatchLine => ({ id: l.id, accountId: l.bank_account_id, businessId: l.business_id, date: l.posted_date ?? '', amount: Number(l.amount), description: l.description ?? '' })
const toEntry = (t: Transaction): MatchEntry => ({
  id: t.id,
  businessId: t.business_id,
  date: t.date,
  type: t.type,
  amount: Number(t.amount),
  category: t.category,
  description: t.description ?? '',
  contractor: t.contractor ?? '',
  client: t.client ?? '',
})

export function ReviewTab({
  account,
  siblingAccountIds,
  lockedThrough,
  startMonth,
  onChanged,
}: {
  account: BankAccount
  /** Other accounts of the same business, for spotting transfers between them. */
  siblingAccountIds: string[]
  /** Statement lines dated on or before this are not part of review (before the opening balance, or already reconciled). */
  lockedThrough: string
  startMonth?: string
  onChanged: () => void
}) {
  const { categories } = useCategories()
  const { contractors } = useContractors()
  const { clients } = useClients()

  const [month, setMonth] = useState<string | null>(startMonth ?? null)
  const [showReviewed, setShowReviewed] = useState(false)
  const [lines, setLines] = useState<BankLine[]>([])
  const [others, setOthers] = useState<BankLine[]>([])
  const [entries, setEntries] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [selLines, setSelLines] = useState<Set<string>>(new Set())
  const [selEntries, setSelEntries] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(() => {
    setTick((n) => n + 1)
    onChanged()
  }, [onChanged])

  // Open on the first month that still has work to do.
  useEffect(() => {
    if (month) return
    let cancelled = false
    supabase.rpc('bank_first_unreviewed', { p_account: account.id, p_after: lockedThrough }).then(({ data }) => {
      if (cancelled) return
      setMonth(typeof data === 'string' ? `${data.slice(0, 7)}-01` : currentMonth())
    })
    return () => {
      cancelled = true
    }
  }, [month, account.id, lockedThrough])

  useEffect(() => {
    if (!month) return
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const from = month!
        const to = monthEnd(month!)
        const after = from > lockedThrough ? addDays(from, -1) : lockedThrough
        const [l, o, e] = await Promise.all([
          fetchAllRows<BankLine>((a, b) =>
            supabase.from('bank_transactions').select('*').eq('bank_account_id', account.id).gt('posted_date', after).gte('posted_date', from).lte('posted_date', to).order('posted_date', { ascending: true }).order('id').range(a, b),
          ),
          siblingAccountIds.length
            ? fetchAllRows<BankLine>((a, b) =>
                supabase.from('bank_transactions').select('*').in('bank_account_id', siblingAccountIds).eq('status', 'pending_review').gte('posted_date', addDays(from, -4)).lte('posted_date', addDays(to, 4)).order('posted_date').range(a, b),
              )
            : Promise.resolve([] as BankLine[]),
          fetchAllRows<Transaction>((a, b) =>
            supabase.from('transactions').select('*').eq('business_id', account.business_id).is('bank_match_id', null).gte('date', addDays(from, -10)).lte('date', addDays(to, 10)).order('date', { ascending: true }).order('id').range(a, b),
          ),
        ])
        if (cancelled) return
        setLines(l)
        setOthers(o)
        setEntries(e)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(errMsg(err, 'Failed to load this month.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [month, account.id, account.business_id, siblingAccountIds, lockedThrough, tick])

  const todo = useMemo(() => lines.filter((l) => l.status === 'pending_review'), [lines])
  const reviewed = useMemo(() => lines.filter((l) => l.status !== 'pending_review'), [lines])

  const suggestions = useMemo(() => suggestMatches(todo.map(toLine), entries.map(toEntry)), [todo, entries])
  const exact = suggestions.filter((s) => s.confidence === 'exact')
  const possible = suggestions.filter((s) => s.confidence === 'possible')
  const transfers = useMemo(
    () => suggestTransfers([...todo.map(toLine), ...others.map(toLine)]).filter((p) => p.out.accountId === account.id || p.into.accountId === account.id),
    [todo, others, account.id],
  )

  const chosenLines = todo.filter((l) => selLines.has(l.id))
  const chosenEntries = entries.filter((e) => selEntries.has(e.id))
  const diff = groupDifference(chosenLines.map(toLine), chosenEntries.map(toEntry))

  const run = useCallback(
    async (fn: () => Promise<void>, ok: string) => {
      setBusy(true)
      setError(null)
      setNotice(null)
      try {
        await fn()
        setNotice(ok)
        setSelLines(new Set())
        setSelEntries(new Set())
        setNote('')
        setAdding(null)
        reload()
      } catch (err) {
        setError(errMsg(err, 'That did not work.'))
        reload()
      } finally {
        setBusy(false)
      }
    },
    [reload],
  )

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }

  const confirmSuggestion = (s: Suggestion) =>
    run(() => createMatch({ businessId: account.business_id, lineIds: [s.line.id], entryIds: [s.entry.id], difference: 0 }).then(() => undefined), 'Matched.')

  const confirmAllExact = () =>
    run(async () => {
      for (const s of exact) await createMatch({ businessId: account.business_id, lineIds: [s.line.id], entryIds: [s.entry.id], difference: 0 })
    }, `Matched ${exact.length} line${exact.length === 1 ? '' : 's'}.`)

  const confirmTransfer = (p: TransferPair) => run(() => markTransfer([p.out.id, p.into.id]), 'Marked as a transfer between your accounts.')

  const matchSelected = () =>
    run(
      () => createMatch({ businessId: account.business_id, lineIds: [...selLines], entryIds: [...selEntries], difference: diff, note }).then(() => undefined),
      diff === 0 ? 'Matched.' : `Matched with a ${money(Math.abs(diff))} difference.`,
    )

  if (!month) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>

  const lineLabel = (l: MatchLine) => `${fmtDate(l.date)} ${l.description || 'statement line'} ${money(l.amount)}`
  const catOptions = (type: 'income' | 'expense') => categories.filter((c) => c.type === type && c.is_active).map((c) => c.name)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-medium text-slate-900 dark:text-slate-100">{monthLabel(month)}</span>
          <button type="button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))} className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-600 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100">{todo.length}</strong> to review
          </span>
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={showReviewed} onChange={(e) => setShowReviewed(e.target.checked)} className="rounded" />
            Show reviewed ({reviewed.length})
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {notice}
        </p>
      )}

      {(suggestions.length > 0 || transfers.length > 0) && (
        <section className={cardCls}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Suggestions</h3>
            {exact.length > 1 && (
              <button type="button" disabled={busy} onClick={confirmAllExact} className={primaryBtn}>
                Match all {exact.length} sure matches
              </button>
            )}
          </div>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {[...exact, ...possible].map((s) => (
              <li key={s.line.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex-1 min-w-[14rem]">
                  <div className="text-slate-800 dark:text-slate-200">{lineLabel(s.line)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    ↔ Ledger: {fmtDate(s.entry.date)} · {s.entry.category}
                    {s.entry.description ? ` · ${s.entry.description}` : ''} · {money(signedAmount(s.entry))}
                    {s.daysApart > 0 && ` · ${s.daysApart} day${s.daysApart === 1 ? '' : 's'} apart`}
                  </div>
                </div>
                <span className={`text-xs ${s.confidence === 'exact' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{s.confidence === 'exact' ? 'Sure' : 'Possible'}</span>
                <button type="button" disabled={busy} onClick={() => confirmSuggestion(s)} className={ghostBtn}>
                  Match
                </button>
              </li>
            ))}
            {transfers.map((p) => (
              <li key={`${p.out.id}-${p.into.id}`} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex-1 min-w-[14rem]">
                  <div className="text-slate-800 dark:text-slate-200">
                    {money(Math.abs(p.out.amount))} moved between your accounts
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Out {fmtDate(p.out.date)} · in {fmtDate(p.into.date)}. Not income or an expense.
                  </div>
                </div>
                <span className={`text-xs ${p.confidence === 'exact' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{p.confidence === 'exact' ? 'Sure' : 'Possible'}</span>
                <button type="button" disabled={busy} onClick={() => confirmTransfer(p)} className={ghostBtn}>
                  Mark transfer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className={`${cardCls} min-w-0`}>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Bank statement lines</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Tick the lines that belong together, then the Ledger entries they pay for.</p>
            {todo.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{lines.length === 0 ? 'No statement lines this month. Import a statement on the Lines tab.' : 'Every line this month has been reviewed.'}</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {todo.map((l) => (
                  <li key={l.id} className="py-2.5">
                    <label className="flex items-center gap-3 text-sm cursor-pointer">
                      <input type="checkbox" checked={selLines.has(l.id)} onChange={() => setSelLines(toggle(selLines, l.id))} aria-label={`Select ${l.description ?? 'line'}`} className="rounded" />
                      <span className="w-[5.75rem] shrink-0 whitespace-nowrap text-slate-500 dark:text-slate-400 tabular-nums">{fmtDate(l.posted_date)}</span>
                      <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-200">{l.description || <em className="text-slate-400">no description</em>}</span>
                      <span className={`tabular-nums ${Number(l.amount) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{money(Number(l.amount))}</span>
                    </label>
                    <div className="ml-7 mt-1 flex gap-4 text-xs">
                      <button type="button" onClick={() => setAdding(adding === l.id ? null : l.id)} className="text-emerald-700 dark:text-emerald-400 hover:underline">
                        Add to Ledger
                      </button>
                      <button type="button" disabled={busy} onClick={() => run(() => markTransfer([l.id]), 'Marked as a transfer.')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        Transfer
                      </button>
                      <button type="button" disabled={busy} onClick={() => run(() => setIgnored(l.id, true), 'Ignored.')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        Ignore
                      </button>
                    </div>
                    {adding === l.id && (
                      <AddToLedgerForm
                        line={l}
                        categoryOptions={catOptions(Number(l.amount) < 0 ? 'expense' : 'income')}
                        contractorOptions={contractors.filter((c) => c.business_id === l.business_id && c.is_active).map((c) => c.name)}
                        clientOptions={clients.filter((c) => c.business_id === l.business_id && c.is_active).map((c) => c.name)}
                        busy={busy}
                        onCancel={() => setAdding(null)}
                        onSubmit={(category, contractor, client) => run(() => addLineToLedger({ line: l, category, contractor, client }), 'Added to your Ledger and matched.')}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${cardCls} min-w-0`}>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Ledger entries not on a statement yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Entries in this business dated around {monthLabel(month)}.</p>
            {entries.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nothing waiting. Every Ledger entry around this month is already matched.</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {entries.map((e) => (
                  <li key={e.id}>
                    <label className="py-2.5 flex items-center gap-3 text-sm cursor-pointer">
                      <input type="checkbox" checked={selEntries.has(e.id)} onChange={() => setSelEntries(toggle(selEntries, e.id))} aria-label={`Select ${e.category}`} className="rounded" />
                      <span className="w-[5.75rem] shrink-0 whitespace-nowrap text-slate-500 dark:text-slate-400 tabular-nums">{fmtDate(e.date)}</span>
                      <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-200">
                        {e.category}
                        {e.description ? <span className="text-slate-500 dark:text-slate-400"> · {e.description}</span> : null}
                      </span>
                      <span className={`tabular-nums ${e.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{money(signedAmount(toEntry(e)))}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {(selLines.size > 0 || selEntries.size > 0) && (
        <div className="sticky bottom-20 md:bottom-4 z-10 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm tabular-nums">
            <span className="text-slate-600 dark:text-slate-300">
              Bank lines ({selLines.size}): <strong>{money(chosenLines.reduce((s, l) => s + Number(l.amount), 0))}</strong>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              Ledger entries ({selEntries.size}): <strong>{money(chosenEntries.reduce((s, e) => s + signedAmount(toEntry(e)), 0))}</strong>
            </span>
            <span className={diff === 0 ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-amber-700 dark:text-amber-400 font-medium'}>{diff === 0 ? 'Ties out' : `Difference ${money(diff)}`}</span>
          </div>
          {diff !== 0 && selLines.size > 0 && (
            <input
              className={`${inputCls} mt-3`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why do these differ? e.g. withheld payroll taxes paid later (optional)"
              aria-label="Reason for the difference"
            />
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy || selLines.size === 0} onClick={matchSelected} className={primaryBtn}>
              {diff === 0 ? 'Match' : 'Match anyway'}
            </button>
            <button type="button" disabled={busy} onClick={() => { setSelLines(new Set()); setSelEntries(new Set()); setNote('') }} className={ghostBtn}>
              Clear
            </button>
            {selLines.size === 0 && <span className="self-center text-xs text-slate-500 dark:text-slate-400">Tick at least one bank line.</span>}
          </div>
        </div>
      )}

      {showReviewed && reviewed.length > 0 && (
        <section className={cardCls}>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Reviewed this month</h3>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {reviewed.map((l) => (
              <li key={l.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span className="w-[5.75rem] shrink-0 whitespace-nowrap text-slate-500 dark:text-slate-400 tabular-nums">{fmtDate(l.posted_date)}</span>
                <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-200">{l.description || <em className="text-slate-400">no description</em>}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{l.reconciliation_id ? 'Reconciled' : STATUS_LABEL[l.status]}</span>
                <span className={`tabular-nums ${Number(l.amount) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{money(Number(l.amount))}</span>
                <button
                  type="button"
                  disabled={busy || !!l.reconciliation_id}
                  title={l.reconciliation_id ? 'Reopen the reconciliation on the Reconcile tab to change this.' : undefined}
                  onClick={() => run(() => undoLine(l), 'Put back to review.')}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40"
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function AddToLedgerForm({
  line,
  categoryOptions,
  contractorOptions,
  clientOptions,
  busy,
  onSubmit,
  onCancel,
}: {
  line: BankLine
  categoryOptions: string[]
  contractorOptions: string[]
  clientOptions: string[]
  busy: boolean
  onSubmit: (category: string, contractor: string, client: string) => void
  onCancel: () => void
}) {
  const expense = Number(line.amount) < 0
  const [category, setCategory] = useState('')
  const [who, setWho] = useState('')
  return (
    <div className="ml-7 mt-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Creates a {expense ? 'expense' : 'income'} of {money(Math.abs(Number(line.amount)))} dated {fmtDate(line.posted_date)} in your Ledger and matches it to this line.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Category</label>
          <Combobox value={category} onChange={setCategory} options={categoryOptions} placeholder="e.g. Supplies" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{expense ? 'Contractor (optional)' : 'Client (optional)'}</label>
          <Combobox value={who} onChange={setWho} options={expense ? contractorOptions : clientOptions} placeholder={expense ? "e.g. Bob's Plumbing" : 'e.g. Hartwell HOA'} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={busy || !category.trim()} onClick={() => onSubmit(category, expense ? who : '', expense ? '' : who)} className={primaryBtn}>
          Add and match
        </button>
        <button type="button" onClick={onCancel} className={ghostBtn}>
          Cancel
        </button>
      </div>
    </div>
  )
}
