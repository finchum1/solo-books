import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { panel } from '../lib/landingTheme'
import { BrandMark } from '../components/BrandMark'
import { Reveal, Wrap, usePageMeta } from './ui'
import { H1, HeroGlow, Ticks } from './blocks'
import { CONTACT_EMAIL, REQUEST_INVITE_HREF } from './access'
import { pendingInvite, previewInvite } from '../lib/team'
import type { InvitePreview } from '../lib/team'

/** 'signup' is invite-only: it shows a create-account form only for someone holding an invitation link; everyone else sees how to request one. */
type Mode = 'signin' | 'signup'

const inputStyle = { background: panel.bgRaised2, color: panel.ink, caretColor: panel.goldText }
const inputCls = 'sb-input w-full rounded-xl px-4 py-3 text-[15px] focus:outline-none'

function Label({ children }: { children: string }) {
  return (
    <label className="mb-1.5 mt-4 block text-sm font-medium first:mt-0" style={{ color: panel.inkDim }}>
      {children}
    </label>
  )
}

function Message({ kind, children }: { kind: 'error' | 'ok'; children: string }) {
  return (
    <p className="mt-4 text-sm" style={{ color: kind === 'error' ? panel.expense : panel.income }} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}

function SubmitButton({ loading, children }: { loading: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-6 w-full rounded-full py-3.5 text-[15px] font-medium transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
      style={{ background: panel.gold, color: panel.onGold, boxShadow: '0 1px 0 rgba(255,255,255,0.45) inset, 0 8px 22px -8px rgba(203,176,120,0.55)' }}
    >
      {children}
    </button>
  )
}

function InviteOnly() {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight" style={{ color: panel.ink }}>
        Solo Books is invite-only
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: panel.inkDim }}>
        We’re opening Solo Books to people by invitation for now. If you’d like to use it, email us with your name and the business you run, and we’ll set up your account.
      </p>
      <a
        href={REQUEST_INVITE_HREF}
        className="mt-6 flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-medium transition hover:brightness-105 active:scale-[0.98]"
        style={{ background: panel.gold, color: panel.onGold, boxShadow: '0 1px 0 rgba(255,255,255,0.45) inset, 0 8px 22px -8px rgba(203,176,120,0.55)' }}
      >
        Email to request an invite
      </a>
      <p className="mt-2 text-center text-xs" style={{ color: panel.inkDim }}>
        {CONTACT_EMAIL}
      </p>
      <p className="mt-6 text-center text-sm" style={{ color: panel.inkDim }}>
        Already have an account?{' '}
        <Link to="/signin" className="underline" style={{ color: panel.goldText }}>
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-center text-sm" style={{ color: panel.inkDim }}>
        Were you sent an invitation link? Open that link again to get set up.
      </p>
      <p className="mt-5 text-center text-xs" style={{ color: panel.inkDim }}>
        <Link to="/terms" className="underline" style={{ color: panel.goldText }}>
          Terms of Service
        </Link>{' '}
        ·{' '}
        <Link to="/privacy" className="underline" style={{ color: panel.goldText }}>
          Privacy Policy
        </Link>
      </p>
    </div>
  )
}

/** Create an account, for someone who opened an invitation link. The session that results sends them back to /join/<token> (see App). */
function InviteSignUp({ invite }: { invite: InvitePreview }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (password.length < 8) return setError('Use a password of at least 8 characters.')
    if (password !== confirm) return setError('Those passwords do not match.')
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    // With a session, the app carries them to the invitation. Without one, the project wants the email confirmed first.
    if (!data.session) setNotice('Check your email to confirm your address, then open your invitation link again.')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-semibold tracking-tight" style={{ color: panel.ink }}>
        Create your account
      </h2>
      <p className="mb-5 mt-2 text-[15px]" style={{ color: panel.inkDim }}>
        You were invited to join <strong style={{ color: panel.ink }}>{invite.business_name}</strong>. Create an account and you’ll go straight to it.
      </p>
      <Label>Email</Label>
      <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={inputStyle} />
      <Label>Password</Label>
      <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} style={inputStyle} />
      <Label>Confirm password</Label>
      <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} style={inputStyle} />
      {error && <Message kind="error">{error}</Message>}
      {notice && <Message kind="ok">{notice}</Message>}
      <SubmitButton loading={loading}>{loading ? 'Creating account…' : 'Create account'}</SubmitButton>
      <p className="mt-5 text-center text-sm" style={{ color: panel.inkDim }}>
        Already have an account?{' '}
        <Link to="/signin" className="underline" style={{ color: panel.goldText }}>
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-center text-xs" style={{ color: panel.inkDim }}>
        By creating an account you agree to the{' '}
        <Link to="/terms" className="underline" style={{ color: panel.goldText }}>
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="underline" style={{ color: panel.goldText }}>
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  )
}

/** Shows the create-account form only when the stored invitation is still good; otherwise the invite-only card. */
function SignUpGate() {
  const token = pendingInvite.get()
  const [invite, setInvite] = useState<InvitePreview | null | 'none'>(token ? null : 'none')

  useEffect(() => {
    if (!token) return
    let live = true
    previewInvite(token)
      .then((p) => live && setInvite(p.status === 'valid' ? p : 'none'))
      .catch(() => live && setInvite('none'))
    return () => {
      live = false
    }
  }, [token])

  if (invite === null) return <p style={{ color: panel.inkDim }}>Checking your invitation…</p>
  if (invite === 'none') return <InviteOnly />
  return <InviteSignUp invite={invite} />
}

function Form() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgot, setForgot] = useState(false)

  function reset(toForgot: boolean) {
    setError(null)
    setNotice(null)
    setForgot(toForgot)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    // A session routes straight into the app through the app-level listener.
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    // The emailed link returns here; the app then shows a "choose a new password" screen.
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setLoading(false)
    if (error) setError(error.message)
    // Same message whether or not the address has an account.
    else setNotice('If there is an account for that email, a reset link is on its way. Check your inbox and spam folder.')
  }

  const emailField = (
    <>
      <Label>Email</Label>
      <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={inputStyle} />
    </>
  )

  if (forgot) {
    return (
      <form onSubmit={handleReset}>
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: panel.ink }}>
          Reset your password
        </h2>
        <p className="mb-5 mt-2 text-[15px]" style={{ color: panel.inkDim }}>
          Enter the email for your account and we&rsquo;ll send a link to choose a new password.
        </p>
        {emailField}
        {error && <Message kind="error">{error}</Message>}
        {notice && <Message kind="ok">{notice}</Message>}
        <SubmitButton loading={loading}>{loading ? 'Sending…' : 'Send reset link'}</SubmitButton>
        <p className="mt-5 text-center text-sm">
          <button type="button" onClick={() => reset(false)} className="underline" style={{ color: panel.goldText }}>
            Back to sign in
          </button>
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="mb-5 text-2xl font-semibold tracking-tight" style={{ color: panel.ink }}>
        Welcome back
      </h2>
      {emailField}
      <Label>Password</Label>
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputCls}
        style={inputStyle}
      />
      <div className="mt-2 text-right">
        <button type="button" onClick={() => reset(true)} className="text-sm underline" style={{ color: panel.goldText }}>
          Forgot password?
        </button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {notice && <Message kind="ok">{notice}</Message>}
      <SubmitButton loading={loading}>{loading ? 'Signing in…' : 'Sign in'}</SubmitButton>
      <p className="mt-5 text-center text-sm" style={{ color: panel.inkDim }}>
        Solo Books is invite-only.{' '}
        <Link to="/signup" className="underline" style={{ color: panel.goldText }}>
          Request an invite
        </Link>
      </p>
    </form>
  )
}

export function AuthPage({ mode }: { mode: Mode }) {
  usePageMeta(mode === 'signup' ? 'Request an invite | Solo Books' : 'Sign in | Solo Books', 'Sign in to Solo Books, or request an invite. Solo Books is open by invitation for now.')
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden pb-20 pt-32 sm:pt-36">
      <HeroGlow />
      <Wrap className="relative grid items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-24" width="max-w-5xl">
        <Reveal className="hidden lg:block">
          <BrandMark color={panel.goldText} size={52} />
          <H1 className="mt-6" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
            {mode === 'signup' ? 'Your books, in one private place.' : 'Good to see you again.'}
          </H1>
          <Ticks
            className="mt-8"
            items={['Bookkeeping for one business or several', 'Receipts attached to the expense they belong to', 'Contractor, client and Profit & Loss reports as PDFs', 'Payroll for your W-2 employees, built in']}
          />
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rounded-3xl p-7 sm:p-9" style={{ background: panel.bgRaised, boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}>
            {mode === 'signup' ? <SignUpGate /> : <Form />}
          </div>
        </Reveal>
      </Wrap>
    </section>
  )
}
