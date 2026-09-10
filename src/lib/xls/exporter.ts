import ExcelJS from 'exceljs'
import { Sistema } from '../costs/types'

type ExportData = {
  nombreProyecto: string
  totales: {
    materiales: number
    manoObra: number
    impuestos: number
    utilidad: number
    totalFinal: number
  }
  items: Array<{
    sistema: Sistema
    componente: string
    descripcion: string
    unidad_medida: string
    cantidad: number
    costo_unitario: number
    costo_total: number
  }>
}

export async function generateCostExcel(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CCTV Planner Pro'
  workbook.lastModifiedBy = 'CCTV Planner Pro'
  workbook.created = new Date()
  workbook.modified = new Date()

  // 1. Resumen Consolidado
  const summarySheet = workbook.addWorksheet('Resumen Ejecutivo')
  
  summarySheet.columns = [
    { header: 'Concepto', key: 'concepto', width: 30 },
    { header: 'Monto', key: 'monto', width: 20 },
    { header: '%', key: 'pct', width: 10 }
  ]

  summarySheet.addRows([
    ['Proyecto', data.nombreProyecto],
    ['Fecha', new Date().toLocaleDateString()],
    [],
    ['Materiales', data.totales.materiales],
    ['Mano de Obra', data.totales.manoObra],
    ['Utilidad', data.totales.utilidad],
    ['Impuestos', data.totales.impuestos],
    ['TOTAL GENERAL', data.totales.totalFinal]
  ])

  // Style Summary
  summarySheet.getRow(1).font = { bold: true, size: 14 }
  summarySheet.getRow(8).font = { bold: true, size: 12, color: { argb: 'FFFF0000' } }
  
  // 2. Hojas por Sistema
  const sistemas: Sistema[] = ['CCTV', 'ACCESO', 'VOCEO', 'INCENDIO']
  
  for (const sys of sistemas) {
    const items = data.items.filter(i => i.sistema === sys)
    if (items.length === 0) continue

    const sheet = workbook.addWorksheet(sys)
    
    sheet.columns = [
      { header: 'Item', key: 'item', width: 10 },
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Descripción', key: 'desc', width: 50 },
      { header: 'Unidad', key: 'unit', width: 10 },
      { header: 'Cantidad', key: 'qty', width: 12 },
      { header: 'P. Unitario', key: 'price', width: 15 },
      { header: 'Total', key: 'total', width: 15 }
    ]

    // Header Style
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } }

    let rowIdx = 2
    items.forEach((item, idx) => {
      const row = sheet.addRow({
        item: idx + 1,
        codigo: item.componente,
        desc: item.descripcion,
        unit: item.unidad_medida,
        qty: item.cantidad,
        price: item.costo_unitario,
        total: { formula: `E${rowIdx}*F${rowIdx}` } // Formula: Qty * Price
      })

      // Conditional Formatting: Negative Quantity (Error)
      if (item.cantidad < 0) {
        row.getCell('qty').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }
      }

      // Conditional Formatting: High Cost (> 10000)
      if (item.costo_total > 10000) {
        row.getCell('total').font = { color: { argb: 'FFFF0000' }, bold: true }
      }
      
      rowIdx++
    })

    // Total Row
    const totalRow = sheet.addRow(['', '', 'TOTAL SISTEMA', '', '', '', { formula: `SUM(G2:G${rowIdx-1})` }])
    totalRow.font = { bold: true }
    totalRow.getCell(7).numFmt = '"$"#,##0.00'

    // Format numbers
    sheet.getColumn('price').numFmt = '"$"#,##0.00'
    sheet.getColumn('total').numFmt = '"$"#,##0.00'
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer as Buffer
}
