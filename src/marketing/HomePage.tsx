import { useState } from 'react'
import { motion } from 'framer-motion'
import { panel } from '../lib/landingTheme'
import { RowDot, TickerTotal } from '../components/landing/primitives'
import { Arrow, MkLink, Reveal, Shot, Wrap, usePageMeta } from './ui'
import { DarkBand, H1, H2, H3, HeroGlow, P, Surface, Ticks } from './blocks'
import { PayrollSample } from './PayrollSample'

const SAMPLE_BUSINESSES = [
  { name: 'Riverside Landscaping', income: 16200, expenses: 8857 },
  { name: 'Northgate Consulting', income: 8900, expenses: 1149 },
  { name: 'Blue Harbor Coffee Co.', income: 4300, expenses: 3120 },
]
const SAMPLE_NET = SAMPLE_BUSINESSES.reduce((s, b) => s + (b.income - b.expenses), 0)

function Hero() {
  return (
    <section className="relative overflow-hidden pb-10 pt-32 sm:pt-44">
      <HeroGlow />
      <Wrap className="relative text-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <H1 className="mx-auto max-w-4xl">One ledger for every business you run.</H1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl" style={{ color: panel.inkDim }}>
            Books, receipts, contractors, clients and now payroll. Private to your account, whether you run one business or several.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <MkLink to="/signup" size="lg">
              Get started <Arrow />
            </MkLink>
            <MkLink to="/features" kind="outline" size="lg">
              See what&rsquo;s inside
            </MkLink>
          </div>
        </motion.div>
      </Wrap>

      <Wrap className="relative mt-14 sm:mt-20" width="max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="relative">
          <Shot name="ledger" priority alt="The Solo Books ledger: an add-transaction form with a receipt drop zone above a table of recent income and expenses across several businesses" />
          {/* Product, not decoration: what recording a payroll looks like. */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mk-glass absolute -bottom-6 right-2 w-[17.5rem] rounded-2xl p-4 sm:-right-6 sm:bottom-12 sm:w-72"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: panel.ink }}>
                Payroll recorded
              </span>
              <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: panel.gold, color: panel.onGold }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-xs" style={{ color: panel.inkDim }}>
              3 employees · every 2 weeks
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs" style={{ color: panel.inkDim }}>
                Net pay
              </span>
              <span className="text-xl font-semibold tabular-nums" style={{ color: panel.ink }}>
                $5,924.85
              </span>
            </div>
          </motion.div>
        </motion.div>
      </Wrap>
    </section>
  )
}

function Mechanism() {
  const [isolated, setIsolated] = useState<number | null>(null)
  const total = isolated === null ? SAMPLE_NET : SAMPLE_BUSINESSES[isolated].income - SAMPLE_BUSINESSES[isolated].expenses
  return (
    <section className="py-24 sm:py-32" style={{ background: panel.bg }}>
      <Wrap className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <Reveal>
          <H2>Combine everything, or isolate one.</H2>
          <P className="mt-5">
            Every transaction is tagged to a business, so the same data answers both questions: how is everything doing, and how is this one doing. Start with a single business; the second, fifth or tenth is just another name in the list.
          </P>
          <P className="mt-4">Try it. Select a business to isolate it, and select it again to bring everyone back.</P>
        </Reveal>
        <Reveal delay={0.1}>
          <Surface className="p-6 sm:p-8" style={{ boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}>
            <div className="mb-3 text-sm font-medium" style={{ color: panel.inkDim }}>
              {isolated === null ? 'All businesses' : SAMPLE_BUSINESSES[isolated].name} · sample data
            </div>
            {SAMPLE_BUSINESSES.map((b, i) => {
              const net = b.income - b.expenses
              const active = isolated === null || isolated === i
              return (
                <button
                  key={b.name}
                  onClick={() => setIsolated(isolated === i ? null : i)}
                  aria-pressed={isolated === i}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-4 text-left transition hover:bg-[color-mix(in_srgb,var(--mk-ink)_5%,transparent)]"
                  style={{ borderTop: i > 0 ? `1px solid ${panel.border}` : undefined }}
                >
                  <RowDot active={isolated === i} />
                  <span className="flex-1 text-[15px] sm:text-base" style={{ color: active ? panel.ink : panel.inkDim }}>
                    {b.name}
                  </span>
                  <TickerTotal value={net} active={active} key={`${i}-${active}`} className="shrink-0 text-[15px] font-medium sm:text-base" style={{ color: active ? panel.income : panel.inkDim }} />
                </button>
              )
            })}
            <div className="mt-2 flex items-baseline justify-between pt-5" style={{ borderTop: `1px solid ${panel.borderStrong}` }}>
              <span className="text-sm font-medium" style={{ color: panel.inkDim }}>
                {isolated === null ? 'Combined profit' : 'Isolated profit'}
              </span>
              <TickerTotal value={total} key={isolated ?? 'all'} className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: panel.ink }} />
            </div>
          </Surface>
        </Reveal>
      </Wrap>
    </section>
  )
}

/** A shot that bleeds off the bottom-right of its tile. */
function TileShot({ name, alt }: { name: 'ledger' | 'reports'; alt: string }) {
  return (
    <div className="mt-auto pt-8 pl-6 sm:pl-10">
      <div className="h-56 overflow-hidden rounded-tl-2xl sm:h-72" style={{ boxShadow: `0 0 0 1px ${panel.border}` }}>
        <Shot name={name} alt={alt} frame={false} className="w-[135%] max-w-none" />
      </div>
    </div>
  )
}

function Tiles() {
  return (
    <section className="py-24 sm:py-32">
      <Wrap>
        <Reveal className="mb-12 max-w-3xl sm:mb-16">
          <H2>Everything you need for the weekly sit-down.</H2>
        </Reveal>
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-6">
          <Reveal className="lg:col-span-4">
            <Surface className="flex h-full flex-col overflow-hidden pt-8 sm:pt-10">
              <div className="px-6 sm:px-10">
                <H3>Log it in seconds. Drag the receipt on.</H3>
                <P className="mt-3">Income and expenses go in against the right business. Drop a photo or PDF of the receipt onto an expense; it&rsquo;s stored privately and opened later through a short-lived link.</P>
              </div>
              <TileShot name="ledger" alt="The ledger's add-transaction form and recent transactions table" />
            </Surface>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-2">
            <Surface className="flex h-full flex-col p-6 sm:p-10">
              <H3>Know who you paid, and who paid you.</H3>
              <P className="mt-3">Tag an expense with a contractor or income with a client, then pull a report that totals each one.</P>
              <div className="mt-auto pt-8">
                {[
                  ['Paid to', "Bob's Plumbing", '$1,250.00'],
                  ['', 'Delta Research', '$900.00'],
                  ['Received from', 'Hartwell HOA', '$14,000.00'],
                  ['', 'Oakridge Dental', '$2,200.00'],
                ].map(([g, n, v], i) => (
                  <div key={n}>
                    {g && (
                      <div className={`pb-1 text-xs font-medium ${i > 0 ? 'pt-5' : ''}`} style={{ color: panel.inkDim }}>
                        {g}
                      </div>
                    )}
                    <div className="flex items-baseline justify-between py-2.5 text-sm" style={{ borderTop: `1px solid ${panel.border}` }}>
                      <span style={{ color: panel.ink }}>{n}</span>
                      <span className="tabular-nums" style={{ color: panel.inkDim }}>{v}</span>
                    </div>
                  </div>
                ))}
                <div className="mt-3 text-xs" style={{ color: panel.inkDim }}>Sample data</div>
              </div>
            </Surface>
          </Reveal>
          <Reveal className="lg:col-span-2">
            <Surface className="flex h-full flex-col p-6 sm:p-10">
              <H3>Start with one business. Add more any time.</H3>
              <P className="mt-3">No second account and no per-business setup. A new business is a new name in your list, and every report gains a combined view.</P>
              <div className="mt-auto space-y-2 pt-8">
                {['Riverside Landscaping', 'Northgate Consulting'].map((n) => (
                  <div key={n} className="rounded-xl px-4 py-3 text-sm" style={{ background: panel.bgRaised2, color: panel.ink }}>
                    {n}
                  </div>
                ))}
                <div className="rounded-xl px-4 py-3 text-sm" style={{ border: `1.5px dashed ${panel.borderStrong}`, color: panel.goldText }}>
                  + Add a business
                </div>
              </div>
            </Surface>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-4">
            <Surface className="flex h-full flex-col overflow-hidden pt-8 sm:pt-10">
              <div className="px-6 sm:px-10">
                <H3>Reports you can hand to an accountant.</H3>
                <P className="mt-3">Profit &amp; Loss, contractors, clients and payroll. Combined or one business, any date range, and each one exports as a clean PDF.</P>
              </div>
              <TileShot name="reports" alt="The Profit and Loss report with income and expense categories" />
            </Surface>
          </Reveal>
        </div>
      </Wrap>
    </section>
  )
}

function PayrollBand() {
  return (
    <DarkBand className="py-24 sm:py-32">
      <Wrap className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <Reveal>
          <H2>Payroll for your W‑2 employees. Built in.</H2>
          <P className="mt-5">
            Enter the hours, add a bonus if there is one, and see every withholding before you record it. Solo Books works out the taxes, writes the pay stubs and puts the cost in your ledger.
          </P>
          <Ticks
            className="mt-7"
            items={[
              'Federal, Social Security, Medicare and Oklahoma withholding on the 2026 tables',
              'Bonuses taxed the way you choose: flat rate or combined with regular pay',
              'Pay stubs as PDFs, with year-to-date totals',
              'Wages and employer taxes post to your ledger on their own',
              'Quarterly and year-end totals ready for Forms 941, 940 and W-2',
            ]}
          />
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <MkLink to="/features/payroll">
              How payroll works <Arrow />
            </MkLink>
          </div>
          <p className="mt-5 max-w-[56ch] text-sm leading-relaxed" style={{ color: panel.inkDim }}>
            For Oklahoma employers today. Solo Books calculates and records; you make the deposits and file your returns.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <PayrollSample />
        </Reveal>
      </Wrap>
    </DarkBand>
  )
}

function Ritual() {
  const steps = [
    { t: 'Log what happened', d: 'Income, expenses and receipts, against the right business. A few minutes, once a week.' },
    { t: 'Run payroll', d: 'Hours in, taxes worked out, stubs written, cost posted. No second system to reconcile.' },
    { t: 'Pull the report', d: 'Profit & Loss for everything or one business, as a PDF for your records or your accountant.' },
  ]
  return (
    <section className="py-24 sm:py-32">
      <Wrap>
        <Reveal className="max-w-3xl">
          <H2>Not daily babysitting. A weekly sit-down.</H2>
          <P className="mt-5">
            Most accounting software assumes one company at a time, with separate logins and exports to reconcile by hand. Solo Books is built around a short, regular sit-down instead.
          </P>
        </Reveal>
        <div className="mt-12 sm:mt-16">
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.06}>
              <div className="grid items-baseline gap-3 border-t py-8 md:grid-cols-[1fr_1.3fr] md:gap-12 md:py-10" style={{ borderColor: panel.borderStrong }}>
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: panel.ink, letterSpacing: '-0.025em' }}>
                  {s.t}
                </h3>
                <P>{s.d}</P>
              </div>
            </Reveal>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

function Phone({ name, alt, className = '' }: { name: 'mobile-home' | 'mobile-payroll'; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[2.4rem] p-2 ${className}`} style={{ background: panel.bgRaised, boxShadow: `0 0 0 1px ${panel.borderStrong}, var(--mk-frame-shadow)` }}>
      <div className="overflow-hidden rounded-[1.9rem]">
        <Shot name={name} alt={alt} frame={false} />
      </div>
    </div>
  )
}

function Pocket() {
  return (
    <section className="overflow-hidden py-24 sm:py-32" style={{ background: panel.bg }}>
      <Wrap className="grid items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <Reveal>
          <H2>It works on your phone, too.</H2>
          <P className="mt-5">
            Open it in any phone browser and add it to your home screen. It runs full screen like an app, with the navigation at your thumb, so a receipt can be logged right where you are.
          </P>
          <MkLink to="/features" kind="outline" className="mt-8">
            See all features <Arrow />
          </MkLink>
        </Reveal>
        <Reveal delay={0.1} className="relative mx-auto flex max-w-md items-start justify-center gap-4 sm:gap-6">
          <Phone name="mobile-home" alt="Solo Books on a phone: the Home screen with year-to-date profit and loss" className="w-[46%]" />
          <Phone name="mobile-payroll" alt="Solo Books on a phone: the Payroll screen" className="mt-10 w-[46%]" />
        </Reveal>
      </Wrap>
    </section>
  )
}

function Private() {
  const facts = [
    { t: 'Your records stay yours', d: 'Each account is separated from every other by rules enforced in the database itself, not just in the app.' },
    { t: 'Receipts stay private', d: 'Files are never public. They open only through a short-lived link made for your signed-in account.' },
    { t: 'No Social Security or bank numbers', d: 'The app has no fields for them and never connects to your bank, so there is nothing of that kind to leak.' },
  ]
  return (
    <section className="py-24 sm:py-32">
      <Wrap>
        <Reveal className="max-w-3xl">
          <H2>Private by default.</H2>
        </Reveal>
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {facts.map((f, i) => (
            <Reveal key={f.t} delay={i * 0.08}>
              <div className="border-t pt-6" style={{ borderColor: panel.borderStrong }}>
                <H3>{f.t}</H3>
                <P className="mt-3">{f.d}</P>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-12">
          <MkLink to="/security" kind="outline">
            How we protect your data <Arrow />
          </MkLink>
        </Reveal>
      </Wrap>
    </section>
  )
}

function Close() {
  return (
    <section className="relative overflow-hidden py-28 text-center sm:py-40" style={{ background: panel.bg }}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 55% 70% at 50% 100%, var(--mk-glow), transparent 70%)' }} />
      <Wrap className="relative">
        <Reveal>
          <H2 className="mx-auto max-w-3xl">Start your books today.</H2>
          <P className="mx-auto mt-5 text-center">Create an account in a minute. Add your first business, log a transaction, and see your numbers.</P>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <MkLink to="/signup" size="lg">
              Get started <Arrow />
            </MkLink>
            <MkLink to="/signin" kind="outline" size="lg">
              Sign in
            </MkLink>
          </div>
        </Reveal>
      </Wrap>
    </section>
  )
}

export function HomePage() {
  usePageMeta('Solo Books: one ledger for every business you run', 'Bookkeeping, receipts, contractors, clients and payroll for owner-operators. One private ledger for one business or several.')
  return (
    <>
      <Hero />
      <Mechanism />
      <Tiles />
      <PayrollBand />
      <Ritual />
      <Pocket />
      <Private />
      <Close />
    </>
  )
}
