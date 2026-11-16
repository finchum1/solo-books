import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'

/**
 * Who can do what, per business. The database enforces all of it (row-level security); this only decides what to SHOW,
 * so a view-only person is not offered buttons that would fail.
 *   owner       created the business: everything
 *   admin       everything except deleting the business, plus managing the team
 *   bookkeeper  everything except managing the team (payroll included)
 *   viewer      read-only, and no payroll
 */
export type Role = 'owner' | 'admin' | 'bookkeeper' | 'viewer'

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', admin: 'Admin', bookkeeper: 'Bookkeeper', viewer: 'View-only' }
export const ROLE_HELP: Record<Exclude<Role, 'owner'>, string> = {
  admin: 'Everything a bookkeeper can do, plus add and remove people.',
  bookkeeper: 'The ledger, receipts, budgets, banking and payroll. Cannot manage people.',
  viewer: 'Can read the books and reports. Cannot change anything or see payroll.',
}

interface Access {
  ready: boolean
  userId: string
  roleOf: (businessId: string) => Role | null
  canWrite: (businessId: string) => boolean
  canPayroll: (businessId: string) => boolean
  canManage: (businessId: string) => boolean
  /** Businesses this person can add or change things in. */
  writableIds: string[]
  /** Businesses whose payroll this person may see. */
  payrollIds: string[]
  refresh: () => void
}

const Ctx = createContext<Access | null>(null)

export function AccessProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [roles, setRoles] = useState<Map<string, Role>>(new Map())
  const [ready, setReady] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const [b, m] = await Promise.all([supabase.from('businesses').select('id,owner_id'), supabase.from('business_members').select('business_id,role').eq('user_id', userId)])
      if (cancelled || b.error || m.error) return
      const next = new Map<string, Role>()
      for (const row of b.data ?? []) next.set(row.id as string, row.owner_id === userId ? 'owner' : 'viewer')
      for (const row of m.data ?? []) next.set(row.business_id as string, row.role as Role)
      setRoles(next)
      setReady(true)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [userId, tick])

  const value = useMemo<Access>(() => {
    // Until the roles load, show everything: the database is the real gate, and owners (nearly everyone today) should not see a flash of locked screens.
    const roleOf = (id: string) => roles.get(id) ?? null
    const ok = (id: string, allowed: Role[]) => (!ready ? true : allowed.includes(roles.get(id) as Role))
    const ids = (allowed: Role[]) => [...roles].filter(([, r]) => allowed.includes(r)).map(([id]) => id)
    return {
      ready,
      userId,
      roleOf,
      canWrite: (id) => ok(id, ['owner', 'admin', 'bookkeeper']),
      canPayroll: (id) => ok(id, ['owner', 'admin', 'bookkeeper']),
      canManage: (id) => ok(id, ['owner', 'admin']),
      writableIds: ids(['owner', 'admin', 'bookkeeper']),
      payrollIds: ids(['owner', 'admin', 'bookkeeper']),
      refresh: () => setTick((n) => n + 1),
    }
  }, [roles, ready, userId])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAccess(): Access {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAccess must be used inside AccessProvider')
  return v
}
