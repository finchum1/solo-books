import { panel } from '../lib/landingTheme'
import { Arrow, MkLink, Reveal, Shot, Wrap, usePageMeta } from './ui'
import { DarkBand, H1, H2, H3, P, Surface, Ticks } from './blocks'
import { PayrollSample } from './PayrollSample'

const STEPS = [
  { t: 'Set up each employee', d: 'Pay rate and pay frequency, plus the choices from their signed federal W-4 and Oklahoma OK-W-4.' },
  { t: 'Enter the hours and any bonus', d: 'Hourly staff get regular and overtime hours. Salaried staff fill in on their own.' },
  { t: 'Review every figure', d: 'Gross pay, each withholding, net pay and what you owe as the employer, all on screen before anything is saved.' },
  { t: 'Record it', d: 'One confirmation saves the pay stubs and adds two expenses to your ledger: gross wages, and your share of payroll taxes.' },
  { t: 'Pay and deposit', d: 'You pay your people and make the tax deposits. Solo Books tells you exactly what the numbers are.' },
]

const TAXES: [string, string][] = [
  ['Federal income tax', 'IRS Publication 15-T (2026), using each employee’s W-4 entries.'],
  ['Social Security', '6.2% from the employee and 6.2% from you, up to the 2026 wage limit of $184,500.'],
  ['Medicare', '1.45% each, with no limit, plus the extra 0.9% on an employee’s wages above $200,000.'],
  ['Oklahoma income tax', 'The Oklahoma Tax Commission’s 2026 withholding tables, using marital status and allowances.'],
  ['Federal unemployment', 'FUTA at an effective 0.6% on the first $7,000 per employee each year.'],
  ['State unemployment', 'Your own rate and wage base from your Oklahoma Employment Security Commission notice.'],
]

export function PayrollFeaturePage() {
  usePageMeta('Payroll | Solo Books', 'Run payroll for W-2 employees: 2026 federal and Oklahoma withholding, bonuses, pay stubs, ledger posting and Form 941, 940 and W-2 totals.')
  return (
    <>
      <DarkBand className="pb-24 pt-36 sm:pb-32 sm:pt-48">
        <Wrap className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          <Reveal>
            <H1 style={{ fontSize: 'clamp(2.4rem, 5.4vw, 4.4rem)' }}>Payroll, built into your books.</H1>
            <P className="mt-6 text-lg">
              Run payroll for your W-2 employees without a second system. Enter hours, add a bonus, and Solo Books works out the taxes, writes the pay stubs and records the cost in your ledger.
            </P>
            <div className="mt-9 flex flex-wrap gap-3">
              <MkLink to="/signup" size="lg">
                Get started <Arrow />
              </MkLink>
            </div>
            <p className="mt-5 max-w-[52ch] text-sm leading-relaxed" style={{ color: panel.inkDim }}>
              Try it on the right. This is the real calculator, running a made-up employee on the 2026 tables.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <PayrollSample />
          </Reveal>
        </Wrap>
      </DarkBand>

      <section className="py-24 sm:py-32">
        <Wrap>
          <Reveal className="max-w-3xl">
            <H2>How a payroll run works.</H2>
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
        <Wrap className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <H2>What it calculates.</H2>
            <P className="mt-5">Every figure comes from the published 2026 tables, and you see each one before you record the run.</P>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[15px]">
                <tbody>
                  {TAXES.map(([k, v]) => (
                    <tr key={k} style={{ borderTop: `1px solid ${panel.border}` }}>
                      <th scope="row" className="w-[34%] py-4 pr-6 align-top font-semibold" style={{ color: panel.ink }}>
                        {k}
                      </th>
                      <td className="py-4 leading-relaxed" style={{ color: panel.inkDim }}>
                        {v}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: `1px solid ${panel.border}` }} aria-hidden>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32">
        <Wrap>
          <Reveal className="max-w-3xl">
            <H2>Bonuses, taxed the way you choose.</H2>
            <P className="mt-5">
              A bonus is taxed differently from regular pay for income tax, but not for Social Security or Medicare, which apply in full. For income tax you pick how, per run.
            </P>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <Reveal>
              <Surface className="h-full p-7 sm:p-9">
                <H3>Flat rate</H3>
                <P className="mt-3">22% federal and 4.5% Oklahoma on the bonus alone, with 37% federal on the part of a year’s bonuses above $1 million. The simplest choice, and the one used for a bonus paid on its own.</P>
              </Surface>
            </Reveal>
            <Reveal delay={0.08}>
              <Surface className="h-full p-7 sm:p-9">
                <H3>Combined with regular pay</H3>
                <P className="mt-3">The bonus and the regular pay are taxed together, as if they were one payment, so the withholding tracks the whole check. Better when a bonus comes with a regular paycheck.</P>
              </Surface>
            </Reveal>
          </div>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32" style={{ background: panel.bg }}>
        <Wrap className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <Reveal>
            <H2>Pay stubs, and numbers ready to file.</H2>
            <Ticks
              className="mt-7"
              items={[
                'A pay stub PDF per employee, or all of a run at once, with year-to-date totals',
                'Quarterly totals laid out for Forms 941 and 940',
                'Yearly totals for each employee’s W-2 boxes',
                'Gross wages and employer taxes post to your ledger, so your Profit & Loss includes payroll',
              ]}
            />
          </Reveal>
          <Reveal delay={0.08}>
            <Shot name="payroll-report" alt="The payroll report: quarterly tax totals and W-2 totals per employee" />
          </Reveal>
        </Wrap>
      </section>

      <section className="py-24 sm:py-32">
        <Wrap className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <H2>What it doesn’t do yet.</H2>
          </Reveal>
          <Reveal delay={0.08}>
            <P>Solo Books is a calculation and record-keeping tool, not a payroll service, and it’s worth knowing exactly where that line is.</P>
            <Ticks
              className="mt-6"
              items={[
                'It doesn’t pay your employees or the tax agencies. You make the payments and deposits.',
                'It doesn’t file anything. You file Forms 941 and 940, your Oklahoma returns and W-2s yourself, using the totals it gives you.',
                'It supports Oklahoma employers. Other states aren’t built yet.',
                'No pre-tax deductions (such as a 401(k) or health premiums) or garnishments yet.',
                'It never stores Social Security numbers or bank details.',
              ]}
            />
            <P className="mt-6">Tax tables are for 2026 and updated each year. Have a CPA or payroll professional look over your setup before your first run.</P>
          </Reveal>
        </Wrap>
      </section>

      <section className="relative overflow-hidden py-28 text-center sm:py-36" style={{ background: panel.bg }}>
        <Wrap className="relative">
          <Reveal>
            <H2 className="mx-auto max-w-3xl">Put payroll next to your books.</H2>
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
