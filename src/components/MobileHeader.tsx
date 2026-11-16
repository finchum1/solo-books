import { NavLink } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { ThemeToggle } from './ThemeToggle'
import { Avatar } from './Avatar'
import type { Session } from '@supabase/supabase-js'

/**
 * Top bar shown only below the md breakpoint, replacing the sidebar's brand
 * mark + settings/account access (the sidebar itself is hidden on mobile --
 * see Sidebar.tsx / App.tsx). Sticky so it stays reachable while scrolling a
 * long page.
 */
export function MobileHeader({ session }: { session: Session }) {
  return (
    <header
      className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur px-4 pb-3"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <BrandMark color="var(--color-amber-400)" size={28} />
        <span className="font-brand text-xl leading-none text-slate-900 dark:text-slate-100 truncate">Solo Books</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />
        <NavLink
          to="/settings"
          aria-label="Your profile and settings"
          className={({ isActive }) => `rounded-full p-1 transition ${isActive ? 'ring-2 ring-emerald-500' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
          <Avatar user={session.user} size={30} />
        </NavLink>
      </div>
    </header>
  )
}
