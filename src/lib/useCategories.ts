import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Category } from './types'

/**
 * Categories are either PERSONAL (business_id null: yours, used by any of your businesses) or belong to ONE business (a list
 * shared by everyone on its team). A business that has its own list uses only that list; one that doesn't falls back to yours.
 */
export function categoriesFor(all: Category[], businessId: string | null | undefined): Category[] {
  if (businessId && businessId !== 'all') {
    const own = all.filter((c) => c.business_id === businessId)
    if (own.length > 0) return own
  }
  return all.filter((c) => !c.business_id)
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('type', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      setCategories(data as Category[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  /** The category list to offer when working in this business. */
  const forBusiness = useCallback((businessId: string | null | undefined) => categoriesFor(categories, businessId), [categories])

  return { categories, forBusiness, loading, error, refetch }
}
