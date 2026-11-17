// Google Drive Picker（Google Picker API + OAuth2 / Google Identity Services）
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY

export const driveEnabled = Boolean(CLIENT_ID && API_KEY)

const TOKEN_KEY = 'a-bit-google-token'
let token = (() => {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null')
    return t && t.exp > Date.now() ? t.value : null
  } catch { return null }
})()
const loaded = {}

function loadScript(src) {
  if (loaded[src]) return loaded[src]
  loaded[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
  return loaded[src]
}

async function ensureLibs() {
  await Promise.all([
    loadScript('https://apis.google.com/js/api.js'),
    loadScript('https://accounts.google.com/gsi/client'),
  ])
  await new Promise((r) => window.gapi.load('picker', r))
}

/** 現在の Google アクセストークン（未ログインなら null） */
export const currentDriveToken = () => {
  if (!token) return null
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null')
    if (t && t.exp <= Date.now()) { localStorage.removeItem(TOKEN_KEY); token = null }
  } catch { /* noop */ }
  return token
}

/** 期限切れ・無効なトークンを捨てる */
export function clearDriveToken() {
  token = null
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* noop */ }
}

/** Google ログイン（Drive 読み取り許可）してトークンを得る */
export async function loginGoogleDrive() {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID が未設定です')
  await loadScript('https://accounts.google.com/gsi/client')
  return getToken()
}

function getToken() {
  return new Promise((resolve, reject) => {
    if (token) return resolve(token)
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (res) => {
        if (res.error) return reject(res)
        token = res.access_token
        const exp = Date.now() + (res.expires_in - 60) * 1000
        try { localStorage.setItem(TOKEN_KEY, JSON.stringify({ value: token, exp })) } catch { /* noop */ }
        setTimeout(() => (token = null), exp - Date.now())
        resolve(token)
      },
    })
    client.requestAccessToken()
  })
}

/**
 * Drive からファイルを選択。{ file_name, file_url } の配列を返す（キャンセル時は []）。
 * @param {{ mimeTypes?: string, multi?: boolean }} opts
 */
export async function pickFromDrive({ mimeTypes, multi = true } = {}) {
  if (!driveEnabled) throw new Error('Google Drive 連携が未設定です')
  await ensureLibs()
  const accessToken = await getToken()
  const g = window.google
  return new Promise((resolve) => {
    const view = new g.picker.DocsView(g.picker.ViewId.DOCS).setIncludeFolders(true)
    if (mimeTypes) view.setMimeTypes(mimeTypes)
    let builder = new g.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .setLocale('ja')
      .setCallback((data) => {
        if (data.action === g.picker.Action.PICKED) {
          resolve(data.docs.map((d) => ({ file_name: d.name, file_url: d.url })))
        } else if (data.action === g.picker.Action.CANCEL) {
          resolve([])
        }
      })
    if (multi) builder = builder.enableFeature(g.picker.Feature.MULTISELECT_ENABLED)
    builder.build().setVisible(true)
  })
}
