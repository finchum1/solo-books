import { supabase } from './supabase'
import { errMsg } from './errors'
import { fetchAllRows } from './fetchAll'
import { addDays } from './bankMatch'
import { createMatch, recomputeDifference } from './bankActions'
import { remainingFor, unitKey } from './payrollMatch'
import type { PayrollRunInfo, PayrollStub } from './payrollMatch'

/** Database side of payroll auto-matching: gather what each run still needs, and apply a confirmed suggestion. */

export interface PayrollContext {
  runs: PayrollRunInfo[]
  /** Cash each unit (match group, or a run with none) still needs. */
  remaining: Record<string, number>
  /** Match groups holding lines from a finished reconciliation. */
  lockedGroups: Set<string>
  /** Runs that are part-way through being matched: some cash found, some still missing (usually tax deposits). */
  partial: { key: string; runIds: string[]; payDates: string[]; total: number; covered: number; remaining: number }[]
}

export const EMPTY_PAYROLL: PayrollContext = { runs: [], remaining: {}, lockedGroups: new Set(), partial: [] }

const fail = (err: unknown, fallback: string) => new Error(errMsg(err, fallback))
const num = (v: unknown) => Number(v ?? 0)

interface RunRow {
  id: string
  pay_date: string
  wage_transaction_id: string | null
  tax_transaction_id: string | null
}
interface TxRow {
  id: string
  amount: number
  bank_match_id: string | null
}

export async function loadPayrollContext(businessId: string, from: string, to: string): Promise<PayrollContext> {
  // Deposits can lag a run by a quarter (FUTA/SUTA), so look back far enough to see them.
  const runRows = await fetchAllRows<RunRow>((a, b) =>
    supabase.from('payroll_runs').select('id,pay_date,wage_transaction_id,tax_transaction_id').eq('business_id', businessId).gte('pay_date', addDays(from, -135)).lte('pay_date', addDays(to, 5)).order('pay_date').order('id').range(a, b),
  )
  if (runRows.length === 0) return EMPTY_PAYROLL
  const runIds = runRows.map((r) => r.id)
  const entryIds = runRows.flatMap((r) => [r.wage_transaction_id, r.tax_transaction_id]).filter((x): x is string => !!x)

  const [stubRows, txRows] = await Promise.all([
    fetchAllRows<Record<string, unknown>>((a, b) => supabase.from('pay_stubs').select('*').in('run_id', runIds).order('id').range(a, b)),
    entryIds.length ? fetchAllRows<TxRow>((a, b) => supabase.from('transactions').select('id,amount,bank_match_id').in('id', entryIds).order('id').range(a, b)) : Promise.resolve([] as TxRow[]),
  ])
  const tx = new Map(txRows.map((t) => [t.id, t]))
  const groupIds = [...new Set(txRows.map((t) => t.bank_match_id).filter((g): g is string => !!g))]

  const [groupEntries, groupLines] = groupIds.length
    ? await Promise.all([
        fetchAllRows<{ id: string; bank_match_id: string }>((a, b) => supabase.from('transactions').select('id,bank_match_id').in('bank_match_id', groupIds).order('id').range(a, b)),
        fetchAllRows<{ id: string; match_id: string; amount: number; reconciliation_id: string | null }>((a, b) =>
          supabase.from('bank_transactions').select('id,match_id,amount,reconciliation_id').in('match_id', groupIds).order('id').range(a, b),
        ),
      ])
    : [[], []]

  const known = new Set(entryIds)
  const foreignGroups = new Set(groupEntries.filter((e) => !known.has(e.id)).map((e) => e.bank_match_id))
  const lockedGroups = new Set(groupLines.filter((l) => l.reconciliation_id).map((l) => l.match_id))
  const linesByGroup = new Map<string, number>()
  for (const l of groupLines) linesByGroup.set(l.match_id, Math.round(((linesByGroup.get(l.match_id) ?? 0) + -num(l.amount)) * 100) / 100)

  const stubsByRun = new Map<string, PayrollStub[]>()
  for (const s of stubRows) {
    const stub: PayrollStub = {
      id: String(s.id),
      employeeName: String(s.employee_name),
      net: num(s.net),
      federalWithholding: num(s.federal_withholding),
      ssEmployee: num(s.social_security_employee),
      medicareEmployee: num(s.medicare_employee),
      additionalMedicare: num(s.additional_medicare),
      stateWithholding: num(s.state_withholding),
      ssEmployer: num(s.social_security_employer),
      medicareEmployer: num(s.medicare_employer),
      futa: num(s.futa),
      suta: num(s.suta),
    }
    const k = String(s.run_id)
    stubsByRun.set(k, [...(stubsByRun.get(k) ?? []), stub])
  }

  const runs: PayrollRunInfo[] = runRows.map((r) => {
    const wage = r.wage_transaction_id ? tx.get(r.wage_transaction_id) : undefined
    const taxTx = r.tax_transaction_id ? tx.get(r.tax_transaction_id) : undefined
    const a = wage?.bank_match_id ?? null
    const b = taxTx?.bank_match_id ?? null
    const groupId = a ?? b
    const conflicting = !!a && !!b && a !== b
    const eligible = !!wage && !conflicting && !(groupId && foreignGroups.has(groupId))
    return { id: r.id, payDate: r.pay_date, stubs: stubsByRun.get(r.id) ?? [], groupId, eligible }
  })

  // What each unit still needs.
  const cost = new Map<string, number>() // unit -> entries total
  const members = new Map<string, PayrollRunInfo[]>()
  for (const run of runs) {
    const row = runRows.find((x) => x.id === run.id)!
    const total = num(tx.get(row.wage_transaction_id ?? '')?.amount) + num(tx.get(row.tax_transaction_id ?? '')?.amount)
    const k = unitKey(run)
    cost.set(k, Math.round(((cost.get(k) ?? 0) + total) * 100) / 100)
    members.set(k, [...(members.get(k) ?? []), run])
  }
  const remaining: Record<string, number> = {}
  const partial: PayrollContext['partial'] = []
  for (const [k, total] of cost) {
    const covered = k.startsWith('run:') ? 0 : (linesByGroup.get(k) ?? 0)
    const rem = remainingFor(total, covered)
    remaining[k] = rem
    if (covered > 0.005 && rem > 0.005) {
      const ms = members.get(k) ?? []
      partial.push({ key: k, runIds: ms.map((m) => m.id), payDates: ms.map((m) => m.payDate), total, covered, remaining: rem })
    }
  }
  return { runs, remaining, lockedGroups, partial }
}

/**
 * Applies a confirmed suggestion: the line joins its payroll run's match group (created if the run has none),
 * the run's wages and employer-tax entries join it, and if the line pays several runs at once their groups are
 * merged into one. Everything is re-read from the database first, so a second browser window can't cause a double match.
 * The group's recorded difference is re-derived at the end, so it is right even if a step failed part-way.
 */
export async function applyPayrollSuggestion(args: { businessId: string; lineId: string; runIds: string[] }): Promise<void> {
  const { businessId, lineId, runIds } = args
  const runs = await fetchAllRows<RunRow>((a, b) => supabase.from('payroll_runs').select('id,pay_date,wage_transaction_id,tax_transaction_id').in('id', runIds).order('id').range(a, b))
  if (runs.length !== runIds.length) throw new Error('A payroll run in this match no longer exists. Refresh and try again.')
  const entryIds = runs.flatMap((r) => [r.wage_transaction_id, r.tax_transaction_id]).filter((x): x is string => !!x)
  const txRows = await fetchAllRows<TxRow>((a, b) => supabase.from('transactions').select('id,amount,bank_match_id').in('id', entryIds).order('id').range(a, b))
  const tx = new Map(txRows.map((t) => [t.id, t]))

  const perRun = runs.map((r) => {
    const ids = [r.wage_transaction_id, r.tax_transaction_id].filter((x): x is string => !!x && tx.has(x))
    if (!r.wage_transaction_id || !tx.has(r.wage_transaction_id)) throw new Error("A payroll run's wages entry was deleted from the Ledger, so it can't be matched.")
    return { ids, groups: [...new Set(ids.map((i) => tx.get(i)!.bank_match_id).filter((g): g is string => !!g))] }
  })
  if (perRun.some((p) => p.groups.length > 1)) throw new Error("A payroll run's entries are in two different matches. Undo one of them first.")

  const groups = [...new Set(perRun.flatMap((p) => p.groups))]
  let locked = new Set<string>()
  if (groups.length) {
    const lr = await supabase.from('bank_transactions').select('match_id').in('match_id', groups).not('reconciliation_id', 'is', null)
    if (lr.error) throw fail(lr.error, 'Could not read the existing matches.')
    locked = new Set((lr.data ?? []).map((x) => x.match_id as string))
  }
  if (locked.size > 1) throw new Error('Two of these payroll runs are in reconciled matches, which cannot be combined.')

  // Base group: a reconciled one must stay as it is; otherwise any existing one; otherwise a new one.
  let base: string | null = [...locked][0] ?? groups[0] ?? null
  const unmatchedEntries = txRows.filter((t) => !t.bank_match_id).map((t) => t.id)

  try {
    if (!base) {
      base = await createMatch({ businessId, lineIds: [lineId], entryIds: unmatchedEntries, difference: 0, note: 'Payroll' })
    } else {
      const l = await supabase.from('bank_transactions').update({ match_id: base, status: 'matched' }).eq('id', lineId).eq('status', 'pending_review').select('id')
      if (l.error) throw l.error
      if ((l.data?.length ?? 0) !== 1) throw new Error('That statement line was already reviewed somewhere else. Refresh and try again.')
      if (unmatchedEntries.length) {
        const e = await supabase.from('transactions').update({ bank_match_id: base }).in('id', unmatchedEntries).is('bank_match_id', null).select('id')
        if (e.error) throw e.error
      }
      for (const g of groups) {
        if (g === base) continue
        const ml = await supabase.from('bank_transactions').update({ match_id: base }).eq('match_id', g)
        if (ml.error) throw ml.error
        const me = await supabase.from('transactions').update({ bank_match_id: base }).eq('bank_match_id', g)
        if (me.error) throw me.error
        const del = await supabase.from('bank_matches').delete().eq('id', g)
        if (del.error) throw del.error
      }
      await supabase.from('bank_matches').update({ note: 'Payroll' }).eq('id', base).is('note', null)
    }
  } catch (err) {
    if (base) await recomputeDifference(base).catch(() => undefined)
    throw fail(err, 'Could not save the payroll match.')
  }
  await recomputeDifference(base)
}
