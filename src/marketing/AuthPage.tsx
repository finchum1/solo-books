import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { panel } from '../lib/landingTheme'
import { BrandMark } from '../components/BrandMark'
import { Reveal, Wrap, usePageMeta } from './ui'
import { H1, HeroGlow, Ticks } from './blocks'

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

function Form({ mode }: { mode: Mode }) {
  const isSignUp = mode === 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    setLoading(true)
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) setError(error.message)
      else if (!data.session) setNotice('Check your email to confirm your account, then sign in.')
      // A session means confirmation is off: the app-level listener routes straight in.
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) setError(error.message)
    }
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
          Enter the email you signed up with and we&rsquo;ll send a link to choose a new password.
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
        {isSignUp ? 'Create your account' : 'Welcome back'}
      </h2>
      {emailField}
      <Label>Password</Label>
      <input
        type="password"
        required
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        minLength={isSignUp ? 8 : undefined}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputCls}
        style={inputStyle}
      />
      {!isSignUp && (
        <div className="mt-2 text-right">
          <button type="button" onClick={() => reset(true)} className="text-sm underline" style={{ color: panel.goldText }}>
            Forgot password?
          </button>
        </div>
      )}
      {isSignUp && (
        <>
          <Label>Confirm password</Label>
          <input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} style={inputStyle} />
          <p className="mt-2 text-xs" style={{ color: panel.inkDim }}>
            At least 8 characters.
          </p>
        </>
      )}
      {error && <Message kind="error">{error}</Message>}
      {notice && <Message kind="ok">{notice}</Message>}
      <SubmitButton loading={loading}>{loading ? (isSignUp ? 'Creating account…' : 'Signing in…') : isSignUp ? 'Create account' : 'Sign in'}</SubmitButton>
      {isSignUp && (
        <p className="mt-4 text-center text-xs" style={{ color: panel.inkDim }}>
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
      )}
      <p className="mt-5 text-center text-sm" style={{ color: panel.inkDim }}>
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <Link to="/signin" className="underline" style={{ color: panel.goldText }}>
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link to="/signup" className="underline" style={{ color: panel.goldText }}>
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  )
}

export function AuthPage({ mode }: { mode: Mode }) {
  usePageMeta(mode === 'signup' ? 'Create your account | Solo Books' : 'Sign in | Solo Books', 'Sign in to Solo Books, or create a private account for your business books and payroll.')
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden pb-20 pt-32 sm:pt-36">
      <HeroGlow />
      <Wrap className="relative grid items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-24" width="max-w-5xl">
        <Reveal className="hidden lg:block">
          <BrandMark color={panel.gold} size={44} />
          <H1 className="mt-6" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
            {mode === 'signup' ? 'Your books, in one private place.' : 'Good to see you again.'}
          </H1>
          <Ticks
            className="mt-8"
            items={['A ledger for one business or several', 'Receipts attached to the expense they belong to', 'Contractor, client and Profit & Loss reports as PDFs', 'Payroll for your W-2 employees, built in']}
          />
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rounded-3xl p-7 sm:p-9" style={{ background: panel.bgRaised, boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}>
            <Form key={mode} mode={mode} />
          </div>
        </Reveal>
      </Wrap>
    </section>
  )
}
