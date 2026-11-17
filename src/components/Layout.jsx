import { NavLink, Outlet } from 'react-router-dom'
import { Music, CalendarDays, ClipboardList, Wallet, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

export const NAV = [
  { to: '/', label: '楽曲', icon: Music, end: true },
  { to: '/calendar', label: 'カレンダー', icon: CalendarDays },
  { to: '/poll', label: 'アンケート', icon: ClipboardList },
  { to: '/expenses', label: '交通費', icon: Wallet },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg text-slate-100">
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent text-white font-display font-bold text-sm">A</span>
            <span className="font-display text-lg font-bold tracking-tight">A-BiT</span>
          </NavLink>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => cn('flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm transition',
                  isActive ? 'bg-primary/15 text-violet-300' : 'text-muted hover:text-slate-200 hover:bg-white/5')}>
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
            <button onClick={() => supabase?.auth.signOut()} title="ログアウト" className="ml-2 p-2 rounded-xl text-muted hover:text-slate-200 hover:bg-white/5">
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
          <button onClick={() => supabase?.auth.signOut()} title="ログアウト" className="md:hidden p-2 rounded-xl text-muted">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 pb-28 md:pb-10">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px]', isActive ? 'text-violet-300' : 'text-muted')}>
              <Icon className="h-5 w-5" />{label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
