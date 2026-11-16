import { monthEnd, shiftMonth } from './budget'

/**
 * Matching statement lines to Ledger entries, and the reconciliation arithmetic.
 * All pure (data in, data out), so it can be tested without a browser or a database.
 */

export interface MatchLine {
  id: string
  accountId: string
  businessId: string
  /** YYYY-MM-DD */
  date: string
  /** Signed: money in is positive. */
  amount: number
  description: string
}

export interface MatchEntry {
  id: string
  businessId: string
  date: string
  type: 'income' | 'expense'
  /** Always positive; `type` carries the direction. */
  amount: number
  category: string
  description: string
  contractor: string
  client: string
}

const cents = (n: number) => Math.round(n * 100)
const round2 = (n: number) => Math.round(n * 100) / 100

/** The Ledger entry as a signed number, comparable with a statement line: income in (+), expense out (-). */
export const signedAmount = (e: Pick<MatchEntry, 'type' | 'amount'>) => (e.type === 'income' ? e.amount : -e.amount)

export function dayDiff(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86400000)
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

// ----------------------------------------------------------- text similarity

const STOP = new Set(['the', 'and', 'for', 'inc', 'llc', 'co', 'corp', 'pos', 'debit', 'credit', 'card', 'purchase', 'payment', 'ach', 'web', 'online', 'transfer', 'check', 'checkcard', 'recurring', 'deposit', 'withdrawal', 'from', 'to', 'of', 'a'])

/** Lowercase words of 3+ letters, with bank noise (store numbers, "DEBIT CARD", "ACH") removed. */
export function tokens(s: string): Set<string> {
  const out = new Set<string>()
  for (const w of s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)) if (w.length >= 3 && !STOP.has(w)) out.add(w)
  return out
}

/** 0..1: how much of the smaller word set also appears in the other. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let hit = 0
  for (const w of ta) if (tb.has(w)) hit++
  return hit / Math.min(ta.size, tb.size)
}

const entryText = (e: MatchEntry) => `${e.description} ${e.category} ${e.contractor} ${e.client}`

// ------------------------------------------------------------- 1:1 matching

export interface Suggestion {
  line: MatchLine
  entry: MatchEntry
  /** 'exact': nothing else could be confused with this pair. 'possible': other lines or entries fit too. */
  confidence: 'exact' | 'possible'
  daysApart: number
  similarity: number
}

/**
 * Pairs each statement line with the Ledger entry that has the same amount and direction, in the same
 * business, dated within `windowDays`. A pair is "exact" only when it is the single possibility from both
 * sides; if two $5.00 coffees could swap places, those are "possible" and a person confirms them one by one.
 */
export function suggestMatches(lines: MatchLine[], entries: MatchEntry[], windowDays = 7): Suggestion[] {
  const byLine = new Map<string, Suggestion[]>()
  const byEntry = new Map<string, Suggestion[]>()
  const all: Suggestion[] = []
  for (const line of lines) {
    for (const entry of entries) {
      if (entry.businessId !== line.businessId) continue
      if (cents(signedAmount(entry)) !== cents(line.amount)) continue
      const daysApart = Math.abs(dayDiff(line.date, entry.date))
      if (daysApart > windowDays) continue
      const s: Suggestion = { line, entry, confidence: 'possible', daysApart, similarity: similarity(line.description, entryText(entry)) }
      all.push(s)
      byLine.set(line.id, [...(byLine.get(line.id) ?? []), s])
      byEntry.set(entry.id, [...(byEntry.get(entry.id) ?? []), s])
    }
  }
  const score = (s: Suggestion) => 1000 - 40 * s.daysApart + Math.round(s.similarity * 100)
  const picked: Suggestion[] = []
  const usedLines = new Set<string>()
  const usedEntries = new Set<string>()
  for (const s of [...all].sort((a, b) => score(b) - score(a) || a.line.id.localeCompare(b.line.id))) {
    if (usedLines.has(s.line.id) || usedEntries.has(s.entry.id)) continue
    usedLines.add(s.line.id)
    usedEntries.add(s.entry.id)
    s.confidence = byLine.get(s.line.id)!.length === 1 && byEntry.get(s.entry.id)!.length === 1 ? 'exact' : 'possible'
    picked.push(s)
  }
  return picked.sort((a, b) => a.line.date.localeCompare(b.line.date) || a.line.id.localeCompare(b.line.id))
}

// ---------------------------------------------------------------- transfers

export interface TransferPair {
  out: MatchLine
  into: MatchLine
  confidence: 'exact' | 'possible'
}

/** Money leaving one of your accounts and arriving in another (same business, opposite amounts, a few days apart). */
export function suggestTransfers(lines: MatchLine[], windowDays = 4): TransferPair[] {
  const outs = lines.filter((l) => l.amount < 0)
  const ins = lines.filter((l) => l.amount > 0)
  const cand = new Map<string, MatchLine[]>()
  const reverse = new Map<string, MatchLine[]>()
  for (const o of outs)
    for (const i of ins) {
      if (o.accountId === i.accountId || o.businessId !== i.businessId) continue
      if (cents(o.amount) !== -cents(i.amount)) continue
      if (Math.abs(dayDiff(o.date, i.date)) > windowDays) continue
      cand.set(o.id, [...(cand.get(o.id) ?? []), i])
      reverse.set(i.id, [...(reverse.get(i.id) ?? []), o])
    }
  const pairs: TransferPair[] = []
  const used = new Set<string>()
  for (const o of outs) {
    const options = (cand.get(o.id) ?? []).filter((i) => !used.has(i.id))
    if (options.length === 0) continue
    options.sort((a, b) => Math.abs(dayDiff(o.date, a.date)) - Math.abs(dayDiff(o.date, b.date)) || a.id.localeCompare(b.id))
    const into = options[0]
    used.add(into.id)
    pairs.push({ out: o, into, confidence: (cand.get(o.id) ?? []).length === 1 && (reverse.get(into.id) ?? []).length === 1 ? 'exact' : 'possible' })
  }
  return pairs
}

// ------------------------------------------------------------------- groups

/** Lines minus entries. Zero means the group ties out exactly. */
export function groupDifference(lines: Pick<MatchLine, 'amount'>[], entries: Pick<MatchEntry, 'type' | 'amount'>[]): number {
  return round2(lines.reduce((s, l) => s + l.amount, 0) - entries.reduce((s, e) => s + signedAmount(e), 0))
}

// ----------------------------------------------------------- reconciliation

/** Statement ending balance minus what the opening balance plus the imported lines add up to. Zero means they agree. */
export function reconcileDifference(args: { startBalance: number; linesSum: number; statementEndBalance: number }): number {
  return round2(args.statementEndBalance - (args.startBalance + args.linesSum))
}

const lastDayOfMonth = (ymd: string) => monthEnd(`${ymd.slice(0, 7)}-01`)

/**
 * The statement end date to suggest next. `boundary` is the day the period starts after: the previous
 * reconciliation's end date, or the account's opening-balance date.
 *  - After a reconciliation: one month on (a month-end stays a month-end; a 28th stays a 28th).
 *  - From the opening balance date: the end of the next calendar month (calendar-month statements).
 */
export function suggestStatementEnd(boundary: string, fromReconciliation: boolean): string {
  if (!fromReconciliation) return lastDayOfMonth(addDays(boundary, 1))
  const day = Number(boundary.slice(8, 10))
  const nextMonth = shiftMonth(`${boundary.slice(0, 7)}-01`, 1)
  if (boundary === lastDayOfMonth(boundary)) return monthEnd(nextMonth)
  const last = Number(monthEnd(nextMonth).slice(8, 10))
  return `${nextMonth.slice(0, 8)}${String(Math.min(day, last)).padStart(2, '0')}`
}
