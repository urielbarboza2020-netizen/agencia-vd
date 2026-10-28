import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-ink-100 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900 ${className}`}
    >
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: ReactNode
  sub?: string
  accent?: boolean
}) {
  return (
    <Card className={accent ? 'bg-brand-600 text-white border-brand-600' : ''}>
      <p className={`text-xs font-medium uppercase tracking-wide ${accent ? 'text-brand-100' : 'text-ink-400'}`}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? 'text-white' : 'text-ink-900 dark:text-white'}`}>
        {value}
      </p>
      {sub && <p className={`mt-1 text-xs ${accent ? 'text-brand-100' : 'text-ink-400'}`}>{sub}</p>}
    </Card>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100'
  const variants: Record<string, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary:
      'bg-white text-ink-700 border border-ink-200 hover:bg-ink-50 dark:bg-ink-800 dark:text-ink-200 dark:border-ink-700 dark:hover:bg-ink-700',
    ghost: 'text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-ink-100 bg-white p-5 shadow-card animate-fade-in sm:rounded-2xl sm:p-6 dark:border-ink-800 dark:bg-ink-900 ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string
  children: ReactNode
  error?: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-500 dark:text-ink-400">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:focus:ring-brand-500/20'

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center dark:border-ink-800 dark:bg-ink-900">
      {icon && <div className="mb-3 text-ink-300 dark:text-ink-600">{icon}</div>}
      <p className="text-sm font-medium text-ink-700 dark:text-ink-200">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Badge({ children, color = 'brand' }: { children: ReactNode; color?: 'brand' | 'gray' | 'green' }) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    gray: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  }
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-ink-500 dark:text-ink-400">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
