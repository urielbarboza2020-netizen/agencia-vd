import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useToast } from './ToastContext'

export function ToastHost() {
  const { toasts, dismiss } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`animate-toast-in flex items-start gap-2.5 rounded-xl border px-4 py-3 text-left text-sm shadow-card backdrop-blur-sm transition
            ${t.kind === 'success' ? 'bg-brand-600 border-brand-500 text-white' : ''}
            ${t.kind === 'error' ? 'bg-red-600 border-red-500 text-white' : ''}
            ${t.kind === 'info' ? 'bg-ink-800 border-ink-700 text-white' : ''}
          `}
        >
          {t.kind === 'success' && <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          {t.kind === 'error' && <XCircle size={18} className="mt-0.5 shrink-0" />}
          {t.kind === 'info' && <Info size={18} className="mt-0.5 shrink-0" />}
          <span className="leading-snug">{t.message}</span>
        </button>
      ))}
    </div>
  )
}
