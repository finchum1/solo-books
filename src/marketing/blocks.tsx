import type { CSSProperties, ReactNode } from 'react'
import { panel } from '../lib/landingTheme'
import { Check } from './ui'

/** Page-level headline. Size steps with the viewport, capped under 6rem; tracking stays above -0.04em. */
export function H1({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <h1
      className={`font-semibold ${className}`}
      style={{ fontSize: 'clamp(2.5rem, 6.2vw, 5rem)', lineHeight: 1.02, letterSpacing: '-0.035em', textWrap: 'balance', color: panel.ink, ...style }}
    >
      {children}
    </h1>
  )
}

export function H2({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <h2
      className={`font-semibold ${className}`}
      style={{ fontSize: 'clamp(1.9rem, 4vw, 3.1rem)', lineHeight: 1.06, letterSpacing: '-0.03em', textWrap: 'balance', color: panel.ink, ...style }}
    >
      {children}
    </h2>
  )
}

export function H3({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-xl font-semibold tracking-tight sm:text-2xl ${className}`} style={{ color: panel.ink, textWrap: 'balance' }}>
      {children}
    </h3>
  )
}

/** Running copy: dim ink, a readable measure. */
export function P({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <p className={`max-w-[62ch] text-base leading-relaxed sm:text-[17px] ${className}`} style={{ color: panel.inkDim, ...style }}>
      {children}
    </p>
  )
}

export function Ticks({ items, className = '' }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed" style={{ color: panel.ink }}>
          <span className="mt-1" style={{ color: panel.goldText }}>
            <Check />
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

/** Two soft gold light-leaks at the top of a hero: what the glass header refracts. */
export function HeroGlow({ height = '75%' }: { height?: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0"
      style={{
        height,
        background:
          'radial-gradient(ellipse 38% 60% at 27% 0%, var(--mk-glow), transparent 70%), radial-gradient(ellipse 34% 55% at 76% 0%, var(--mk-glow), transparent 70%)',
      }}
    />
  )
}

/** A large rounded surface. Used sparingly and never nested. */
export function Surface({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-3xl ${className}`} style={{ background: panel.bgRaised, boxShadow: `0 0 0 1px ${panel.border}`, ...style }}>
      {children}
    </div>
  )
}

/** A full-bleed band that stays black in both themes. */
export function DarkBand({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section data-mk-band className={`mk-dark relative overflow-hidden ${className}`} style={{ background: panel.bgDeep, color: panel.ink }}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 85% 0%, rgba(203,176,120,0.13), transparent 70%)' }} />
      <div className="relative">{children}</div>
    </section>
  )
}
