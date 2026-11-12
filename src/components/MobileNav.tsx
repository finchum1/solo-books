import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { NAV } from '../lib/nav'
import { MoreIcon, NavIcon } from './NavIcons'

const PRIMARY = NAV.filter((n) => !n.moreOnMobile)
const MORE = NAV.filter((n) => n.moreOnMobile)

const TAB =
  'flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition'
const ACTIVE = 'text-emerald-700 dark:text-emerald-400'
const IDLE = 'text-slate-500 dark:text-slate-400'

/**
 * Fixed bottom tab bar shown only below the md breakpoint -- the primary
 * way to navigate on a phone, since the sidebar (App.tsx's other nav
 * surface) is hidden there. Pairs with MobileHeader (brand + settings) and
 * <main>'s bottom padding, which reserves space so page content never sits
 * underneath this bar.
 *
 * It never holds more than five tabs: the everyday destinations get their own,
 * and the rest (nav.ts `moreOnMobile`) live in a sheet behind a "More" tab, so
 * adding a page to the app does not squeeze the bar.
 */
export function MobileNav() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const moreActive = MORE.some((n) => pathname === n.to || pathname.startsWith(`${n.to}/`))

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="md:hidden fixed inset-0 z-10 bg-slate-950/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              id="mobile-more-menu"
              role="menu"
              className="md:hidden fixed inset-x-3 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1.5 shadow-xl"
              style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom))' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {MORE.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  role="menuitem"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-200 active:bg-slate-200 dark:active:bg-slate-800'
                    }`
                  }
                >
                  <NavIcon to={item.to} size={20} />
                  {item.label}
                </NavLink>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${TAB} ${isActive && !open ? ACTIVE : IDLE}`}>
            <NavIcon to={item.to} size={20} />
            <span className="truncate max-w-full px-0.5">{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-more-menu"
          className={`${TAB} ${open || moreActive ? ACTIVE : IDLE}`}
        >
          <MoreIcon size={20} />
          <span className="truncate max-w-full px-0.5">More</span>
        </button>
      </nav>
    </>
  )
}
