import { useState } from 'react'
import type { Business, PayrollRun, PayStub } from '../../lib/types'
import type { PayStubPDFItem } from '../../lib/pdf/PayStubPDF'
import { deletePayrollRun } from '../../lib/payroll/postRun'
import { getLogoUrl } from '../../lib/logos'
import { num } from '../../lib/usePayroll'

function money(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function toPdfItem(stub: PayStub, run: PayrollRun | undefined, allStubs: PayStub[]): PayStubPDFItem {
  const year = stub.pay_date.slice(0, 4)
  const same = allStubs.filter(
    (s) => s.employee_id === stub.employee_id && s.pay_date.slice(0, 4) === year && s.pay_date <= stub.pay_date,
  )
  const total = (pick: (s: PayStub) => number) => same.reduce((a, s) => a + pick(s), 0)
  return {
    employeeName: stub.employee_name,
    payDate: stub.pay_date,
    periodStart: run?.period_start ?? null,
    periodEnd: run?.period_end ?? null,
    regularHours: num(stub.regular_hours),
    overtimeHours: num(stub.overtime_hours),
    bonus: num(stub.bonus),
    gross: num(stub.gross),
    federalWithholding: num(stub.federal_withholding),
    socialSecurityEmployee: num(stub.social_security_employee),
    medicareEmployee: num(stub.medicare_employee),
    additionalMedicare: num(stub.additional_medicare),
    stateWithholding: num(stub.state_withholding),
    net: num(stub.net),
    ytd: {
      gross: total((s) => num(s.gross)),
      bonus: total((s) => num(s.bonus)),
      federal: total((s) => num(s.federal_withholding)),
      socialSecurity: total((s) => num(s.social_security_employee)),
      medicare: total((s) => num(s.medicare_employee) + num(s.additional_medicare)),
      state: total((s) => num(s.state_withholding)),
      net: total((s) => num(s.net)),
    },
  }
}

export function HistoryTab({
  business,
  runs,
  stubs,
  loading,
  error: fetchError,
  onChanged,
}: {
  business: Business | undefined
  runs: PayrollRun[]
  stubs: PayStub[]
  loading: boolean
  error: string | null
  onChanged: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const businessRuns = runs.filter((r) => r.business_id === business?.id)

  async function openPdf(key: string, items: PayStubPDFItem[], filename: string) {
    if (!business) return
    const newTab = window.open('', '_blank', 'noopener,noreferrer')
    setBusy(key)
    setError(null)
    try {
      const [{ pdf }, { PayStubPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../lib/pdf/PayStubPDF'),
      ])
      const blob = await pdf(
        <PayStubPDF
          businessName={business.name}
          logoUrl={business.logo_path ? getLogoUrl(business.logo_path) : null}
          stubs={items}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      if (newTab) {
        newTab.location.href = url
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } catch (err) {
      newTab?.close()
      setError(err instanceof Error ? err.message : 'Failed to generate PDF.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(run: PayrollRun) {
    if (
      !confirm(
        `Delete the ${run.pay_date} payroll run? This removes its pay stubs and the two expense entries it added to your Ledger. This can't be undone.`,
      )
    )
      return
    setBusy(run.id)
    setError(null)
    try {
      await deletePayrollRun(run)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payroll run.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Payroll history</h2>
      {(error || fetchError) && <p className="text-sm text-rose-600 dark:text-rose-400 mb-3">{error ?? fetchError}</p>}
      {loading ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>
      ) : businessRuns.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500 text-sm">No payroll recorded yet for this business.</p>
      ) : (
        <ul className="space-y-4">
          {businessRuns.map((run) => {
            const runStubs = stubs.filter((s) => s.run_id === run.id)
            const gross = runStubs.reduce((a, s) => a + num(s.gross), 0)
            const net = runStubs.reduce((a, s) => a + num(s.net), 0)
            return (
              <li key={run.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{run.pay_date}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {runStubs.length} employee{runStubs.length === 1 ? '' : 's'} · gross {money(gross)} · net {money(net)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={busy !== null}
                      onClick={() =>
                        openPdf(run.id, runStubs.map((s) => toPdfItem(s, run, stubs)), `pay-stubs-${run.pay_date}.pdf`)
                      }
                      className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-60"
                    >
                      {busy === run.id ? 'Working…' : 'All pay stubs (PDF)'}
                    </button>
                    <button
                      disabled={busy !== null}
                      onClick={() => handleDelete(run)}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-60"
                    >
                      Delete run
                    </button>
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
                  {runStubs.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{s.employee_name}</span>
                      <span className="flex items-center gap-4">
                        <span className="tabular-nums text-slate-500 dark:text-slate-400">{money(num(s.net))} net</span>
                        <button
                          disabled={busy !== null}
                          onClick={() =>
                            openPdf(s.id, [toPdfItem(s, run, stubs)], `pay-stub-${s.employee_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${s.pay_date}.pdf`)
                          }
                          className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-60"
                        >
                          {busy === s.id ? 'Working…' : 'Pay stub'}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
