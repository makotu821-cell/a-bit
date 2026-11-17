// =========================================================
// A-BiT LINE 通知（Supabase Edge Function）
//  - LINE からの Webhook: bot が入ったグループの ID を覚える
//  - アプリからの呼び出し: 覚えたグループに push メッセージを送る
// 必要な Secrets: LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET
// ※ この関数は「Verify JWT」をオフにしてデプロイする（LINE の Webhook には JWT が無いため）。
//    アプリからの呼び出しは、関数内でログインユーザーかどうかを確認している。
// =========================================================
import { createClient } from 'npm:@supabase/supabase-js@2'

const TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
const SECRET = Deno.env.get('LINE_CHANNEL_SECRET')
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function validSignature(body: string, signature: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return btoa(String.fromCharCode(...new Uint8Array(mac))) === signature
}

async function line(path: string, payload: unknown) {
  return fetch(`https://api.line.me/v2/bot/message/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const body = await req.text()

  // ---- LINE からの Webhook ----
  const signature = req.headers.get('x-line-signature')
  if (signature) {
    if (!SECRET || !(await validSignature(body, signature))) return json({ ok: false }, 401)
    const { events = [] } = JSON.parse(body || '{}')
    for (const e of events) {
      const groupId = e.source?.type === 'group' ? e.source.groupId : null
      if (!groupId) continue
      await admin.from('app_settings').upsert({ key: 'line_group_id', value: groupId })
      if (e.type === 'join' && e.replyToken) {
        await line('reply', {
          replyToken: e.replyToken,
          messages: [{ type: 'text', text: 'A-BiT の通知をこのグループに送ります🎸\n日程が確定したらここにお知らせします。' }],
        })
      }
    }
    return json({ ok: true })
  }

  // ---- アプリからの送信依頼 ----
  if (!TOKEN) return json({ ok: false, reason: 'not_configured' })
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(jwt)
  if (!auth?.user) return json({ ok: false, reason: 'unauthorized' }, 401)

  const { text } = JSON.parse(body || '{}')
  if (!text) return json({ ok: false, reason: 'empty' }, 400)

  const { data: setting } = await admin.from('app_settings').select('value').eq('key', 'line_group_id').maybeSingle()
  if (!setting?.value) return json({ ok: false, reason: 'no_group' })

  const res = await line('push', { to: setting.value, messages: [{ type: 'text', text: String(text).slice(0, 5000) }] })
  if (!res.ok) return json({ ok: false, reason: 'line_error', detail: await res.text() })
  return json({ ok: true })
})
