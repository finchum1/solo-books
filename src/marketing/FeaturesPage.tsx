import type { ReactNode } from 'react'
import { panel } from '../lib/landingTheme'
import { Arrow, MkLink, Reveal, Shot, Wrap, usePageMeta } from './ui'
import { DarkBand, H1, H2, H3, HeroGlow, P, Surface, Ticks } from './blocks'

function Row({ title, body, points, visual, flip = false }: { title: string; body: string; points?: ReactNode[]; visual: ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
      <Reveal className={flip ? 'lg:order-2' : ''}>
        <H2 style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.6rem)' }}>{title}</H2>
        <P className="mt-4">{body}</P>
        {points && <Ticks className="mt-6" items={points} />}
      </Reveal>
      <Reveal delay={0.08} className={flip ? 'lg:order-1' : ''}>
        {visual}
      </Reveal>
    </div>
  )
}

function DropZoneVisual() {
  return (
    <Surface className="p-6 sm:p-8" style={{ boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}>
      <div className="mb-3 text-sm font-medium" style={{ color: panel.inkDim }}>
        Receipt (optional)
      </div>
      <div className="grid place-items-center rounded-2xl px-6 py-10 text-center" style={{ border: `1.5px dashed ${panel.borderStrong}`, background: panel.bgRaised2 }}>
        <div className="text-[15px]" style={{ color: panel.inkDim }}>
          Drag a receipt here, or <span style={{ color: panel.goldText, textDecoration: 'underline' }}>browse files</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm" style={{ background: panel.bgRaised2 }}>
        <span style={{ color: panel.ink }}>hardware-store.jpg</span>
        <span style={{ color: panel.goldText }}>Attached · private</span>
      </div>
    </Surface>
  )
}

function RosterVisual() {
  const rows = [
    ['Contractors', "Bob's Plumbing", '$1,250.00', 'Delta Research', '$900.00'],
    ['Clients', 'Hartwell HOA', '$14,000.00', 'Oakridge Dental', '$2,200.00'],
  ] as const
  return (
    <Surface className="p-6 sm:p-8" style={{ boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}>
      {rows.map((r, i) => (
        <div key={r[0]} className={i > 0 ? 'mt-7' : ''}>
          <div className="mb-2 text-sm font-semibold" style={{ color: panel.ink }}>
            {r[0]}
          </div>
          {[
            [r[1], r[2]],
            [r[3], r[4]],
          ].map(([n, v]) => (
            <div key={n} className="flex items-baseline justify-between py-3 text-[15px]" style={{ borderTop: `1px solid ${panel.border}` }}>
              <span style={{ color: panel.ink }}>{n}</span>
              <span className="tabular-nums" style={{ color: panel.inkDim }}>{v}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="mt-6 text-xs" style={{ color: panel.inkDim }}>Sample data</div>
    </Surface>
  )
}

function StatementImportVisual() {
  const rows: [string, string, string][] = [
    ['Nov 3', 'SHELL OIL 5521', '-118.64'],
    ['Nov 5', 'DEPOSIT OAKRIDGE DENTAL', '7,750.00'],
    ['Nov 7', 'HOME DEPOT #1823', '-412.30'],
  ]
  return (
    <Surface className="p-6 sm:p-8" style={{ boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}>
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
      <div className="mt-4 text-xs" style={{ color: panel.inkDim }}>Sample data</div>
    </Surface>
  )
}

export function FeaturesPage() {
  usePageMeta('Features | Solo Books', 'Ledger, receipts, contractors and clients, budgets, bank statement import with matching and monthly reconciliation, payroll and PDF reports, in one private account.')
  return (
    <>
      <section className="relative overflow-hidden pb-20 pt-36 sm:pt-48">
        <HeroGlow />
        <Wrap className="relative">
          <H1 className="max-w-4xl">Everything you need to keep clean books.</H1>
          <P className="mt-6 text-lg sm:text-xl">
            A ledger, receipts, budgets, bank reconciliation, payroll and reports. Made for the owner who does their own bookkeeping, for one business or for several.
          </P>
        </Wrap>
      </section>

      <Wrap className="space-y-28 pb-28 sm:space-y-40 sm:pb-40">
        <Row
          title="A ledger that stays out of your way."
          body="Every income or expense is a date, a business, a category and an amount. Categories are a list you manage, but you can always type a one-off, so nothing ever blocks an entry."
          points={['Recent transactions, filterable by business and type', 'Edit or delete any entry', 'Contractor and client names right on the transaction']}
          visual={<Shot name="ledger" alt="The ledger: add-transaction form and recent transactions" />}
        />
        <Row
          flip
          title="Receipts, attached where they belong."
          body="Drag a photo or PDF onto an expense and it stays with that transaction. Receipts are never public; you open one through a short-lived link made for your signed-in account."
          points={['Drag and drop, or browse for a file', 'Photos and PDFs', 'Replace or remove a receipt any time']}
          visual={<DropZoneVisual />}
        />
        <Row
          title="Know who you paid, and who paid you."
          body="Keep a roster of contractors and clients for each business. Tag the transaction, and the reports total exactly what each one was paid or paid you."
          points={['Separate contractor and client reports', 'Rosters per business, with suggestions as you type', 'Deactivate someone without losing their history']}
          visual={<RosterVisual />}
        />
        <Row
          flip
          title="Reports you can hand to an accountant."
          body="Profit & Loss with income and expenses by category. Combined across every business or for one. Pick a month, a quarter, a year or your own dates."
          points={['Profit & Loss, contractor, client and payroll reports', 'Every report exports as a clean PDF', 'The PDF lists the businesses it covers']}
          visual={<Shot name="reports" alt="The Profit and Loss report" />}
        />
        <Row
          title="Set a budget. See where you stand."
          body="Give each category a monthly limit, and each income category a target. Solo Books compares them with your ledger as you go, so you see what is left to spend before the month is over."
          points={['Bars that turn from on track to over, with a mark for where today falls', 'Copy last month, fill blanks from your 3-month average, or carry a month through the rest of the year', 'One budget per business, plus a combined roll-up']}
          visual={<Shot name="budget" alt="The Budget screen: each category with its monthly limit, what has been spent, and what is left" />}
        />
        <Row
          flip
          title="Bring in your bank statements."
          body="Add your checking and savings accounts, then upload the file your bank lets you download. Solo Books works out the columns for you and shows a preview before anything is saved."
          points={['CSV, OFX and QFX files from any bank', 'Statements that overlap are de-duplicated, so a re-download never doubles anything', 'Undo an import any time. Nothing connects to your bank, and you never share a login']}
          visual={<StatementImportVisual />}
        />
        <Row
          title="Match every line to your ledger."
          body="Each statement line is either already in your ledger, or it isn’t. Solo Books lines them up by amount, date and wording, and you confirm. A line with no entry becomes one in a click."
          points={['Sure matches in one click, or review them one at a time', 'Transfers between your own accounts are kept out of income and expenses', 'Payroll lines are recognized from your pay stubs: net pay, and the tax deposits that come weeks later']}
          visual={<Shot name="banking" alt="The Review screen: suggested matches between bank statement lines and ledger entries, including a payroll run" />}
        />
        <Row
          flip
          title="Reconcile once a month."
          body="Enter the statement’s closing date and ending balance. If your reviewed lines add up to it, the difference is $0.00 and you finish. If not, it shows you the gap instead of letting it slide."
          points={['Finishing locks that month’s lines so they can’t change by accident', 'Reopen the latest month if you need to fix something', 'A new month starts from the last one’s ending balance']}
          visual={<Shot name="reconcile" alt="The Reconcile screen: starting balance, statement ending balance and a difference of zero" />}
        />
      </Wrap>

      <DarkBand className="py-24 sm:py-32">
        <Wrap className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <Reveal>
            <H2>Payroll for your W‑2 employees.</H2>
            <P className="mt-5">Run payroll, produce pay stubs and keep the cost in your ledger, with the 2026 federal and Oklahoma tables built in.</P>
            <MkLink to="/features/payroll" className="mt-8">
              How payroll works <Arrow />
            </MkLink>
          </Reveal>
          <Reveal delay={0.1}>
            <Shot name="payroll" alt="The Payroll screen: hours and bonus for each employee with gross, withholding and net pay" />
          </Reveal>
        </Wrap>
      </DarkBand>

      <Wrap className="py-28 sm:py-40">
        <div className="grid items-start gap-12 md:grid-cols-3 md:gap-8">
          {[
            { t: 'Many businesses, one login', d: 'Add a business whenever you need one. Every report gets a combined view and a single-business view, with nothing to migrate.' },
            { t: 'On your phone', d: 'Open it in any phone browser and add it to your home screen. It runs full screen, with navigation built for a thumb.' },
            { t: 'Light and dark', d: 'Switch themes from the header on this site or from Settings inside the app, and it remembers your choice.' },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 0.08}>
              <div className="border-t pt-6" style={{ borderColor: panel.borderStrong }}>
                <H3>{f.t}</H3>
                <P className="mt-3">{f.d}</P>
              </div>
            </Reveal>
          ))}
        </div>
      </Wrap>

      <section className="relative overflow-hidden py-28 text-center sm:py-36" style={{ background: panel.bg }}>
        <Wrap className="relative">
          <Reveal>
            <H2 className="mx-auto max-w-3xl">See it with your own numbers.</H2>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <MkLink to="/signup" size="lg">
                Get started <Arrow />
              </MkLink>
            </div>
          </Reveal>
        </Wrap>
      </section>
    </>
  )
}
