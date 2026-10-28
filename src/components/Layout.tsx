import { useState } from 'react'
import { Menu, Moon, Sun, X, PlusCircle } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, SidebarContent } from './Sidebar'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/historial': 'Historial de trabajos',
  '/resumen-semanal': 'Resumen semanal',
  '/resumen-mensual': 'Resumen mensual',
  '/marcas': 'Marcas',
  '/tarifas': 'Tarifas y niveles',
  '/configuracion': 'Configuración',
}

export function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { settings, updateSettings } = useApp()
  const { openWorkForm } = useUI()
  const location = useLocation()
  const title = TITLES[location.pathname] ?? 'Agencia VD'

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  const toggleTheme = () => updateSettings({ theme: isDark ? 'light' : 'dark' })

  return (
    <div className="flex min-h-screen bg-ink-50 text-ink-700 dark:bg-ink-950 dark:text-ink-200">
      <Sidebar />

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-card dark:bg-ink-900">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-5 rounded-md p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur md:px-8 dark:border-ink-800 dark:bg-ink-900/90">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 md:hidden dark:hover:bg-ink-800"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink-900 md:text-lg dark:text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openWorkForm()}
              className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 sm:flex"
            >
              <PlusCircle size={16} />
              Registrar
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-ink-200 p-2 text-ink-500 transition hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
              title="Cambiar tema"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl animate-fade-in pb-20 md:pb-0">
            <Outlet />
          </div>
        </main>

        <button
          onClick={() => openWorkForm()}
          className="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 active:scale-95 sm:hidden"
          aria-label="Registrar trabajo"
        >
          <PlusCircle size={24} />
        </button>
      </div>
    </div>
  )
}
