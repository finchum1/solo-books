import { useEffect, useRef, useState } from 'react'
import type { ReactNode, PointerEvent } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BrandMark } from '../components/BrandMark'
import { applyTheme } from '../lib/theme'
import { brandFont, panel } from '../lib/landingTheme'
import { FitWordmark, MkLink, Wrap, useIsDark } from './ui'

const NAV = [
  { to: '/features', label: 'Features', end: true },
  { to: '/features/payroll', label: 'Payroll', end: true, isNew: true },
  { to: '/security', label: 'Security', end: true },
]

function ThemePill() {
  const dark = useIsDark()
  return (
    <button
      type="button"
      onClick={() => applyTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative grid h-9 w-9 place-items-center rounded-full transition hover:bg-[color-mix(in_srgb,var(--mk-ink)_8%,transparent)]"
      style={{ color: panel.ink }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'sun' : 'moon'}
          initial={{ rotate: -70, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 70, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="grid place-items-center"
        >
          {dark ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

function Header({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const [overDark, setOverDark] = useState(false)
  // At the very top the header is a plain bar aligned to the page gutters; once
  // the page scrolls it condenses into the floating glass pill.
  const [scrolled, setScrolled] = useState(() => window.scrollY > 12)
  const pill = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    let raf = 0
    const check = () => {
      raf = 0
      setScrolled(window.scrollY > 12)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // While the pill sits over a region that is black in both themes (the Payroll
  // band, the footer), flip it to the dark token set so its glass, mark and
  // links keep their contrast instead of turning into a grey slab in light mode.
  useEffect(() => {
    let raf = 0
    const PILL_CENTER = 44
    const check = () => {
      raf = 0
      let hit = false
      document.querySelectorAll('[data-mk-band]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top <= PILL_CENTER && r.bottom >= PILL_CENTER) hit = true
      })
      setOverDark(hit)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    check()
    const settle = window.setTimeout(check, 400) // after the new route has laid out
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.clearTimeout(settle)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [pathname])

  function track(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const linkCls = (active: boolean) =>
    `relative rounded-full px-4 py-2 text-sm font-medium transition ${active ? '' : 'hover:bg-[color-mix(in_srgb,var(--mk-ink)_7%,transparent)]'}`

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={`pointer-events-auto relative w-full transition-[max-width] duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled ? 'max-w-4xl' : 'max-w-6xl'} ${overDark ? 'mk-dark' : ''}`}
      >
        <div
          ref={pill}
          onPointerMove={track}
          className={`relative h-14 rounded-full transition-[padding] duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled ? 'pl-4 pr-2 sm:pl-5' : 'px-1 sm:px-8'}`}
        >
          {/* The glass itself fades in on scroll; the bar's content sits above it. */}
          <span
            aria-hidden
            className={`mk-glass pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
          />
          <div className="relative z-10 flex h-full items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Solo Books home">
            <BrandMark color={panel.goldText} size={30} />
            <span className="whitespace-nowrap text-[21px] leading-none" style={{ color: panel.ink, fontFamily: brandFont }}>
              Solo Books
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => linkCls(isActive)} style={({ isActive }) => ({ color: isActive ? panel.goldText : panel.ink })}>
                {n.label}
                {n.isNew && (
                  <span className="ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wider" style={{ background: panel.gold, color: panel.onGold }}>
                    New
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <ThemePill />
            {signedIn ? (
              <MkLink to="/" size="sm">
                Open app
              </MkLink>
            ) : (
              <>
                <span className="hidden sm:inline-flex">
                  <MkLink to="/signin" kind="ghost" size="sm">
                    Sign in
                  </MkLink>
                </span>
                <MkLink to="/signup" size="sm">
                  Get started
                </MkLink>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label="Menu"
              className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-[color-mix(in_srgb,var(--mk-ink)_8%,transparent)] md:hidden"
              style={{ color: panel.ink }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          </div>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mk-glass mt-2 rounded-3xl p-2 md:hidden"
            >
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className="flex items-center justify-between rounded-2xl px-4 py-3 text-[15px] font-medium" style={({ isActive }) => ({ color: isActive ? panel.goldText : panel.ink })}>
                  {n.label}
                  {n.isNew && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: panel.gold, color: panel.onGold }}>
                      New
                    </span>
                  )}
                </NavLink>
              ))}
              {!signedIn && (
                <Link to="/signin" className="flex rounded-2xl px-4 py-3 text-[15px] font-medium" style={{ color: panel.ink }}>
                  Sign in
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold" style={{ color: panel.ink }}>
        {title}
      </h3>
      <ul className="space-y-3 text-sm" style={{ color: panel.inkDim }}>
        {children}
      </ul>
    </div>
  )
}

const fl = 'transition hover:text-[var(--mk-ink)]'

function Footer({ signedIn }: { signedIn: boolean }) {
  return (
    // Always black, in both themes, so the gold wordmark below always has its ground.
    <footer data-mk-band className="mk-dark relative overflow-hidden" style={{ background: panel.bgDeep, color: panel.ink }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${panel.gold}, transparent)`, opacity: 0.55 }}
      />
      <Wrap className="pt-16 sm:pt-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <BrandMark color={panel.gold} size={36} />
              <span className="text-2xl leading-none" style={{ fontFamily: brandFont }}>Solo Books</span>
            </div>
            <p className="mb-6 text-[15px] leading-relaxed" style={{ color: panel.inkDim }}>
              Books, receipts, contractors, clients and payroll. One private ledger for the business, or businesses, you run.
            </p>
            {!signedIn && (
              <MkLink to="/signup" size="sm">
                Create your account
              </MkLink>
            )}
          </div>
          <FooterCol title="Product">
            <li><Link to="/features" className={fl}>Features</Link></li>
            <li><Link to="/features/payroll" className={fl}>Payroll</Link></li>
            <li><Link to="/security" className={fl}>Security</Link></li>
          </FooterCol>
          <FooterCol title="Account">
            <li><Link to={signedIn ? '/' : '/signin'} className={fl}>{signedIn ? 'Open the app' : 'Sign in'}</Link></li>
            {!signedIn && <li><Link to="/signup" className={fl}>Create an account</Link></li>}
          </FooterCol>
          <FooterCol title="Company">
            <li><Link to="/privacy" className={fl}>Privacy</Link></li>
            <li><Link to="/terms" className={fl}>Terms</Link></li>
            <li><a href="mailto:terrence@latchpointstudios.com" className={fl}>Contact</a></li>
          </FooterCol>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-xs" style={{ borderColor: panel.border, color: panel.inkDim }}>
          <span>© {new Date().getFullYear()} Solo Books. Built and operated by <a href="https://latchpointstudios.com" className="underline">Latchpoint Studios, LLC</a>.</span>
          <span>Payroll tax tables: 2026 · Oklahoma employers</span>
        </div>
      </Wrap>

      {/* The signature close: the name, edge to edge, resting on the bottom of the page. */}
      <div className="mt-10 sm:mt-14" style={{ paddingInline: 'clamp(10px, 1.6vw, 28px)' }}>
        <motion.div initial={{ y: '34%', opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}>
          <FitWordmark />
        </motion.div>
      </div>
    </footer>
  )
}

export function MarketingShell({ children, signedIn = false }: { children: ReactNode; signedIn?: boolean }) {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="mk-root flex min-h-screen flex-col">
      <Header signedIn={signedIn} />
      <main className="flex-1">{children}</main>
      <Footer signedIn={signedIn} />
    </div>
  )
}
