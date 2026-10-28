import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string; needsConfirmation?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signUp: AuthContextValue['signUp'] = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    })
    if (error) return { error: translateAuthError(error.message) }
    return { needsConfirmation: !data.session }
  }

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: translateAuthError(error.message) }
    return {}
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading, signUp, signIn, signOut }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Email o contraseña incorrectos',
    'User already registered': 'Ya existe una cuenta con ese email',
    'Email not confirmed': 'Confirmá tu email antes de iniciar sesión',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
  }
  return map[message] ?? message
}
