import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { Employee } from '../../lib/types'
import {
  FEDERAL_FILING_LABELS,
  OKLAHOMA_FILING_LABELS,
  PAY_FREQUENCY_LABELS,
} from '../../lib/payroll/taxTables'
import type { FederalFilingStatus, OklahomaFilingStatus, PayFrequency } from '../../lib/payroll/taxTables'

export const inputCls =
  'w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
export const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1'

interface FormState {
  name: string
  hire_date: string
  pay_type: 'hourly' | 'salary'
  pay_rate: string
  pay_frequency: PayFrequency
  federal_filing_status: FederalFilingStatus
  w4_step2_checked: boolean
  w4_step3_credits: string
  w4_step4a_other_income: string
  w4_step4b_deductions: string
  w4_step4c_extra: string
  oklahoma_filing_status: OklahomaFilingStatus
  oklahoma_allowances: string
}

function toState(e?: Employee): FormState {
  return {
    name: e?.name ?? '',
    hire_date: e?.hire_date ?? '',
    pay_type: e?.pay_type ?? 'hourly',
    pay_rate: e ? String(e.pay_rate) : '',
    pay_frequency: e?.pay_frequency ?? 'biweekly',
    federal_filing_status: e?.federal_filing_status ?? 'single',
    w4_step2_checked: e?.w4_step2_checked ?? false,
    w4_step3_credits: e ? String(e.w4_step3_credits) : '0',
    w4_step4a_other_income: e ? String(e.w4_step4a_other_income) : '0',
    w4_step4b_deductions: e ? String(e.w4_step4b_deductions) : '0',
    w4_step4c_extra: e ? String(e.w4_step4c_extra) : '0',
    oklahoma_filing_status: e?.oklahoma_filing_status ?? 'single',
    oklahoma_allowances: e ? String(e.oklahoma_allowances) : '0',
  }
}

export function EmployeeForm({
  businessId,
  employee,
  onSaved,
  onCancel,
}: {
  businessId: string
  employee?: Employee
  onSaved: () => void
  onCancel: () => void
}) {
  const [f, setF] = useState<FormState>(() => toState(employee))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setF((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const rate = Number(f.pay_rate)
    if (!f.name.trim()) return setError('Name is required.')
    if (!Number.isFinite(rate) || rate <= 0) {
      return setError(f.pay_type === 'hourly' ? 'Enter an hourly rate above zero.' : 'Enter an annual salary above zero.')
    }
    const allowances = Math.floor(Number(f.oklahoma_allowances))
    if (!Number.isFinite(allowances) || allowances < 0) return setError('Oklahoma allowances must be 0 or more.')

    const row = {
      name: f.name.trim(),
      hire_date: f.hire_date || null,
      pay_type: f.pay_type,
      pay_rate: rate,
      pay_frequency: f.pay_frequency,
      federal_filing_status: f.federal_filing_status,
      w4_step2_checked: f.w4_step2_checked,
      w4_step3_credits: Number(f.w4_step3_credits) || 0,
      w4_step4a_other_income: Number(f.w4_step4a_other_income) || 0,
      w4_step4b_deductions: Number(f.w4_step4b_deductions) || 0,
      w4_step4c_extra: Number(f.w4_step4c_extra) || 0,
      oklahoma_filing_status: f.oklahoma_filing_status,
      oklahoma_allowances: allowances,
    }

    setSaving(true)
    setError(null)
    try {
      const { error } = employee
        ? await supabase.from('employees').update(row).eq('id', employee.id)
        : await supabase.from('employees').insert({ ...row, business_id: businessId })
      if (error) throw error
      onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save employee.'
      setError(msg.includes('duplicate') ? 'This business already has an employee with that name.' : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Full name</label>
          <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Hire date (optional)</label>
          <input type="date" className={inputCls} value={f.hire_date} onChange={(e) => set('hire_date', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Pay type</label>
          <select className={inputCls} value={f.pay_type} onChange={(e) => set('pay_type', e.target.value as FormState['pay_type'])}>
            <option value="hourly">Hourly</option>
            <option value="salary">Salary</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>{f.pay_type === 'hourly' ? 'Hourly rate ($)' : 'Annual salary ($)'}</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className={inputCls}
            value={f.pay_rate}
            onChange={(e) => set('pay_rate', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Pay frequency</label>
          <select
            className={inputCls}
            value={f.pay_frequency}
            onChange={(e) => set('pay_frequency', e.target.value as PayFrequency)}
          >
            {(Object.keys(PAY_FREQUENCY_LABELS) as PayFrequency[]).map((k) => (
              <option key={k} value={k}>
                {PAY_FREQUENCY_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Federal Form W-4 (2020 or later)
        </legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Step 1(c) filing status</label>
            <select
              className={inputCls}
              value={f.federal_filing_status}
              onChange={(e) => set('federal_filing_status', e.target.value as FederalFilingStatus)}
            >
              {(Object.keys(FEDERAL_FILING_LABELS) as FederalFilingStatus[]).map((k) => (
                <option key={k} value={k}>
                  {FEDERAL_FILING_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={f.w4_step2_checked}
              onChange={(e) => set('w4_step2_checked', e.target.checked)}
              className="rounded"
            />
            Step 2 box is checked (multiple jobs / working spouse)
          </label>
          <div>
            <label className={labelCls}>Step 3: credits, yearly ($)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={f.w4_step3_credits} onChange={(e) => set('w4_step3_credits', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Step 4(a): other income, yearly ($)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={f.w4_step4a_other_income} onChange={(e) => set('w4_step4a_other_income', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Step 4(b): deductions, yearly ($)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={f.w4_step4b_deductions} onChange={(e) => set('w4_step4b_deductions', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Step 4(c): extra per paycheck ($)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={f.w4_step4c_extra} onChange={(e) => set('w4_step4c_extra', e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Copy these straight from the employee's signed W-4. Leave Steps 3 and 4 at 0 if they left them blank.
          This calculator only supports 2020-or-later W-4s.
        </p>
      </fieldset>

      <fieldset className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Oklahoma Form OK-W-4
        </legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Marital status</label>
            <select
              className={inputCls}
              value={f.oklahoma_filing_status}
              onChange={(e) => set('oklahoma_filing_status', e.target.value as OklahomaFilingStatus)}
            >
              {(Object.keys(OKLAHOMA_FILING_LABELS) as OklahomaFilingStatus[]).map((k) => (
                <option key={k} value={k}>
                  {OKLAHOMA_FILING_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Withholding allowances</label>
            <input type="number" min="0" step="1" className={inputCls} value={f.oklahoma_allowances} onChange={(e) => set('oklahoma_allowances', e.target.value)} />
          </div>
        </div>
      </fieldset>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition"
        >
          {saving ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
