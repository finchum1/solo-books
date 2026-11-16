import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusinesses } from '../lib/useBusinesses'
import { useAccess } from '../lib/access'
import type { BankAccount, BankAccountSummary } from '../lib/types'
import { AccountForm } from '../components/banking/AccountForm'
import { AccountDetail } from '../components/banking/AccountDetail'
import { cardCls, fmtDate, money, primaryBtn } from '../components/banking/shared'
import { errMsg } from '../lib/errors'

export function BankingPage() {
  const { businesses, writable } = useBusinesses()
  const access = useAccess()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [summaries, setSummaries] = useState<Record<string, BankAccountSummary>>({})
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<{ kind: 'list' } | { kind: 'add' } | { kind: 'account'; id: string }>({ kind: 'list' })
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const [a, s] = await Promise.all([
          supabase.from('bank_accounts').select('*').is('connection_id', null).order('name', { ascending: true }),
          supabase.rpc('bank_account_summaries'),
        ])
        if (a.error) throw a.error
        if (s.error) throw s.error
        if (cancelled) return
        setAccounts(a.data as BankAccount[])
        setSummaries(Object.fromEntries((s.data as BankAccountSummary[]).map((x) => [x.bank_account_id, { ...x, counted_sum: Number(x.counted_sum), line_count: Number(x.line_count), counted_count: Number(x.counted_count), unreviewed_count: Number(x.unreviewed_count) }])))
        setError(null)
        setLoaded(true)
      } catch (err) {
        if (!cancelled) {
          setError(errMsg(err, 'Failed to load your bank accounts.'))
          setLoaded(true)
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [tick])

  const byBusiness = useMemo(() => {
    const map = new Map<string, BankAccount[]>()
    for (const a of accounts) map.set(a.business_id, [...(map.get(a.business_id) ?? []), a])
    return map
  }, [accounts])

  const businessName = (id: string) => businesses.find((b) => b.id === id)?.name ?? ''
  const firstBusinessId = writable.find((b) => b.is_active)?.id ?? writable[0]?.id ?? ''
  const canAdd = writable.length > 0

  if (businesses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Banking</h1>
        <p className="text-sm text-amber-600 dark:text-amber-400">Add a business in Settings before adding a bank account.</p>
      </div>
    )
  }

  const open = view.kind === 'account' ? accounts.find((a) => a.id === view.id) : undefined

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Banking</h1>
        {view.kind === 'list' && accounts.length > 0 && canAdd && (
          <button type="button" onClick={() => setView({ kind: 'add' })} className={primaryBtn}>
            Add account
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}

      {view.kind === 'add' && (
        <section className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Add a bank account</h2>
          <AccountForm
            businesses={writable}
            defaultBusinessId={firstBusinessId}
            onSaved={(id) => {
              reload()
              setView({ kind: 'account', id })
            }}
            onCancel={() => setView({ kind: 'list' })}
          />
        </section>
      )}

      {open && (
        <AccountDetail
          account={open}
          summary={summaries[open.id]}
          business={businesses.find((b) => b.id === open.business_id)}
          businesses={businesses}
          readOnly={!access.canWrite(open.business_id)}
          onBack={() => setView({ kind: 'list' })}
          onChanged={reload}
        />
      )}
      {view.kind === 'account' && !open && loaded && <p className="text-sm text-slate-500 dark:text-slate-400">That account isn't there any more.</p>}

      {view.kind === 'list' &&
        (!loaded ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : accounts.length === 0 ? (
          <section className={`${cardCls} text-center py-12`}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Bring in your bank statements</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Add a checking or savings account, then upload the CSV or OFX file your bank lets you download. Next comes matching those lines to your Ledger and reconciling each month.
            </p>
            {canAdd && (
              <button type="button" onClick={() => setView({ kind: 'add' })} className={`${primaryBtn} mt-6`}>
                Add your first account
              </button>
            )}
            <p className="mx-auto mt-4 max-w-md text-xs text-slate-400 dark:text-slate-500">Solo Books never asks for your bank login. You add the statement files yourself.</p>
          </section>
        ) : (
          [...byBusiness.entries()].map(([bid, list]) => (
            <section key={bid}>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{businessName(bid)}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((a) => {
                  const s = summaries[a.id]
                  const balance = a.opening_balance + (s?.counted_sum ?? 0)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setView({ kind: 'account', id: a.id })}
                      className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5 transition hover:border-emerald-500/60"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{a.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                          {a.account_type === 'checking' ? 'Checking' : 'Savings'}
                          {a.mask ? ` ••${a.mask}` : ''}
                        </span>
                      </div>
                      <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{money(balance)}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {s && s.line_count > 0 ? `${s.line_count.toLocaleString()} lines · through ${fmtDate(s.last_date)}` : 'No statements imported yet'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        ))}
    </div>
  )
}
