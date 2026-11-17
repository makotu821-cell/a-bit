// =========================================================
// A-BiT Googleドライブ連携（Supabase Edge Function）
// バンド共有の Google アカウントで「最初に1回だけ」接続すると、
// 以降はサーバーがドライブを読みに行くので、メンバーは Google ログイン不要。
//
// 必要な Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// ※「Verify JWT」はオフでデプロイ（Google からの戻り先 GET を受けるため）。
//   アプリからの呼び出しは関数内でログインユーザーかどうかを確認している。
// =========================================================
import { createClient } from 'npm:@supabase/supabase-js@2'

const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/drive-sync`
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const html = (msg: string) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;background:#0b0a14;color:#eee;display:grid;place-items:center;height:90vh;text-align:center"><div><h2>${msg}</h2><p>この画面を閉じて A-BiT に戻ってください</p></div>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })

const getSetting = async (key: string) =>
  (await admin.from('app_settings').select('value').eq('key', key).maybeSingle()).data?.value ?? null
const setSetting = (key: string, value: string | null) =>
  admin.from('app_settings').upsert({ key, value, updated_date: new Date().toISOString() })

async function token(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID!, client_secret: CLIENT_SECRET!, ...params }),
  })
  return { ok: res.ok, data: await res.json() }
}

// アクセストークンはインスタンス内で使い回す（約1時間）
let cached: { value: string; exp: number } | null = null
async function accessToken() {
  if (cached && cached.exp > Date.now()) return cached.value
  const refresh = await getSetting('google_refresh_token')
  if (!refresh) return null
  const { ok, data } = await token({ grant_type: 'refresh_token', refresh_token: refresh })
  if (!ok) {
    if (data.error === 'invalid_grant') await setSetting('google_refresh_token', null) // 失効 → 再接続が必要
    return null
  }
  cached = { value: data.access_token, exp: Date.now() + (data.expires_in - 120) * 1000 }
  return cached.value
}

async function listTree(rootId: string, at: string) {
  const folders: Record<string, { id: string; name: string; parent: string | null }> = { [rootId]: { id: rootId, name: '', parent: null } }
  const files: unknown[] = []
  let frontier = [rootId]
  while (frontier.length) {
    const next: string[] = []
    for (let i = 0; i < frontier.length; i += 40) {
      const chunk = frontier.slice(i, i + 40)
      const q = `(${chunk.map((id) => `'${id}' in parents`).join(' or ')}) and trashed = false`
      let pageToken: string | undefined
      do {
        const params = new URLSearchParams({
          q, pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true',
          fields: 'nextPageToken,files(id,name,mimeType,parents,webViewLink,size,modifiedTime)',
        })
        if (pageToken) params.set('pageToken', pageToken)
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: { Authorization: `Bearer ${at}` } })
        if (!res.ok) throw new Error(`Drive API ${res.status}`)
        const data = await res.json()
        for (const f of data.files || []) {
          const parent = (f.parents || []).find((p: string) => chunk.includes(p)) || chunk[0]
          if (f.mimeType === FOLDER_MIME) {
            if (!folders[f.id]) { folders[f.id] = { id: f.id, name: f.name, parent }; next.push(f.id) }
          } else {
            files.push({ ...f, parents: [parent], size: f.size ? Number(f.size) : null })
          }
        }
        pageToken = data.nextPageToken
      } while (pageToken)
    }
    frontier = next
  }
  return { rootId, folders, files, fetchedAt: Date.now() }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = new URL(req.url)

  // ---- Google からの戻り先（接続の完了） ----
  if (req.method === 'GET') {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code || !state || state !== (await getSetting('google_oauth_state'))) return html('接続に失敗しました（もう一度お試しください）')
    await setSetting('google_oauth_state', null)
    const { ok, data } = await token({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI })
    if (!ok || !data.refresh_token) return html('接続に失敗しました（もう一度お試しください）')
    await setSetting('google_refresh_token', data.refresh_token)
    cached = { value: data.access_token, exp: Date.now() + (data.expires_in - 120) * 1000 }
    return html('Googleドライブを接続しました 🎸')
  }

  // ---- アプリからの呼び出し（ログイン必須） ----
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(jwt)
  if (!auth?.user) return json({ ok: false, reason: 'unauthorized' }, 401)
  if (!CLIENT_ID || !CLIENT_SECRET) return json({ ok: false, reason: 'not_configured' })

  const { action, root } = await req.json().catch(() => ({}))

  if (action === 'start') {
    const state = crypto.randomUUID()
    await setSetting('google_oauth_state', state)
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: SCOPE,
      access_type: 'offline', prompt: 'consent', state,
    })
    return json({ ok: true, url: authUrl })
  }

  if (action === 'list') {
    const at = await accessToken()
    if (!at) return json({ ok: false, reason: 'not_connected' })
    try {
      return json({ ok: true, tree: await listTree(root || 'root', at) })
    } catch (e) {
      return json({ ok: false, reason: 'drive_error', detail: String(e) })
    }
  }

  if (action === 'disconnect') {
    await setSetting('google_refresh_token', null)
    cached = null
    return json({ ok: true })
  }

  return json({ ok: false, reason: 'unknown_action' }, 400)
})
