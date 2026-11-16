import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { health } from '../lib/budget'
import type { Health } from '../lib/budget'
import { panel } from '../lib/landingTheme'
import { Check } from './ui'
import { Surface } from './blocks'

/** Sample-data visuals shared by the feature pages. Each is plain markup, so it stays in step with the site's themes. */

const frame: CSSProperties = { boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

function Foot({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 text-xs" style={{ color: panel.inkDim }}>
      {children}
    </div>
  )
}

export function StatementImportVisual() {
  const rows: [string, string, string][] = [
    ['Nov 3', 'SHELL OIL 5521', '-118.64'],
    ['Nov 5', 'DEPOSIT OAKRIDGE DENTAL', '7,750.00'],
    ['Nov 7', 'HOME DEPOT #1823', '-412.30'],
  ]
  return (
    <Surface className="p-6 sm:p-8" style={frame}>
      <div className="flex items-center justify-between rounded-xl px-4 py-3 text-sm" style={{ background: panel.bgRaised2 }}>
        <span style={{ color: panel.ink }}>riverside-operating-nov.csv</span>
        <span style={{ color: panel.goldText }}>Columns recognized</span>
      </div>
      <div className="mt-4 text-xs font-medium uppercase tracking-wide" style={{ color: panel.inkDim }}>
        Preview
      </div>
      {rows.map(([d, n, a]) => (
        <div key={n} className="flex items-baseline gap-4 py-3 text-[15px]" style={{ borderTop: `1px solid ${panel.border}` }}>
          <span className="w-14 shrink-0 tabular-nums" style={{ color: panel.inkDim }}>{d}</span>
          <span className="flex-1" style={{ color: panel.ink }}>{n}</span>
          <span className="tabular-nums" style={{ color: a.startsWith('-') ? panel.expense : panel.income }}>{a}</span>
        </div>
      ))}
      <div className="mt-4 flex items-center justify-between pt-4 text-sm" style={{ borderTop: `1px solid ${panel.borderStrong}` }}>
        <span style={{ color: panel.ink }}>
          <strong>142</strong> new lines
        </span>
        <span style={{ color: panel.inkDim }}>12 already imported, skipped</span>
      </div>
      <Foot>Sample data</Foot>
    </Surface>
  )
}

const TONE: Record<Health, string> = { ok: panel.income, watch: panel.gold, over: panel.expense, none: panel.inkDim }

function BudgetBar({ label, limit, spent }: { label: string; limit: number; spent: number }) {
  const pct = spent / limit
  const h = health('expense', { budget: limit, actual: spent, pct })
  const left = limit - spent
  return (
    <div className="py-4" style={{ borderTop: `1px solid ${panel.border}` }}>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-[15px]">
        <span style={{ color: panel.ink }}>{label}</span>
        <span className="tabular-nums text-sm" style={{ color: h === 'over' ? panel.expense : panel.inkDim }}>
          {money(spent)} of {money(limit)} · {left >= 0 ? `${money(left)} left` : `${money(-left)} over`}
        </span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: panel.bgRaised2 }} role="img" aria-label={`${label}: ${Math.round(pct * 100)}% of the limit`}>
        <div className="h-full rounded-full transition-[width,background-color] duration-300" style={{ width: `${Math.min(1, pct) * 100}%`, background: TONE[h] }} />
        {/* Where today falls in the month. */}
        <div className="absolute -bottom-1 -top-1 w-px" style={{ left: '52%', background: panel.ink, opacity: 0.55 }} title="Today" />
      </div>
    </div>
  )
}

/** A live sample of the Budget bars: drag the slider and watch Fuel go from on track, to close, to over. */
export function BudgetSample() {
  const [fuel, setFuel] = useState(640)
  return (
    <div className="rounded-3xl p-6 sm:p-8" style={{ background: panel.bgRaised, ...frame }}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold tracking-tight" style={{ color: panel.ink }}>
            November
          </div>
          <div className="text-sm" style={{ color: panel.inkDim }}>
            Riverside Landscaping · spending
          </div>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ color: panel.inkDim, boxShadow: `inset 0 0 0 1px ${panel.borderStrong}` }}>
          Sample budget
        </span>
      </div>

      <BudgetBar label="Fuel" limit={900} spent={fuel} />
      <BudgetBar label="Supplies" limit={1500} spent={1180} />
      <BudgetBar label="Equipment & Repairs" limit={1200} spent={1415.75} />

      <div className="mt-4 rounded-2xl p-4" style={{ background: panel.bgRaised2 }}>
        <label htmlFor="fuel-spent" className="mb-2 flex items-baseline justify-between text-sm font-medium" style={{ color: panel.ink }}>
          <span>Spent on fuel so far</span>
          <span className="tabular-nums" style={{ color: panel.goldText }}>{money(fuel)}</span>
        </label>
        <input
          id="fuel-spent"
          type="range"
          min={0}
          max={1200}
          step={20}
          value={fuel}
          onChange={(e) => setFuel(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--mk-gold)' }}
        />
        <div className="mt-1 flex justify-between text-xs" style={{ color: panel.inkDim }}>
          <span>$0</span>
          <span>limit $900</span>
          <span>$1,200</span>
        </div>
      </div>
      <Foot>The thin mark on each bar is where today falls in the month.</Foot>
    </div>
  )
}

export function SuggestionsVisual() {
  const rows: { line: string; entry: string; tag: 'Sure' | 'Possible' }[] = [
    { line: 'Nov 3  SHELL OIL 5521  -$118.64', entry: 'Fuel · Truck fuel · -$118.64', tag: 'Sure' },
    { line: 'Nov 5  DEPOSIT OAKRIDGE DENTAL  $7,750.00', entry: 'Installation Revenue · Oakridge Dental install', tag: 'Sure' },
    { line: 'Nov 7  HOME DEPOT #1823  -$412.30', entry: 'Supplies · Pavers and sand · -$412.30', tag: 'Sure' },
    { line: 'Nov 12  MOWER WORLD  -$1,415.75', entry: 'Equipment & Repairs · Mower deck · 2 days apart', tag: 'Possible' },
  ]
  return (
    <Surface className="p-6 sm:p-8" style={frame}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-base font-semibold" style={{ color: panel.ink }}>
          Suggestions
        </span>
        <span className="rounded-full px-3.5 py-1.5 text-[13px] font-medium" style={{ background: panel.gold, color: panel.onGold }}>
          Match all 3 sure matches
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.line} className="flex items-start gap-3 py-3 text-sm" style={{ borderTop: `1px solid ${panel.border}` }}>
          <div className="min-w-0 flex-1">
            <div style={{ color: panel.ink }}>{r.line}</div>
            <div className="text-xs" style={{ color: panel.inkDim }}>↔ Your records: {r.entry}</div>
          </div>
          <span className="shrink-0 text-xs font-medium" style={{ color: r.tag === 'Sure' ? panel.income : panel.goldText }}>
            {r.tag}
          </span>
        </div>
      ))}
      <Foot>Sample data. Nothing is matched until you say so.</Foot>
    </Surface>
  )
}

export function PayrollMatchVisual() {
  const parts: { when: string; what: string; amount: number; found: boolean }[] = [
    { when: 'Oct 15', what: 'Net pay to Jane Doe', amount: 800, found: true },
    { when: 'Nov 12', what: 'Federal payroll tax deposit', amount: 253, found: true },
    { when: 'Nov 12', what: 'Oklahoma withholding deposit', amount: 40, found: true },
    { when: 'Due by Jan 31', what: 'Unemployment taxes (FUTA + SUTA)', amount: 26, found: false },
  ]
  const total = parts.reduce((s, p) => s + p.amount, 0)
  const found = parts.filter((p) => p.found).reduce((s, p) => s + p.amount, 0)
  return (
    <div className="rounded-3xl p-6 sm:p-8" style={{ background: panel.bgRaised, ...frame }}>
      <div className="mb-1 text-lg font-semibold tracking-tight" style={{ color: panel.ink }}>
        Payroll of Oct 15
      </div>
      <div className="mb-3 text-sm" style={{ color: panel.inkDim }}>
        The cash this payroll costs leaves your bank in pieces.
      </div>
      {parts.map((p) => (
        <div key={p.what} className="flex items-center gap-3 py-3 text-sm" style={{ borderTop: `1px solid ${panel.border}` }}>
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={p.found ? { background: panel.gold, color: panel.onGold } : { boxShadow: `inset 0 0 0 1.5px ${panel.borderStrong}`, color: panel.inkDim }}>
            {p.found && <Check />}
          </span>
          <div className="min-w-0 flex-1">
            <div style={{ color: panel.ink }}>{p.what}</div>
            <div className="text-xs" style={{ color: panel.inkDim }}>{p.when}{p.found ? ' · found on your statement' : ' · not on a statement yet'}</div>
          </div>
          <span className="tabular-nums" style={{ color: p.found ? panel.ink : panel.inkDim }}>{money(p.amount)}</span>
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between pt-4 text-sm" style={{ borderTop: `1px solid ${panel.borderStrong}` }}>
        <span style={{ color: panel.ink }}>
          <strong>{money(found)}</strong> of {money(total)} matched
        </span>
        <span style={{ color: panel.goldText }}>{money(total - found)} still to find</span>
      </div>
      <Foot>Sample data. The pieces come from your saved pay stubs.</Foot>
    </div>
  )
}

export function ReconcileMathVisual() {
  const rows: [string, string, boolean?][] = [
    ['Starting balance (last month’s ending balance)', '$13,045.50'],
    ['This month’s 7 reviewed lines', '+$1,893.33'],
    ['Your books say the balance is', '$14,938.83', true],
    ['Your statement says', '$14,938.83'],
  ]
  return (
    <Surface className="p-6 sm:p-8" style={frame}>
      {rows.map(([k, v, strong]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-3 text-[15px]" style={{ borderTop: `1px solid ${panel.border}` }}>
          <span style={{ color: strong ? panel.ink : panel.inkDim, fontWeight: strong ? 600 : 400 }}>{k}</span>
          <span className="tabular-nums" style={{ color: panel.ink, fontWeight: strong ? 600 : 400 }}>{v}</span>
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between pt-4" style={{ borderTop: `1px solid ${panel.borderStrong}` }}>
        <span className="text-base font-semibold" style={{ color: panel.ink }}>Difference</span>
        <span className="text-3xl font-semibold tabular-nums" style={{ color: panel.income }}>$0.00</span>
      </div>
      <Foot>Sample data. At $0.00 with nothing left to review, you press Finish.</Foot>
    </Surface>
  )
}
