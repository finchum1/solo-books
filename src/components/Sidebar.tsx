import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { ThemeToggle } from './ThemeToggle'
import { NAV } from '../lib/nav'
import { MoreIcon, NavIcon } from './NavIcons'
import { BrandMark } from './BrandMark'

const TOP = NAV.filter((n) => !n.inMoreFolder)
const FOLDER = NAV.filter((n) => n.inMoreFolder)
const FOLDER_KEY = 'sidebar-more-open'

const linkCls = (isActive: boolean) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
  }`

/**
 * The "More" folder: the less-frequent pages, collapsed by default. It opens by
 * itself when you are on one of its pages (so the current page is never hidden),
 * and otherwise remembers whether you left it open.
 */
function MoreFolder() {
  const { pathname } = useLocation()
  const inside = FOLDER.some((n) => pathname === n.to || pathname.startsWith(`${n.to}/`))
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

export function Sidebar({ session }: { session: Session }) {
  return (
    <aside className="hidden md:flex h-screen w-60 shrink-0 sticky top-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-5">
      <div className="px-1 pb-6 flex items-center gap-2">
        <BrandMark color="var(--color-amber-400)" size={30} />
        <div className="font-brand text-xl leading-none text-slate-900 dark:text-slate-100">Solo Books</div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {TOP.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => linkCls(isActive)}>
            <NavIcon to={item.to} size={18} />
            {item.label}
          </NavLink>
        ))}
        {FOLDER.length > 0 && <MoreFolder />}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <NavLink
            to="/settings"
            title="Settings"
            className={({ isActive }) =>
              `flex-1 min-w-0 truncate rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            {session.user.email}
          </NavLink>
          <ThemeToggle />
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
