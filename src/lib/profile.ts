import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { errMsg } from './errors'

/**
 * The signed-in person's profile: a display name and a headshot. Both live in the user's own auth metadata
 * (full_name, avatar_path), and the photo itself in a private storage bucket, one folder per user. Nothing
 * here needs a table.
 */

const BUCKET = 'avatars'
const LINK_SECONDS = 3600

export interface Profile {
  fullName: string
  email: string
  avatarPath: string | null
  /** What to call them in the UI: their name, else the part of their email before the @. */
  display: string
  initials: string
}

export function profileOf(user: User): Profile {
  const meta = (user.user_metadata ?? {}) as { full_name?: unknown; avatar_path?: unknown }
  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : ''
  const email = user.email ?? ''
  const display = fullName || email.split('@')[0] || 'You'
  const words = display.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  const initials = ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?'
  return { fullName, email, avatarPath: typeof meta.avatar_path === 'string' && meta.avatar_path ? meta.avatar_path : null, display, initials }
}

export async function saveName(fullName: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
  if (error) throw new Error(errMsg(error, 'Could not save your name.'))
}

/** Stores a new headshot (already cropped and shrunk), points the profile at it, then removes the old one. */
export async function saveAvatar(userId: string, blob: Blob, previousPath: string | null): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })
  if (up.error) throw new Error(errMsg(up.error, 'Could not upload the photo.'))
  const { error } = await supabase.auth.updateUser({ data: { avatar_path: path } })
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(errMsg(error, 'Could not save the photo.'))
  }
  if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]) // best effort
  forget(previousPath)
  return path
}

export async function removeAvatar(path: string | null): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { avatar_path: '' } })
  if (error) throw new Error(errMsg(error, 'Could not remove the photo.'))
  if (path) await supabase.storage.from(BUCKET).remove([path]) // best effort
  forget(path)
}

// Signed links are reused for most of their life, so the photo does not flicker or refetch on every page.
const links = new Map<string, { url: string; at: number }>()
function forget(path: string | null) {
  if (path) links.delete(path)
}

async function linkFor(path: string): Promise<string | null> {
  const hit = links.get(path)
  if (hit && Date.now() - hit.at < (LINK_SECONDS - 300) * 1000) return hit.url
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS)
  if (error || !data?.signedUrl) return null
  links.set(path, { url: data.signedUrl, at: Date.now() })
  return data.signedUrl
}

/** The headshot's link, or null while loading, when there is no photo, or if it can't be fetched (initials are shown instead). */
export function useAvatarUrl(path: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => (path ? links.get(path)?.url ?? null : null))
  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    let cancelled = false
    const load = () => linkFor(path).then((u) => !cancelled && setUrl(u))
    load()
    const timer = window.setInterval(load, (LINK_SECONDS - 600) * 1000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [path])
  return url
}
