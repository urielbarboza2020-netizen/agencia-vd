import { HashRouter, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ToastHost } from './context/ToastHost'
import { UIProvider } from './context/UIContext'
import { Layout } from './components/Layout'
import { WorkFormModal } from './components/WorkFormModal'
import { QuickTextModal } from './components/QuickTextModal'
import { Dashboard } from './pages/Dashboard'
import { HistoryPage } from './pages/HistoryPage'
import { WeeklySummaryPage } from './pages/WeeklySummaryPage'
import { MonthlySummaryPage } from './pages/MonthlySummaryPage'
import { BrandsPage } from './pages/BrandsPage'
import { RatesPage } from './pages/RatesPage'
import { SettingsPage } from './pages/SettingsPage'
import { AuthPage } from './pages/AuthPage'
import { SetupRequiredPage } from './pages/SetupRequiredPage'
import { isSupabaseConfigured } from './lib/supabaseClient'

function AuthGate() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-950">
        <Loader2 size={28} className="animate-spin text-brand-600" />
      </div>
    )
  }

  if (!session) return <AuthPage />

  return (
    <AppProvider>
      <DataGate />
    </AppProvider>
  )
}

function DataGate() {
  const { loaded } = useApp()

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-950">
        <Loader2 size={28} className="animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <UIProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="historial" element={<HistoryPage />} />
            <Route path="resumen-semanal" element={<WeeklySummaryPage />} />
            <Route path="resumen-mensual" element={<MonthlySummaryPage />} />
            <Route path="marcas" element={<BrandsPage />} />
            <Route path="tarifas" element={<RatesPage />} />
            <Route path="configuracion" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
      <WorkFormModal />
      <QuickTextModal />
    </UIProvider>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupRequiredPage />

  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
      <ToastHost />
    </ToastProvider>
  )
}
