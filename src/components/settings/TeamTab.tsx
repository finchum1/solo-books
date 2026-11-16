import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusinesses } from '../../lib/useBusinesses'
import { ROLE_HELP, ROLE_LABEL, useAccess } from '../../lib/access'
import type { Role } from '../../lib/access'
import { errMsg } from '../../lib/errors'
import { changeRole, inviteByEmail, inviteLink, listInvites, listTeam, removeMember, revokeInvite, sendInviteEmail } from '../../lib/team'
import type { Invite, TeamMember } from '../../lib/team'

const cardCls = 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6'
const inputCls =
  'w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1'
const primary = 'rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition'
const linkBtn = 'text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50'
const ASSIGNABLE: Exclude<Role, 'owner'>[] = ['admin', 'bookkeeper', 'viewer']

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))

export function TeamTab({ onOpenCategories }: { onOpenCategories?: (businessId: string) => void }) {
  const { businesses } = useBusinesses()
  const access = useAccess()
  const mine = businesses.filter((b) => access.roleOf(b.id))
  const [businessId, setBusinessId] = useState('')
  const current = businessId && mine.some((b) => b.id === businessId) ? businessId : (mine[0]?.id ?? '')
  const business = mine.find((b) => b.id === current)
  const manage = !!current && access.roleOf(current) !== null && access.canManage(current)
  const myRole = current ? access.roleOf(current) : null

  const [team, setTeam] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Exclude<Role, 'owner'>>('bookkeeper')
  const [fresh, setFresh] = useState<{ link: string; emailed: boolean; to: string; problem: string | null } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [hasSharedCats, setHasSharedCats] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    if (!current) return
    setLoading(true)
    try {
      const [t, i] = await Promise.all([listTeam(current), manage ? listInvites(current) : Promise.resolve([] as Invite[])])
      setTeam(t)
      setInvites(i)
      setError(null)
    } catch (err) {
      setError(errMsg(err, 'Could not load the team.'))
    } finally {
      setLoading(false)
    }
  }, [current, manage])

  // Without a shared category list, each person falls back to their own personal one, so teammates would not file things the same way.
  useEffect(() => {
    setHasSharedCats(null)
    if (!current) return
    let cancelled = false
    supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', current)
      .then(({ count, error }) => !cancelled && !error && setHasSharedCats((count ?? 0) > 0))
    return () => {
      cancelled = true
    }
  }, [current])

  useEffect(() => {
    setFresh(null)
    setNotice(null)
    load()
  }, [load])

  async function run(key: string, fn: () => Promise<void>, ok?: string) {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      await fn()
      if (ok) setNotice(ok)
      await load()
    } catch (err) {
      setError(errMsg(err, 'That did not work.'))
    } finally {
      setBusy(null)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy('invite')
    setError(null)
    setNotice(null)
    setFresh(null)
    try {
      const r = await inviteByEmail(current, email, role)
      setFresh({ link: r.link, emailed: r.emailed, to: r.invite.email, problem: r.emailProblem })
      setEmail('')
      await load()
    } catch (err) {
      setError(errMsg(err, 'Could not create the invitation.'))
    } finally {
      setBusy(null)
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000)
    } catch {
      setError('Your browser would not copy it. Select the link and copy it by hand.')
    }
  }

  if (mine.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <section className={cardCls}>
          <p className="text-sm text-slate-500 dark:text-slate-400">Add a business first. Then you can invite people to it from here.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">
      <section className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">The people who can sign in and work in this business.</p>
          </div>
          {mine.length > 1 && (
            <select aria-label="Business" value={current} onChange={(e) => setBusinessId(e.target.value)} className={`${inputCls} !w-auto`}>
              {mine.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {mine.length === 1 && <div className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">{business?.name}</div>}

        {error && (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {notice}
          </p>
        )}

        {loading && team.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {team.map((m) => {
              const you = m.user_id === access.userId
              return (
                <li key={m.user_id} className="py-3 flex flex-wrap items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400/20 text-sm font-semibold text-amber-700 dark:text-amber-300" aria-hidden>
                    {initials(m.display_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {m.display_name}
                      {you && <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">(you)</span>}
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{m.email}</div>
                  </div>
                  {manage && m.role !== 'owner' && !you ? (
                    <select
                      aria-label={`Role for ${m.display_name}`}
                      value={m.role}
                      disabled={busy === m.user_id}
                      onChange={(e) => run(m.user_id, () => changeRole(current, m.user_id, e.target.value as Exclude<Role, 'owner'>), `${m.display_name} is now ${ROLE_LABEL[e.target.value as Role]}.`)}
                      className={`${inputCls} !w-auto !py-1.5`}
                    >
                      {ASSIGNABLE.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{ROLE_LABEL[m.role]}</span>
                  )}
                  {manage && m.role !== 'owner' && !you && (
                    <button
                      type="button"
                      disabled={busy === m.user_id}
                      onClick={() => confirm(`Remove ${m.display_name} from ${business?.name}? They will no longer be able to open it.`) && run(m.user_id, () => removeMember(current, m.user_id), `${m.display_name} was removed.`)}
                      className={`${linkBtn} hover:!text-rose-600 dark:hover:!text-rose-400`}
                    >
                      Remove
                    </button>
                  )}
                  {you && m.role !== 'owner' && (
                    <button
                      type="button"
                      disabled={busy === m.user_id}
                      onClick={() => confirm(`Leave ${business?.name}? You will lose access until someone invites you again.`) && run(m.user_id, () => removeMember(current, m.user_id).then(() => access.refresh()), `You left ${business?.name}.`)}
                      className={`${linkBtn} hover:!text-rose-600 dark:hover:!text-rose-400`}
                    >
                      Leave
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {!manage && myRole && <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">You are {ROLE_LABEL[myRole].toLowerCase() === 'view-only' ? 'view-only' : `a ${ROLE_LABEL[myRole].toLowerCase()}`} here. Only an owner or admin can add or remove people.</p>}
      </section>

      {current && access.canWrite(current) && hasSharedCats === false && (
        <section className="rounded-2xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Set up a shared category list</h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {business?.name} doesn't have its own categories yet, so each person would use their own list. Create one list that everyone on the team uses. Admins and bookkeepers can add and rename categories in it, and view-only people can see it.
          </p>
          {onOpenCategories && (
            <button type="button" onClick={() => onOpenCategories(current)} className={`${primary} mt-3`}>
              Set up categories
            </button>
          )}
        </section>
      )}

      {manage && (
        <section className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Invite someone</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">They get an email with a link that lasts 7 days, and they accept it after signing in to their own account. Solo Books is invite-only, so someone new needs an account set up first: email terrence@latchpointstudios.com and we'll create it.</p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="invite-email" className={labelCls}>
                Their email
              </label>
              <input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputCls} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="invite-role" className={labelCls}>
                What they can do
              </label>
              <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as Exclude<Role, 'owner'>)} className={inputCls}>
                {ASSIGNABLE.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{ROLE_HELP[role]}</p>
            </div>
            <button type="submit" disabled={busy === 'invite' || !email.trim()} className={primary}>
              {busy === 'invite' ? 'Sending…' : 'Send invitation'}
            </button>
          </form>

          {fresh && (
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 text-sm">
              {fresh.emailed ? (
                <p className="text-emerald-700 dark:text-emerald-400">Invitation emailed to {fresh.to}.</p>
              ) : (
                <p className="text-amber-700 dark:text-amber-400">
                  {fresh.problem ?? 'The email could not be sent'}, so no email went out to {fresh.to}. Copy the link and send it to them yourself.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <input readOnly value={fresh.link} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} className={`${inputCls} !text-xs`} />
                <button type="button" onClick={() => copy(fresh.link, 'fresh')} className={primary}>
                  {copied === 'fresh' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Anyone with this link can join, once, so send it only to {fresh.to}.</p>
            </div>
          )}
        </section>
      )}

      {manage && invites.length > 0 && (
        <section className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Waiting to join</h2>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {invites.map((i) => (
              <li key={i.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-900 dark:text-slate-100">{i.email}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {ROLE_LABEL[i.role]} · {daysLeft(i.expires_at)} day{daysLeft(i.expires_at) === 1 ? '' : 's'} left
                  </div>
                </div>
                <button type="button" onClick={() => copy(inviteLink(i.token), i.id)} className={linkBtn}>
                  {copied === i.id ? 'Copied' : 'Copy link'}
                </button>
                <button
                  type="button"
                  disabled={busy === i.id}
                  onClick={() => run(i.id, async () => {
                    const r = await sendInviteEmail(i.id)
                    if (!r.ok) throw new Error(`${r.problem ?? 'The email could not be sent'}. Copy the link instead.`)
                  }, `Emailed ${i.email} again.`)}
                  className={linkBtn}
                >
                  Resend email
                </button>
                <button type="button" disabled={busy === i.id} onClick={() => run(i.id, () => revokeInvite(i.id), 'Invitation cancelled.')} className={`${linkBtn} hover:!text-rose-600 dark:hover:!text-rose-400`}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
