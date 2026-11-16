import { addDays, dayDiff } from './bankMatch'
import type { MatchLine } from './bankMatch'
import { monthEnd } from './budget'

/**
 * Recognizing the bank lines a payroll run causes, using the pay stubs Solo Books already has.
 * All pure (data in, data out), so it can be tested without a browser or a database.
 *
 * What a run costs in cash, in total, is gross wages + employer taxes (the two Ledger entries the run posts).
 * It leaves the bank in pieces: net pay to each employee, then tax deposits (federal 941, Oklahoma
 * withholding, FUTA, SUTA), often later and often several runs at once. Every piece is a number the pay
 * stubs already contain, so a statement line whose amount equals a piece, on a plausible date, is almost
 * certainly that piece. Nothing here is applied automatically: it only proposes.
 */

export interface PayrollStub {
  id: string
  employeeName: string
  net: number
  federalWithholding: number
  ssEmployee: number
  medicareEmployee: number
  additionalMedicare: number
  stateWithholding: number
  ssEmployer: number
  medicareEmployer: number
  futa: number
  suta: number
}

export interface PayrollRunInfo {
  id: string
  payDate: string
  stubs: PayrollStub[]
  /** The match group this run's wages entry is already in, if any. */
  groupId: string | null
  /** False when the run's entries can't take more lines (missing entry, or its group holds unrelated entries). */
  eligible: boolean
}

export interface PayrollSuggestion {
  line: MatchLine
  runIds: string[]
  /** What the line is, e.g. "Net pay to Jane Doe". */
  label: string
  confidence: 'exact' | 'possible'
}

const r2 = (n: number) => Math.round(n * 100) / 100
const same = (a: number, b: number) => Math.abs(a - b) < 0.005
const sum = (xs: number[]) => r2(xs.reduce((a, b) => a + b, 0))

/** The unit that money is counted against: the run's match group, or the run alone if it has none. */
export const unitKey = (r: Pick<PayrollRunInfo, 'id' | 'groupId'>) => r.groupId ?? `run:${r.id}`

type Atom = string // 'net:<stubId>' | 'fed' | 'state' | 'futa' | 'suta'

interface Part {
  run: PayrollRunInfo
  amount: number
  atoms: Atom[]
}
interface Comp {
  key: string
  label: string
  priority: number
  from: string
  to: string
  parts: Part[]
  amount: number
}

function perRun(r: PayrollRunInfo) {
  const fed = sum(r.stubs.map((s) => s.federalWithholding + s.ssEmployee + s.ssEmployer + s.medicareEmployee + s.medicareEmployer + s.additionalMedicare))
  const state = sum(r.stubs.map((s) => s.stateWithholding))
  const futa = sum(r.stubs.map((s) => s.futa))
  const suta = sum(r.stubs.map((s) => s.suta))
  return { fed, state, futa, suta }
}

const quarterOf = (ymd: string) => `${ymd.slice(0, 4)}-Q${Math.floor((Number(ymd.slice(5, 7)) - 1) / 3) + 1}`
const quarterEndMonth = (ymd: string) => {
  const y = ymd.slice(0, 4)
  const q = Math.floor((Number(ymd.slice(5, 7)) - 1) / 3) + 1
  return `${y}-${String(q * 3).padStart(2, '0')}-01`
}
const nextMonthEnd = (monthStart: string) => {
  const y = Number(monthStart.slice(0, 4))
  const m = Number(monthStart.slice(5, 7))
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return monthEnd(`${ny}-${String(nm).padStart(2, '0')}-01`)
}

function buildComponents(runs: PayrollRunInfo[]): Comp[] {
  const comps: Comp[] = []
  const add = (c: Omit<Comp, 'amount'>) => {
    const amount = sum(c.parts.map((p) => p.amount))
    if (amount > 0) comps.push({ ...c, amount })
  }

  for (const r of runs) {
    const t = perRun(r)
    const netAtoms = r.stubs.map((s) => `net:${s.id}`)
    for (const s of r.stubs) {
      add({ key: `net:${r.id}:${s.id}`, label: `Net pay to ${s.employeeName}`, priority: 0, from: addDays(r.payDate, -3), to: addDays(r.payDate, 7), parts: [{ run: r, amount: s.net, atoms: [`net:${s.id}`] }] })
    }
    if (r.stubs.length > 1) {
      add({ key: `nettotal:${r.id}`, label: 'Net pay to all employees', priority: 1, from: addDays(r.payDate, -3), to: addDays(r.payDate, 7), parts: [{ run: r, amount: sum(r.stubs.map((s) => s.net)), atoms: netAtoms }] })
    }
    const taxWindow = { from: r.payDate, to: addDays(r.payDate, 45) }
    add({ key: `fed:${r.id}`, label: 'Federal payroll tax deposit', priority: 2, ...taxWindow, parts: [{ run: r, amount: t.fed, atoms: ['fed'] }] })
    add({ key: `state:${r.id}`, label: 'Oklahoma withholding deposit', priority: 3, ...taxWindow, parts: [{ run: r, amount: t.state, atoms: ['state'] }] })
    add({ key: `futa:${r.id}`, label: 'Federal unemployment (FUTA)', priority: 4, ...taxWindow, parts: [{ run: r, amount: t.futa, atoms: ['futa'] }] })
    add({ key: `suta:${r.id}`, label: 'State unemployment (SUTA)', priority: 5, ...taxWindow, parts: [{ run: r, amount: t.suta, atoms: ['suta'] }] })
    add({ key: `unemp:${r.id}`, label: 'Unemployment taxes (FUTA + SUTA)', priority: 6, ...taxWindow, parts: [{ run: r, amount: r2(t.futa + t.suta), atoms: ['futa', 'suta'] }] })
    const allTax = r2(t.fed + t.state + t.futa + t.suta)
    add({ key: `alltax:${r.id}`, label: 'All payroll taxes for this run', priority: 7, from: addDays(r.payDate, -3), to: addDays(r.payDate, 45), parts: [{ run: r, amount: allTax, atoms: ['fed', 'state', 'futa', 'suta'] }] })
    add({ key: `total:${r.id}`, label: 'Entire payroll (net pay and taxes)', priority: 8, from: addDays(r.payDate, -3), to: addDays(r.payDate, 10), parts: [{ run: r, amount: r2(sum(r.stubs.map((s) => s.net)) + allTax), atoms: [...netAtoms, 'fed', 'state', 'futa', 'suta'] }] })
  }

  // One deposit covering several runs: monthly depositors pay a month's runs together, FUTA/SUTA go quarterly.
  const byMonth = new Map<string, PayrollRunInfo[]>()
  const byQuarter = new Map<string, PayrollRunInfo[]>()
  for (const r of runs) {
    const m = r.payDate.slice(0, 7)
    byMonth.set(m, [...(byMonth.get(m) ?? []), r])
    const q = quarterOf(r.payDate)
    byQuarter.set(q, [...(byQuarter.get(q) ?? []), r])
  }
  const latest = (rs: PayrollRunInfo[]) => rs.map((r) => r.payDate).sort().at(-1)!
  for (const [m, rs] of byMonth) {
    if (rs.length < 2) continue
    const window = { from: latest(rs), to: addDays(nextMonthEnd(`${m}-01`), 5) }
    const mk = (kind: 'fed' | 'state' | 'all', label: string, priority: number) =>
      add({
        key: `m-${kind}:${m}`,
        label,
        priority,
        ...window,
        parts: rs.map((r) => {
          const t = perRun(r)
          return kind === 'fed' ? { run: r, amount: t.fed, atoms: ['fed'] } : kind === 'state' ? { run: r, amount: t.state, atoms: ['state'] } : { run: r, amount: r2(t.fed + t.state + t.futa + t.suta), atoms: ['fed', 'state', 'futa', 'suta'] }
        }),
      })
    mk('fed', `Federal payroll tax deposit for ${rs.length} runs`, 2)
    mk('state', `Oklahoma withholding deposit for ${rs.length} runs`, 3)
    mk('all', `All payroll taxes for ${rs.length} runs`, 7)
  }
  for (const [q, rs] of byQuarter) {
    if (rs.length < 2) continue
    const window = { from: latest(rs), to: addDays(nextMonthEnd(quarterEndMonth(latest(rs))), 7) }
    const mk = (kind: 'futa' | 'suta' | 'unemp', label: string, priority: number) =>
      add({
        key: `q-${kind}:${q}`,
        label,
        priority,
        ...window,
        parts: rs.map((r) => {
          const t = perRun(r)
          return kind === 'futa' ? { run: r, amount: t.futa, atoms: ['futa'] } : kind === 'suta' ? { run: r, amount: t.suta, atoms: ['suta'] } : { run: r, amount: r2(t.futa + t.suta), atoms: ['futa', 'suta'] }
        }),
      })
    mk('futa', `Federal unemployment (FUTA) for ${rs.length} runs`, 4)
    mk('suta', `State unemployment (SUTA) for ${rs.length} runs`, 5)
    mk('unemp', `Unemployment taxes (FUTA + SUTA) for ${rs.length} runs`, 6)
  }
  return comps
}

/**
 * Proposes which payroll piece each outgoing statement line is.
 *  - `remaining[unitKey]`: cash a unit's entries still need (entries total minus lines already matched). A piece is only
 *    proposed if it fits in what's left, so the same money is never claimed twice.
 *  - `lockedGroups`: match groups that hold lines from a finished reconciliation. Those can't be merged into another group.
 */
export function suggestPayroll(args: {
  runs: PayrollRunInfo[]
  lines: MatchLine[]
  remaining: Record<string, number>
  lockedGroups?: Set<string>
}): PayrollSuggestion[] {
  const runs = args.runs.filter((r) => r.eligible && r.stubs.length > 0)
  const locked = args.lockedGroups ?? new Set<string>()
  const comps = buildComponents(runs)
  const outgoing = args.lines.filter((l) => l.amount < 0 && l.date)

  interface Pair {
    line: MatchLine
    comp: Comp
    days: number
    sig: string
  }
  const pairs: Pair[] = []
  for (const line of outgoing) {
    const abs = r2(-line.amount)
    for (const comp of comps) {
      if (!same(comp.amount, abs) || line.date < comp.from || line.date > comp.to) continue
      const days = Math.min(...comp.parts.map((p) => Math.abs(dayDiff(line.date, p.run.payDate))))
      pairs.push({ line, comp, days, sig: comp.parts.map((p) => p.run.id).sort().join('+') })
    }
  }
  pairs.sort((a, b) => a.comp.parts.length - b.comp.parts.length || a.days - b.days || a.comp.priority - b.comp.priority)

  const remaining = { ...args.remaining }
  const usedLine = new Set<string>()
  const usedComp = new Set<string>()
  const usedAtoms = new Map<string, Set<Atom>>()
  const chosen: Pair[] = []

  for (const p of pairs) {
    if (usedLine.has(p.line.id) || usedComp.has(p.comp.key)) continue
    // Parts must not overlap pieces of the same run that were already claimed.
    if (p.comp.parts.some((part) => part.atoms.some((a) => usedAtoms.get(part.run.id)?.has(a)))) continue
    // Each unit must still need this much money.
    const need = new Map<string, number>()
    for (const part of p.comp.parts) need.set(unitKey(part.run), r2((need.get(unitKey(part.run)) ?? 0) + part.amount))
    if ([...need].some(([u, amt]) => (remaining[u] ?? 0) + 0.005 < amt)) continue
    // Merging groups is impossible when two of them hold reconciled lines.
    const groups = new Set(p.comp.parts.map((part) => part.run.groupId).filter((g): g is string => !!g))
    if ([...groups].filter((g) => locked.has(g)).length > 1) continue

    for (const [u, amt] of need) remaining[u] = r2((remaining[u] ?? 0) - amt)
    for (const part of p.comp.parts) {
      const s = usedAtoms.get(part.run.id) ?? new Set<Atom>()
      part.atoms.forEach((a) => s.add(a))
      usedAtoms.set(part.run.id, s)
    }
    usedLine.add(p.line.id)
    usedComp.add(p.comp.key)
    chosen.push(p)
  }

  return chosen
    .map((p) => {
      const mine = pairs.filter((q) => q.line.id === p.line.id)
      const sigs = new Set(mine.map((q) => q.sig))
      // Competing lines: other lines that could be the same piece (same runs, same amount).
      const rivals = new Set(pairs.filter((q) => q.sig === p.sig && same(q.comp.amount, p.comp.amount)).map((q) => q.line.id))
      const slots = new Set(pairs.filter((q) => q.sig === p.sig && same(q.comp.amount, p.comp.amount)).map((q) => q.comp.key))
      const exact = sigs.size === 1 && rivals.size <= slots.size
      return {
        line: p.line,
        runIds: p.comp.parts.map((part) => part.run.id),
        label: p.comp.label,
        confidence: (exact ? 'exact' : 'possible') as 'exact' | 'possible',
      }
    })
    .sort((a, b) => a.line.date.localeCompare(b.line.date) || a.line.id.localeCompare(b.line.id))
}

/** Cash a set of runs' entries still need: what they cost minus the lines already in their group. */
export function remainingFor(entriesTotal: number, linesTotal: number): number {
  return r2(entriesTotal - linesTotal)
}
