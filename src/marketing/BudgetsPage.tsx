import { panel } from '../lib/landingTheme'
import { Arrow, MkLink, Reveal, Shot, Wrap, usePageMeta } from './ui'
import { DarkBand, H1, H2, H3, P, Surface, Ticks } from './blocks'
import { BudgetSample } from './visuals'
import { FaqSection } from './Faq'

const STEPS = [
  { t: 'Pick a month and a business', d: 'A budget belongs to one business and one month, so each business gets its own plan.' },
  { t: 'Set your limits and targets', d: 'Type a monthly limit beside each spending category, and a target beside each kind of income.' },
  { t: 'Record things as usual', d: 'Every expense and payment you enter fills the bars for you, payroll included. There is nothing to enter twice.' },
  { t: 'Check in any time', d: 'See what is left to spend, what is over, and how the month is going while there is still time to act.' },
]

const SHORTCUTS = [
  { t: 'Copy from last month', d: 'Start this month with last month’s numbers, then change only what is different.' },
  { t: 'Fill blanks from my 3-month average', d: 'For categories with no limit yet, Solo Books suggests one based on what you actually spent over the last three months.' },
  { t: 'Use this month for the rest of the year', d: 'Happy with the plan? Carry it through December in one click instead of setting twelve months by hand.' },
]

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full" style={{ background: panel.bgRaised2 }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function BudgetsPage() {
  usePageMeta('Budgets | Solo Books', 'Set a monthly limit for each spending category and a target for each income stream, and see what is left to spend as the month goes. One budget per business, with a combined view.')
  return (
    <>
      <DarkBand className="pb-24 pt-36 sm:pb-32 sm:pt-48">
        <Wrap className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          <Reveal>
            <H1 style={{ fontSize: 'clamp(2.4rem, 5.4vw, 4.4rem)' }}>Know what’s left to spend.</H1>
            <P className="mt-6 text-lg">
              Give each kind of spending a monthly limit, and each kind of income a target. Solo Books compares them with what you have recorded, so you can see where you stand before the month is over.
            </P>
            <div className="mt-9 flex flex-wrap gap-3">
              <MkLink to="/signup" size="lg">
                Request an invite <Arrow />
              </MkLink>
            </div>
            <p className="mt-5 max-w-[52ch] text-sm leading-relaxed" style={{ color: panel.inkDim }}>
              Try it on the right. Drag the slider and watch the fuel bar go from on track, to close, to over.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <BudgetSample />
          </Reveal>
        </Wrap>
      </DarkBand>

      <section className="py-24 sm:py-32">
        <Wrap>
          <Reveal className="max-w-3xl">
            <H2>How a budget works.</H2>
          </Reveal>
          <ol className="mt-14 grid gap-x-8 gap-y-10 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.06}>
                <li className="border-t pt-5" style={{ borderColor: panel.borderStrong }}>
                  <div className="mb-3 text-sm font-semibold tabular-nums" style={{ color: panel.goldText }}>
                    {i + 1}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight" style={{ color: panel.ink }}>
                    {s.t}
                  </h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: panel.inkDim }}>
                    {s.d}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32" style={{ background: panel.bg }}>
        <Wrap className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <Reveal>
            <H2>Bars that tell you the truth.</H2>
            <P className="mt-5">Each category has one bar, and its color tells you at a glance whether to relax or look closer.</P>
            <div className="mt-8 space-y-6">
              {[
                { c: panel.income, pct: 55, t: 'Green', d: 'You are under 85% of the limit.' },
                { c: panel.gold, pct: 92, t: 'Gold', d: 'You have used 85% or more. Close to the limit.' },
                { c: panel.expense, pct: 100, t: 'Red', d: 'You are over the limit. It says by how much.' },
              ].map((r) => (
                <div key={r.t}>
                  <div className="mb-2 flex items-baseline justify-between gap-4 text-[15px]">
                    <span className="font-semibold" style={{ color: panel.ink }}>{r.t}</span>
                    <span className="text-right" style={{ color: panel.inkDim }}>{r.d}</span>
                  </div>
                  <Bar pct={r.pct} color={r.c} />
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Ticks
              items={[
                'A thin mark on every bar shows where today falls in the month, so you can tell whether spending is running ahead of the calendar',
                'Income targets never show as a warning. They simply turn green once you have met them',
                'A category with spending but no limit says “Not budgeted”, so nothing hides',
                'The summary at the top shows budgeted spending, spent so far, what is left, and your planned profit',
              ]}
            />
          </Reveal>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32">
        <Wrap>
          <Reveal className="max-w-3xl">
            <H2>Shortcuts that do the typing.</H2>
            <P className="mt-5">Setting twenty limits by hand is the reason most budgets never get made. These three get you most of the way there.</P>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {SHORTCUTS.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.08}>
                <Surface className="h-full p-7 sm:p-8">
                  <H3>{s.t}</H3>
                  <P className="mt-3">{s.d}</P>
                </Surface>
              </Reveal>
            ))}
          </div>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32" style={{ background: panel.bg }}>
        <Wrap className="grid items-center gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <H2>One budget per business, and a combined view.</H2>
            <P className="mt-5">Run more than one business? Each has its own plan. Switch to “All businesses” to see them rolled up together. The combined view is for looking, so a number is never changed by accident.</P>
          </Reveal>
          <Reveal delay={0.08}>
            <Shot name="budget" alt="The Budget screen: monthly limits by category with bars showing what has been spent" />
          </Reveal>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32">
        <Wrap className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <H2>What it doesn’t do yet.</H2>
          </Reveal>
          <Reveal delay={0.08}>
            <P>A budget in Solo Books is a plan you compare with your records. It’s worth knowing where that line is.</P>
            <Ticks
              className="mt-6"
              items={[
                'It doesn’t move or set aside money. It tells you where you stand; what you do about it is up to you.',
                'It doesn’t send alerts. You see the bars when you open the page.',
                'Budgets are monthly. There are no weekly, quarterly or yearly budgets yet.',
                'The bars come from the transactions you have recorded, so a month looks emptier until your entries are caught up.',
              ]}
            />
          </Reveal>
        </Wrap>
      </section>

      <FaqSection ids={['budget', 'budgetBusiness', 'budgetAlerts', 'budgetBank']} />

      <section className="relative overflow-hidden py-28 text-center sm:py-36" style={{ background: panel.bg }}>
        <Wrap className="relative">
          <Reveal>
            <H2 className="mx-auto max-w-3xl">Plan the month before it plans you.</H2>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <MkLink to="/signup" size="lg">
                Request an invite <Arrow />
              </MkLink>
              <MkLink to="/features/banking" kind="outline" size="lg">
                Bank statements and reconciliation
              </MkLink>
            </div>
          </Reveal>
        </Wrap>
      </section>
    </>
  )
}
