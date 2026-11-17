import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { supabase, isConfigured, isDemo } from '../lib/supabase'
import { Button, Input, Card, Spinner } from './ui'

// Base44 と同様、アプリ利用にはログインが必要。メールのワンタイムリンクでログインする。
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

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

  return (
    <Shell>
      {sent ? (
        <div className="text-center">
          <Mail className="h-10 w-10 mx-auto text-accent mb-3" />
          <p className="font-medium">ログイン用のメールを送りました</p>
          <p className="text-sm text-muted mt-1">{email} に届いたリンクを開いてください</p>
          <Button variant="ghost" className="mt-4" onClick={() => setSent(false)}>やり直す</Button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <p className="text-sm text-muted">メールアドレスにログイン用リンクを送ります</p>
          <Input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full justify-center" loading={sending}>ログインリンクを送信</Button>
        </form>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-bg text-slate-100 grid place-items-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="grid place-items-center h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent font-display font-bold">A</span>
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
