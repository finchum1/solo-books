import { supabase } from './supabase'
import { errMsg } from './errors'
import type { Role } from './access'

/** Everything about a business's team and its invitations. Each call is checked again by the database, whatever the screen shows. */

export interface TeamMember {
  user_id: string
  role: Role
  email: string
  display_name: string
  joined_at: string
}
export interface Invite {
  id: string
  email: string
  role: Exclude<Role, 'owner'>
  token: string
  created_at: string
  expires_at: string
  last_sent_at: string | null
  accepted_at: string | null
  revoked_at: string | null
}
export type InviteStatus = 'valid' | 'expired' | 'used' | 'revoked' | 'unknown'
export interface InvitePreview {
  business_name: string | null
  role: Exclude<Role, 'owner'> | null
  inviter: string | null
  status: InviteStatus
}

const fail = (err: unknown, fallback: string) => new Error(errMsg(err, fallback))

export const inviteLink = (token: string) => `${window.location.origin}/join/${token}`
export const isPending = (i: Pick<Invite, 'accepted_at' | 'revoked_at' | 'expires_at'>) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at).getTime() > Date.now()

export async function listTeam(businessId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase.rpc('business_team', { p_business: businessId })
  if (error) throw fail(error, 'Could not load the team.')
  const order: Record<string, number> = { owner: 0, admin: 1, bookkeeper: 2, viewer: 3 }
  return ((data ?? []) as TeamMember[]).sort((a, b) => order[a.role] - order[b.role] || a.display_name.localeCompare(b.display_name))
}

export async function listInvites(businessId: string): Promise<Invite[]> {
  const { data, error } = await supabase.from('business_invites').select('*').eq('business_id', businessId).is('accepted_at', null).is('revoked_at', null).order('created_at', { ascending: false })
  if (error) throw fail(error, 'Could not load the invitations.')
  return ((data ?? []) as Invite[]).filter(isPending)
}

/** Makes an invite and tries to email it. If email isn't available the link still works: the admin can copy it and send it themselves. */
export async function inviteByEmail(businessId: string, email: string, role: Exclude<Role, 'owner'>): Promise<{ invite: Invite; link: string; emailed: boolean; emailProblem: string | null }> {
  const made = await supabase.rpc('create_business_invite', { p_business: businessId, p_email: email, p_role: role })
  if (made.error) throw fail(made.error, 'Could not create the invitation.')
  const row = (Array.isArray(made.data) ? made.data[0] : made.data) as { invite_id: string; invite_token: string; invite_expires_at: string }
  const { data: inv, error } = await supabase.from('business_invites').select('*').eq('id', row.invite_id).single()
  if (error) throw fail(error, 'Could not read the invitation.')
  const sent = await sendInviteEmail(row.invite_id)
  return { invite: inv as Invite, link: inviteLink(row.invite_token), emailed: sent.ok, emailProblem: sent.problem }
}

export async function sendInviteEmail(inviteId: string): Promise<{ ok: boolean; problem: string | null }> {
  try {
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
      body: JSON.stringify({ inviteId }),
    })
    const body = (await res.json().catch(() => ({}))) as { error?: string; sent?: boolean }
    if (res.ok && body.sent) return { ok: true, problem: null }
    return { ok: false, problem: body.error === 'not_configured' ? "Email isn't set up yet" : body.error || 'The email could not be sent' }
  } catch {
    return { ok: false, problem: 'The email could not be sent' }
  }
}

export async function revokeInvite(id: string): Promise<void> {
  const { error } = await supabase.from('business_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id)
  if (error) throw fail(error, 'Could not cancel the invitation.')
}

export async function changeRole(businessId: string, userId: string, role: Exclude<Role, 'owner'>): Promise<void> {
  const { error, data } = await supabase.from('business_members').update({ role }).eq('business_id', businessId).eq('user_id', userId).select('user_id')
  if (error) throw fail(error, 'Could not change that role.')
  if (!data?.length) throw new Error('Could not change that role.')
}

export async function removeMember(businessId: string, userId: string): Promise<void> {
  const { error, data } = await supabase.from('business_members').delete().eq('business_id', businessId).eq('user_id', userId).select('user_id')
  if (error) throw fail(error, 'Could not remove that person.')
  if (!data?.length) throw new Error('Could not remove that person.')
}

export async function previewInvite(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('invite_preview', { p_token: token })
  if (error) throw fail(error, 'Could not read that invitation.')
  const row = (Array.isArray(data) ? data[0] : data) as InvitePreview | undefined
  return row ?? { business_name: null, role: null, inviter: null, status: 'unknown' }
}

export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_business_invite', { p_token: token })
  if (error) throw fail(error, 'Could not accept the invitation.')
  return data as string
}

const PENDING_KEY = 'pendingInvite'
export const pendingInvite = {
  get: () => {
    try {
      return localStorage.getItem(PENDING_KEY)
    } catch {
      return null
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(PENDING_KEY, t)
    } catch {
      /* storage blocked: the link can simply be opened again after signing in */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(PENDING_KEY)
    } catch {
      /* ignore */
    }
  },
}
