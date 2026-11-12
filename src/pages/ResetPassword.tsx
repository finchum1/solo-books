import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { panel } from '../lib/landingTheme'
import { BrandMark } from '../components/BrandMark'

/**
 * Shown after someone follows the link in a password-reset email. Supabase has
 * already signed them in with a temporary recovery session, so until they pick
 * a new password this screen replaces the app (otherwise the link would just
 * drop them into the app without ever setting one).
 */
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    onDone()
  }

  async function cancel() {
    await supabase.auth.signOut()
    onDone()
  }

  const inputProps = {
    className: 'sb-input w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none',
    style: { background: panel.bgRaised2, color: panel.ink, caretColor: panel.gold },
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: panel.bgDeep, color: panel.ink, fontFamily: "'Hanken Grotesk', sans-serif" }}
    >
      <div className="rounded-3xl relative w-full max-w-md p-6 sm:p-8" style={{ background: panel.bgRaised, boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}>
        <div className="flex items-center gap-2 mb-5">
          <BrandMark color={panel.gold} size={24} />
          <span className="font-semibold tracking-tight text-[15px]">Solo Books</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Choose a new password</h1>
        <p className="text-sm mb-6" style={{ color: panel.inkDim }}>
          At least 8 characters. You'll be signed in once it's saved.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="block text-xs mb-1.5" style={{ color: panel.inkDim }}>
            New password
          </label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            {...inputProps}
          />
          <label className="block text-xs mt-4 mb-1.5" style={{ color: panel.inkDim }}>
            Confirm new password
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            {...inputProps}
          />
          {error && (
            <p className="text-sm mt-4" style={{ color: panel.expense }} role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 rounded-lg py-2.5 font-medium text-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            style={{ background: panel.gold, color: panel.bgDeep }}
          >
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: panel.inkDim }}>
          <button type="button" onClick={cancel} className="underline transition hover:opacity-75" style={{ color: panel.gold }}>
            Cancel and sign out
          </button>
        </p>
      </div>
    </div>
  )
}
