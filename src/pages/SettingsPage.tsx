import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ProfileTab } from '../components/settings/ProfileTab'
import { BusinessesPage } from './BusinessesPage'
import { CategoriesPage } from './CategoriesPage'

type Tab = 'profile' | 'businesses' | 'categories'

const TABS: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'businesses', label: 'Businesses' },
  { key: 'categories', label: 'Categories' },
]

export function SettingsPage({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Settings</h1>
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
                tab === t.key
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'profile' ? <ProfileTab session={session} /> : tab === 'businesses' ? <BusinessesPage /> : <CategoriesPage />}
    </div>
  )
}
