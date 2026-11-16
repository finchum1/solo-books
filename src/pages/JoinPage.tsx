import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { brandFont, panel } from '../lib/landingTheme'
import { BrandMark } from '../components/BrandMark'
import { ROLE_HELP, ROLE_LABEL } from '../lib/access'
import { acceptInvite, pendingInvite, previewInvite } from '../lib/team'
import type { InvitePreview } from '../lib/team'
import { errMsg } from '../lib/errors'

/**
 * The page an invitation link opens (/join/<token>), for someone signed in or not. Signed out, it explains the invitation and
 * sends them to sign in (there is no public sign-up: new accounts are set up for people), remembering the link so they land back here. Signed in, one button accepts it.
 */
export function JoinPage({ token, session }: { token: string; session: Session | null }) {
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    previewInvite(token)
      .then((p) => {
        if (cancelled) return
        setPreview(p)
        if (p.status !== 'valid') pendingInvite.clear() // a dead link must not keep sending them back here
      })
      .catch((e) => !cancelled && setError(errMsg(e, 'Could not read that invitation.')))
    return () => {
      cancelled = true
    }
  }, [token])

  const valid = preview?.status === 'valid'
  const dead = preview && !valid

  function go(path: '/signin') {
    pendingInvite.set(token)
    window.location.assign(path)
  }

  async function join() {
    setBusy(true)
    setError(null)
    try {
      await acceptInvite(token)
      pendingInvite.clear()
      window.location.assign('/') // a clean load, so every screen picks up the new business
    } catch (e) {
      setError(errMsg(e, 'Could not accept the invitation.'))
      setBusy(false)
    }
  }

  const reason: Record<string, string> = {
    unknown: "This invitation link isn't recognized. Check that you copied all of it, or ask for a new one.",
    expired: 'This invitation has expired. Ask the person who invited you to send a new one.',
    used: 'This invitation has already been used. If that was you, just sign in.',
    revoked: 'This invitation was cancelled. Ask the person who invited you to send a new one.',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: panel.bgDeep, color: panel.ink, fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <div className="rounded-3xl relative w-full max-w-md p-6 sm:p-8" style={{ background: panel.bgRaised, boxShadow: `0 0 0 1px ${panel.border}, var(--mk-frame-shadow)` }}>
        <div className="flex items-center gap-2 mb-6">
          <BrandMark color={panel.goldText} size={32} />
          <span className="text-xl leading-none" style={{ fontFamily: brandFont }}>Solo Books</span>
        </div>

        {!preview && !error && <p style={{ color: panel.inkDim }}>Checking your invitation…</p>}

        {valid && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Join {preview.business_name}</h1>
            <p className="text-[15px] leading-relaxed mb-1" style={{ color: panel.inkDim }}>
              {preview.inviter ? `${preview.inviter} invited you` : 'You were invited'} to work in <strong style={{ color: panel.ink }}>{preview.business_name}</strong> as{' '}
              <strong style={{ color: panel.ink }}>{ROLE_LABEL[preview.role!]}</strong>.
            </p>
            <p className="text-sm mb-6" style={{ color: panel.inkDim }}>
              {ROLE_HELP[preview.role!]}
            </p>
            {session ? (
              <>
                <p className="text-sm mb-4" style={{ color: panel.inkDim }}>
                  You're signed in as <strong style={{ color: panel.ink }}>{session.user.email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={join}
                  disabled={busy}
                  className="w-full rounded-full px-5 py-3 text-sm font-semibold transition disabled:opacity-60"
                  style={{ background: panel.gold, color: panel.onGold }}
                >
                  {busy ? 'Joining…' : `Join ${preview.business_name}`}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <button type="button" onClick={() => go('/signin')} className="w-full rounded-full px-5 py-3 text-sm font-semibold transition" style={{ background: panel.gold, color: panel.onGold }}>
                  Sign in to accept
                </button>
                <p className="pt-2 text-xs leading-relaxed" style={{ color: panel.inkDim }}>
                  Solo Books is invite-only, so accounts are set up for people. No account yet? Ask {preview.inviter || 'the person who invited you'} to arrange one, then open this link again.
                </p>
              </div>
            )}
          </>
        )}

        {dead && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">This invitation can't be used</h1>
            <p className="text-[15px] leading-relaxed mb-6" style={{ color: panel.inkDim }}>
              {reason[preview!.status] ?? reason.unknown}
            </p>
            <a href="/" className="text-sm underline" style={{ color: panel.goldText }}>
              {session ? 'Open Solo Books' : 'Go to Solo Books'}
            </a>
          </>
        )}

        {error && (
          <p className="mt-4 text-sm" style={{ color: panel.expense }} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
