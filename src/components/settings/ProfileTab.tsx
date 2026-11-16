import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { errMsg } from '../../lib/errors'
import { profileOf, removeAvatar, saveAvatar, saveName } from '../../lib/profile'
import { Avatar } from '../Avatar'
import { ThemeToggle } from '../ThemeToggle'
import { AvatarCropper } from './AvatarCropper'

const cardCls = 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6'
const inputCls =
  'w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1'
const primary = 'rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition'
const ghost = 'rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-60 transition'
const MAX_INPUT = 15 * 1024 * 1024

export function ProfileTab({ session }: { session: Session }) {
  const p = profileOf(session.user)
  const fileInput = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<File | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [name, setName] = useState(p.fullName)
  const [nameBusy, setNameBusy] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function choose(file: File | undefined) {
    setPhotoMsg(null)
    if (!file) return
    if (!file.type.startsWith('image/')) return setPhotoMsg({ ok: false, text: 'Choose an image file (JPG, PNG or WebP).' })
    if (file.size > MAX_INPUT) return setPhotoMsg({ ok: false, text: 'That photo is over 15 MB. Choose a smaller one.' })
    setPicked(file)
  }

  async function savePhoto(blob: Blob) {
    setPhotoBusy(true)
    try {
      await saveAvatar(session.user.id, blob, p.avatarPath)
      setPicked(null)
      setPhotoMsg({ ok: true, text: 'Photo saved.' })
    } catch (err) {
      setPhotoMsg({ ok: false, text: errMsg(err, 'Could not save the photo.') })
    } finally {
      setPhotoBusy(false)
    }
  }

  async function dropPhoto() {
    if (!confirm('Remove your photo?')) return
    setPhotoBusy(true)
    setPhotoMsg(null)
    try {
      await removeAvatar(p.avatarPath)
      setPhotoMsg({ ok: true, text: 'Photo removed.' })
    } catch (err) {
      setPhotoMsg({ ok: false, text: errMsg(err, 'Could not remove the photo.') })
    } finally {
      setPhotoBusy(false)
    }
  }

  async function submitName(e: FormEvent) {
    e.preventDefault()
    setNameBusy(true)
    setNameMsg(null)
    try {
      await saveName(name)
      setNameMsg({ ok: true, text: 'Saved.' })
    } catch (err) {
      setNameMsg({ ok: false, text: errMsg(err, 'Could not save your name.') })
    } finally {
      setNameBusy(false)
    }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (pw.length < 8) return setPwMsg({ ok: false, text: 'Use at least 8 characters.' })
    if (pw !== pw2) return setPwMsg({ ok: false, text: "The two passwords don't match." })
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) return setPwMsg({ ok: false, text: errMsg(error, 'Could not change your password.') })
    setPw('')
    setPw2('')
    setPwMsg({ ok: true, text: 'Password changed.' })
  }

  const msg = (m: { ok: boolean; text: string } | null) =>
    m && (
      <p className={`text-sm mt-3 ${m.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} role={m.ok ? 'status' : 'alert'}>
        {m.text}
      </p>
    )

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">
      <section className={cardCls}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Your profile</h2>
        {picked ? (
          <AvatarCropper file={picked} busy={photoBusy} onCancel={() => setPicked(null)} onSave={savePhoto} />
        ) : (
          <div className="flex flex-wrap items-center gap-5">
            <Avatar user={session.user} size={88} />
            <div>
              <div className="text-base font-medium text-slate-900 dark:text-slate-100">{p.display}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">{p.email}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileInput.current?.click()} disabled={photoBusy} className={primary}>
                  {p.avatarPath ? 'Change photo' : 'Add a photo'}
                </button>
                {p.avatarPath && (
                  <button type="button" onClick={dropPhoto} disabled={photoBusy} className={ghost}>
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Choose a photo"
                onChange={(e) => {
                  choose(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        )}
        {msg(photoMsg)}
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Your photo is private. Only you see it, here in Solo Books.</p>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Name</h2>
        <form onSubmit={submitName} className="space-y-3">
          <div>
            <label htmlFor="profile-name" className={labelCls}>
              Your name
            </label>
            <input id="profile-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Jordan Rivera" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="profile-email" className={labelCls}>
              Email
            </label>
            <input id="profile-email" className={`${inputCls} opacity-70`} value={p.email} readOnly />
          </div>
          <button type="submit" disabled={nameBusy || name.trim() === p.fullName} className={primary}>
            {nameBusy ? 'Saving…' : 'Save'}
          </button>
          {msg(nameMsg)}
        </form>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-300">Theme</span>
          <ThemeToggle />
        </div>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Password</h2>
        <form onSubmit={submitPassword} className="space-y-3">
          <div>
            <label htmlFor="new-password" className={labelCls}>
              New password
            </label>
            <input id="new-password" type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="new-password-2" className={labelCls}>
              Type it again
            </label>
            <input id="new-password-2" type="password" className={inputCls} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">At least 8 characters.</p>
          <button type="submit" disabled={pwBusy || !pw} className={primary}>
            {pwBusy ? 'Saving…' : 'Change password'}
          </button>
          {msg(pwMsg)}
        </form>
      </section>

      <section className={cardCls}>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">
          <Link to="/privacy" className="underline hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</Link> ·{' '}
          <Link to="/terms" className="underline hover:text-slate-600 dark:hover:text-slate-300">Terms of Service</Link>
        </p>
      </section>
    </div>
  )
}
