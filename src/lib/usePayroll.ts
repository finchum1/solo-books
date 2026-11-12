import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Employee, PayrollRun, PayrollSettings, PayStub } from './types'

/**
 * Small fetch-on-mount hook factory shared by the payroll tables, matching the
 * shape of useBusinesses/useContractors (rows + loading + error + refetch).
 * Numeric columns come back from PostgREST as numbers for `numeric` types in
 * supabase-js, but are coerced where it matters (see `num`).
 */
function useTable<T>(table: string, orderBy: { column: string; ascending: boolean }[]) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from(table).select('*')
      for (const o of orderBy) query = query.order(o.column, { ascending: o.ascending })
      const { data, error } = await query
      if (error) throw error
      setRows(data as T[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${table}.`)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { rows, loading, error, refetch }
}

export function useEmployees() {
  const { rows, ...rest } = useTable<Employee>('employees', [{ column: 'name', ascending: true }])
  return { employees: rows, ...rest }
}

export function usePayrollSettings() {
  const { rows, ...rest } = useTable<PayrollSettings>('payroll_settings', [])
  return { settings: rows, ...rest }
}

export function usePayrollRuns() {
  const { rows, ...rest } = useTable<PayrollRun>('payroll_runs', [
    { column: 'pay_date', ascending: false },
    { column: 'created_at', ascending: false },
  ])
  return { runs: rows, ...rest }
}

export function usePayStubs() {
  const { rows, ...rest } = useTable<PayStub>('pay_stubs', [{ column: 'pay_date', ascending: false }])
  return { stubs: rows, ...rest }
}

/** PostgREST returns `numeric` as a number or numeric string depending on the client path; normalize. */
export const num = (v: unknown) => Number(v ?? 0)
