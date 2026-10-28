import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AppSettings, WorkEntry } from '../types'
import { aggregateProduction, formatMoney } from './calculations'
import { formatEntryLine } from './summary'
import { MONTH_NAMES_ES } from './dateUtils'

const BRAND_BLUE: [number, number, number] = [26, 86, 255]
const INK_900: [number, number, number] = [13, 15, 28]
const INK_500: [number, number, number] = [79, 88, 117]
const INK_300: [number, number, number] = [163, 171, 188]
const INK_100: [number, number, number] = [231, 233, 238]

interface PdfOptions {
  title: string
  periodLabel: string
  entries: WorkEntry[]
  settings: AppSettings
  userEmail?: string
  fileName: string
}

export function generateWorkPdf({ title, periodLabel, entries, settings, userEmail, fileName }: PdfOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 16
  let y = 20

  // ---- Header ----
  doc.setFillColor(...BRAND_BLUE)
  doc.roundedRect(marginX, y - 6, 10, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('VD', marginX + 5, y, { align: 'center', baseline: 'middle' })

  doc.setTextColor(...INK_900)
  doc.setFontSize(15)
  doc.text('Agencia VD', marginX + 16, y - 1.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...INK_500)
  doc.text('Control de producción y pagos', marginX + 16, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...INK_900)
  doc.text(title, pageWidth - marginX, y - 1.5, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...INK_500)
  doc.text(periodLabel, pageWidth - marginX, y + 4, { align: 'right' })
  if (userEmail) {
    doc.text(userEmail, pageWidth - marginX, y + 9, { align: 'right' })
  }

  y += 16
  doc.setDrawColor(...INK_100)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 10

  const totals = aggregateProduction(entries)

  // ---- Line items, same order/format as the text summary ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK_900)
  doc.text('Trabajos', marginX, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  )

  if (sorted.length === 0) {
    doc.setTextColor(...INK_300)
    doc.text('No hay trabajos registrados en este período.', marginX, y)
    y += 8
  }

  for (const entry of sorted) {
    if (y > 275) {
      doc.addPage()
      y = 20
    }
    const line = formatEntryLine(entry, settings.summaryFormat)
    doc.setTextColor(...INK_900)
    doc.text(line, marginX, y)
    y += 6.5
  }

  y += 4
  if (y > 270) {
    doc.addPage()
    y = 20
  }
  doc.setDrawColor(...INK_100)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...BRAND_BLUE)
  doc.text(`TOTAL: $${formatMoney(totals.totalAmount, settings.summaryFormat.decimalSeparator)} ${settings.currency}`, marginX, y)
  y += 14

  // ---- Breakdown: by brand ----
  const byBrand = new Map<string, { amount: number; count: number }>()
  for (const e of entries) {
    const cur = byBrand.get(e.brandName) ?? { amount: 0, count: 0 }
    cur.amount += e.total
    cur.count += 1
    byBrand.set(e.brandName, cur)
  }
  const brandRows = Array.from(byBrand.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([brand, v]) => [brand, String(v.count), `$${formatMoney(v.amount, settings.summaryFormat.decimalSeparator)}`])

  if (brandRows.length > 0) {
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK_900)
    doc.text('Desglose por marca', marginX, y)
    y += 4
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Marca', 'Trabajos', 'Importe']],
      body: brandRows,
      theme: 'plain',
      styles: { fontSize: 9, textColor: INK_900, cellPadding: 2 },
      headStyles: { textColor: INK_500, fontStyle: 'bold', fillColor: [245, 246, 248] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ---- Breakdown: by type ----
  if (y > 250) {
    doc.addPage()
    y = 20
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK_900)
  doc.text('Desglose por tipo de trabajo', marginX, y)
  y += 4

  const byTypeAmount: Record<string, number> = { H: 0, G: 0, CBO: 0 }
  for (const e of entries) byTypeAmount[e.type] += e.total
  const typeRows = [
    ['H — Hook individual', String(totals.countH), `$${formatMoney(byTypeAmount.H, settings.summaryFormat.decimalSeparator)}`],
    ['G — Cuerpo + 3 hooks', String(totals.countG), `$${formatMoney(byTypeAmount.G, settings.summaryFormat.decimalSeparator)}`],
    ['CBO — 3 cuerpos + 9 hooks', String(totals.countCBO), `$${formatMoney(byTypeAmount.CBO, settings.summaryFormat.decimalSeparator)}`],
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Tipo', 'Cantidad', 'Importe']],
    body: typeRows,
    theme: 'plain',
    styles: { fontSize: 9, textColor: INK_900, cellPadding: 2 },
    headStyles: { textColor: INK_500, fontStyle: 'bold', fillColor: [245, 246, 248] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10

  // ---- Production stats ----
  if (y > 250) {
    doc.addPage()
    y = 20
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK_900)
  doc.text('Producción', marginX, y)
  y += 4

  const productionRows = [
    ['Cuerpos producidos', String(totals.totalBodies)],
    ['Hooks totales', String(totals.totalHooks)],
    ['  · Hooks individuales (H)', String(totals.hooksIndividual)],
    ['  · Hooks incluidos en paquetes (G/CBO)', String(totals.hooksIncluded)],
    ['Marcas trabajadas', String(totals.brandsWorked.size)],
    ['Tandas trabajadas', String(totals.batchesWorked.size)],
  ]
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    body: productionRows,
    theme: 'plain',
    styles: { fontSize: 9, textColor: INK_900, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 14

  // ---- Footer ----
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...INK_300)
    const generatedAt = new Date()
    const generatedLabel = `Generado el ${generatedAt.getDate()} de ${MONTH_NAMES_ES[generatedAt.getMonth()]} de ${generatedAt.getFullYear()} · Agencia VD`
    doc.text(generatedLabel, marginX, pageHeight - 10)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - marginX, pageHeight - 10, { align: 'right' })
  }

  doc.save(fileName)
}
