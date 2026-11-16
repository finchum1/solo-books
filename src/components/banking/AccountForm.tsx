import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { BankAccount, Business } from '../../lib/types'
import { inputCls, labelCls, primaryBtn, ghostBtn } from './shared'
import { errMsg } from '../../lib/errors'

export function AccountForm({
  businesses,
  defaultBusinessId,
  account,
  onSaved,
  onCancel,
}: {
  businesses: Business[]
  defaultBusinessId: string
  account?: BankAccount
  onSaved: (id: string) => void
  onCancel: () => void
}) {
  const [businessId, setBusinessId] = useState(account?.business_id ?? defaultBusinessId)
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<'checking' | 'savings'>(account?.account_type ?? 'checking')
  const [mask, setMask] = useState(account?.mask ?? '')
  const [balance, setBalance] = useState(account ? String(account.opening_balance) : '')
  const [asOf, setAsOf] = useState(account?.opening_balance_date ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const bal = Number(balance.replace(/[$,\s]/g, ''))
    if (!name.trim()) return setError('Give the account a name, such as "Business Checking".')
    if (balance.trim() === '' || !Number.isFinite(bal)) return setError('Enter the opening balance (use 0 if the account was empty).')
    if (!asOf) return setError('Enter the date that balance was true on.')
    if (mask && !/^\d{1,4}$/.test(mask)) return setError('Last digits: enter up to 4 digits, never the full account number.')
    const row = {
      name: name.trim(),
      account_type: type,
      mask: mask || null,
      opening_balance: Math.round(bal * 100) / 100,
      opening_balance_date: asOf,
    }
    setSaving(true)
    setError(null)
    try {
      if (account) {
        const { error } = await supabase.from('bank_accounts').update(row).eq('id', account.id)
        if (error) throw error
        onSaved(account.id)
      } else {
        const { data, error } = await supabase.from('bank_accounts').insert({ ...row, business_id: businessId }).select('id').single()
        if (error) throw error
        onSaved(data.id as string)
      }
    } catch (err) {
      const msg = errMsg(err, 'Failed to save the account.')
      setError(msg.includes('bank_accounts_business_name_key') || msg.includes('duplicate') ? 'This business already has an account with that name.' : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Business</label>
          <select className={inputCls} value={businessId} onChange={(e) => setBusinessId(e.target.value)} disabled={!!account}>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Account name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Business Checking" />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as 'checking' | 'savings')}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Last 4 digits (optional)</label>
          <input className={inputCls} inputMode="numeric" maxLength={4} value={mask} onChange={(e) => setMask(e.target.value.replace(/\D/g, ''))} placeholder="1234" />
        </div>
      </div>

      <fieldset className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Starting point</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Opening balance ($)</label>
            <input className={inputCls} inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="2500.00" />
          </div>
          <div>
            <label className={labelCls}>Balance as of (end of this day)</label>
            <input type="date" className={inputCls} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Use the ending balance from the statement just before the first one you'll import. Only statement lines dated after this day count toward the account's balance, so importing older history later can't double count it.
        </p>
      </fieldset>

      <p className="text-xs text-slate-400 dark:text-slate-500">Solo Books never asks for your bank login or full account number. You add statement files yourself.</p>
      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? 'Saving…' : account ? 'Save changes' : 'Add account'}
        </button>
        <button type="button" onClick={onCancel} className={ghostBtn}>
          Cancel
        </button>
      </div>
    </form>
  )
}
