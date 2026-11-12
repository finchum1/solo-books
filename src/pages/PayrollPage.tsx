import { useEffect, useMemo, useState } from 'react'
import { useBusinesses } from '../lib/useBusinesses'
import { useEmployees, usePayrollRuns, usePayrollSettings, usePayStubs } from '../lib/usePayroll'
import { EmployeesTab } from '../components/payroll/EmployeesTab'
import { RunPayrollTab } from '../components/payroll/RunPayrollTab'
import { HistoryTab } from '../components/payroll/HistoryTab'
import { TAX_YEAR } from '../lib/payroll/taxTables'

type Tab = 'run' | 'employees' | 'history'

const TABS: { key: Tab; label: string }[] = [
  { key: 'run', label: 'Run payroll' },
  { key: 'employees', label: 'Employees' },
  { key: 'history', label: 'History' },
]

export function PayrollPage() {
  const { businesses } = useBusinesses()
  const { employees, loading: empLoading, error: empError, refetch: refetchEmployees } = useEmployees()
  const { settings, refetch: refetchSettings } = usePayrollSettings()
  const { runs, loading: runsLoading, error: runsError, refetch: refetchRuns } = usePayrollRuns()
  const { stubs, refetch: refetchStubs } = usePayStubs()
  const [tab, setTab] = useState<Tab>('run')
  const [businessId, setBusinessId] = useState('')

  const activeBusinesses = useMemo(() => businesses.filter((b) => b.is_active), [businesses])

  useEffect(() => {
    if (!businessId && businesses.length > 0) setBusinessId((activeBusinesses[0] ?? businesses[0]).id)
  }, [businesses, activeBusinesses, businessId])

  const business = businesses.find((b) => b.id === businessId)
  const businessSettings = settings.find((s) => s.business_id === businessId)

  function afterRunChange() {
    refetchRuns()
    refetchStubs()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Payroll</h1>
        <select
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
        >
          {businesses.length === 0 && <option value="">No businesses yet</option>}
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {businesses.length === 0 ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">Add a business in Settings before setting up payroll.</p>
      ) : tab === 'run' ? (
        <RunPayrollTab
          businessId={businessId}
          employees={employees}
          settings={businessSettings}
          stubs={stubs}
          runs={runs}
          onSaved={afterRunChange}
        />
      ) : tab === 'employees' ? (
        <EmployeesTab
          businessId={businessId}
          employees={employees}
          loading={empLoading}
          fetchError={empError}
          settings={businessSettings}
          refetchEmployees={refetchEmployees}
          refetchSettings={refetchSettings}
        />
      ) : (
        <HistoryTab
          business={business}
          runs={runs}
          stubs={stubs}
          loading={runsLoading}
          error={runsError}
          onChanged={afterRunChange}
        />
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-8">
        Tax tables: {TAX_YEAR} IRS Publication 15-T and Oklahoma Tax Commission Packet OW-2. Solo Books calculates and
        records payroll. You make the tax deposits and file Forms 941, 940, your Oklahoma returns and W-2s yourself.
        Not supported yet: pre-tax deductions (401(k), health insurance), garnishments, and other states.
      </p>
    </div>
  )
}
