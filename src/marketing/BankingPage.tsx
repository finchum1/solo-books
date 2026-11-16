import { panel } from '../lib/landingTheme'
import { Arrow, MkLink, Reveal, Shot, Wrap, usePageMeta } from './ui'
import { DarkBand, H1, H2, P, Ticks } from './blocks'
import { PayrollMatchVisual, ReconcileMathVisual, StatementImportVisual, SuggestionsVisual } from './visuals'

const STEPS = [
  { t: 'Add your accounts', d: 'Checking and savings, for each business. Give each an opening balance as of a date.' },
  { t: 'Upload a statement', d: 'Download the transactions from your bank’s website, drop the file in, and check the preview.' },
  { t: 'Review the lines', d: 'Confirm the suggested matches. Anything not recorded yet is added in a click.' },
  { t: 'Reconcile the month', d: 'Enter the statement’s ending balance. When the difference is $0.00, finish.' },
  { t: 'Repeat next month', d: 'Each month starts from the last one’s ending balance, so it only gets faster.' },
]

export function BankingPage() {
  usePageMeta('Banking | Solo Books', 'Upload your bank statements, match every line to your records, and reconcile once a month. Works with CSV, OFX and QFX files. No bank login, ever.')
  return (
    <>
      <DarkBand className="pb-24 pt-36 sm:pb-32 sm:pt-48">
        <Wrap>
          <Reveal className="max-w-4xl">
            <H1 style={{ fontSize: 'clamp(2.4rem, 5.4vw, 4.4rem)' }}>Your bank statements, matched and reconciled.</H1>
            <P className="mt-6 text-lg">
              Upload the file your bank lets you download. Solo Books lines up each transaction with what you have recorded, adds what is missing, and checks once a month that your books agree with the bank. It never asks for a bank login.
            </P>
            <div className="mt-9 flex flex-wrap gap-3">
              <MkLink to="/signup" size="lg">
                Get started <Arrow />
              </MkLink>
              <MkLink to="/features/budgets" kind="outline" size="lg">
                Budgets
              </MkLink>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="mt-14 sm:mt-20">
            <Shot name="banking" priority alt="The Review screen: suggested matches between bank statement lines and your records, including a payroll run" />
          </Reveal>
        </Wrap>
      </DarkBand>

      <section className="py-24 sm:py-32">
        <Wrap>
          <Reveal className="max-w-3xl">
            <H2>How a month goes.</H2>
            <P className="mt-5">The first time takes about twenty minutes. After that, a month is about fifteen.</P>
          </Reveal>
          <ol className="mt-14 grid gap-x-8 gap-y-10 md:grid-cols-5">
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
        <Wrap className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal className="lg:order-2">
            <H2>Any bank. No login.</H2>
            <P className="mt-5">Almost every bank lets you download your transactions as a file. Solo Books reads it, works out which column is which, and shows you a preview before anything is saved.</P>
            <Ticks
              className="mt-7"
              items={[
                'CSV, OFX and QFX files',
                'Dates, amounts and withdrawal signs are detected for you, and you can correct them on the preview',
                'Statements that overlap are de-duplicated, so a re-download never doubles anything',
                'Changed your mind? Undo an import until you start reviewing its lines',
              ]}
            />
          </Reveal>
          <Reveal delay={0.08} className="lg:order-1">
            <StatementImportVisual />
          </Reveal>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32">
        <Wrap className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <H2>Every line, matched.</H2>
            <P className="mt-5">Each statement line is either already in your records or it isn’t. Solo Books compares amounts, dates and wording and suggests the match. You decide.</P>
            <Ticks
              className="mt-7"
              items={[
                'Match all the sure ones in one click, or go through them one at a time',
                'A line with nothing to match becomes a new entry in a click',
                'Money moved between your own accounts is kept out of income and expenses',
                'One deposit that covers several invoices, or several payments that cover one bill, can be matched together, with a note on why the totals differ',
              ]}
            />
          </Reveal>
          <Reveal delay={0.08}>
            <SuggestionsVisual />
          </Reveal>
        </Wrap>
      </section>

      <DarkBand className="py-24 sm:py-32">
        <Wrap className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          <Reveal>
            <H2>Payroll finds its own bank lines.</H2>
            <P className="mt-5">
              Payroll leaves your bank in pieces: each employee’s net pay on payday, then tax deposits weeks later, sometimes one deposit covering several payrolls. Solo Books already has the exact amounts in your pay stubs, so it recognizes those lines for you.
            </P>
            <Ticks
              className="mt-7"
              items={[
                'Net pay, and federal, Oklahoma, FUTA and SUTA deposits, recognized from your saved pay stubs',
                'One deposit that covers several payrolls is matched to all of them',
                'A progress note shows how much of each payroll is still unaccounted for',
                'Always a suggestion. Nothing is matched until you confirm it',
              ]}
            />
            <MkLink to="/features/payroll" kind="outline" className="mt-8">
              How payroll works <Arrow />
            </MkLink>
          </Reveal>
          <Reveal delay={0.1}>
            <PayrollMatchVisual />
          </Reveal>
        </Wrap>
      </DarkBand>

      <section className="py-24 sm:py-32">
        <Wrap className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal className="lg:order-2">
            <H2>Reconcile once a month.</H2>
            <P className="mt-5">Reconciling just means proving your books match your bank. Enter the statement’s closing date and ending balance, and Solo Books adds up your reviewed lines and shows the difference.</P>
            <Ticks
              className="mt-7"
              items={[
                'It must be $0.00, with every line reviewed, before you can finish',
                'If it isn’t, it points you to the usual causes: a missing line, a duplicate, a wrong amount or a mistyped balance',
                'Finishing locks that month’s lines so they can’t change by accident',
                'Need to fix something? Reopen the latest month, change it, and finish again',
              ]}
            />
          </Reveal>
          <Reveal delay={0.08} className="lg:order-1">
            <ReconcileMathVisual />
          </Reveal>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32" style={{ background: panel.bg }}>
        <Wrap className="grid items-center gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <H2>One screen to finish a month.</H2>
            <P className="mt-5">Your starting balance, the statement’s ending balance and the difference sit together, with a history of every month you have finished.</P>
          </Reveal>
          <Reveal delay={0.08}>
            <Shot name="reconcile" alt="The Reconcile screen: starting balance, statement ending balance and a difference of zero" />
          </Reveal>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32">
        <Wrap className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <H2>What it doesn’t do yet.</H2>
          </Reveal>
          <Reveal delay={0.08}>
            <P>Solo Books reads statement files you upload. It is not a live connection to your bank, and that is on purpose: it never holds your bank login. Here is the rest of the line.</P>
            <Ticks
              className="mt-6"
              items={[
                'It doesn’t pull transactions in automatically. You upload a file, usually once a month.',
                'Checking and savings accounts only. Credit cards and loans aren’t supported yet.',
                'It suggests matches but never applies one without you.',
                'It doesn’t categorize new transactions by rule yet. You choose a category when you add a line to your records.',
                'It doesn’t move money, pay anyone or file anything for you.',
              ]}
            />
            <P className="mt-6">Only each transaction’s date, amount and description are saved. The file itself is never kept.</P>
          </Reveal>
        </Wrap>
      </section>

      <section className="relative overflow-hidden py-28 text-center sm:py-36" style={{ background: panel.bg }}>
        <Wrap className="relative">
          <Reveal>
            <H2 className="mx-auto max-w-3xl">Close the month with confidence.</H2>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <MkLink to="/signup" size="lg">
                Get started <Arrow />
              </MkLink>
              <MkLink to="/features" kind="outline" size="lg">
                All features
              </MkLink>
            </div>
          </Reveal>
        </Wrap>
      </section>
    </>
  )
}
