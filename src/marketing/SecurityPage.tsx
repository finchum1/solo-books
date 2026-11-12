import { Link } from 'react-router-dom'
import { panel } from '../lib/landingTheme'
import { Arrow, MkLink, Reveal, Wrap, usePageMeta } from './ui'
import { H1, H2, H3, HeroGlow, P } from './blocks'

const SECTIONS = [
  {
    t: 'Separated at the database',
    d: 'Every record is tagged with the account that owns it, and the database refuses to show it to anyone else. This is enforced in the database itself, not only in the app, so it holds even if the app has a bug.',
  },
  {
    t: 'Receipts are never public',
    d: 'Receipt files are kept in private storage. When you open one, the app asks for a link that works for about a minute and only for your signed-in account.',
  },
  {
    t: 'Passwords we can’t read',
    d: 'Your password is stored only as a one-way hash by our sign-in provider. We can’t see it or read it back to you, and a reset email is the only way back in if you forget it.',
  },
  {
    t: 'What we deliberately don’t collect',
    d: 'No Social Security numbers, no bank account or routing numbers, no card numbers. The app has no fields for them and never connects to your bank, so there is nothing of that kind to lose. Please keep them out of notes and description fields too.',
  },
  {
    t: 'Where it runs',
    d: 'The app is hosted on Vercel. Your data is stored with Supabase for the database, sign-in and file storage. Data is encrypted in transit. These providers handle information only to run the app for us.',
  },
  {
    t: 'You stay in control',
    d: 'Edit or delete your businesses, transactions, employees and payroll runs yourself. To delete your whole account, email us and we’ll remove it and the data tied to it. Download your payroll PDFs first; employers are often required to keep those records.',
  },
]

export function SecurityPage() {
  usePageMeta('Security and privacy | Solo Books', 'How Solo Books keeps each account’s books separate and private, what it never collects, and where your data lives.')
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-36 sm:pt-48">
        <HeroGlow />
        <Wrap className="relative">
          <H1 className="max-w-4xl">Your books are yours.</H1>
          <P className="mt-6 text-lg sm:text-xl">Financial records deserve plain answers. Here is how Solo Books handles yours, including what it doesn’t do.</P>
        </Wrap>
      </section>

      <Wrap className="pb-24 sm:pb-32">
        <div className="grid gap-x-12 gap-y-14 md:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.t} delay={(i % 2) * 0.08}>
              <div className="border-t pt-6" style={{ borderColor: panel.borderStrong }}>
                <H3>{s.t}</H3>
                <P className="mt-3">{s.d}</P>
              </div>
            </Reveal>
          ))}
        </div>
      </Wrap>

      <section className="py-24 sm:py-32" style={{ background: panel.bg }}>
        <Wrap className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <H2>What isn’t there yet.</H2>
          </Reveal>
          <Reveal delay={0.08}>
            <P>Two-step sign-in isn’t available yet, so choose a strong, unique password. And while we’ve built carefully, no system is perfect: if you ever spot something that looks wrong, please email us and we’ll look into it right away.</P>
            <P className="mt-5">
              The full details are in the{' '}
              <Link to="/privacy" className="underline" style={{ color: panel.goldText }}>
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="underline" style={{ color: panel.goldText }}>
                Terms of Service
              </Link>
              . Questions go to{' '}
              <a href="mailto:terrence@latchpointstudios.com" className="underline" style={{ color: panel.goldText }}>
                terrence@latchpointstudios.com
              </a>
              .
            </P>
          </Reveal>
        </Wrap>
      </section>

      <section className="py-28 text-center sm:py-36">
        <Wrap>
          <Reveal>
            <H2 className="mx-auto max-w-3xl">Keep your books in one private place.</H2>
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
