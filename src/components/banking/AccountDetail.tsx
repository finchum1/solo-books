import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { BankAccount, BankAccountSummary, BankImport, BankLine, BankReconciliation, Business } from '../../lib/types'
import { AccountForm } from './AccountForm'
import { ImportWizard } from './ImportWizard'
import { ReviewTab } from './ReviewTab'
import { ReconcileTab } from './ReconcileTab'
import { cardCls, fmtDate, ghostBtn, inputCls, money, primaryBtn } from './shared'
import { errMsg } from '../../lib/errors'

const PAGE = 100
const STATUS_LABEL: Record<BankLine['status'], string> = { pending_review: 'To review', matched: 'Matched', imported: 'In Ledger', transfer: 'Transfer', ignored: 'Ignored' }

export function AccountDetail({
  account,
  summary,
  business,
  businesses,
  readOnly = false,
  onBack,
  onChanged,
}: {
  account: BankAccount
  summary: BankAccountSummary | undefined
  business: Business | undefined
  businesses: Business[]
  /** A view-only teammate can look at the account and its lines but not change anything. */
  readOnly?: boolean
  onBack: () => void
  onChanged: () => void
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'import'>('view')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lines, setLines] = useState<BankLine[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingLines, setLoadingLines] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [imports, setImports] = useState<BankImport[]>([])
  const [tick, setTick] = useState(0)
  const [busyImport, setBusyImport] = useState<string | null>(null)
  const [tab, setTab] = useState<'lines' | 'review' | 'reconcile'>('lines')
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([])
  const [siblingIds, setSiblingIds] = useState<string[]>([])

  const refresh = useCallback(() => {
    setTick((n) => n + 1)
    onChanged()
  }, [onChanged])

  // Debounce the search box so typing doesn't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoadingLines(true)
      try {
        let q = supabase
          .from('bank_transactions')
          .select('id,bank_account_id,business_id,posted_date,amount,description,status,import_id,match_id,transfer_pair_id,reconciliation_id')
          .eq('bank_account_id', account.id)
          .order('posted_date', { ascending: false })
          .order('id', { ascending: false })
          .range(0, PAGE - 1)
        if (query) q = q.ilike('description', `%${query.replace(/[%_]/g, (c) => `\\${c}`)}%`)
        const { data, error } = await q
        if (error) throw error
        if (cancelled) return
        setLines(data as BankLine[])
        setHasMore((data?.length ?? 0) === PAGE)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(errMsg(err, 'Failed to load the statement lines.'))
      } finally {
        if (!cancelled) setLoadingLines(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [account.id, query, tick])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('bank_imports')
      .select('*')
      .eq('bank_account_id', account.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => !cancelled && setImports((data ?? []) as BankImport[]))
    return () => {
      cancelled = true
    }
  }, [account.id, tick])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('bank_reconciliations')
      .select('*')
      .eq('bank_account_id', account.id)
      .order('statement_end_date', { ascending: false })
      .then(({ data }) => !cancelled && setReconciliations((data ?? []) as BankReconciliation[]))
    return () => {
      cancelled = true
    }
  }, [account.id, tick])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('bank_accounts')
      .select('id')
      .eq('business_id', account.business_id)
      .is('connection_id', null)
      .then(({ data }) => !cancelled && setSiblingIds((data ?? []).map((r) => r.id as string)))
    return () => {
      cancelled = true
    }
  }, [account.business_id])

  async function loadMore() {
    setLoadingLines(true)
    let q = supabase
      .from('bank_transactions')
      .select('id,bank_account_id,business_id,posted_date,amount,description,status,import_id,match_id,transfer_pair_id,reconciliation_id')
      .eq('bank_account_id', account.id)
      .order('posted_date', { ascending: false })
      .order('id', { ascending: false })
      .range(lines.length, lines.length + PAGE - 1)
    if (query) q = q.ilike('description', `%${query.replace(/[%_]/g, (c) => `\\${c}`)}%`)
    const { data, error } = await q
    if (error) setError(error.message)
    else {
      setLines((prev) => [...prev, ...((data ?? []) as BankLine[])])
      setHasMore((data?.length ?? 0) === PAGE)
    }
    setLoadingLines(false)
  }

  async function undoImport(imp: BankImport) {
    setError(null)
    setNotice(null)
    // Once a line has been reviewed or matched, undoing the import would orphan that work.
    const { count, error: cErr } = await supabase.from('bank_transactions').select('id', { count: 'exact', head: true }).eq('import_id', imp.id).neq('status', 'pending_review')
    if (cErr) return setError(cErr.message)
    if ((count ?? 0) > 0) return setError(`${count} line${count === 1 ? '' : 's'} from this import have already been reviewed, so it can't be undone.`)
    if (!confirm(`Remove the ${imp.lines_added} line${imp.lines_added === 1 ? '' : 's'} imported from "${imp.filename ?? 'this file'}"? You can import the file again later.`)) return
    setBusyImport(imp.id)
    const { error } = await supabase.from('bank_imports').delete().eq('id', imp.id)
    setBusyImport(null)
    if (error) return setError(error.message)
    setNotice('Import removed.')
    refresh()
  }

  async function deleteAccount() {
    const n = summary?.line_count ?? 0
    if (!confirm(`Delete "${account.name}"${n ? ` and its ${n} statement line${n === 1 ? '' : 's'}` : ''}? Your Ledger entries are not affected. This can't be undone.`)) return
    const { error } = await supabase.from('bank_accounts').delete().eq('id', account.id)
    if (error) return setError(error.message)
    refresh()
    onBack()
  }

  const lockedThrough = [account.opening_balance_date, reconciliations[0]?.statement_end_date].filter(Boolean).sort().pop() as string
  const toReview = summary?.unreviewed_count ?? 0
  const balance = account.opening_balance + (summary?.counted_sum ?? 0)
  const before = (summary?.line_count ?? 0) - (summary?.counted_count ?? 0)

  if (mode === 'edit') {
    return (
      <section className={cardCls}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Edit account</h2>
        <AccountForm
          businesses={businesses}
          defaultBusinessId={account.business_id}
          account={account}
          onSaved={() => {
            setMode('view')
            refresh()
          }}
          onCancel={() => setMode('view')}
        />
      </section>
    )
  }

  if (mode === 'import') {
    return (
      <ImportWizard
        account={account}
        reconciledThrough={reconciliations[0]?.statement_end_date ?? null}
        onCancel={() => setMode('view')}
        onDone={(msg) => {
          setMode('view')
          setNotice(msg)
          refresh()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline">
        ← All accounts
      </button>

      <section className={cardCls}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{account.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {business?.name} · {account.account_type === 'checking' ? 'Checking' : 'Savings'}
              {account.mask ? ` · ending ${account.mask}` : ''}
            </p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setNotice(null); setMode('import') }} className={primaryBtn}>
                Import statement
              </button>
              <button type="button" onClick={() => setMode('edit')} className={ghostBtn}>
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-3 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Balance per your imports</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{money(balance)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Opening balance</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{money(account.opening_balance)}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">{fmtDate(account.opening_balance_date)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Statement lines</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{(summary?.line_count ?? 0).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Latest line</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{summary?.last_date ? fmtDate(summary.last_date) : '—'}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Opening balance plus every imported line dated after {fmtDate(account.opening_balance_date)}. It should match your bank's balance on the latest line's date.
          {before > 0 && ` ${before} older line${before === 1 ? ' is' : 's are'} saved but not counted.`}
        </p>
        {notice && (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}
      </section>

      <div role="tablist" aria-label="Account sections" className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(
          [
            ['lines', 'Lines'],
            ['review', toReview > 0 ? `Review (${toReview.toLocaleString()})` : 'Review'],
            ['reconcile', 'Reconcile'],
          ] as const
        ).filter(([id]) => !readOnly || id === 'lines').map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${tab === id ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'review' && <ReviewTab account={account} siblingAccountIds={siblingIds} lockedThrough={lockedThrough} onChanged={refresh} />}
      {tab === 'reconcile' && <ReconcileTab account={account} reconciliations={reconciliations} onChanged={refresh} onGoReview={() => setTab('review')} />}

      {tab === 'lines' && (
      <section className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Statement lines</h3>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search descriptions"
            aria-label="Search statement lines"
            className={`${inputCls} !w-56`}
          />
        </div>
        {lines.length === 0 && !loadingLines ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {query ? 'No lines match that search.' : 'No statement lines yet. Use Import statement to add your first bank download.'}
          </p>
        ) : (
          <>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-24 shrink-0 text-slate-500 dark:text-slate-400 tabular-nums">{fmtDate(l.posted_date)}</span>
                  <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-200">{l.description || <em className="text-slate-400">no description</em>}</span>
                  {l.status !== 'pending_review' && <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{l.reconciliation_id ? 'Reconciled' : STATUS_LABEL[l.status]}</span>}
                  <span className={`tabular-nums ${Number(l.amount) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{money(Number(l.amount))}</span>
                </div>
              ))}
            </div>
            {hasMore && (
              <button type="button" onClick={loadMore} disabled={loadingLines} className={`${ghostBtn} mt-3`}>
                {loadingLines ? 'Loading…' : 'Show more'}
              </button>
            )}
            {loadingLines && lines.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
          </>
        )}
      </section>
      )}

      {tab === 'lines' && imports.length > 0 && (
        <section className={cardCls}>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Imports</h3>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {imports.map((imp) => (
              <li key={imp.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate text-slate-800 dark:text-slate-200">{imp.filename ?? 'Imported file'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {imp.lines_added} line{imp.lines_added === 1 ? '' : 's'} added
                    {imp.lines_skipped > 0 && `, ${imp.lines_skipped} skipped`} · {fmtDate(imp.first_date)} to {fmtDate(imp.last_date)} · imported {fmtDate(imp.created_at.slice(0, 10))}
                  </div>
                </div>
                {!readOnly && <button type="button" disabled={busyImport === imp.id} onClick={() => undoImport(imp)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-60">
                  Undo import
                </button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!readOnly && <div className="text-right">
        <button type="button" onClick={deleteAccount} className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400">
          Delete this account
        </button>
      </div>}
    </div>
  )
}
