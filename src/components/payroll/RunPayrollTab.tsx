import { useMemo, useState } from 'react'
import type { Employee, PayrollRun, PayrollSettings, PayStub } from '../../lib/types'
import { calculatePayStub, grossForPeriod } from '../../lib/payroll/calc'
import type { TaxProfile } from '../../lib/payroll/calc'
import { BONUS_METHOD_LABELS, PAY_FREQUENCY_LABELS, TAX_YEAR } from '../../lib/payroll/taxTables'
import type { BonusMethod } from '../../lib/payroll/taxTables'
import { savePayrollRun } from '../../lib/payroll/postRun'
import { num } from '../../lib/usePayroll'
import { inputCls, labelCls } from './EmployeeForm'

const today = () => new Date().toISOString().slice(0, 10)

function money(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function profileOf(e: Employee): TaxProfile {
  return {
    payFrequency: e.pay_frequency,
    federalFilingStatus: e.federal_filing_status,
    w4Step2Checked: e.w4_step2_checked,
    w4Step3Credits: num(e.w4_step3_credits),
    w4Step4aOtherIncome: num(e.w4_step4a_other_income),
    w4Step4bDeductions: num(e.w4_step4b_deductions),
    w4Step4cExtra: num(e.w4_step4c_extra),
    oklahomaFilingStatus: e.oklahoma_filing_status,
    oklahomaAllowances: e.oklahoma_allowances,
  }
}

interface Hours {
  regular: string
  overtime: string
  bonus: string
}

export function RunPayrollTab({
  businessId,
  employees,
  settings,
  stubs,
  runs,
  onSaved,
}: {
  businessId: string
  employees: Employee[]
  settings: PayrollSettings | undefined
  stubs: PayStub[]
  runs: PayrollRun[]
  onSaved: () => void
}) {
  const [payDate, setPayDate] = useState(today())
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [hours, setHours] = useState<Record<string, Hours>>({})
  const [bonusOnly, setBonusOnly] = useState(false)
  const [bonusMethod, setBonusMethod] = useState<BonusMethod>('flat')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const active = useMemo(
    () => employees.filter((e) => e.business_id === businessId && e.is_active),
    [employees, businessId],
  )

  const sutaRate = num(settings?.suta_rate)
  const sutaWageBase = num(settings?.suta_wage_base)
  const sutaMissing = sutaRate === 0 && sutaWageBase === 0
  const payYear = Number(payDate.slice(0, 4))
  const wrongYear = payDate.length === 10 && payYear !== TAX_YEAR
  const dupRun = runs.some((r) => r.business_id === businessId && r.pay_date === payDate)

  const rows = useMemo(() => {
    return active.map((e) => {
      const h = hours[e.id] ?? { regular: '', overtime: '', bonus: '' }
      const regularHours = Number(h.regular) || 0
      const overtimeHours = Number(h.overtime) || 0
      const bonus = Math.max(0, Number(h.bonus) || 0)
      const regular = bonusOnly
        ? 0
        : grossForPeriod({
            payType: e.pay_type,
            payRate: num(e.pay_rate),
            payFrequency: e.pay_frequency,
            regularHours,
            overtimeHours,
          })
      const prior = stubs.filter(
        (s) => s.employee_id === e.id && s.pay_date.slice(0, 4) === String(payYear) && s.pay_date <= payDate,
      )
      const result = calculatePayStub({
        regular,
        bonus,
        bonusMethod,
        profile: profileOf(e),
        ytd: {
          wages: prior.reduce((a, s) => a + num(s.gross), 0),
          supplementalWages: prior.reduce((a, s) => a + num(s.bonus), 0),
        },
        business: { sutaRate, sutaWageBase },
      })
      return {
        employee: e,
        regularHours: bonusOnly ? 0 : regularHours,
        overtimeHours: bonusOnly ? 0 : overtimeHours,
        result,
        included: !excluded.has(e.id) && result.gross > 0,
      }
    })
  }, [active, hours, excluded, stubs, payDate, payYear, sutaRate, sutaWageBase, bonusOnly, bonusMethod])

  const included = rows.filter((r) => r.included)
  const totals = included.reduce(
    (t, r) => ({
      gross: t.gross + r.result.gross,
      net: t.net + r.result.net,
      employeeTaxes: t.employeeTaxes + r.result.totalEmployeeDeductions,
      employerTaxes: t.employerTaxes + r.result.totalEmployerTaxes,
    }),
    { gross: 0, net: 0, employeeTaxes: 0, employerTaxes: 0 },
  )

  function setHour(id: string, key: keyof Hours, value: string) {
    setHours((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { regular: '', overtime: '', bonus: '' }), [key]: value } }))
  }

  function toggleIncluded(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function finalize() {
    setError(null)
    setDone(null)
    if (wrongYear) return setError(`Payroll tax tables in this app are for ${TAX_YEAR}. Pick a ${TAX_YEAR} pay date.`)
    if (included.length === 0) return setError('Nothing to pay: enter hours for at least one employee.')
    const msg = `Record payroll for ${included.length} employee${included.length === 1 ? '' : 's'}?\n\nGross wages ${money(totals.gross)}, employer taxes ${money(totals.employerTaxes)}. This adds two expense entries to your ledger.`
    if (!confirm(msg)) return

    setSaving(true)
    try {
      await savePayrollRun({
        businessId,
        payDate,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        stubs: included.map((r) => ({
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          regularHours: r.regularHours,
          overtimeHours: r.overtimeHours,
          result: r.result,
        })),
      })
      setHours({})
      setExcluded(new Set())
      setBonusOnly(false)
      setDone(`Payroll recorded for ${payDate}. Pay stubs are in History.`)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payroll.')
    } finally {
      setSaving(false)
    }
  }

  if (active.length === 0) {
    return (
      <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No active employees for this business yet. Add one on the Employees tab first.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Run payroll</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Pay date</label>
            <input type="date" className={inputCls} value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Period start (optional)</label>
            <input type="date" className={inputCls} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Period end (optional)</label>
            <input type="date" className={inputCls} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={bonusOnly} onChange={(e) => setBonusOnly(e.target.checked)} className="rounded" />
            Bonus-only payroll (no regular wages this time)
          </label>
          <div>
            <label className={labelCls}>How to withhold income tax on bonuses</label>
            <select className={inputCls} value={bonusMethod} onChange={(e) => setBonusMethod(e.target.value as BonusMethod)}>
              {(Object.keys(BONUS_METHOD_LABELS) as BonusMethod[]).map((k) => (
                <option key={k} value={k}>
                  {BONUS_METHOD_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {wrongYear && (
          <p className="text-sm text-rose-600 dark:text-rose-400 mt-3">
            The tax tables in Solo Books are for {TAX_YEAR}. Payroll can't be run for {payYear} until they're updated.
          </p>
        )}
        {dupRun && !wrongYear && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            Payroll was already recorded for this business on {payDate}. Check History before running another.
          </p>
        )}
        {sutaMissing && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            SUTA isn't set for this business, so it's being calculated as $0.00. Set it on the Employees tab.
          </p>
        )}
      </section>

      <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <th className="pb-2 pr-3 font-medium">Pay</th>
              <th className="pb-2 pr-3 font-medium">Employee</th>
              <th className="pb-2 pr-3 font-medium">Hours</th>
              <th className="pb-2 pr-3 font-medium">Bonus</th>
              <th className="pb-2 pr-3 font-medium text-right">Gross</th>
              <th className="pb-2 pr-3 font-medium text-right">Fed</th>
              <th className="pb-2 pr-3 font-medium text-right">FICA</th>
              <th className="pb-2 pr-3 font-medium text-right">OK</th>
              <th className="pb-2 font-medium text-right">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map(({ employee: e, result: r, included: inc }) => (
              <tr key={e.id} className={inc ? '' : 'opacity-50'}>
                <td className="py-2 pr-3">
                  <input type="checkbox" checked={!excluded.has(e.id)} onChange={() => toggleIncluded(e.id)} aria-label={`Include ${e.name}`} />
                </td>
                <td className="py-2 pr-3 text-slate-800 dark:text-slate-200">
                  {e.name}
                  <div className="text-xs text-slate-400 dark:text-slate-500">{PAY_FREQUENCY_LABELS[e.pay_frequency]}</div>
                </td>
                <td className="py-2 pr-3">
                  {bonusOnly ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Bonus only</span>
                  ) : e.pay_type === 'hourly' ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="Reg"
                        value={hours[e.id]?.regular ?? ''}
                        onChange={(ev) => setHour(e.id, 'regular', ev.target.value)}
                        className={`${inputCls} !w-20`}
                        aria-label={`${e.name} regular hours`}
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="OT"
                        value={hours[e.id]?.overtime ?? ''}
                        onChange={(ev) => setHour(e.id, 'overtime', ev.target.value)}
                        className={`${inputCls} !w-20`}
                        aria-label={`${e.name} overtime hours`}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Salary</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={hours[e.id]?.bonus ?? ''}
                    onChange={(ev) => setHour(e.id, 'bonus', ev.target.value)}
                    className={`${inputCls} !w-24`}
                    aria-label={`${e.name} bonus`}
                  />
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {money(r.gross)}
                  {r.bonusMethodUsed === 'flat' && bonusMethod === 'aggregate' && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400">flat rate used (no regular pay)</div>
                  )}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{money(r.federalWithholding)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {money(r.socialSecurityEmployee + r.medicareEmployee + r.additionalMedicare)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{money(r.stateWithholding)}</td>
                <td className="py-2 text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">{money(r.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          Hourly employees: enter regular hours and overtime hours (overtime is paid at 1.5×). Salaried employees
          fill in automatically. Bonuses are added on top and are fully subject to Social Security and Medicare;
          only the income-tax withholding differs. Rows with $0.00 gross are skipped.
        </p>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Gross wages', totals.gross],
          ['Withheld from employees', totals.employeeTaxes],
          ['Net pay', totals.net],
          ['Employer taxes', totals.employerTaxes],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label as string}</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{money(value as number)}</div>
          </div>
        ))}
      </section>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {done && <p className="text-sm text-emerald-600 dark:text-emerald-400">{done}</p>}
      <button
        onClick={finalize}
        disabled={saving || included.length === 0}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium px-5 py-2.5 text-sm transition"
      >
        {saving ? 'Recording…' : 'Record payroll'}
      </button>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Recording payroll saves the pay stubs and adds two expenses to your Ledger: gross wages and the employer's
        share of payroll taxes. It does not pay your employees or the tax agencies. You still make those deposits
        yourself.
      </p>
    </div>
  )
}
