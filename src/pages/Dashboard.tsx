import { useMemo } from 'react'
import { ArrowRight, Clapperboard, FileText, Layers, Sparkles, TrendingUp, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { Badge, Button, Card, EmptyState, StatCard } from '../components/ui'
import { aggregateProduction, formatMoney, matchProductionLevel } from '../lib/calculations'
import { getMonthKey, getWeekRange, isDateInRange, todayISO, formatShortDate } from '../lib/dateUtils'
import { Link } from 'react-router-dom'

export function Dashboard() {
  const { entries, levels, settings } = useApp()
  const { openWorkForm, openQuickText } = useUI()

  const today = todayISO()
  const { start: weekStart, end: weekEnd } = getWeekRange(new Date(), settings.weekStart)
  const monthKey = getMonthKey(today)

  const todayEntries = useMemo(() => entries.filter((e) => e.date === today), [entries, today])
  const weekEntries = useMemo(
    () => entries.filter((e) => isDateInRange(e.date, weekStart, weekEnd)),
    [entries, weekStart, weekEnd],
  )
  const monthEntries = useMemo(() => entries.filter((e) => getMonthKey(e.date) === monthKey), [entries, monthKey])

  const todayTotals = useMemo(() => aggregateProduction(todayEntries), [todayEntries])
  const weekTotals = useMemo(() => aggregateProduction(weekEntries), [weekEntries])
  const monthTotals = useMemo(() => aggregateProduction(monthEntries), [monthEntries])

  const packagedBodiesToday = todayTotals.bodiesFromG + todayTotals.bodiesFromCBO
  const packagedHooksToday = todayTotals.hooksFromG + todayTotals.hooksFromCBO
  const levelMatch = matchProductionLevel(packagedBodiesToday, packagedHooksToday, levels)

  const lastEntries = [...entries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Hola 👋</h2>
          <p className="text-sm text-ink-400">Así va tu producción hoy, {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openQuickText}>
            <Sparkles size={16} />
            Texto rápido
          </Button>
          <Button onClick={() => openWorkForm()}>
            <Zap size={16} />
            Registrar trabajo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Generado hoy" value={`$${formatMoney(todayTotals.totalAmount)}`} accent sub={`${todayEntries.length} registro(s)`} />
        <StatCard label="Generado esta semana" value={`$${formatMoney(weekTotals.totalAmount)}`} sub={`${weekEntries.length} registro(s)`} />
        <StatCard label="Generado este mes" value={`$${formatMoney(monthTotals.totalAmount)}`} sub={`${monthEntries.length} registro(s)`} />
        <StatCard
          label="Nivel de hoy"
          value={levelMatch.currentLevel?.name ?? 'Sin nivel'}
          sub={
            levelMatch.nextLevel
              ? `Faltan ${levelMatch.bodiesToNext}c / ${levelMatch.hooksToNext}h para ${levelMatch.nextLevel.name}`
              : 'Nivel máximo alcanzado'
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">H hoy</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900 dark:text-white">{todayTotals.countH}</p>
          <p className="mt-1 text-xs text-ink-400">Hooks individuales</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">G hoy</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900 dark:text-white">{todayTotals.countG}</p>
          <p className="mt-1 text-xs text-ink-400">Cuerpos + 3 hooks c/u</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">CBO hoy</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900 dark:text-white">{todayTotals.countCBO}</p>
          <p className="mt-1 text-xs text-ink-400">3 cuerpos + 9 hooks c/u</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
            <Clapperboard size={16} className="text-brand-600" />
            Últimos trabajos registrados
          </h3>
          <Link to="/historial" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            Ver historial completo <ArrowRight size={13} />
          </Link>
        </div>

        {lastEntries.length === 0 ? (
          <EmptyState
            icon={<Layers size={28} />}
            title="Todavía no registraste trabajos"
            description="Empezá registrando tu primer trabajo del día: marca, tipo (H, G o CBO), cantidad y tanda."
            action={
              <Button onClick={() => openWorkForm()}>
                <Zap size={16} />
                Registrar el primero
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {lastEntries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 text-sm dark:border-ink-800"
              >
                <div className="flex items-center gap-3">
                  <Badge color="brand">{e.quantity}{e.type}</Badge>
                  <span className="font-medium text-ink-800 dark:text-ink-100">{e.brandName}</span>
                  {e.batch && <span className="text-xs text-ink-400">Tanda {e.batch}</span>}
                </div>
                <div className="flex items-center gap-3 text-ink-400">
                  <span>{formatShortDate(e.date)}</span>
                  <span className="font-semibold text-ink-800 dark:text-ink-100">${formatMoney(e.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/resumen-semanal">
          <Card className="group flex h-full cursor-pointer items-center justify-between transition hover:border-brand-300">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
                <TrendingUp size={16} className="text-brand-600" />
                Generar resumen semanal
              </p>
              <p className="mt-1 text-xs text-ink-400">Listo para copiar y pegar, con el formato de siempre.</p>
            </div>
            <ArrowRight size={18} className="text-ink-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
          </Card>
        </Link>
        <Link to="/resumen-mensual">
          <Card className="group flex h-full cursor-pointer items-center justify-between transition hover:border-brand-300">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
                <FileText size={16} className="text-brand-600" />
                Ver resumen mensual
              </p>
              <p className="mt-1 text-xs text-ink-400">Producción y ganancias totales del mes.</p>
            </div>
            <ArrowRight size={18} className="text-ink-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
          </Card>
        </Link>
      </div>
    </div>
  )
}
