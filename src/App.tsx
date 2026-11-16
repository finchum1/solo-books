import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { PublicSite } from './marketing/PublicSite'
import { ResetPassword } from './pages/ResetPassword'
import { Sidebar } from './components/Sidebar'
import { MobileHeader } from './components/MobileHeader'
import { MobileNav } from './components/MobileNav'
import { HomePage } from './pages/HomePage'
import { LedgerPage } from './pages/LedgerPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ContractorsPage } from './pages/ContractorsPage'
import { ClientsPage } from './pages/ClientsPage'
import { PayrollPage } from './pages/PayrollPage'
import { BudgetPage } from './pages/BudgetPage'
import { BankingPage } from './pages/BankingPage'
import { AccessProvider } from './lib/access'
import { JoinPage } from './pages/JoinPage'
import { pendingInvite } from './lib/team'

// Read once, at import time: a password-reset email link lands here with
// `#...&type=recovery` in the URL, and supabase-js strips that hash as soon as
// it has processed it, so it has to be captured before React renders.
const OPENED_FROM_RECOVERY_LINK = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)
  const [recovering, setRecovering] = useState(OPENED_FROM_RECOVERY_LINK)
  const { pathname } = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecked(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Privacy and Terms are public pages: reachable signed in or out, so they can be linked from anywhere.
  if (pathname === '/privacy' || pathname === '/terms') return <PublicSite signedIn={!!session} />

  // An invitation link works whether or not you are signed in.
  const join = pathname.match(/^\/join\/([A-Za-z0-9]+)\/?$/)
  if (join && checked) return <JoinPage token={join[1]} session={session} />

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-sm">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <PublicSite />
  }

  // Signed up or in from an invitation link: carry on to it.
  const waiting = pendingInvite.get()
  if (waiting && !recovering) return <Navigate to={`/join/${waiting}`} replace />

  if (recovering) {
    return <ResetPassword onDone={() => setRecovering(false)} />
  }

  return (
    <AccessProvider userId={session.user.id}>
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar session={session} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader session={session} />
        <main className="min-w-0 flex-1 pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/contractors" element={<ContractorsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/banking" element={<BankingPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage session={session} />} />
            <Route path="/customers" element={<Navigate to="/clients" replace />} />
            <Route path="/businesses" element={<Navigate to="/settings" replace />} />
            <Route path="/categories" element={<Navigate to="/settings" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <MobileNav />
      </div>
    </div>
    </AccessProvider>
  )
}

export default App
