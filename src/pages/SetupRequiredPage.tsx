import { AlertTriangle } from 'lucide-react'

export function SetupRequiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 dark:bg-ink-950">
      <div className="max-w-lg rounded-2xl border border-amber-200 bg-white p-8 shadow-card dark:border-amber-500/30 dark:bg-ink-900">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/10">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-lg font-semibold text-ink-900 dark:text-white">Falta configurar Supabase</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          Esta app necesita las variables de entorno <code className="rounded bg-ink-100 px-1 py-0.5 text-xs dark:bg-ink-800">VITE_SUPABASE_URL</code> y{' '}
          <code className="rounded bg-ink-100 px-1 py-0.5 text-xs dark:bg-ink-800">VITE_SUPABASE_ANON_KEY</code> para funcionar. Configuralas en tu
          proyecto de Vercel (o en un archivo <code className="rounded bg-ink-100 px-1 py-0.5 text-xs dark:bg-ink-800">.env.local</code> si estás
          corriendo la app en tu computadora) y volvé a desplegar.
        </p>
      </div>
    </div>
  )
}
