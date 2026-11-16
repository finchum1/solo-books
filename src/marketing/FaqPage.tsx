import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { panel } from '../lib/landingTheme'
import { Arrow, MkLink, Reveal, Wrap, usePageMeta } from './ui'
import { H1, H2, HeroGlow, P } from './blocks'
import { FaqList, useFaqJsonLd } from './Faq'
import { GROUPS, pick } from './faqData'

const ALL = GROUPS.flatMap((g) => pick(g.items))

export function FaqPage() {
  usePageMeta('Questions and answers | Solo Books', 'Answers about Solo Books: bank statements and reconciling, budgets, payroll, teams and AI connections, privacy, and what it does and doesn’t do.')
  useFaqJsonLd(ALL)
  // Opened as /faq#payroll (a shared link): the section isn't on the page when the browser looks for it, so scroll there once it is.
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 200)
    return () => window.clearTimeout(t)
  }, [hash])
  return (
    <>
      <section className="relative overflow-hidden pb-14 pt-36 sm:pb-20 sm:pt-48">
        <HeroGlow />
        <Wrap className="relative">
          <H1 className="max-w-4xl">Questions, answered.</H1>
          <P className="mt-6 text-lg sm:text-xl">The things people ask before they begin, in plain words. Can’t find yours? Email us and a real person will reply.</P>
          <nav aria-label="Jump to a topic" className="mt-9 flex flex-wrap gap-2">
            {GROUPS.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="rounded-full px-4 py-2 text-sm font-medium transition hover:bg-[color-mix(in_srgb,var(--mk-ink)_6%,transparent)]"
                style={{ color: panel.ink, boxShadow: `inset 0 0 0 1px ${panel.borderStrong}` }}
              >
                {g.title}
              </a>
            ))}
          </nav>
        </Wrap>
      </section>

      <Wrap className="space-y-20 pb-24 sm:space-y-28 sm:pb-32">
        {GROUPS.map((g) => (
          <section key={g.id} id={g.id} className="scroll-mt-28 grid gap-8 lg:grid-cols-[1fr_1.9fr] lg:gap-20">
            <Reveal>
              <H2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>{g.title}</H2>
              <P className="mt-3">{g.blurb}</P>
            </Reveal>
            <Reveal delay={0.06}>
              <FaqList items={pick(g.items)} />
            </Reveal>
          </section>
        ))}
      </Wrap>

      <section className="relative overflow-hidden py-28 text-center sm:py-36" style={{ background: panel.bg }}>
        <Wrap className="relative">
          <Reveal>
            <H2 className="mx-auto max-w-3xl">Still wondering about something?</H2>
            <P className="mx-auto mt-5 text-center">Ask us directly, or just try it. Adding a business and logging a first transaction takes a few minutes.</P>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <MkLink to="/signup" size="lg">
                Request an invite <Arrow />
              </MkLink>
              <a
                href="mailto:terrence@latchpointstudios.com"
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-medium transition duration-200 active:scale-[0.97]"
                style={{ color: panel.ink, boxShadow: `inset 0 0 0 1px ${panel.borderStrong}` }}
              >
                Email us
              </a>
            </div>
          </Reveal>
        </Wrap>
      </section>
    </>
  )
}
