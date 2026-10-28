import { useRef, useState } from 'react'
import { Download, Upload, AlertTriangle, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button, Card, ConfirmDialog, Field, inputClass } from '../components/ui'
import { buildBackup, downloadTextFile, type BackupPayload } from '../lib/storage'
import { todayISO } from '../lib/dateUtils'
import { wipeUserData } from '../lib/db'

export function SettingsPage() {
  const { entries, brands, rates, levels, settings, updateSettings, restoreFromBackup } = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingRestore, setPendingRestore] = useState<BackupPayload | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleExportBackup = () => {
    const backup = buildBackup({ entries, brands, rates, levels, settings })
    downloadTextFile(`backup_agencia_vd_${todayISO()}.json`, JSON.stringify(backup, null, 2), 'application/json')
    push('Copia de seguridad descargada')
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result as string) as BackupPayload
        setPendingRestore(payload)
      } catch {
        push('El archivo no es un backup válido', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const confirmRestore = async () => {
    if (!pendingRestore) return
    const payload = pendingRestore
    setPendingRestore(null)
    setBusy(true)
    try {
      await restoreFromBackup(payload)
      push('Backup restaurado correctamente')
    } catch (err) {
      push(`No se pudo restaurar el backup: ${(err as Error).message}`, 'error')
    }
    setBusy(false)
  }

  const handleReset = async () => {
    if (!user) return
    setBusy(true)
    try {
      await wipeUserData(user.id)
      window.location.reload()
    } catch (err) {
      push(`No se pudo borrar: ${(err as Error).message}`, 'error')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-ink-900 dark:text-white">Preferencias generales</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Moneda predeterminada">
            <input
              className={inputClass}
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value.toUpperCase() })}
              maxLength={4}
            />
          </Field>
          <Field label="Formato de fecha">
            <select
              className={inputClass}
              value={settings.dateFormat}
              onChange={(e) => updateSettings({ dateFormat: e.target.value as typeof settings.dateFormat })}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </Field>
          <Field label="Primer día de la semana">
            <select
              className={inputClass}
              value={settings.weekStart}
              onChange={(e) => updateSettings({ weekStart: e.target.value as typeof settings.weekStart })}
            >
              <option value="monday">Lunes</option>
              <option value="sunday">Domingo</option>
            </select>
          </Field>
          <Field label="Tema">
            <select
              className={inputClass}
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as typeof settings.theme })}
            >
              <option value="system">Automático (sistema)</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-sm font-semibold text-ink-900 dark:text-white">Formato del resumen semanal</h3>
        <p className="mb-4 text-xs text-ink-400">Personalizá cómo se genera el texto del resumen si lo necesitás.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Encabezado">
            <input
              className={inputClass}
              value={settings.summaryFormat.header}
              onChange={(e) => updateSettings({ summaryFormat: { ...settings.summaryFormat, header: e.target.value } })}
            />
          </Field>
          <Field label="Prefijo de importe">
            <input
              className={inputClass}
              value={settings.summaryFormat.currencyPrefix}
              onChange={(e) => updateSettings({ summaryFormat: { ...settings.summaryFormat, currencyPrefix: e.target.value } })}
            />
          </Field>
          <Field label="Sufijo del total">
            <input
              className={inputClass}
              value={settings.summaryFormat.totalSuffix}
              onChange={(e) => updateSettings({ summaryFormat: { ...settings.summaryFormat, totalSuffix: e.target.value } })}
            />
          </Field>
          <Field label="Separador decimal">
            <select
              className={inputClass}
              value={settings.summaryFormat.decimalSeparator}
              onChange={(e) =>
                updateSettings({ summaryFormat: { ...settings.summaryFormat, decimalSeparator: e.target.value as ',' | '.' } })
              }
            >
              <option value=",">Coma (7,3)</option>
              <option value=".">Punto (7.3)</option>
            </select>
          </Field>
          <Field label="Separador de fecha">
            <select
              className={inputClass}
              value={settings.summaryFormat.dateSeparator}
              onChange={(e) =>
                updateSettings({ summaryFormat: { ...settings.summaryFormat, dateSeparator: e.target.value as '/' | '-' } })
              }
            >
              <option value="/">27/10</option>
              <option value="-">27-10</option>
            </select>
          </Field>
          <Field label="CBO sin cantidad cuando es 1">
            <select
              className={inputClass}
              value={settings.summaryFormat.hideQuantityForCboWhenOne ? 'yes' : 'no'}
              onChange={(e) =>
                updateSettings({ summaryFormat: { ...settings.summaryFormat, hideQuantityForCboWhenOne: e.target.value === 'yes' } })
              }
            >
              <option value="yes">Sí (CBO)</option>
              <option value="no">No (1CBO)</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-sm font-semibold text-ink-900 dark:text-white">Exportación y copias de seguridad</h3>
        <p className="mb-4 text-xs text-ink-400">
          Tus datos viven en tu cuenta (en la nube) y se sincronizan automáticamente entre tu computadora y tu
          celular. Igual podés descargar un backup periódicamente como respaldo extra.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportBackup}>
            <Download size={15} />
            Descargar backup completo (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} />
            Restaurar backup
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileSelected} />
        </div>
      </Card>

      <Card className="border-red-200 dark:border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Zona de riesgo</h3>
            <p className="mt-1 text-xs text-ink-400">
              Borra todos tus trabajos, marcas y niveles guardados en la nube. Hacé un backup antes si no estás
              seguro. Tu cuenta y tu acceso no se eliminan.
            </p>
            <Button variant="danger" className="mt-3" onClick={() => setConfirmReset(true)} disabled={busy}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              Borrar todos los datos
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!pendingRestore}
        title="Restaurar backup"
        description="Esto reemplazará todos los datos actuales (trabajos, marcas, tarifas y configuración) por los del archivo seleccionado."
        confirmLabel="Restaurar"
        danger
        onCancel={() => setPendingRestore(null)}
        onConfirm={confirmRestore}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Borrar todos los datos"
        description="Esta acción eliminará permanentemente todos los trabajos, marcas y configuración guardados en este dispositivo. No se puede deshacer."
        confirmLabel="Sí, borrar todo"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={handleReset}
      />
    </div>
  )
}
