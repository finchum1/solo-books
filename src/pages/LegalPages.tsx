import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { panel } from '../lib/landingTheme'
import { BrandMark } from '../components/BrandMark'

// Public Privacy Policy and Terms of Service, served at /privacy and /terms
// whether or not the visitor is signed in (App.tsx renders them before the auth
// gate). Adapted from the Latchpoint Real Estate pages (listings-app/src/pages/
// LegalPages.jsx), rewritten for what Solo Books actually stores and does.
// Plain language on purpose. Not a substitute for review by an attorney.

const APP = 'Solo Books'
const OPERATOR = 'Latchpoint Studios, LLC'
const CONTACT = 'terrence@latchpointstudios.com'
const UPDATED = 'November 11, 2026'

function Shell({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} | ${APP}`
    return () => {
      document.title = previous
    }
  }, [title])

  return (
    <div
      className="min-h-screen"
      style={{ background: panel.bgDeep, color: panel.ink, fontFamily: "'Hanken Grotesk', sans-serif" }}
    >
      <header style={{ borderBottom: `1px solid ${panel.border}` }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark color={panel.gold} size={24} />
            <span className="font-semibold tracking-tight text-[15px]">{APP}</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm" style={{ color: panel.inkDim }}>
            <Link to="/privacy" className="hover:opacity-80">Privacy</Link>
            <Link to="/terms" className="hover:opacity-80">Terms</Link>
            <Link
              to="/"
              className="rounded-lg px-4 py-1.5 font-medium transition hover:brightness-110"
              style={{ background: panel.gold, color: panel.bgDeep }}
            >
              Open {APP}
            </Link>
          </nav>
        </div>
      </header>

      <main
        className="max-w-3xl mx-auto px-5 sm:px-8 py-12 [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-2 [&_li]:leading-relaxed [&_a]:underline [&_a]:underline-offset-2"
      >
        {children}
      </main>

      <footer style={{ borderTop: `1px solid ${panel.border}`, color: panel.inkDim }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 text-xs flex flex-wrap justify-between gap-2">
          <span>
            {APP} is built and operated by <a href="https://latchpointstudios.com" className="underline">{OPERATOR}</a>.
          </span>
          <span>
            <Link to="/privacy" className="underline">Privacy</Link> ·{' '}
            <Link to="/terms" className="underline">Terms</Link> ·{' '}
            <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>
          </span>
        </div>
      </footer>
    </div>
  )
}

const dim = { color: panel.inkDim } as const

export function PrivacyPage() {
  return (
    <Shell title="Privacy Policy">
      <h1>Privacy Policy</h1>
      <p className="text-sm" style={dim}>Last updated {UPDATED}</p>
      <p>
        {APP} ("the app", "we") is a bookkeeping app for people who run one or more small businesses. It is operated by {OPERATOR}. This policy explains
        what information the app handles, what we do with it, and the choices you have.
      </p>

      <h2>Information we handle</h2>
      <ul>
        <li>
          <strong>Account information:</strong> your email address and a password. Your password is stored only as a one-way hash by our sign-in provider. We
          cannot see it or read it back to you.
        </li>
        <li>
          <strong>Your business records:</strong> the businesses you add (names, logos, contact details), your income and expense transactions with their
          categories and descriptions, and the names of contractors and clients you track, including any email, phone, or address you enter for a client.
        </li>
        <li>
          <strong>Receipts and logos:</strong> files you upload. Receipts are kept private and are opened only through short-lived links generated for your
          signed-in account.
        </li>
        <li>
          <strong>Payroll information</strong>, if you use the payroll feature: your employees' names, pay rates and pay frequency, the tax elections from
          their W-4 and Oklahoma OK-W-4, hours, bonuses, and the pay stubs and tax amounts the app calculates.
        </li>
      </ul>
      <p>
        <strong>What we deliberately do not collect:</strong> Social Security numbers, bank account or routing numbers, and card numbers. The app has no fields
        for them and does not connect to your bank. Please do not type them into description or notes fields either.
      </p>
      <p>
        Your sign-in comes from an account system that other apps from {OPERATOR} also use. Creating a {APP} account may create an empty account record
        there. It does not give anyone access to your {APP} data, and your records are visible only to your account.
      </p>

      <h2>How we use it</h2>
      <p>
        Only to run the app for you: showing your ledger, reports, and payroll, producing the PDFs you ask for, and keeping you signed in. We do not sell your
        information, use it for advertising, share it with data brokers, or use it to train artificial intelligence models.
      </p>

      <h2>Who can see your data</h2>
      <p>
        You can. Each account's records are separated from every other account's by rules enforced in the database itself, not just in the app. As the
        operator, we can technically reach stored data in order to maintain the service. We do that only to fix a problem you have asked us to look into, to
        keep the service running and secure, or when the law requires it.
      </p>

      <h2>Where it is stored and who processes it</h2>
      <p>
        The app is hosted on Vercel. Your data is stored with Supabase (database, sign-in, and file storage). Account emails, such as password resets, are sent
        through an email delivery provider. These providers handle information only to operate the app for us. Data is encrypted in transit.
      </p>

      <h2>Your choices and deleting your data</h2>
      <ul>
        <li>
          <strong>In the app:</strong> you can edit or delete businesses, transactions, contractors, clients, employees, and payroll runs yourself.
        </li>
        <li>
          <strong>Delete your account:</strong> email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address on your account and we will delete the
          account and the data tied to it.
        </li>
        <li>
          <strong>Keep your own copies first.</strong> Deleting an account also deletes its pay stubs and payroll history. Employers are often required to
          keep payroll records for several years, so download the PDFs and reports you need before asking us to delete anything.
        </li>
      </ul>

      <h2>Retention</h2>
      <p>
        We keep your information while your account is active. When an account is deleted, its data is removed from active systems, and routine backups
        expire on our providers' normal schedule.
      </p>

      <h2>Cookies and device storage</h2>
      <p>
        The app uses your browser's storage to keep you signed in and to remember preferences such as light or dark mode. If you install it on your phone or
        computer, it also saves copies of its own program files so it opens quickly. It does not save your financial data for offline use. We do not use
        advertising cookies or third-party trackers.
      </p>

      <h2>Children</h2>
      <p>The app is for adults running a business and is not directed to anyone under 18. We do not knowingly collect information from children.</p>

      <h2>Changes to this policy</h2>
      <p>If we change this policy, we will update the date above, and for significant changes we will tell account holders before they take effect.</p>

      <h2>Contact</h2>
      <p>
        {OPERATOR}, Oklahoma, USA. <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </Shell>
  )
}

export function TermsPage() {
  return (
    <Shell title="Terms of Service">
      <h1>Terms of Service</h1>
      <p className="text-sm" style={dim}>Last updated {UPDATED}</p>
      <p>
        These terms apply to your use of {APP} ("the app"), operated by {OPERATOR} ("we"). By creating an account or using the app, you agree to them and to
        our <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the app.
      </p>

      <h2>Your account</h2>
      <p>
        You must be at least 18 and give us a working email address. You are responsible for keeping your password private and for everything done under
        your account. Tell us promptly if you think someone else has access.
      </p>

      <h2>What the app is, and is not</h2>
      <p>
        {APP} is a record-keeping and calculation tool. It is <strong>not</strong> accounting, tax, payroll-service, or legal advice, and we are not your
        accountant, tax preparer, or payroll provider.
      </p>
      <ul>
        <li>
          <strong>You are responsible for your numbers.</strong> Check transactions, reports, and every figure the app produces before you rely on them.
        </li>
        <li>
          <strong>Payroll is a calculation aid.</strong> It estimates withholding and employer taxes using the published tax tables for the year shown in the
          app, and the payroll feature currently supports Oklahoma employers. Tax rules and tables change, and we do not guarantee that they are current,
          complete, or right for your situation. An employee's actual obligations can differ.
        </li>
        <li>
          <strong>The app does not move money or file anything.</strong> You are responsible for paying your employees, depositing taxes on time, filing
          required returns and forms, and meeting every other employer obligation. Have a CPA or payroll professional review your setup.
        </li>
        <li>
          <strong>You must be entitled to enter the data you enter,</strong> including information about employees, contractors, and clients, and you must
          follow the laws that apply to you as a business owner and employer.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <ul>
        <li>Use the app only for lawful business purposes.</li>
        <li>Do not try to access other people's data, interfere with the app's operation, or probe it for weaknesses without our written permission.</li>
        <li>Do not upload content you have no right to use, or that is unlawful, deceptive, or infringing.</li>
        <li>Do not enter Social Security numbers, bank account numbers, or card numbers into the app.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You keep ownership of everything you enter and upload. You give us permission to store, process, and display it as needed to run the app for you, as
        described in the Privacy Policy.
      </p>

      <h2>Availability, backups, and changes</h2>
      <p>
        We work to keep the app available and accurate, but it is provided "as is" and "as available", and we do not promise it will be uninterrupted or error
        free. Keep your own copies of anything important by downloading the PDFs and reports you need. Features may change, and we may suspend access that
        breaks these terms or puts the app or other users at risk.
      </p>

      <h2>Cost</h2>
      <p>{APP} does not currently charge for use. If we introduce fees, we will tell you before they apply to you.</p>

      <h2>Disclaimer and limits on liability</h2>
      <p>
        To the fullest extent the law allows, we make no warranties about the app, and we are not liable for indirect or consequential losses, or for lost
        profits, penalties, interest, tax assessments, or lost data. Our total liability for any claim is limited to the greater of the amount you paid us for
        the app in the twelve months before the claim, or $100. Nothing here limits liability that cannot be limited by law.
      </p>

      <h2>Ending your use</h2>
      <p>
        You may stop using the app at any time. We may end or suspend an account that violates these terms. On request we will delete your account as
        described in the <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may update these terms and will change the date above when we do. Continuing to use the app after a change means you accept it. These terms are
        governed by the laws of the State of Oklahoma.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </Shell>
  )
}
