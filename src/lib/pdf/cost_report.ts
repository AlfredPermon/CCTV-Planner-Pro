import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas-pro'
import { PdfOptions } from './export'

export async function generateCostReportPdf(
  data: any,
  options: PdfOptions
) {
  const doc = new jsPDF({
    orientation: options.orientation,
    format: options.format,
    unit: 'pt',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40

  // 1. Portada
  doc.setFillColor(41, 128, 185) // Blue header
  doc.rect(0, 0, pageWidth, 150, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(options.projectTitle || 'Reporte de Costos', margin, 80)
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(options.companyName || 'CCTV Planner Pro', margin, 110)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, 200)
  doc.text(`Versión: ${options.version || '1.0'}`, margin, 220)
  doc.text(`Autor: ${options.author || 'Usuario'}`, margin, 240)

  // Resumen Ejecutivo
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Ejecutivo', margin, 300)

  const summaryY = 330
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Materiales: $${data.totales.materiales.toLocaleString()}`, margin, summaryY)
  doc.text(`Mano de Obra: $${data.totales.manoObra.toLocaleString()}`, margin, summaryY + 20)
  doc.text(`Impuestos: $${data.totales.impuestos.toLocaleString()}`, margin, summaryY + 40)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL GENERAL: $${data.totales.totalFinal.toLocaleString()}`, margin, summaryY + 70)

  // Gráfico (Placeholder - Recharts to Image is complex on server/client hybrid without dedicated canvas ref)
  // We will assume the chart is rendered in UI and we can capture it, but here we generate a simple bar chart manually
  
  // Simple Bar Chart Drawing
  const chartY = 450
  const maxVal = data.totales.totalFinal
  const barHeight = 20
  const chartWidth = 300
  
  const drawBar = (label: string, value: number, y: number, color: [number, number, number]) => {
    const w = (value / maxVal) * chartWidth
    doc.setFillColor(...color)
    doc.rect(margin + 100, y, w, barHeight, 'F')
    doc.setTextColor(0,0,0)
    doc.setFont('helvetica', 'normal')
    doc.text(label, margin, y + 14)
    doc.text(`$${value.toLocaleString()}`, margin + 100 + w + 10, y + 14)
  }

  drawBar('Materiales', data.totales.materiales, chartY, [52, 152, 219])
  drawBar('Mano de Obra', data.totales.manoObra, chartY + 30, [46, 204, 113])
  drawBar('Impuestos', data.totales.impuestos, chartY + 60, [231, 76, 60])
  drawBar('Utilidad', data.totales.utilidad, chartY + 90, [241, 196, 15])

  // Nueva Página: Detalle
  doc.addPage()
  let y = margin
  
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Desglose Detallado', margin, y)
  y += 30

  // Table Header
  doc.setFillColor(240, 240, 240)
  doc.rect(margin, y, pageWidth - 2*margin, 20, 'F')
  doc.setFontSize(10)
  doc.text('Sistema', margin + 5, y + 14)
  doc.text('Componente', margin + 60, y + 14)
  doc.text('Cant.', margin + 250, y + 14)
  doc.text('Unitario', margin + 300, y + 14)
  doc.text('Total', margin + 380, y + 14)
  y += 20

  data.resultados.forEach((sys: any) => {
    sys.items.forEach((item: any) => {
      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      
      doc.setFont('helvetica', 'normal')
      doc.text(sys.sistema.substring(0, 10), margin + 5, y + 14)
      doc.text(item.descripcion.substring(0, 35), margin + 60, y + 14)
      doc.text(item.cantidad.toString(), margin + 250, y + 14)
      doc.text(`$${item.costo_unitario.toFixed(2)}`, margin + 300, y + 14)
      doc.text(`$${item.costo_total.toFixed(2)}`, margin + 380, y + 14)
      
      y += 20
    })
    // Subtotal separator
    y += 5
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
  })

  // Save
  if (options.aiAnalysis) {
    doc.addPage()
    y = margin
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Análisis de Inteligencia Artificial', margin, y)
    y += 30
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    
    const summaryLines = doc.splitTextToSize(`Resumen: ${options.aiAnalysis.summary || 'Sin resumen'}`, pageWidth - 2 * margin)
    doc.text(summaryLines, margin, y)
    y += summaryLines.length * 15 + 20

    // Métricas
    doc.setFont('helvetica', 'bold')
    doc.text('Métricas de Optimización:', margin, y)
    y += 20
    doc.setFont('helvetica', 'normal')
    doc.text(`- Mejora estimada: ${options.aiAnalysis.optimization_metrics?.improvement_pct ?? 0}%`, margin + 10, y)
    y += 15
    doc.text(`- Componentes adicionales: ${options.aiAnalysis.optimization_metrics?.added_components_count ?? 0}`, margin + 10, y)
    y += 15
    doc.text(`- Valor agregado: ${options.aiAnalysis.optimization_metrics?.value_add_estimate ?? 'N/A'}`, margin + 10, y)
    y += 30

    // Recomendaciones Adicionales
    if (options.aiAnalysis.additional_recommendations?.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('Recomendaciones de Infraestructura:', margin, y)
      y += 20
      
      options.aiAnalysis.additional_recommendations.forEach((rec: any) => {
        if (y > pageHeight - margin) {
          doc.addPage()
          y = margin
        }
        doc.setFont('helvetica', 'bold')
        doc.text(`• ${rec.descripcion} (Cant: ${rec.cantidad})`, margin + 10, y)
        y += 15
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10)
        doc.text(`  Razón: ${rec.razon}`, margin + 20, y)
        y += 20
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(12)
      })
    }
  }

  doc.save(`Reporte_Costos_${options.projectTitle || 'Proyecto'}.pdf`)
}
