import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { profileOf, useAvatarUrl } from '../lib/profile'

/** A person's headshot in a circle, or their initials when they haven't added one. */
export function Avatar({ user, size = 32, className = '' }: { user: User; size?: number; className?: string }) {
  const p = profileOf(user)
  const url = useAvatarUrl(p.avatarPath)
  const [failed, setFailed] = useState<string | null>(null)
  const show = url && failed !== url
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-amber-400/20 font-semibold text-amber-700 dark:text-amber-300 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) }}
      aria-hidden
    >
      {show ? <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(url)} /> : p.initials}
    </span>
  )
}
