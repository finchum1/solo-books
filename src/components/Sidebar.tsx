import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { ThemeToggle } from './ThemeToggle'
import { NAV } from '../lib/nav'
import { MoreIcon, NavIcon } from './NavIcons'
import { BrandMark } from './BrandMark'
import { Avatar } from './Avatar'
import { profileOf } from '../lib/profile'
import { useAccess } from '../lib/access'

/**
 * The desktop sidebar is a drawer. Open, it is a menu with labels, 208 to 340px wide (drag its right edge). Closed, it is a
 * 64px rail of icons that stays on the left, with a name tag on hover. The chevron on its edge (or a double-click on the edge)
 * opens and closes it, and the width is remembered. A quick flick, or dragging it narrow enough, closes it to the rail.
 */
const RAIL_PX = 64
const MIN_OPEN_PX = 208
const MAX_OPEN_PX = 340
const DEFAULT_OPEN_PX = 240
const NAV_KEY = 'solobooks-nav'
const FOLDER_KEY = 'sidebar-more-open'

const clampOpen = (n: number) => Math.max(MIN_OPEN_PX, Math.min(MAX_OPEN_PX, Math.round(n)))
function readNav(): { open: boolean; px: number } {
  try {
    const v = JSON.parse(localStorage.getItem(NAV_KEY) || 'null')
    if (v && typeof v.open === 'boolean') return { open: v.open, px: clampOpen(Number(v.px) || DEFAULT_OPEN_PX) }
  } catch {
    /* storage blocked: use the default */
  }
  return { open: true, px: DEFAULT_OPEN_PX }
}

const ALL_TOP = NAV.filter((n) => !n.inMoreFolder)
const FOLDER = NAV.filter((n) => n.inMoreFolder)

const linkCls = (isActive: boolean) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
  }`

const railCls = (active: boolean) =>
  `relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition ${
    active
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
  }`

const inFolder = (pathname: string) => FOLDER.some((n) => pathname === n.to || pathname.startsWith(`${n.to}/`))

/**
 * The "More" folder (open menu): the less-frequent pages, collapsed by default. It opens by itself when you are on one of
 * its pages (so the current page is never hidden), and otherwise remembers whether you left it open.
 */
function MoreFolder() {
  const { pathname } = useLocation()
  const inside = inFolder(pathname)
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(FOLDER_KEY) === '1'
    } catch {
      return false
    }
  })
  const expanded = open || inside

  useEffect(() => {
    try {
      localStorage.setItem(FOLDER_KEY, open ? '1' : '0')
    } catch {
      /* storage can be blocked; the folder just won't remember */
    }
  }, [open])

  return (
    <div>
      <button
        type="button"
        // While you are on one of its pages the folder stays open (so the current page is never
        // hidden); the click does nothing then, and does not change what it remembers.
        onClick={() => !inside && setOpen(!open)}
        aria-expanded={expanded}
        aria-controls="sidebar-more-folder"
        className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
          inside && !expanded
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        } ${inside ? 'cursor-default' : ''}`}
      >
        <MoreIcon size={18} />
        <span className="flex-1 text-left">More</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="sidebar-more-folder"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
              {FOLDER.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => linkCls(isActive)}>
                  <NavIcon to={item.to} size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface Tip {
  label: string
  x: number
  y: number
}
interface PopMenu {
  x: number
  y: number
}

const SignOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
)

export function Sidebar({ session }: { session: Session }) {
  const { pathname } = useLocation()
  const me = profileOf(session.user)
  const access = useAccess()
  // Payroll is hidden from someone who may not open any business's payroll (a view-only teammate).
  const TOP = ALL_TOP.filter((n) => n.to !== '/payroll' || !access.ready || access.payrollIds.length > 0)
  const [nav, setNav] = useState(readNav) // open or closed, and how wide it is when open
  const [live, setLive] = useState<number | null>(null) // its width while the edge is being dragged
  const drag = useRef<{ x: number; w: number; moved: boolean; samples: { x: number; t: number }[] } | null>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const [pop, setPop] = useState<PopMenu | null>(null)

  const width = live ?? (nav.open ? nav.px : RAIL_PX)
  const rail = width < 140

  const save = useCallback((next: { open: boolean; px: number }) => {
    setNav(next)
    try {
      localStorage.setItem(NAV_KEY, JSON.stringify(next))
    } catch {
      /* storage blocked: it just won't be remembered */
    }
  }, [])
  const toggle = () => save({ ...nav, open: !nav.open })

  // Drag the right edge: any width from the rail to the widest the open menu goes. Let go and it settles: narrower than
  // ~150px closes to the rail, anything else opens (never narrower than the open minimum). A quick flick left closes it,
  // a quick flick right opens it.
  const edge = {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return
      drag.current = { x: e.clientX, w: width, moved: false, samples: [{ x: e.clientX, t: performance.now() }] }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      const d = drag.current
      if (!d || (!d.moved && Math.abs(e.clientX - d.x) < 4)) return
      d.moved = true
      d.samples.push({ x: e.clientX, t: performance.now() })
      if (d.samples.length > 8) d.samples.shift()
      setLive(Math.max(RAIL_PX, Math.min(MAX_OPEN_PX, d.w + (e.clientX - d.x))))
    },
    onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
      const d = drag.current
      drag.current = null
      if (!d || !d.moved) return
      const w = Math.max(RAIL_PX, Math.min(MAX_OPEN_PX, d.w + (e.clientX - d.x)))
      const last = d.samples[d.samples.length - 1]
      const from = d.samples.find((p) => last.t - p.t <= 120) || last
      const v = performance.now() - last.t > 90 || last.t === from.t ? 0 : (last.x - from.x) / (last.t - from.t) // px per ms, right is positive
      setLive(null)
      if (v < -0.8) save({ ...nav, open: false })
      else if (v > 0.8) save({ open: true, px: clampOpen(Math.max(w, nav.px)) })
      else if (w < 150) save({ ...nav, open: false })
      else save({ open: true, px: clampOpen(w) })
    },
    onPointerCancel: () => {
      drag.current = null
      setLive(null)
    },
    onDoubleClick: toggle,
  }

  // A name tag or the More menu belongs to the rail; both go away with the page change or once the menu is open.
  useEffect(() => {
    setPop(null)
    setTip(null)
  }, [pathname])
  useEffect(() => {
    if (!rail) {
      setPop(null)
      setTip(null)
    }
  }, [rail])
  useEffect(() => {
    if (!pop) return
    const onDown = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('[data-rail-menu], [data-rail-trigger]')) return
      setPop(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPop(null)
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [pop])

  const tipOn = (label: string) => (e: { currentTarget: HTMLElement }) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ label, x: r.right + 10, y: r.top + r.height / 2 })
  }
  const tipHandlers = (label: string) => ({ onMouseEnter: tipOn(label), onMouseLeave: () => setTip(null), onFocus: tipOn(label), onBlur: () => setTip(null) })

  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/')
  const moreActive = inFolder(pathname)

  const railNav: ReactNode = (
    <div className="flex flex-col gap-1.5">
      {TOP.map((item) => {
        const active = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
        return (
          <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} aria-current={active ? 'page' : undefined} className={railCls(active)} {...tipHandlers(item.label)}>
            <NavIcon to={item.to} size={20} />
          </NavLink>
        )
      })}
      {FOLDER.length > 0 && (
        <button
          type="button"
          data-rail-trigger=""
          aria-label="More"
          aria-haspopup="menu"
          aria-expanded={!!pop}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setTip(null)
            setPop((cur) => (cur ? null : { x: r.right + 10, y: r.top }))
          }}
          className={railCls(moreActive || !!pop)}
          {...tipHandlers('More')}
        >
          <MoreIcon size={20} />
        </button>
      )}
    </div>
  )

  const openNav: ReactNode = (
    <div className="flex flex-col gap-1">
      {TOP.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => linkCls(isActive)}>
          <NavIcon to={item.to} size={18} />
          {item.label}
        </NavLink>
      ))}
      {FOLDER.length > 0 && <MoreFolder />}
    </div>
  )

  return (
    <>
      <aside
        style={{ width }}
        className={`hidden md:flex z-30 h-screen shrink-0 sticky top-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 ${
          live === null ? 'transition-[width] duration-200 ease-out motion-reduce:transition-none' : ''
        }`}
      >
        {rail ? (
          <>
            <Link to="/" aria-label="Solo Books home" className="shrink-0 flex justify-center pb-5 pt-5">
              <BrandMark color="var(--color-amber-400)" size={30} />
            </Link>
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2" aria-label="Main">
              {railNav}
            </nav>
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 py-4 flex flex-col items-center gap-2">
              <Link to="/settings" aria-label="Your profile and settings" aria-current={settingsActive ? 'page' : undefined} className="rounded-full" {...tipHandlers(me.display)}>
                <Avatar user={session.user} size={36} className={settingsActive ? 'ring-2 ring-emerald-500' : ''} />
              </Link>
              <ThemeToggle />
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                aria-label="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
                {...tipHandlers('Sign out')}
              >
                <SignOutIcon />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 px-5 py-5 flex items-center gap-2 min-w-0">
              <BrandMark color="var(--color-amber-400)" size={30} />
              <div className="font-brand text-xl leading-none text-slate-900 dark:text-slate-100 truncate">Solo Books</div>
            </div>
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4" aria-label="Main">
              {openNav}
            </nav>
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-4 py-4 space-y-2 overflow-hidden">
              <Link
                to="/settings"
                title="Your profile and settings"
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 min-w-0 transition ${
                  settingsActive ? 'bg-emerald-500/15' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Avatar user={session.user} size={34} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${settingsActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>{me.display}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{me.fullName ? me.email : 'Profile and settings'}</span>
                </span>
              </Link>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                >
                  Sign out
                </button>
                <ThemeToggle />
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={toggle}
          aria-label={rail ? 'Open the menu' : 'Close the menu to icons'}
          title={rail ? 'Open the menu' : 'Close the menu to icons'}
          className="absolute -right-3 top-[18px] z-40 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 shadow-sm hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className={rail ? '' : 'rotate-180'}>
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Grab the right edge to make the menu wider or narrower, or to close it to the icon rail. */}
        <div
          {...edge}
          role="separator"
          aria-orientation="vertical"
          aria-label="Drag to resize the menu"
          title="Drag to resize"
          className="group absolute inset-y-0 -right-1.5 z-10 w-3 cursor-col-resize touch-none"
        >
          <span className={`absolute inset-y-0 left-[5px] w-0.5 transition-colors ${live !== null ? 'bg-emerald-500/70' : 'bg-transparent group-hover:bg-emerald-500/40'}`} />
        </div>
      </aside>

      {rail &&
        tip &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: tip.x, top: tip.y }}
            className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-white dark:text-slate-900 shadow-lg"
          >
            {tip.label}
          </div>,
          document.body,
        )}

      {rail &&
        pop &&
        createPortal(
          <div
            data-rail-menu=""
            role="menu"
            aria-label="More"
            style={{ left: pop.x, top: Math.max(8, Math.min(pop.y, window.innerHeight - (FOLDER.length * 40 + 52))) }}
            className="fixed z-[60] min-w-[190px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-xl"
          >
            <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">More</p>
            {FOLDER.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} role="menuitem" onClick={() => setPop(null)} className={({ isActive }) => linkCls(isActive)}>
                <NavIcon to={item.to} size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
