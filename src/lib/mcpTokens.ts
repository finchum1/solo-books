import { supabase } from './supabase'
import { errMsg } from './errors'

/** Access tokens for AI agents. The raw token exists only in the reply to createToken; afterwards only a hash is stored. */

export interface McpToken {
  id: string
  name: string
  token_hint: string
  scopes: ('read' | 'write')[]
  business_ids: string[] | null
  created_at: string
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
}

const fail = (err: unknown, fallback: string) => new Error(errMsg(err, fallback))

export const mcpUrl = () => `${window.location.origin}/api/mcp`
export const isExpired = (t: Pick<McpToken, 'expires_at'>) => !!t.expires_at && new Date(t.expires_at).getTime() <= Date.now()

export async function createToken(args: { name: string; write: boolean; businessIds: string[] | null; days: number | null }): Promise<{ token: string; id: string; hint: string }> {
  const { data, error } = await supabase.rpc('create_mcp_token', { p_name: args.name, p_write: args.write, p_businesses: args.businessIds, p_days: args.days })
  if (error) throw fail(error, 'Could not create the connection.')
  const row = (Array.isArray(data) ? data[0] : data) as { token_id: string; token: string; hint: string }
  return { token: row.token, id: row.token_id, hint: row.hint }
}

export async function listTokens(): Promise<McpToken[]> {
  const { data, error } = await supabase
    .from('mcp_tokens')
    .select('id,name,token_hint,scopes,business_ids,created_at,expires_at,last_used_at,revoked_at')
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) throw fail(error, 'Could not load your connections.')
  return (data ?? []) as McpToken[]
}

export async function revokeToken(id: string): Promise<void> {
  const { error, data } = await supabase.from('mcp_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id).select('id')
  if (error || !data?.length) throw fail(error, 'Could not revoke that connection.')
}

/** How many calls each token made in the last 24 hours. */
export async function callsLast24h(ids: string[]): Promise<Record<string, number>> {
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const out: Record<string, number> = {}
  await Promise.all(
    ids.map(async (id) => {
      const { count } = await supabase.from('mcp_audit').select('id', { count: 'exact', head: true }).eq('token_id', id).gte('at', since)
      out[id] = count ?? 0
    }),
  )
  return out
}
