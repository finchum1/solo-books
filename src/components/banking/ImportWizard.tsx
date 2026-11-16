import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { BankAccount } from '../../lib/types'
import {
  buildLines,
  detectDateFormat,
  findHeaderRow,
  guessMapping,
  looksLikeOfx,
  parseDelimited,
  parseOfx,
  summarizeLines,
} from '../../lib/bankImport'
import type { DateFormat, Mapping, StatementLine } from '../../lib/bankImport'
import { cardCls, fetchAllRows, fmtDate, ghostBtn, inputCls, labelCls, money, primaryBtn } from './shared'
import { errMsg } from '../../lib/errors'

const MAX_BYTES = 5 * 1024 * 1024
const CHUNK = 400

interface Parsed {
  filename: string
  source: 'csv' | 'ofx'
  /** CSV only */
  rows: string[][]
  /** OFX only */
  ofx: ReturnType<typeof parseOfx> | null
}

const colName = (rows: string[][], headerRow: number, i: number) => (headerRow >= 0 ? rows[headerRow][i] || `Column ${i + 1}` : `Column ${i + 1}`)

export function ImportWizard({ account, reconciledThrough, onDone, onCancel }: { account: BankAccount; /** Lines dated on or before this belong to a finished reconciliation and are not imported. */ reconciledThrough?: string | null; onDone: (message: string) => void; onCancel: () => void }) {
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // CSV choices (start from what was detected; the person can change any of them)
  const [headerRow, setHeaderRow] = useState(0)
  const [mapping, setMapping] = useState<Mapping>({ date: -1, description: -1, amount: -1, debit: -1, credit: -1 })
  const [dateFormat, setDateFormat] = useState<DateFormat>('mdy')
  const [dateAmbiguous, setDateAmbiguous] = useState(false)
  const [flipSign, setFlipSign] = useState(false)
  const [splitColumns, setSplitColumns] = useState(false)

  const [existingIds, setExistingIds] = useState<Set<string> | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  async function readFile(file: File) {
    setReadError(null)
    setParsed(null)
    setExistingIds(null)
    if (file.size > MAX_BYTES) return setReadError('That file is over 5 MB, which is larger than a bank statement should be. Download a shorter date range from your bank.')
    let text: string
    try {
      text = await file.text()
    } catch {
      return setReadError("Couldn't read that file.")
    }
    if (looksLikeOfx(text)) {
      const ofx = parseOfx(text)
      if (ofx.lines.length === 0) return setReadError('This looks like an OFX/QFX file, but it has no transactions in it.')
      return setParsed({ filename: file.name, source: 'ofx', rows: [], ofx })
    }
    const rows = parseDelimited(text)
    if (rows.length < 2) return setReadError("That file doesn't look like a CSV statement. Download the transactions as CSV (or OFX/QFX) from your bank's website.")
    const h = findHeaderRow(rows)
    const hr = h === -1 ? 0 : h
    const m = h === -1 ? { date: 0, description: 1, amount: 2, debit: -1, credit: -1 } : guessMapping(rows[h])
    const dates = rows.slice(hr + 1, hr + 60).map((r) => r[m.date] ?? '')
    const fmt = detectDateFormat(dates)
    setHeaderRow(hr)
    setMapping(m)
    setSplitColumns(m.amount === -1 && (m.debit !== -1 || m.credit !== -1))
    setDateFormat(fmt.format)
    setDateAmbiguous(fmt.ambiguous)
    setFlipSign(false)
    setParsed({ filename: file.name, source: 'csv', rows, ofx: null })
  }

  const built = useMemo(() => {
    if (!parsed) return null
    if (parsed.source === 'ofx') return { lines: parsed.ofx!.lines, rejected: [] as { rowNumber: number; reason: string }[] }
    const m = splitColumns ? { ...mapping, amount: -1 } : mapping
    if (m.date < 0 || (splitColumns ? m.debit < 0 && m.credit < 0 : m.amount < 0)) return { lines: [] as StatementLine[], rejected: [] as { rowNumber: number; reason: string }[] }
    return buildLines({ rows: parsed.rows, headerRow, mapping: m, dateFormat, flipSign: splitColumns ? false : flipSign })
  }, [parsed, mapping, headerRow, dateFormat, flipSign, splitColumns])

  const summary = useMemo(() => (built ? summarizeLines(built.lines) : null), [built])

  // Which of these lines are already in the account (from an earlier, overlapping statement)?
  const idsKey = built && built.lines.length && summary ? `${account.id}|${built.lines.length}|${summary.first}|${summary.last}|${built.lines[0].externalId}|${built.lines[built.lines.length - 1].externalId}` : ''
  const first = summary?.first
  const last = summary?.last
  useEffect(() => {
    if (!idsKey || !first || !last) return
    let cancelled = false
    setExistingIds(null)
    fetchAllRows<{ external_transaction_id: string }>((from, to) =>
      supabase.from('bank_transactions').select('external_transaction_id').eq('bank_account_id', account.id).gte('posted_date', first).lte('posted_date', last).range(from, to),
    )
      .then((rows) => !cancelled && setExistingIds(new Set(rows.map((r) => r.external_transaction_id))))
      .catch(() => !cancelled && setExistingIds(new Set()))
    return () => {
      cancelled = true
    }
  }, [idsKey, first, last, account.id])

  const closedLines = built && reconciledThrough ? built.lines.filter((l) => l.date <= reconciledThrough).length : 0
  const importable = built ? built.lines.filter((l) => !reconciledThrough || l.date > reconciledThrough) : []
  const duplicates = existingIds ? importable.filter((l) => existingIds.has(l.externalId)).length : 0
  const fresh = importable.length - duplicates

  const beforeOpening = account.opening_balance_date && built ? importable.filter((l) => l.date <= account.opening_balance_date!).length : 0
  const mostlyPositive = built && !splitColumns && built.lines.length >= 5 && built.lines.filter((l) => l.amount > 0).length / built.lines.length > 0.85
  const maskMismatch = parsed?.source === 'ofx' && parsed.ofx!.accountLast4 && account.mask && parsed.ofx!.accountLast4 !== account.mask

  async function runImport() {
    if (!built || !summary || importable.length === 0) return
    setImporting(true)
    setImportError(null)
    let importId: string | null = null
    try {
      const { data: imp, error: impErr } = await supabase
        .from('bank_imports')
        .insert({
          bank_account_id: account.id,
          business_id: account.business_id,
          filename: parsed!.filename.slice(0, 200),
          source: parsed!.source,
          rows_in_file: built.lines.length + built.rejected.length,
          first_date: summary.first,
          last_date: summary.last,
        })
        .select('id')
        .single()
      if (impErr) throw impErr
      importId = imp.id as string
      let added = 0
      for (let i = 0; i < importable.length; i += CHUNK) {
        const slice = importable.slice(i, i + CHUNK).map((l) => ({
          bank_account_id: account.id,
          business_id: account.business_id,
          import_id: importId,
          external_transaction_id: l.externalId,
          posted_date: l.date,
          amount: l.amount,
          description: l.description,
          pending: false,
          status: 'pending_review',
        }))
        const { data, error } = await supabase.from('bank_transactions').upsert(slice, { onConflict: 'bank_account_id,external_transaction_id', ignoreDuplicates: true }).select('id')
        if (error) throw error
        added += data?.length ?? 0
      }
      const skipped = importable.length - added
      if (added === 0) {
        await supabase.from('bank_imports').delete().eq('id', importId)
      } else {
        const { error } = await supabase.from('bank_imports').update({ lines_added: added, lines_skipped: skipped }).eq('id', importId)
        if (error) throw error
      }
      onDone(
        added === 0
          ? `Nothing new: all ${importable.length} lines were already imported.`
          : `Imported ${added} new line${added === 1 ? '' : 's'}${skipped ? ` (${skipped} already there, skipped)` : ''}.`,
      )
    } catch (err) {
      // Don't leave a half-imported batch behind.
      if (importId) await supabase.from('bank_imports').delete().eq('id', importId)
      setImportError(errMsg(err, 'The import failed.'))
      setImporting(false)
    }
  }

  const sel = (value: number, set: (n: number) => void, none = false) => (
    <select className={inputCls} value={value} onChange={(e) => set(Number(e.target.value))}>
      {none && <option value={-1}>(none)</option>}
      {!none && value === -1 && <option value={-1}>Choose a column…</option>}
      {parsed && parsed.rows[0] && Array.from({ length: Math.max(...parsed.rows.slice(0, 40).map((r) => r.length)) }, (_, i) => i).map((i) => (
        <option key={i} value={i}>
          {colName(parsed.rows, headerRow, i)}
        </option>
      ))}
    </select>
  )

  return (
    <section className={cardCls}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Import a statement</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Into {account.name}</p>
        </div>
        <button type="button" onClick={onCancel} className={ghostBtn}>
          Cancel
        </button>
      </div>

      {!parsed ? (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const f = e.dataTransfer.files?.[0]
              if (f) readFile(f)
            }}
            className={`rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${dragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-300 dark:border-slate-700'}`}
          >
            <p className="text-[15px] text-slate-700 dark:text-slate-200">
              Drag your bank's download here, or{' '}
              <button type="button" onClick={() => fileRef.current?.click()} className="text-emerald-700 dark:text-emerald-400 underline">
                choose a file
              </button>
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">CSV, OFX or QFX. The file is read in your browser and only the transactions are saved.</p>
            <input ref={fileRef} type="file" accept=".csv,.txt,.ofx,.qfx,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          </div>
          {readError && (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-400" role="alert">
              {readError}
            </p>
          )}
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            In your bank's website, look for "Download transactions" or "Export" on the account page. Pick CSV (or Quicken/OFX) and a date range such as one statement month.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-700 dark:text-slate-200">
              <strong>{parsed.filename}</strong> <span className="text-slate-500 dark:text-slate-400">({parsed.source.toUpperCase()})</span>
            </span>
            <button type="button" onClick={() => { setParsed(null); setReadError(null) }} className="text-emerald-700 dark:text-emerald-400 hover:underline">
              Choose a different file
            </button>
          </div>

          {parsed.source === 'csv' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">How to read this file</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date column</label>
                  {sel(mapping.date, (n) => setMapping({ ...mapping, date: n }))}
                </div>
                <div>
                  <label className={labelCls}>Description column</label>
                  {sel(mapping.description, (n) => setMapping({ ...mapping, description: n }), true)}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input type="checkbox" checked={splitColumns} onChange={(e) => setSplitColumns(e.target.checked)} className="rounded" />
                  Money in and money out are in separate columns
                </label>
              </div>
              {splitColumns ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Money out (withdrawals / debits)</label>
                    {sel(mapping.debit, (n) => setMapping({ ...mapping, debit: n }), true)}
                  </div>
                  <div>
                    <label className={labelCls}>Money in (deposits / credits)</label>
                    {sel(mapping.credit, (n) => setMapping({ ...mapping, credit: n }), true)}
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className={labelCls}>Amount column</label>
                    {sel(mapping.amount, (n) => setMapping({ ...mapping, amount: n }))}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 pb-2">
                    <input type="checkbox" checked={flipSign} onChange={(e) => setFlipSign(e.target.checked)} className="rounded" />
                    Withdrawals are shown as positive numbers
                  </label>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date order</label>
                  <select className={inputCls} value={dateFormat} onChange={(e) => setDateFormat(e.target.value as DateFormat)}>
                    <option value="mdy">Month / Day / Year (US)</option>
                    <option value="dmy">Day / Month / Year</option>
                    <option value="ymd">Year-Month-Day</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Column titles are on file row</label>
                  <select className={inputCls} value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))}>
                    {parsed.rows.slice(0, 15).map((r, i) => (
                      <option key={i} value={i}>
                        Row {i + 1}: {r.slice(0, 3).join(', ').slice(0, 40)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {dateAmbiguous && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Every date in this file could be month-first or day-first. Check the dates in the preview below and switch "Date order" if they're wrong.
                </p>
              )}
            </div>
          )}

          {parsed.source === 'ofx' && parsed.ofx!.ledgerBalance && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              The bank reports a balance of <strong>{money(parsed.ofx!.ledgerBalance.amount)}</strong>
              {parsed.ofx!.ledgerBalance.date ? ` as of ${fmtDate(parsed.ofx!.ledgerBalance.date)}` : ''}.
            </p>
          )}
          {maskMismatch && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              This file is for an account ending in {parsed.ofx!.accountLast4}, but this account ends in {account.mask}. Make sure it's the right account.
            </p>
          )}

          {built && built.lines.length > 0 && summary ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Preview</p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                  {built.lines.slice(0, 6).map((l, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="w-24 shrink-0 text-slate-500 dark:text-slate-400 tabular-nums">{fmtDate(l.date)}</span>
                      <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-200">{l.description || <em className="text-slate-400">no description</em>}</span>
                      <span className={`tabular-nums ${l.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{money(l.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  ['Lines', String(summary.count)],
                  ['Money in', money(summary.deposits)],
                  ['Money out', money(summary.withdrawals)],
                  ['Dates', `${fmtDate(summary.first)} to ${fmtDate(summary.last)}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{k}</div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">{v}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-sm">
                {existingIds === null ? (
                  <p className="text-slate-500 dark:text-slate-400">Checking for lines you've already imported…</p>
                ) : (
                  <p className="text-slate-700 dark:text-slate-200">
                    <strong>{fresh}</strong> new line{fresh === 1 ? '' : 's'}
                    {duplicates > 0 && <> · {duplicates} already imported (will be skipped)</>}
                  </p>
                )}
                {mostlyPositive && (
                  <p className="text-amber-700 dark:text-amber-400">
                    Nearly every amount is positive. If this file shows withdrawals as positive numbers, tick "Withdrawals are shown as positive numbers".
                  </p>
                )}
                {closedLines > 0 && (
                  <p className="text-amber-700 dark:text-amber-400">
                    {closedLines} line{closedLines === 1 ? ' is' : 's are'} dated on or before {fmtDate(reconciledThrough)}, a period you've already reconciled. {closedLines === 1 ? 'It' : 'They'} won't be imported. Reopen that reconciliation first if you need to add {closedLines === 1 ? 'it' : 'them'}.
                  </p>
                )}
                {beforeOpening > 0 && (
                  <p className="text-amber-700 dark:text-amber-400">
                    {beforeOpening} line{beforeOpening === 1 ? ' is' : 's are'} dated on or before this account's opening balance date ({fmtDate(account.opening_balance_date)}). They'll be saved but won't change the balance.
                  </p>
                )}
                {built.rejected.length > 0 && (
                  <details className="text-slate-600 dark:text-slate-300">
                    <summary className="cursor-pointer text-amber-700 dark:text-amber-400">{built.rejected.length} row{built.rejected.length === 1 ? '' : 's'} couldn't be read and will be left out</summary>
                    <ul className="mt-1 pl-4 list-disc text-xs">
                      {built.rejected.slice(0, 8).map((r) => (
                        <li key={r.rowNumber}>
                          Row {r.rowNumber}: {r.reason}
                        </li>
                      ))}
                      {built.rejected.length > 8 && <li>and {built.rejected.length - 8} more</li>}
                    </ul>
                  </details>
                )}
              </div>

              {importError && (
                <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
                  {importError}
                </p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={runImport} disabled={importing || existingIds === null || fresh === 0} className={primaryBtn}>
                  {importing ? 'Importing…' : fresh === 0 ? 'Nothing new to import' : `Import ${fresh} line${fresh === 1 ? '' : 's'}`}
                </button>
                <button type="button" onClick={onCancel} disabled={importing} className={ghostBtn}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            parsed.source === 'csv' && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {mapping.date < 0 || (splitColumns ? mapping.debit < 0 && mapping.credit < 0 : mapping.amount < 0)
                  ? 'Choose the date and amount columns above to see a preview.'
                  : built && built.rejected.length > 0
                    ? `No readable transactions yet. Check the date order and the row the titles are on. First problem: row ${built.rejected[0].rowNumber}, ${built.rejected[0].reason}.`
                    : 'No transactions found below that row. Check which row holds the column titles.'}
              </p>
            )
          )}
        </div>
      )}
    </section>
  )
}
