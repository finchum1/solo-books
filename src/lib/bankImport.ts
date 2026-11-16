/**
 * Reading a bank's downloaded statement (CSV or OFX/QFX) into plain lines.
 * Everything here is pure (text in, data out) so it can be tested without a browser
 * or a database. Banks disagree about almost everything -- delimiter, header row,
 * date order, whether withdrawals are negative -- so the CSV path detects what it
 * can and lets the person confirm or override each choice on a preview.
 */

export type DateFormat = 'mdy' | 'dmy' | 'ymd'

export interface StatementLine {
  /** YYYY-MM-DD */
  date: string
  /** Signed: money in is positive, money out is negative. */
  amount: number
  description: string
  /** Stable per-account id used to skip lines that were already imported. */
  externalId: string
}

// ---------------------------------------------------------------- CSV text

/** Splits CSV text into rows of cells. Handles quotes, escaped quotes, newlines inside quotes, and a BOM. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const d = delimiter ?? detectDelimiter(src)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += c
    } else if (c === '"' && cell === '') {
      quoted = true
    } else if (c === d) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
    } else cell += c
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ''))
}

export function detectDelimiter(src: string): string {
  const sample = src.split(/\r?\n/).filter((l) => l.trim()).slice(0, 8)
  let best = ','
  let bestScore = -1
  for (const d of [',', ';', '\t', '|']) {
    let score = 0
    for (const line of sample) {
      let inQ = false
      let n = 0
      for (const ch of line) {
        if (ch === '"') inQ = !inQ
        else if (ch === d && !inQ) n++
      }
      score += n
    }
    if (score > bestScore) {
      best = d
      bestScore = score
    }
  }
  return best
}

// -------------------------------------------------------------- headers

export interface Mapping {
  date: number
  description: number
  /** A single signed amount column, or -1 when debit and credit are separate columns. */
  amount: number
  debit: number
  credit: number
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

const DATE_HEADS = ['posting date', 'post date', 'posted date', 'date posted', 'transaction date', 'trans date', 'date']
const DESC_HEADS = ['description', 'transaction description', 'details', 'memo', 'payee', 'name', 'narrative', 'merchant', 'transaction']
const AMOUNT_HEADS = ['amount', 'transaction amount', 'amt']
const DEBIT_HEADS = ['debit', 'debits', 'withdrawal', 'withdrawals', 'money out', 'paid out', 'amount debit']
const CREDIT_HEADS = ['credit', 'credits', 'deposit', 'deposits', 'money in', 'paid in', 'amount credit']

function pick(headers: string[], names: string[]): number {
  const h = headers.map(norm)
  for (const n of names) {
    const i = h.indexOf(n)
    if (i !== -1) return i
  }
  return -1
}

/** The first row that looks like column titles (a date column plus an amount, debit or credit column). -1 if none. */
export function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const m = guessMapping(rows[i])
    if (m.date !== -1 && (m.amount !== -1 || m.debit !== -1 || m.credit !== -1)) return i
  }
  return -1
}

export function guessMapping(headers: string[]): Mapping {
  const date = pick(headers, DATE_HEADS)
  let description = pick(headers, DESC_HEADS)
  const amount = pick(headers, AMOUNT_HEADS)
  const debit = pick(headers, DEBIT_HEADS)
  const credit = pick(headers, CREDIT_HEADS)
  if (description === date) description = -1
  return { date, description, amount, debit, credit }
}

// ------------------------------------------------------------ dates / money

function validYmd(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function parseDate(raw: string, fmt: DateFormat): string | null {
  const s = raw.trim().replace(/T.*$/, '').replace(/\s+\d{1,2}:\d{2}.*$/, '')
  if (!s) return null
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return validYmd(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/)
  if (m) {
    let y = +m[3]
    if (m[3].length === 2) y += y < 70 ? 2000 : 1900
    const a = +m[1]
    const b = +m[2]
    return fmt === 'dmy' ? validYmd(y, b, a) : validYmd(y, a, b)
  }
  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/)
  if (m) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase())
    return mi === -1 ? null : validYmd(+m[3], mi + 1, +m[2])
  }
  m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})\.?[ ,-]*(\d{2}|\d{4})$/)
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
    let y = +m[3]
    if (m[3].length === 2) y += y < 70 ? 2000 : 1900
    return mi === -1 ? null : validYmd(y, mi + 1, +m[1])
  }
  return null
}

/** Picks day-first or month-first from the data when it is unambiguous; otherwise assumes month-first (US). */
export function detectDateFormat(samples: string[]): { format: DateFormat; ambiguous: boolean } {
  let mdy = 0
  let dmy = 0
  let ymd = 0
  for (const raw of samples) {
    const s = raw.trim()
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s)) {
      ymd++
      continue
    }
    const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})/)
    if (!m) continue
    if (+m[1] > 12) dmy++
    else if (+m[2] > 12) mdy++
  }
  if (ymd > 0 && dmy === 0 && mdy === 0) return { format: 'ymd', ambiguous: false }
  if (dmy > 0 && mdy === 0) return { format: 'dmy', ambiguous: false }
  if (mdy > 0 && dmy === 0) return { format: 'mdy', ambiguous: false }
  return { format: 'mdy', ambiguous: dmy === 0 && mdy === 0 }
}

/** Parses "$1,234.50", "(45.00)", "-45", "45-", "1.234,56" and "12,34". Blank or non-numeric gives null. */
export function parseMoney(raw: string): number | null {
  let s = raw.trim()
  if (!s) return null
  let neg = false
  if (/^\(.*\)$/.test(s)) {
    neg = true
    s = s.slice(1, -1)
  }
  s = s.replace(/[$£€\s]/g, '')
  if (/\d\s*CR$/i.test(s)) s = s.replace(/CR$/i, '')
  if (/\d\s*DR$/i.test(s)) {
    neg = true
    s = s.replace(/DR$/i, '')
  }
  if (s.endsWith('-')) {
    neg = !neg
    s = s.slice(0, -1)
  }
  if (s.startsWith('-')) {
    neg = !neg
    s = s.slice(1)
  } else if (s.startsWith('+')) s = s.slice(1)
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null
  if (/,\d{1,2}$/.test(s) && !s.includes('.')) s = s.replace(',', '.') // 12,34 -> 12.34
  else if (/,\d{1,2}$/.test(s) && s.indexOf('.') < s.lastIndexOf(',')) s = s.replace(/\./g, '').replace(',', '.') // 1.234,56
  else s = s.replace(/,/g, '')
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return Math.round((neg ? -n : n) * 100) / 100
}

// ------------------------------------------------------------- building lines

const normDesc = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120)
const cents = (n: number) => Math.round(n * 100)

/**
 * Adds a stable id to each line so importing an overlapping statement later skips what is
 * already there. Identical lines (same date, amount, description) on one statement get an
 * occurrence number, so two $5.00 coffees on the same day stay two lines.
 */
export function withExternalIds(lines: Omit<StatementLine, 'externalId'>[], prefix = 'csv'): StatementLine[] {
  const seen = new Map<string, number>()
  return lines.map((l) => {
    const base = `${l.date}|${cents(l.amount)}|${normDesc(l.description)}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return { ...l, externalId: `${prefix}:${base}|${n}` }
  })
}

export interface Rejected {
  rowNumber: number
  reason: string
}

export function buildLines(args: {
  rows: string[][]
  /** Index of the header row, or -1 if the file has none. */
  headerRow: number
  mapping: Mapping
  dateFormat: DateFormat
  /** Some banks show withdrawals as positive numbers; flip every sign. Single-amount-column files only. */
  flipSign: boolean
}): { lines: StatementLine[]; rejected: Rejected[] } {
  const { rows, headerRow, mapping, dateFormat, flipSign } = args
  const split = mapping.amount === -1
  const out: Omit<StatementLine, 'externalId'>[] = []
  const rejected: Rejected[] = []
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i]
    const get = (idx: number) => (idx >= 0 && idx < r.length ? r[idx] : '')
    const rawDate = get(mapping.date)
    const date = parseDate(rawDate, dateFormat)
    let amount: number | null
    if (split) {
      const debit = parseMoney(get(mapping.debit))
      const credit = parseMoney(get(mapping.credit))
      amount = debit === null && credit === null ? null : Math.round(((credit === null ? 0 : Math.abs(credit)) - (debit === null ? 0 : Math.abs(debit))) * 100) / 100
    } else {
      amount = parseMoney(get(mapping.amount))
      if (amount !== null && flipSign) amount = -amount
    }
    if (date === null && amount === null) {
      // A blank-ish or footer row (totals, disclaimers). Only worth mentioning if it had real content.
      if (r.filter((x) => x).length >= 3) rejected.push({ rowNumber: i + 1, reason: 'No date or amount' })
      continue
    }
    if (date === null) {
      rejected.push({ rowNumber: i + 1, reason: rawDate ? `Couldn't read the date "${rawDate}"` : 'Missing date' })
      continue
    }
    if (amount === null) {
      rejected.push({ rowNumber: i + 1, reason: 'Missing or unreadable amount' })
      continue
    }
    out.push({ date, amount, description: get(mapping.description) })
  }
  return { lines: withExternalIds(out), rejected }
}

export function summarizeLines(lines: StatementLine[]) {
  let deposits = 0
  let withdrawals = 0
  let first = ''
  let last = ''
  for (const l of lines) {
    if (l.amount >= 0) deposits += l.amount
    else withdrawals += -l.amount
    if (!first || l.date < first) first = l.date
    if (!last || l.date > last) last = l.date
  }
  const r = (n: number) => Math.round(n * 100) / 100
  return { count: lines.length, deposits: r(deposits), withdrawals: r(withdrawals), net: r(deposits - withdrawals), first, last }
}

// ------------------------------------------------------------------- OFX/QFX

export interface OfxResult {
  lines: StatementLine[]
  accountLast4: string | null
  ledgerBalance: { amount: number; date: string | null } | null
}

/** Reads OFX 1.x (SGML, tags often not closed) and 2.x (XML). Uses the bank's own FITID as the line id. */
export function parseOfx(text: string): OfxResult {
  const tag = (chunk: string, name: string) => {
    const m = chunk.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i'))
    return m ? m[1].trim() : ''
  }
  const decode = (s: string) => s.replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
  const chunks = text.split(/<STMTTRN>/i).slice(1)
  const raw: { date: string; amount: number; description: string; fitid: string }[] = []
  for (const c of chunks) {
    const body = c.split(/<\/STMTTRN>/i)[0]
    const d = tag(body, 'DTPOSTED').slice(0, 8)
    const date = /^\d{8}$/.test(d) ? validYmd(+d.slice(0, 4), +d.slice(4, 6), +d.slice(6, 8)) : null
    const amount = parseMoney(tag(body, 'TRNAMT'))
    if (!date || amount === null) continue
    const name = decode(tag(body, 'NAME'))
    const memo = decode(tag(body, 'MEMO'))
    const description = name && memo && memo !== name ? `${name} - ${memo}` : name || memo
    raw.push({ date, amount, description, fitid: tag(body, 'FITID') })
  }
  const dupFit = new Set<string>()
  const seenFit = new Set<string>()
  for (const r of raw) {
    if (r.fitid && seenFit.has(r.fitid)) dupFit.add(r.fitid)
    seenFit.add(r.fitid)
  }
  // A FITID is unique per transaction by spec; if a bank repeats one, fall back to content ids for those.
  const fallback = withExternalIds(raw.map((r) => ({ date: r.date, amount: r.amount, description: r.description })), 'ofx')
  const lines = raw.map((r, i) => ({ date: r.date, amount: r.amount, description: r.description, externalId: r.fitid && !dupFit.has(r.fitid) ? `ofx:${r.fitid}` : fallback[i].externalId }))
  const acct = tag(text, 'ACCTID').replace(/\D/g, '')
  const bal = text.match(/<LEDGERBAL>([\s\S]*?)(<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|$)/i)?.[1] ?? ''
  const balAmt = parseMoney(tag(bal, 'BALAMT'))
  const asOf = tag(bal, 'DTASOF').slice(0, 8)
  return {
    lines,
    accountLast4: acct.length >= 4 ? acct.slice(-4) : null,
    ledgerBalance: balAmt === null ? null : { amount: balAmt, date: /^\d{8}$/.test(asOf) ? validYmd(+asOf.slice(0, 4), +asOf.slice(4, 6), +asOf.slice(6, 8)) : null },
  }
}

/** True when the text is an OFX/QFX file rather than a CSV. */
export const looksLikeOfx = (text: string) => /<OFX>|OFXHEADER:/i.test(text.slice(0, 2000))
