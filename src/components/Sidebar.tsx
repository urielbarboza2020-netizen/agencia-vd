import {
  LayoutDashboard,
  PlusCircle,
  History,
  CalendarRange,
  CalendarDays,
  Tags,
  DollarSign,
  Settings as SettingsIcon,
  Clapperboard,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useUI } from '../context/UIContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/resumen-semanal', label: 'Resumen semanal', icon: CalendarRange },
  { to: '/resumen-mensual', label: 'Resumen mensual', icon: CalendarDays },
  { to: '/marcas', label: 'Marcas', icon: Tags },
  { to: '/tarifas', label: 'Tarifas', icon: DollarSign },
  { to: '/configuracion', label: 'Configuración', icon: SettingsIcon },
]

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { openWorkForm } = useUI()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-card">
          <Clapperboard size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900 dark:text-white">Agencia VD</p>
          <p className="text-xs text-ink-400">Control de producción</p>
        </div>
      </div>

      <div className="px-4 pb-2">
        <button
          onClick={() => {
            openWorkForm()
            onNavigate?.()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-card transition hover:bg-brand-700 active:scale-[0.98]"
        >
          <PlusCircle size={17} />
          Registrar trabajo
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 scrollbar-thin">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                  : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800/60 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <item.icon size={17} className={isActive ? 'text-brand-600 dark:text-brand-300' : ''} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-100 px-5 py-4 text-xs text-ink-400 dark:border-ink-800">
        Tus datos se guardan en este dispositivo.
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-white md:flex dark:border-ink-800 dark:bg-ink-900">
      <SidebarContent />
    </aside>
  )
}
