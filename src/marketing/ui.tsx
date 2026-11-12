import { useEffect, useLayoutEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { panel } from '../lib/landingTheme'

/** True while the page is in dark mode; follows the toggle live (the class lives on <html>). */
export function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')))
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

/** Sets the tab title and meta description for a public page. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title
    const meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content') ?? ''
    meta?.setAttribute('content', description)
    return () => {
      document.title = prevTitle
      meta?.setAttribute('content', prevDesc)
    }
  }, [title, description])
}

type ButtonKind = 'primary' | 'ghost' | 'outline'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-200 active:scale-[0.97] whitespace-nowrap'

function buttonStyle(kind: ButtonKind): CSSProperties {
  if (kind === 'primary') return { background: panel.gold, color: panel.onGold, boxShadow: '0 1px 0 rgba(255,255,255,0.45) inset, 0 8px 22px -8px rgba(203,176,120,0.55)' }
  if (kind === 'outline') return { color: panel.ink, boxShadow: `inset 0 0 0 1px ${panel.borderStrong}` }
  return { color: panel.ink }
}

const SIZES = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-[15px]', lg: 'px-8 py-4 text-base' } as const

export function MkLink({
  to,
  kind = 'primary',
  size = 'md',
  children,
  className = '',
}: {
  to: string
  kind?: ButtonKind
  size?: keyof typeof SIZES
  children: ReactNode
  className?: string
}) {
  const hover = kind === 'primary' ? 'hover:brightness-105' : 'hover:bg-[color-mix(in_srgb,var(--mk-ink)_7%,transparent)]'
  return (
    <Link to={to} className={`${BUTTON_BASE} ${SIZES[size]} ${hover} ${className}`} style={buttonStyle(kind)}>
      {children}
    </Link>
  )
}

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function Check({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

/** Fades and lifts into place once, from an already-visible fallback if motion is off. */
export function Reveal({ children, delay = 0, className = '', y = 22 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Page container: one measure, one gutter. */
export function Wrap({ children, className = '', width = 'max-w-6xl' }: { children: ReactNode; className?: string; width?: string }) {
  return <div className={`mx-auto w-full ${width} px-5 sm:px-8 ${className}`}>{children}</div>
}

/** A browser-window frame (dots + hairline strip) around a real app screenshot. */
export function BrowserFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{ background: panel.bgRaised, boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}
    >
      <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: `1px solid ${panel.border}` }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: panel.borderStrong }} />
        ))}
      </div>
      {children}
    </div>
  )
}

export type ShotName = 'home' | 'ledger' | 'reports' | 'payroll' | 'payroll-report' | 'mobile-home' | 'mobile-payroll'

/** A real app screenshot that follows the page theme (light or dark capture). */
export function Shot({ name, alt, frame = true, className = '', priority = false }: { name: ShotName; alt: string; frame?: boolean; className?: string; priority?: boolean }) {
  const dark = useIsDark()
  const mobile = name.startsWith('mobile')
  const img = (
    <img
      src={`/landing/shot-${name}-${dark ? 'dark' : 'light'}.jpg`}
      alt={alt}
      width={mobile ? 390 : 1360}
      height={mobile ? 844 : 850}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className="block h-auto w-full"
    />
  )
  return frame ? <BrowserFrame className={className}>{img}</BrowserFrame> : <div className={className}>{img}</div>
}

/**
 * "SOLO BOOKS" set so it spans the full width of its container, with the
 * baseline on the bottom edge. Drawn as SVG text so the baseline position is
 * exact (an HTML line box would leave an unpredictable gap below the letters),
 * measured with the real font once it loads, and pinned to that width with
 * textLength so a fallback face can't leave it short.
 */
export function FitWordmark({ text = 'SOLO BOOKS', className = '' }: { text?: string; className?: string }) {
  const CAP = 70 // Hanken Grotesk cap height at font-size 100
  const OVERSHOOT = 1.4 // round letters (S, O) dip a hair below the baseline; keep them whole
  const TRACK = -3
  // x: where the ink starts; w: ink width; adv: the text's advance width (for textLength)
  const [box, setBox] = useState({ x: 4, w: 632, adv: 640 })

  useLayoutEffect(() => {
    let cancelled = false
    async function measure() {
      try {
        await document.fonts.load('800 100px "Hanken Grotesk"')
      } catch {
        /* fall through to the estimate */
      }
      if (cancelled) return
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx) return
      ctx.font = '800 100px "Hanken Grotesk", system-ui, sans-serif'
      const m = ctx.measureText(text)
      const gaps = TRACK * (text.length - 1)
      const adv = m.width + gaps
      const inkLeft = -m.actualBoundingBoxLeft
      const inkRight = m.actualBoundingBoxRight + gaps
      if (adv > 100 && inkRight > inkLeft) setBox({ x: Math.round(inkLeft * 10) / 10, w: Math.round((inkRight - inkLeft) * 10) / 10, adv: Math.round(adv) })
    }
    measure()
    return () => {
      cancelled = true
    }
  }, [text])

  return (
    <svg
      viewBox={`${box.x} 0 ${box.w} ${CAP + OVERSHOOT}`}
      className={`block w-full overflow-visible ${className}`}
      role="img"
      aria-label={text === 'SOLO BOOKS' ? 'Solo Books' : text}
      preserveAspectRatio="xMidYMax meet"
    >
      <text
        x="0"
        y={CAP}
        fontFamily="'Hanken Grotesk', system-ui, sans-serif"
        fontWeight={800}
        fontSize={100}
        letterSpacing={TRACK}
        textLength={box.adv}
        lengthAdjust="spacing"
        fill={panel.gold}
      >
        {text}
      </text>
    </svg>
  )
}
