// Emails a team invitation. The browser calls this with the signed-in admin's token and an invite id; the database (not this
// function) decides whether that admin may send it, and returns the invite's own address and link. So this cannot be used to
// email anyone else, or to email anything but an invitation. Without RESEND_API_KEY it answers "not_configured" and the app
// shows the invite link to copy instead.
//
// Environment (Vercel project settings):
//   RESEND_API_KEY   required to send. A send-only key is enough.
//   INVITE_FROM      optional, default "Solo Books <noreply@latchpointstudios.com>" (the domain must be verified in Resend)
//   APP_URL          optional, default https://solobooks.latchpointstudios.com
//   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY   already set for the app

const ROLE_TEXT = {
  admin: 'an Admin, who can do everything and add or remove people',
  bookkeeper: 'a Bookkeeper, who can work in the ledger, receipts, budgets, banking and payroll',
  viewer: 'View-only, who can read the books and reports',
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function buildEmail({ business, inviter, role, link }) {
  const who = inviter || 'Someone'
  const roleText = ROLE_TEXT[role] || 'a team member'
  const subject = `${who} invited you to ${business} on Solo Books`
  const text = [
    `${who} invited you to work in ${business} on Solo Books, as ${roleText}.`,
    '',
    `Accept the invitation: ${link}`,
    '',
    'The link works once and expires in 7 days. Sign in to your Solo Books account to accept it. Solo Books is invite-only, so if you do not have an account yet, reply to the person who invited you.',
    "If you weren't expecting this, you can ignore this email.",
  ].join('\n')
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f6f4;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;color:#0a0b0d">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e6e4de">
    <div style="font-family:Georgia,serif;font-size:22px;color:#85692f;margin-bottom:20px">Solo Books</div>
    <h1 style="font-size:20px;line-height:1.3;margin:0 0 12px">${esc(who)} invited you to join ${esc(business)}</h1>
    <p style="font-size:15px;line-height:1.55;color:#585a61;margin:0 0 24px">You'll be ${esc(roleText)}.</p>
    <a href="${esc(link)}" style="display:inline-block;background:#cbb078;color:#1a1408;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px">Accept the invitation</a>
    <p style="font-size:13px;line-height:1.5;color:#585a61;margin:24px 0 0">The link works once and expires in 7 days. Sign in to your Solo Books account to accept it. Solo Books is invite-only, so if you don't have an account yet, reply to the person who invited you.</p>
    <p style="font-size:12px;line-height:1.5;color:#8a8c93;margin:16px 0 0">If the button doesn't work, paste this into your browser:<br><span style="word-break:break-all">${esc(link)}</span></p>
    <p style="font-size:12px;color:#8a8c93;margin:16px 0 0">If you weren't expecting this, you can ignore this email.</p>
  </div></body></html>`
  return { subject, text, html }
}

/** The whole job, with its inputs passed in so it can be tested without a network. */
export async function sendInvite({ body, authorization, env, fetchImpl = fetch }) {
  const inviteId = body && typeof body.inviteId === 'string' ? body.inviteId : ''
  if (!inviteId || !/^[0-9a-f-]{36}$/i.test(inviteId)) return { status: 400, json: { error: 'Missing invite.' } }
  if (!/^Bearer\s+\S+/.test(authorization || '')) return { status: 401, json: { error: 'Sign in first.' } }

  const apiKey = env.RESEND_API_KEY
  if (!apiKey) return { status: 503, json: { error: 'not_configured' } }
  const supaUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
  const anon = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY
  if (!supaUrl || !anon) return { status: 500, json: { error: 'The server is not set up correctly.' } }

  // Ask the database, as this person, for the invite's details. It refuses anyone who is not an admin of that business.
  const rpc = await fetchImpl(`${supaUrl}/rest/v1/rpc/prepare_invite_email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: anon, authorization },
    body: JSON.stringify({ p_invite: inviteId }),
  })
  const rows = await rpc.json().catch(() => null)
  if (!rpc.ok) {
    const message = (rows && rows.message) || 'That invite could not be sent.'
    return { status: rpc.status === 401 ? 401 : rpc.status === 403 || /admin/i.test(message) ? 403 : 400, json: { error: message } }
  }
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row || !row.invite_email || !row.invite_token) return { status: 400, json: { error: 'That invite could not be sent.' } }

  const appUrl = (env.APP_URL || 'https://solobooks.latchpointstudios.com').replace(/\/+$/, '')
  const link = `${appUrl}/join/${row.invite_token}`
  const mail = buildEmail({ business: row.business_name, inviter: row.inviter, role: row.invite_role, link })

  const sent = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: env.INVITE_FROM || 'Solo Books <noreply@latchpointstudios.com>', to: [row.invite_email], subject: mail.subject, html: mail.html, text: mail.text }),
  })
  if (!sent.ok) {
    const detail = await sent.json().catch(() => ({}))
    return { status: 502, json: { error: (detail && detail.message) || 'The email service refused it.' } }
  }
  return { status: 200, json: { sent: true } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only.' })
  }
  try {
    const out = await sendInvite({ body: req.body, authorization: req.headers.authorization, env: process.env })
    return res.status(out.status).json(out.json)
  } catch {
    return res.status(500).json({ error: 'Something went wrong sending the email.' })
  }
}
