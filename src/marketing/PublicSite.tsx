import { Navigate, Route, Routes } from 'react-router-dom'
import { MarketingShell } from './MarketingShell'
import { HomePage } from './HomePage'
import { FeaturesPage } from './FeaturesPage'
import { PayrollFeaturePage } from './PayrollFeaturePage'
import { SecurityPage } from './SecurityPage'
import { AuthPage } from './AuthPage'
import { PrivacyPage, TermsPage } from '../pages/LegalPages'

/**
 * The public, signed-out site. Privacy and Terms are also reachable while
 * signed in (App.tsx renders this for those two paths regardless of session),
 * in which case the header offers "Open app" instead of sign-in links.
 */
export function PublicSite({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <MarketingShell signedIn={signedIn}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/features/payroll" element={<PayrollFeaturePage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/signin" element={<AuthPage mode="signin" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MarketingShell>
  )
}
