import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
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

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
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
          <ToastHost />
        </UIProvider>
      </AppProvider>
    </ToastProvider>
  )
}
