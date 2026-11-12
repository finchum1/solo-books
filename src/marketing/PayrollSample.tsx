import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { calculatePayStub } from '../lib/payroll/calc'
import type { TaxProfile } from '../lib/payroll/calc'
import type { BonusMethod } from '../lib/payroll/taxTables'
import { panel } from '../lib/landingTheme'

// A synthetic employee. Everything below is computed live by the same engine
// the app uses (lib/payroll/calc.ts, 2026 IRS Pub. 15-T and Oklahoma OW-2 tables).
const PROFILE: TaxProfile = {
  payFrequency: 'biweekly',
  federalFilingStatus: 'single',
  w4Step2Checked: false,
  w4Step3Credits: 0,
  w4Step4aOtherIncome: 0,
  w4Step4bDeductions: 0,
  w4Step4cExtra: 0,
  oklahomaFilingStatus: 'single',
  oklahomaAllowances: 1,
}
const REGULAR_PAY = 80 * 28 // 80 hours at $28.00

const BONUSES = [0, 500, 1000, 2500]

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

function Money({ value, className = '', style }: { value: number; className?: string; style?: CSSProperties }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => fmt(v))
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.55, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [mv, value])
  return (
    <motion.span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {text}
    </motion.span>
  )
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium" style={{ color: panel.inkDim }}>
        {label}
      </div>
      <div className="flex flex-wrap gap-1 rounded-full p-1" style={{ background: panel.bgRaised2, boxShadow: `inset 0 0 0 1px ${panel.border}` }}>
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium transition"
              style={active ? { background: panel.gold, color: panel.onGold } : { color: panel.inkDim }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Row({ label, value, strong = false, tone, note }: { label: string; value: number; strong?: boolean; tone?: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5" style={{ borderTop: `1px solid ${panel.border}` }}>
      <div>
        <div className={strong ? 'text-[15px] font-semibold' : 'text-sm'} style={{ color: strong ? panel.ink : panel.inkDim }}>
          {label}
        </div>
        {note && (
          <div className="text-xs" style={{ color: panel.inkDim }}>
            {note}
          </div>
        )}
      </div>
      <Money value={value} className={strong ? 'text-[15px] font-semibold' : 'text-sm'} style={{ color: tone ?? (strong ? panel.ink : panel.ink) }} />
    </div>
  )
}

export function PayrollSample() {
  const [bonus, setBonus] = useState(1000)
  const [method, setMethod] = useState<BonusMethod>('flat')

  const stub = useMemo(
    () =>
      calculatePayStub({
        regular: REGULAR_PAY,
        bonus,
        bonusMethod: method,
        profile: PROFILE,
        ytd: { wages: 0, supplementalWages: 0 },
        business: { sutaRate: 0, sutaWageBase: 0 },
      }),
    [bonus, method],
  )

  return (
    <div className="rounded-3xl p-6 sm:p-8" style={{ background: panel.bgRaised, boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold tracking-tight" style={{ color: panel.ink }}>
            Maya Chen
          </div>
          <div className="text-sm" style={{ color: panel.inkDim }}>
            Paid every 2 weeks · 80 hours at $28.00
          </div>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ color: panel.inkDim, boxShadow: `inset 0 0 0 1px ${panel.borderStrong}` }}>
          Sample employee
        </span>
      </div>

      <div className="mb-6 grid gap-4">
        <Segmented label="Bonus this pay" value={bonus} onChange={setBonus} options={BONUSES.map((b) => ({ value: b, label: b === 0 ? 'None' : `$${b.toLocaleString()}` }))} />
        <div style={{ opacity: bonus === 0 ? 0.45 : 1, transition: 'opacity .2s' }}>
          <Segmented
            label="Income tax on the bonus"
            value={method}
            onChange={setMethod}
            options={[
              { value: 'flat', label: 'Flat rate' },
              { value: 'aggregate', label: 'Combined with pay' },
            ]}
          />
        </div>
      </div>

      <div>
        <Row label="Regular pay" value={stub.gross - stub.bonus} />
        {bonus > 0 && <Row label="Bonus" value={stub.bonus} />}
        <Row label="Gross pay" value={stub.gross} strong />
        <Row label="Federal income tax" value={-stub.federalWithholding} note={bonus > 0 ? (stub.bonusMethodUsed === 'flat' ? '22% on the bonus' : 'Whole check run through the tables') : undefined} />
        <Row label="Social Security" value={-stub.socialSecurityEmployee} />
        <Row label="Medicare" value={-(stub.medicareEmployee + stub.additionalMedicare)} />
        <Row label="Oklahoma income tax" value={-stub.stateWithholding} note={bonus > 0 && stub.bonusMethodUsed === 'flat' ? '4.5% on the bonus' : undefined} />
        <div className="flex items-baseline justify-between gap-4 pt-4" style={{ borderTop: `1px solid ${panel.borderStrong}` }}>
          <div className="text-base font-semibold" style={{ color: panel.ink }}>
            Net pay
          </div>
          <Money value={stub.net} className="text-3xl font-semibold tracking-tight" style={{ color: panel.goldText }} />
        </div>
      </div>

      <p className="mt-5 text-xs leading-relaxed" style={{ color: panel.inkDim }}>
        You also pay {fmt(stub.totalEmployerTaxes)} in employer Social Security, Medicare and FUTA on this check. A made-up employee, calculated live with the
        same 2026 tables the app uses.
      </p>
    </div>
  )
}
