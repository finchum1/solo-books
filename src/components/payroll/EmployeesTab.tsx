import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Employee, PayrollSettings } from '../../lib/types'
import { PAY_FREQUENCY_LABELS } from '../../lib/payroll/taxTables'
import { EmployeeForm, inputCls, labelCls } from './EmployeeForm'

function money(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function SutaSettings({
  businessId,
  settings,
  onSaved,
}: {
  businessId: string
  settings: PayrollSettings | undefined
  onSaved: () => void
}) {
  // Shown to the user as a percent; stored as a fraction.
  const [rate, setRate] = useState('')
  const [base, setBase] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setRate(settings ? String(Number((Number(settings.suta_rate) * 100).toFixed(4))) : '')
    setBase(settings ? String(Number(settings.suta_wage_base)) : '')
    setSaved(false)
  }, [settings, businessId])

  async function save() {
    const pct = Number(rate)
    const wageBase = Number(base)
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) return setError('Enter a rate between 0 and 100.')
    if (!Number.isFinite(wageBase) || wageBase < 0) return setError('Enter a wage base of 0 or more.')
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('payroll_settings')
        .upsert({ business_id: businessId, suta_rate: pct / 100, suta_wage_base: wageBase }, { onConflict: 'business_id' })
      if (error) throw error
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const missing = !settings || (Number(settings.suta_rate) === 0 && Number(settings.suta_wage_base) === 0)

  return (
    <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">State unemployment (SUTA)</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Use the rate and taxable wage base on your Oklahoma Employment Security Commission rate notice. Solo Books
        doesn't guess these. Until they're set, SUTA is calculated as $0.00.
      </p>
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className={labelCls}>Your SUTA rate (%)</label>
          <input type="number" min="0" step="0.0001" className={inputCls} value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Taxable wage base per employee ($)</label>
          <input type="number" min="0" step="1" className={inputCls} value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {missing && !saved && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">SUTA isn't set for this business yet.</p>
      )}
      {saved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3">Saved.</p>}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400 mt-3">{error}</p>}
    </section>
  )
}

export function EmployeesTab({
  businessId,
  employees,
  loading,
  fetchError,
  settings,
  refetchEmployees,
  refetchSettings,
}: {
  businessId: string
  employees: Employee[]
  loading: boolean
  fetchError: string | null
  settings: PayrollSettings | undefined
  refetchEmployees: () => void
  refetchSettings: () => void
}) {
  const [mode, setMode] = useState<'list' | 'add' | { editId: string }>('list')
  const [error, setError] = useState<string | null>(null)

  const list = employees.filter((e) => e.business_id === businessId)
  const editing = typeof mode === 'object' ? list.find((e) => e.id === mode.editId) : undefined

  async function toggleActive(e: Employee) {
    try {
      const { error } = await supabase.from('employees').update({ is_active: !e.is_active }).eq('id', e.id)
      if (error) throw error
      refetchEmployees()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee.')
    }
  }

  async function handleDelete(e: Employee) {
    if (!confirm(`Delete ${e.name}? This only works if they have no pay stubs. To stop paying them but keep their history, use Deactivate instead.`)) return
    try {
      const { error } = await supabase.from('employees').delete().eq('id', e.id)
      if (error) {
        if (error.message.includes('violates foreign key')) {
          throw new Error(`${e.name} has pay stubs, so they can't be deleted. Deactivate them instead.`)
        }
        throw error
      }
      refetchEmployees()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        {mode === 'list' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Employees</h2>
              <button
                onClick={() => setMode('add')}
                disabled={!businessId}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition"
              >
                Add employee
              </button>
            </div>
            {(error || fetchError) && <p className="text-sm text-rose-600 dark:text-rose-400 mb-3">{error ?? fetchError}</p>}
            {loading ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>
            ) : list.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm">No employees yet for this business.</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {list.map((e) => (
                  <li key={e.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          e.is_active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 line-through'
                        }`}
                      >
                        {e.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {e.pay_type === 'hourly' ? `${money(Number(e.pay_rate))}/hr` : `${money(Number(e.pay_rate))}/yr`} ·{' '}
                        {PAY_FREQUENCY_LABELS[e.pay_frequency]}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => setMode({ editId: e.id })} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(e)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        {e.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button onClick={() => handleDelete(e)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              {editing ? `Edit ${editing.name}` : 'Add employee'}
            </h2>
            <EmployeeForm
              businessId={businessId}
              employee={editing}
              onSaved={() => {
                setMode('list')
                refetchEmployees()
              }}
              onCancel={() => setMode('list')}
            />
          </>
        )}
      </section>

      {businessId && <SutaSettings businessId={businessId} settings={settings} onSaved={refetchSettings} />}
    </div>
  )
}
