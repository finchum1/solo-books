import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { panel } from '../lib/landingTheme'
import { Arrow, Reveal, Wrap } from './ui'
import { H2, P } from './blocks'
import { pick } from './faqData'
import type { Faq } from './faqData'

/** Tells search engines the questions on this page (FAQ structured data), and removes it again when the page changes. */
export function useFaqJsonLd(items: Faq[]) {
  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.dataset.faq = 'true'
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
    })
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [items])
}

/** A list of questions that open and close. Native <details>, so it works with the keyboard and screen readers and needs no script. */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="border-b" style={{ borderColor: panel.borderStrong }}>
      {items.map((f) => (
        <details key={f.q} className="group border-t" style={{ borderColor: panel.borderStrong }}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
            <span className="text-[17px] font-semibold leading-snug sm:text-lg" style={{ color: panel.ink, textWrap: 'balance' }}>
              {f.q}
            </span>
            <span className="mt-1 shrink-0 transition-transform duration-200 group-open:rotate-45" style={{ color: panel.goldText }} aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </summary>
          <div className="pb-6 pr-10">
            <p className="max-w-[68ch] text-[15px] leading-relaxed sm:text-base" style={{ color: panel.inkDim }}>
              {f.a}
            </p>
            {f.link && (
              <Link to={f.link.to} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline" style={{ color: panel.goldText }}>
                {f.link.label} <Arrow />
              </Link>
            )}
          </div>
        </details>
      ))}
    </div>
  )
}

/** A short FAQ block for a page: a heading, the questions chosen by id, and a link on to the full list. */
export function FaqSection({ ids, title = 'Questions people ask.', intro, tinted = false }: { ids: string[]; title?: string; intro?: string; tinted?: boolean }) {
  const items = pick(ids)
  useFaqJsonLd(items)
  return (
    <section className="py-24 sm:py-32" style={tinted ? { background: panel.bg } : undefined}>
      <Wrap className="grid gap-10 lg:grid-cols-[1fr_1.7fr] lg:gap-20">
        <Reveal>
          <H2>{title}</H2>
          {intro && <P className="mt-5">{intro}</P>}
          <Link to="/faq" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline" style={{ color: panel.goldText }}>
            All questions <Arrow />
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <FaqList items={items} />
        </Reveal>
      </Wrap>
    </section>
  )
}
