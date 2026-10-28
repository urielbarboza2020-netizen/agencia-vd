import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clipboard, Download, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import { formatMoney } from '../lib/calculations'
import { addDays, formatShortDate, getWeekLabel, getWeekRange, isDateInRange, compareISODates } from '../lib/dateUtils'
import { generateWeeklySummary } from '../lib/summary'
import { downloadTextFile } from '../lib/storage'

export function WeeklySummaryPage() {
  const { entries, settings } = useApp()
  const { push } = useToast()
  const [refDate, setRefDate] = useState(new Date())
  const [summaryText, setSummaryText] = useState<string | null>(null)

  const { start, end } = getWeekRange(refDate, settings.weekStart)

  const weekEntries = useMemo(
    () =>
      entries
        .filter((e) => isDateInRange(e.date, start, end))
        .sort((a, b) => compareISODates(a.date, b.date) || a.createdAt.localeCompare(b.createdAt)),
    [entries, start, end],
  )

  const total = weekEntries.reduce((sum, e) => sum + e.total, 0)

  const goPrevWeek = () => {
    setRefDate((d) => addDays(d, -7))
    setSummaryText(null)
  }
  const goNextWeek = () => {
    setRefDate((d) => addDays(d, 7))
    setSummaryText(null)
  }
  const goToday = () => {
    setRefDate(new Date())
    setSummaryText(null)
  }

  const handleGenerate = () => {
    const { text } = generateWeeklySummary(weekEntries, settings.summaryFormat)
    setSummaryText(text)
  }

  const handleCopy = async () => {
    if (!summaryText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      push('Resumen copiado al portapapeles')
    } catch {
      push('No se pudo copiar automáticamente. Seleccioná el texto manualmente.', 'error')
    }
  }

  const handleDownload = () => {
    if (!summaryText) return
    downloadTextFile(`resumen_semanal_${formatShortDate(getIsoFromDate(start)).replace('/', '-')}.txt`, summaryText)
    push('Resumen descargado como TXT')
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <button onClick={goPrevWeek} className="rounded-lg border border-ink-200 p-2 text-ink-500 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800">
              <ChevronLeft size={17} />
            </button>
            <div className="min-w-[160px] text-center">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">{getWeekLabel(start, end)}</p>
              <p className="text-xs text-ink-400">Semana ({settings.weekStart === 'monday' ? 'lunes a domingo' : 'domingo a sábado'})</p>
            </div>
            <button onClick={goNextWeek} className="rounded-lg border border-ink-200 p-2 text-ink-500 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800">
              <ChevronRight size={17} />
            </button>
          </div>
          <Button variant="secondary" onClick={goToday}>
            Semana actual
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Trabajos de la semana</h3>
          <p className="text-sm text-ink-500">
            {weekEntries.length} registro(s) · Total <strong className="text-brand-600">${formatMoney(total)}</strong>
          </p>
        </div>

        {weekEntries.length === 0 ? (
          <EmptyState title="No hay trabajos registrados en esta semana" description="Registrá tus trabajos a medida que los hacés y vas a poder generar el resumen el sábado." />
        ) : (
          <div className="space-y-1.5">
            {weekEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800/40">
                <div className="flex items-center gap-2.5">
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

      <div className="flex justify-center">
        <Button onClick={handleGenerate} disabled={weekEntries.length === 0} className="px-8 py-3 text-base">
          <Sparkles size={18} />
          GENERAR RESUMEN SEMANAL
        </Button>
      </div>

      {summaryText && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Resumen listo para copiar</h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCopy}>
                <Clipboard size={15} />
                Copiar resumen
              </Button>
              <Button variant="secondary" onClick={handleDownload}>
                <Download size={15} />
                Descargar TXT
              </Button>
            </div>
          </div>
          <pre className="scrollbar-thin overflow-x-auto whitespace-pre-wrap rounded-xl bg-ink-900 p-4 font-mono text-sm leading-relaxed text-ink-50 dark:bg-black">
            {summaryText}
          </pre>
        </Card>
      )}
    </div>
  )
}

function getIsoFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
