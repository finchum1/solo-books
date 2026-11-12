import { useMemo, useState } from 'react'
import { useBusinesses } from '../lib/useBusinesses'
import { usePayStubs, num } from '../lib/usePayroll'
import type { PayStub } from '../lib/types'
import { SOCIAL_SECURITY_RATE, TAX_YEAR } from '../lib/payroll/taxTables'

function money(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const sumOf = (stubs: PayStub[], pick: (s: PayStub) => number) => round2(stubs.reduce((a, s) => a + pick(s), 0))

function quarterOf(date: string) {
  return Math.floor((Number(date.slice(5, 7)) - 1) / 3) // 0..3
}

function summarize(stubs: PayStub[]) {
  const ssTaxEmployee = sumOf(stubs, (s) => num(s.social_security_employee))
  const ssTaxEmployer = sumOf(stubs, (s) => num(s.social_security_employer))
  const medicareEmployee = sumOf(stubs, (s) => num(s.medicare_employee))
  const medicareEmployer = sumOf(stubs, (s) => num(s.medicare_employer))
  return {
    employees: new Set(stubs.map((s) => s.employee_id)).size,
    wages: sumOf(stubs, (s) => num(s.gross)),
    bonuses: sumOf(stubs, (s) => num(s.bonus)),
    federalWithholding: sumOf(stubs, (s) => num(s.federal_withholding)),
    ssWages: round2((ssTaxEmployee) / SOCIAL_SECURITY_RATE),
    ssTax: round2(ssTaxEmployee + ssTaxEmployer),
    medicareWages: sumOf(stubs, (s) => num(s.gross)),
    medicareTax: round2(medicareEmployee + medicareEmployer),
    additionalMedicare: sumOf(stubs, (s) => num(s.additional_medicare)),
    stateWithholding: sumOf(stubs, (s) => num(s.state_withholding)),
    futa: sumOf(stubs, (s) => num(s.futa)),
    suta: sumOf(stubs, (s) => num(s.suta)),
    net: sumOf(stubs, (s) => num(s.net)),
  }
}

export function PayrollReportPage() {
  const { businesses } = useBusinesses()
  const { stubs, loading, error } = usePayStubs()
  const [businessId, setBusinessId] = useState('')
  const [year, setYear] = useState(String(TAX_YEAR))

  const effectiveBusinessId = businessId || businesses[0]?.id || ''

  const years = useMemo(() => {
    const ys = new Set<string>([String(TAX_YEAR), ...stubs.map((s) => s.pay_date.slice(0, 4))])
    return [...ys].sort().reverse()
  }, [stubs])

  const scoped = useMemo(
    () => stubs.filter((s) => s.business_id === effectiveBusinessId && s.pay_date.slice(0, 4) === year),
    [stubs, effectiveBusinessId, year],
  )

  const quarters = useMemo(
    () => [0, 1, 2, 3].map((q) => summarize(scoped.filter((s) => quarterOf(s.pay_date) === q))),
    [scoped],
  )
  const annual = useMemo(() => summarize(scoped), [scoped])

  const perEmployee = useMemo(() => {
    const byEmployee = new Map<string, PayStub[]>()
    for (const s of scoped) byEmployee.set(s.employee_name, [...(byEmployee.get(s.employee_name) ?? []), s])
    return [...byEmployee.entries()]
      .map(([name, list]) => ({ name, ...summarize(list) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [scoped])

  const quarterRows: { label: string; pick: (s: ReturnType<typeof summarize>) => number; count?: boolean }[] = [
    { label: 'Employees paid', pick: (s) => s.employees, count: true },
    { label: 'Total wages (941 line 2)', pick: (s) => s.wages },
    { label: '   of which bonuses', pick: (s) => s.bonuses },
    { label: 'Federal income tax withheld (941 line 3)', pick: (s) => s.federalWithholding },
    { label: 'Social Security wages (line 5a, col. 1)', pick: (s) => s.ssWages },
    { label: 'Social Security tax, both shares (12.4%)', pick: (s) => s.ssTax },
    { label: 'Medicare wages (line 5c, col. 1)', pick: (s) => s.medicareWages },
    { label: 'Medicare tax, both shares (2.9%)', pick: (s) => s.medicareTax },
    { label: 'Additional Medicare tax withheld (line 5d)', pick: (s) => s.additionalMedicare },
    { label: 'Oklahoma income tax withheld', pick: (s) => s.stateWithholding },
    { label: 'FUTA tax (Form 940)', pick: (s) => s.futa },
    { label: 'SUTA (state unemployment)', pick: (s) => s.suta },
  ]

  const selectCls =
    'rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Payroll report</h2>
          <div className="flex gap-3">
            <select value={effectiveBusinessId} onChange={(e) => setBusinessId(e.target.value)} className={selectCls}>
              {businesses.length === 0 && <option value="">No businesses yet</option>}
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Totals come only from payroll recorded in Solo Books, by pay date. Use them to fill in Forms 941 and 940 and
          your W-2s. Check them against your own records before you file; you are the one filing.
        </p>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400 mt-3">{error}</p>}
      </section>

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>
      ) : scoped.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500 text-sm">No payroll recorded for this business in {year}.</p>
      ) : (
        <>
          <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
              By quarter
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="pb-2 pr-4 text-left font-medium"></th>
                    {['Q1', 'Q2', 'Q3', 'Q4', 'Year'].map((h) => (
                      <th key={h} className="pb-2 pl-4 text-right font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {quarterRows.map((r) => (
                    <tr key={r.label}>
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{r.label}</td>
                      {[...quarters, annual].map((q, i) => (
                        <td key={i} className="py-2 pl-4 text-right tabular-nums text-slate-800 dark:text-slate-200">
                          {r.count ? r.pick(q) : money(r.pick(q))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
              W-2 totals by employee
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="pb-2 pr-4 text-left font-medium">Employee</th>
                    <th className="pb-2 pl-4 text-right font-medium">Box 1 wages</th>
                    <th className="pb-2 pl-4 text-right font-medium">Box 2 fed tax</th>
                    <th className="pb-2 pl-4 text-right font-medium">Box 3 SS wages</th>
                    <th className="pb-2 pl-4 text-right font-medium">Box 4 SS tax</th>
                    <th className="pb-2 pl-4 text-right font-medium">Box 5 Medicare wages</th>
                    <th className="pb-2 pl-4 text-right font-medium">Box 6 Medicare tax</th>
                    <th className="pb-2 pl-4 text-right font-medium">Box 16 OK wages</th>
                    <th className="pb-2 pl-4 text-right font-medium">Box 17 OK tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {perEmployee.map((e) => (
                    <tr key={e.name}>
                      <td className="py-2 pr-4 text-slate-800 dark:text-slate-200">{e.name}</td>
                      {[
                        e.wages,
                        e.federalWithholding,
                        e.ssWages,
                        round2(e.ssTax / 2),
                        e.medicareWages,
                        round2(e.medicareTax / 2 + e.additionalMedicare),
                        e.wages,
                        e.stateWithholding,
                      ].map((v, i) => (
                        <td key={i} className="py-2 pl-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {money(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Box 1 equals gross wages because Solo Books doesn't handle pre-tax deductions (401(k), health premiums)
              yet. If an employee has any, their Box 1 and Box 16 will be lower than shown here.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
