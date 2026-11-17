import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { supabase, isConfigured, isDemo } from '../lib/supabase'
import { Button, Input, Card, Spinner } from './ui'

// Base44 と同様、アプリ利用にはログインが必要。
// 基本はメール＋パスワード（ホーム画面アプリでもそのまま使える）。メールのリンクでのログインも残している。
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [mode, setMode] = useState('password')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!isConfigured || isDemo) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (isDemo) return children
  if (!isConfigured) {
    return (
      <Shell>
        <h2 className="font-display text-xl font-bold mb-2">セットアップが必要です</h2>
        <p className="text-sm text-muted">
          環境変数 <code className="text-accent">VITE_SUPABASE_URL</code> と <code className="text-accent">VITE_SUPABASE_ANON_KEY</code> を設定してください。手順は README を参照。
        </p>
        <a href="?demo" className="inline-block mt-4 text-sm text-accent underline">デモモードで試す（データはこのブラウザ内のみ）</a>
      </Shell>
    )
  }
  if (session === undefined) return <div className="min-h-screen bg-bg"><Spinner /></div>
  if (session) return children

  const send = async (e) => {
    e.preventDefault()
    setSending(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    setSending(false)
    if (error) toast.error(error.message.includes('Signups not allowed') ? 'このメールアドレスは登録されていません' : error.message)
    else setSent(true)
  }

  // メールの6桁コードでログイン（ホーム画面アプリでも使える）
  const verify = async (e) => {
    e.preventDefault()
    setVerifying(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setVerifying(false)
    if (error) toast.error('コードが違うか、期限切れです')
  }

  const signIn = async (e) => {
    e.preventDefault()
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSigningIn(false)
    if (error) toast.error(error.message.includes('Invalid login') ? 'メールアドレスかパスワードが違います' : error.message)
  }

  if (mode === 'password') {
    return (
      <Shell>
        <form onSubmit={signIn} className="space-y-3">
          <p className="text-sm text-muted">一度ログインすれば、この端末ではログインしたままになります。</p>
          <Input type="email" autoComplete="username" required placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" autoComplete="current-password" required placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full justify-center" loading={signingIn}>ログイン</Button>
        </form>
        <button onClick={() => setMode('link')} className="mt-4 w-full text-center text-xs text-muted underline">パスワードなしでメールのリンクからログイン</button>
      </Shell>
    )
  }

  return (
    <Shell>
      {sent ? (
        <div className="text-center">
          <Mail className="h-10 w-10 mx-auto text-accent mb-3" />
          <p className="font-medium">ログイン用のメールを送りました</p>
          <p className="text-sm text-muted mt-1">{email} に届いた<b className="text-slate-200">6桁のコード</b>を入力するか、メールのリンクを開いてください</p>
          <form onSubmit={verify} className="mt-4 space-y-2">
            <Input inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="123456"
              className="text-center tracking-[0.4em] num" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <Button type="submit" className="w-full justify-center" loading={verifying} disabled={code.length < 6}>ログイン</Button>
          </form>
          <p className="text-[11px] text-muted mt-3">ホーム画面に追加したアプリでは、コード入力でログインしてください（リンクはSafariで開くため）</p>
          <Button variant="ghost" className="mt-2" onClick={() => { setSent(false); setCode('') }}>やり直す</Button>
        </div>
      ) : (
        <>
        <form onSubmit={send} className="space-y-3">
          <p className="text-sm text-muted">メールアドレスにログイン用のコードとリンクを送ります。一度ログインすれば、この端末ではログインしたままになります。</p>
          <Input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full justify-center" loading={sending}>ログインメールを送信</Button>
        </form>
        <button onClick={() => setMode('password')} className="mt-4 w-full text-center text-xs text-muted underline">パスワードでログイン</button>
        </>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-bg text-slate-100 grid place-items-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/10" />
          <div>
            <p className="font-display text-lg font-bold leading-none">A-BiT</p>
            <p className="text-xs text-muted">band coordination suite</p>
          </div>
        </div>
        {children}
      </Card>
    </div>
  )
}
