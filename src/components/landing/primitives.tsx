import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { panel } from '../../lib/landingTheme'

/**
 * A small filled/outline dot marking a row's selected state -- the plain
 * SaaS equivalent of a checkbox, standing in for the prior worlds' jack and
 * ink-stamp devices.
 */
export function RowDot({ active }: { active: boolean }) {
  return (
    <motion.span
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: 18, height: 18, boxShadow: `inset 0 0 0 1.5px ${active ? panel.gold : panel.border}` }}
      animate={{ background: active ? panel.gold : 'transparent' }}
      transition={{ duration: 0.2 }}
    >
      {active && (
        <motion.svg width="10" height="10" viewBox="0 0 16 16" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
          <path d="M3 8l3.5 3.5L13 4.5" fill="none" stroke={panel.bgDeep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      )}
    </motion.span>
  )
}

/**
 * A ticking numeric total, digit-climbing rather than a linear count --
 * set in the page's own sans (tabular figures via CSS), not a separate
 * mono costume, matching how this canon shows numbers in one type voice.
 */
export function TickerTotal({
  value,
  prefix = '$',
  className = '',
  active = true,
  style,
}: {
  value: number
  prefix?: string
  className?: string
  active?: boolean
  style?: React.CSSProperties
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!active) {
      setDisplay(0)
      return
    }
    let raf: number
    const start = performance.now()
    const duration = 700
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(eased * value))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, active])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix}
      {display.toLocaleString()}
    </span>
  )
}
