import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useBusinesses } from '../../lib/useBusinesses'
import { ROLE_LABEL, useAccess } from '../../lib/access'
import { errMsg } from '../../lib/errors'
import { callsLast24h, createToken, isExpired, listTokens, mcpUrl, revokeToken } from '../../lib/mcpTokens'
import type { McpToken } from '../../lib/mcpTokens'

const cardCls = 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6'
const inputCls =
  'w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1'
const primary = 'rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition'
const linkBtn = 'text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50'
const codeCls = 'block w-full overflow-x-auto rounded-lg bg-slate-900 text-slate-100 text-xs p-3 font-mono whitespace-pre'

const EXPIRY = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'Never', days: null },
] as const

const ago = (iso: string | null) => {
  if (!iso) return 'never'
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m} minutes ago`
  const h = Math.round(m / 60)
  if (h < 36) return `${h} hour${h === 1 ? '' : 's'} ago`
  return `${Math.round(h / 24)} days ago`
}

type Client = 'claude-code' | 'claude-api' | 'grok' | 'other'
function snippet(client: Client, token: string): string {
  const url = mcpUrl()
  switch (client) {
    case 'claude-code':
      return `claude mcp add --transport http solo-books ${url} \\\n  --header "Authorization: Bearer ${token}"`
    case 'claude-api':
      return `"mcp_servers": [\n  {\n    "type": "url",\n    "url": "${url}",\n    "name": "solo-books",\n    "authorization_token": "${token}"\n  }\n]`
    case 'grok':
      return `from xai_sdk.tools import mcp\n\nmcp(\n    server_url="${url}",\n    server_label="solo_books",\n    authorization="${token}",\n)`
    default:
      return `URL:     ${url}\nHeader:  Authorization: Bearer ${token}\nTransport: Streamable HTTP (JSON replies)`
  }
}
const CLIENTS: { key: Client; label: string; help: string }[] = [
  { key: 'claude-code', label: 'Claude Code', help: 'Run this once in a terminal. Add --scope user to use it in every project.' },
  { key: 'claude-api', label: 'Claude API', help: "Add this to a Messages API request's MCP servers (the MCP connector)." },
  { key: 'grok', label: 'Grok (xAI)', help: "Add this to the tools list when you create a chat with xAI's Python SDK. Other xAI clients use the same three values." },
  { key: 'other', label: 'Any other app', help: 'Any MCP client that lets you set a server URL and an Authorization header will work.' },
]

function Connect({ token }: { token: string }) {
  const [client, setClient] = useState<Client>('claude-code')
  const [copied, setCopied] = useState(false)
  const text = snippet(client, token)
  const c = CLIENTS.find((x) => x.key === client)!
  return (
    <div className="mt-4">
      <div role="tablist" aria-label="Which app" className="flex flex-wrap gap-1 mb-3">
        {CLIENTS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={client === x.key}
            onClick={() => setClient(x.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${client === x.key ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{c.help}</p>
      <code className={codeCls}>{text}</code>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }, () => undefined)}
        className={`${linkBtn} mt-2`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export function ConnectionsTab() {
  const { businesses } = useBusinesses()
  const access = useAccess()
  const [tokens, setTokens] = useState<McpToken[]>([])
  const [calls, setCalls] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState('')
  const [write, setWrite] = useState(false)
  const [scope, setScope] = useState<'all' | 'some'>('all')
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [days, setDays] = useState<number | null>(90)
  const [fresh, setFresh] = useState<{ token: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [helpFor, setHelpFor] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const t = await listTokens()
      setTokens(t)
      setCalls(await callsLast24h(t.map((x) => x.id)))
      setError(null)
    } catch (err) {
      setError(errMsg(err, 'Could not load your connections.'))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    setFresh(null)
    try {
      const ids = scope === 'all' ? null : [...chosen]
      const r = await createToken({ name, write, businessIds: ids, days })
      setFresh({ token: r.token, name: name.trim() })
      setName('')
      setWrite(false)
      setScope('all')
      setChosen(new Set())
      setDays(90)
      setCopied(false)
      await load()
    } catch (err) {
      setError(errMsg(err, 'Could not create the connection.'))
    } finally {
      setBusy(false)
    }
  }

  async function revoke(t: McpToken) {
    if (!confirm(`Revoke "${t.name}"? Anything using it stops working immediately. This can't be undone, but you can make a new one.`)) return
    try {
      await revokeToken(t.id)
      setNotice(`"${t.name}" was revoked.`)
      if (fresh && fresh.name === t.name) setFresh(null)
      await load()
    } catch (err) {
      setError(errMsg(err, 'Could not revoke that connection.'))
    }
  }

  const scopeLabel = (t: McpToken) => (t.business_ids ? `${t.business_ids.length} business${t.business_ids.length === 1 ? '' : 'es'}` : 'All your businesses')

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">
      <section className={cardCls}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI connections</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Let an AI agent, such as a Claude or Grok bot, work in your books. Each connection has its own key that you can limit and revoke at any time.
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400 list-disc pl-4">
          <li>An agent can only do what <strong>you</strong> can do in each business. A view-only role stays view-only.</li>
          <li>Read-only connections can look at the books and reports. Read and write ones can also add and change entries, but <strong>nothing can be deleted</strong>.</li>
          <li>Payroll, pay stubs and employee records are never available to an agent.</li>
          <li>Entries an agent adds are marked as coming from that connection.</li>
        </ul>
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">New connection</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="conn-name" className={labelCls}>
              Name
            </label>
            <input id="conn-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Claude bookkeeping bot" required />
          </div>

          <fieldset>
            <legend className={labelCls}>What it can do</legend>
            <div className="space-y-2">
              {[
                { w: false, t: 'Read only', d: 'Look at the ledger, budgets, bank lines and reports. Recommended to start.' },
                { w: true, t: 'Read and write', d: 'Also add transactions, contractors, clients, categories and budget amounts, and edit entries.' },
              ].map((o) => (
                <label key={o.t} className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="conn-access" checked={write === o.w} onChange={() => setWrite(o.w)} className="mt-1" />
                  <span className="text-sm text-slate-800 dark:text-slate-200">
                    {o.t}
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{o.d}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelCls}>Which businesses</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
                <input type="radio" name="conn-scope" checked={scope === 'all'} onChange={() => setScope('all')} />
                All the businesses I can use
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
                <input type="radio" name="conn-scope" checked={scope === 'some'} onChange={() => setScope('some')} />
                Only the ones I choose
              </label>
              {scope === 'some' && (
                <div className="ml-6 space-y-1.5">
                  {businesses.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chosen.has(b.id)}
                        onChange={() => setChosen((s) => { const n = new Set(s); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); return n })}
                      />
                      {b.name}
                      {access.roleOf(b.id) && access.roleOf(b.id) !== 'owner' && <span className="text-xs text-slate-400">({ROLE_LABEL[access.roleOf(b.id)!]})</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </fieldset>

          <div>
            <label htmlFor="conn-exp" className={labelCls}>
              Expires
            </label>
            <select id="conn-exp" className={inputCls} value={days ?? 'never'} onChange={(e) => setDays(e.target.value === 'never' ? null : Number(e.target.value))}>
              {EXPIRY.map((x) => (
                <option key={x.label} value={x.days ?? 'never'}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={busy || !name.trim() || (scope === 'some' && chosen.size === 0)} className={primary}>
            {busy ? 'Creating…' : 'Create connection'}
          </button>
        </form>

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

        {fresh && (
          <div className="mt-5 rounded-xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4" role="status">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">"{fresh.name}" is ready. Copy its key now.</p>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">This is the only time it is shown. Store it like a password. If it is lost, revoke it and make a new one.</p>
            <div className="mt-3 flex gap-2">
              <input readOnly aria-label="Access key" value={fresh.token} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} font-mono !text-xs`} />
              <button type="button" onClick={() => navigator.clipboard.writeText(fresh.token).then(() => setCopied(true), () => undefined)} className={primary}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <Connect token={fresh.token} />
          </div>
        )}
      </section>

      <section className={cardCls}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Your connections</h2>
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No connections yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {tokens.map((t) => (
              <li key={t.id} className="py-3">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-medium ${isExpired(t) ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>{t.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.scopes.includes('write') ? 'bg-amber-200/70 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        {t.scopes.includes('write') ? 'Read and write' : 'Read only'}
                      </span>
                      {isExpired(t) && <span className="rounded-full bg-rose-100 dark:bg-rose-500/20 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">Expired</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      …{t.token_hint} · {scopeLabel(t)} · last used {ago(t.last_used_at)} · {calls[t.id] ?? 0} call{(calls[t.id] ?? 0) === 1 ? '' : 's'} today ·{' '}
                      {t.expires_at ? `${isExpired(t) ? 'expired' : 'expires'} ${new Date(t.expires_at).toLocaleDateString()}` : 'never expires'}
                    </div>
                  </div>
                  <button type="button" onClick={() => setHelpFor(helpFor === t.id ? null : t.id)} className={linkBtn}>
                    {helpFor === t.id ? 'Hide setup' : 'How to connect'}
                  </button>
                  <button type="button" onClick={() => revoke(t)} className={`${linkBtn} hover:!text-rose-600 dark:hover:!text-rose-400`}>
                    Revoke
                  </button>
                </div>
                {helpFor === t.id && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Use the full key you copied when you made this connection in place of YOUR_KEY.</p>
                    <Connect token="YOUR_KEY" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
