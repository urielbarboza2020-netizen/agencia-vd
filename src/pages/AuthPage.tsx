import { useState } from 'react'
import { Clapperboard, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button, Field, inputClass } from '../components/ui'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    if (mode === 'login') {
      const res = await signIn(email, password)
      if (res.error) setError(res.error)
    } else {
      const res = await signUp(email, password, fullName)
      if (res.error) setError(res.error)
      else if (res.needsConfirmation) setInfo('Te enviamos un email para confirmar tu cuenta. Revisá tu bandeja de entrada.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 dark:bg-ink-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-card">
            <Clapperboard size={22} />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-ink-900 dark:text-white">Agencia VD</p>
            <p className="text-sm text-ink-400">Control de producción y pagos</p>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-5 flex rounded-lg bg-ink-100 p-1 dark:bg-ink-800">
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === 'login' ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white' : 'text-ink-400'}`}
              onClick={() => setMode('login')}
              type="button"
            >
              Iniciar sesión
            </button>
            <button
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === 'register' ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white' : 'text-ink-400'}`}
              onClick={() => setMode('register')}
              type="button"
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Field label="Nombre">
                <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                required
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                required
                minLength={6}
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </Field>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-emerald-600">{info}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-ink-400">
          {mode === 'login' ? 'Cada persona ve únicamente sus propios trabajos y pagos.' : 'Tu cuenta es privada: nadie más puede ver tus datos.'}
        </p>
      </div>
    </div>
  )
}
