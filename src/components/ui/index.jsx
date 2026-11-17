import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '../../lib/utils'

export function Button({ variant = 'primary', size = 'md', className, loading, children, ...p }) {
  const v = {
    primary: 'bg-primary text-white hover:bg-violet-500 shadow-lg shadow-violet-900/30',
    secondary: 'bg-surface2 text-slate-100 border border-border hover:bg-[#25223a]',
    ghost: 'text-slate-300 hover:bg-white/5',
    danger: 'bg-red-600/90 text-white hover:bg-red-500',
    accent: 'bg-accent text-slate-900 hover:bg-cyan-300',
  }[variant]
  const s = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5', icon: 'h-9 w-9 justify-center' }[size]
  return (
    <button
      className={cn('inline-flex items-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:pointer-events-none', v, s, className)}
      disabled={loading || p.disabled}
      {...p}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

const field = 'w-full rounded-xl bg-bg border border-border px-3 text-[16px] text-slate-100 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/60'

export const Input = ({ className, ...p }) => <input className={cn(field, 'h-11', className)} {...p} />
export const Textarea = ({ className, ...p }) => <textarea className={cn(field, 'py-2 min-h-[120px]', className)} {...p} />
export const Select = ({ className, children, ...p }) => (
  <select className={cn(field, 'h-11 appearance-none', className)} {...p}>{children}</select>
)
export const Label = ({ children, required }) => (
  <label className="block text-xs font-medium text-muted mb-1.5">
    {children}{required && <span className="text-pink-400 ml-0.5">*</span>}
  </label>
)
export const Field = ({ label, required, children, className }) => (
  <div className={className}><Label required={required}>{label}</Label>{children}</div>
)

export const Badge = ({ className, children }) => (
  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', className)}>{children}</span>
)

export const Skeleton = ({ className }) => <div className={cn('animate-pulse rounded-xl bg-white/5', className)} />

export const Card = ({ className, children, ...p }) => (
  <div className={cn('rounded-2xl bg-surface border border-border', className)} {...p}>{children}</div>
)

export const Spinner = () => (
  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
)

function useEsc(open, onClose) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [open, onClose])
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEsc(open, onClose)
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn('relative w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface border border-border p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted"><X className="h-5 w-5" /></button>
            </div>
            {children}
            {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Drawer({ open, onClose, children }) {
  useEsc(open, onClose)
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 h-full w-full sm:max-w-[512px] bg-surface border-l border-border overflow-y-auto"
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Confirm({ open, onClose, onConfirm, title, message, loading, confirmLabel = '削除' }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>キャンセル</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}
    >
      <p className="text-sm text-slate-300">{message}</p>
    </Modal>
  )
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 text-muted">
      {Icon && <Icon className="h-10 w-10 mb-3 text-primary/70" />}
      <p className="font-medium text-slate-200">{title}</p>
      {children && <p className="text-sm mt-1">{children}</p>}
    </div>
  )
}
