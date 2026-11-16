import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Business } from './types'
import { useAccess } from './access'

export function useBusinesses() {
  const access = useAccess()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      setBusinesses(data as Business[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  // Everything you can SEE is in `businesses`; these are the ones you may add to or change, and whose payroll you may open.
  const writable = businesses.filter((b) => access.canWrite(b.id))
  const payroll = businesses.filter((b) => access.canPayroll(b.id))
  return { businesses, writable, payroll, loading, error, refetch }
}
