import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase, isConfigured, isDemo } from '../lib/supabase'
import { Button, Input, Card, Spinner } from './ui'

// Base44 と同様、アプリ利用にはログインが必要。
// メール＋パスワードでログイン（メールは送らない。ホーム画面アプリでもそのまま使える）。
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState('password')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [password2, setPassword2] = useState('')
  const [invite, setInvite] = useState('')

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

  const signIn = async (e) => {
    e.preventDefault()
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSigningIn(false)
    if (error) toast.error(error.message.includes('Invalid login') ? 'メールアドレスかパスワードが違います' : error.message)
  }

  // 新規登録（メール＋パスワード）。合言葉は supabase/signup_guard.sql を入れるとサーバー側でチェックされる
  const signUp = async (e) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('パスワードは6文字以上にしてください')
    if (password !== password2) return toast.error('パスワードが一致しません')
    setSigningIn(true)
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { invite: invite.trim() } },
    })
    setSigningIn(false)
    if (error) {
      const m = error.message
      if (/already registered|already exists/i.test(m)) toast.error('このメールアドレスは登録済みです。ログインしてください')
      else if (/invite|合言葉|Database error/i.test(m)) toast.error('合言葉が違います')
      else if (/Signups not allowed/i.test(m)) toast.error('新規登録は締め切られています')
      else toast.error(m)
      return
    }
    if (!data.session) {
      // Supabase の「Confirm email」がオンのままだとここに来る
      toast.error('登録はできましたが、管理者側で「Confirm email」をオフにする必要があります', { duration: 8000 })
      setMode('password')
    }
  }

  if (mode === 'signup') {
    return (
      <Shell>
        <form onSubmit={signUp} className="space-y-3">
          <p className="font-medium">新規登録</p>
          <Input type="email" autoComplete="username" required placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" autoComplete="new-password" required placeholder="パスワード（6文字以上）" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input type="password" autoComplete="new-password" required placeholder="パスワード（確認）" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          <Input required placeholder="バンドの合言葉" value={invite} onChange={(e) => setInvite(e.target.value)} />
          <Button type="submit" className="w-full justify-center" loading={signingIn}>登録してはじめる</Button>
        </form>
        <button onClick={() => setMode('password')} className="mt-4 w-full text-center text-xs text-muted underline">登録済みの人はこちら（ログイン）</button>
      </Shell>
    )
  }

  return (
    <Shell>
      <form onSubmit={signIn} className="space-y-3">
        <p className="text-sm text-muted">一度ログインすれば、この端末ではログインしたままになります。</p>
        <Input type="email" autoComplete="username" required placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" autoComplete="current-password" required placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full justify-center" loading={signingIn}>ログイン</Button>
      </form>
      <Button variant="secondary" className="mt-3 w-full justify-center" onClick={() => setMode('signup')}>はじめての人は新規登録</Button>
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
