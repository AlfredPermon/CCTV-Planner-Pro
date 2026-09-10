import { z } from 'zod'
import * as XLSX from 'xlsx'
import { COMPONENT_CODES } from '@/lib/costs/component_codes'

// Crear conjunto de códigos válidos para búsqueda rápida
const VALID_CODES = new Set(Object.values(COMPONENT_CODES).flat())
function normalizeCategory(sys: string, desc: string, catRaw?: string): string {
  const s = (sys || '').toUpperCase()
  const d = (desc || '').toUpperCase()
  const c = (catRaw || '').toUpperCase()
  const isGeneric = c === '' || c === 'MATERIALES' || c === 'GENERAL'
  if (!isGeneric) return c
  // Inferir por descripción
  if (s === 'CCTV') {
    if (d.includes('CABLE') || d.includes('UTP') || d.includes('FIBRA') || d.includes('BOBINA')) return 'CABLE'
    if (d.includes('CONECTOR') || d.includes('RJ45') || d.includes('JACK') || d.includes('PLUG')) return 'CONECTOR'
    if (d.includes('FUENTE') || d.includes('POWER') || d.includes('PDU') || d.includes('UPS')) return 'FUENTE'
    if (d.includes('CANAL') || d.includes('DUCT') || d.includes('TUBER')) return 'CANAL'
  } else if (s === 'ACCESO') {
    if (d.includes('CABLE')) return 'CABLE'
    if (d.includes('CONTROLADORA') || (d.includes('PANEL') && !d.includes('FACP'))) return 'CONTROLADORA'
    if (d.includes('CERRADURA') || d.includes('ELECTROIMAN') || d.includes('CHAPA') || d.includes('MAGNETICA') || d.includes('MAG') || d.includes('CONTRA')) return 'CERRADURA'
    if (d.includes('FUENTE') || d.includes('UPS') || d.includes('BATER')) return 'FUENTE'
  } else if (s === 'VOCEO') {
    if (d.includes('CABLE')) return 'CABLE'
    if (d.includes('AMPLIFICADOR')) return 'AMPLIFICADOR'
    if (d.includes('ALTAVOZ') || d.includes('BOCINA') || d.includes('SPEAKER')) return 'ALTAVOZ'
    if (d.includes('FUENTE') || d.includes('UPS') || d.includes('BATER')) return 'FUENTE'
  } else if (s === 'INCENDIO') {
    if (d.includes('CABLE') || d.includes('FPL')) return 'CABLE'
    if (d.includes('PANEL') || d.includes('FACP')) return 'PANEL'
    if (d.includes('MODULO')) return 'MODULO'
    if (d.includes('SIRENA') || d.includes('ESTROBO')) return 'SIRENA'
  }
  return 'GENERAL'
}

export const QuoteRowSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  unidad: z.string().min(1),
  cantidad: z.number().optional(), // Opcional, informativo
  precio_unitario: z.number().nonnegative(), // Mapea a costo_unitario
  proveedor: z.string().default('General'),
  fecha_vigencia: z.date().default(() => new Date()),
  sistema: z.string().min(1),
  categoria: z.string().optional().default('General'), // Calculada o provista
})

export type QuoteRow = z.infer<typeof QuoteRowSchema>

export async function parseExcel(buffer: ArrayBuffer): Promise<QuoteRow[]> {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const allRows: QuoteRow[] = []
  const seen = new Set<string>()

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) // Array of arrays

    if (jsonData.length < 2) continue // Empty or just header

    // Assume header row is 0. Detect column indices by name
    const headers = (jsonData[0] as any[]).map(h => String(h).toLowerCase().trim())
    const map: Record<string, number> = {}
    headers.forEach((h, i) => map[h] = i)

    // Check required columns (nuevas columnas: ID, Código, Concepto, Unidad, Cantidad, Precio Unitario, SISTEMA)
    const required = ['código', 'concepto', 'unidad', 'precio', 'sistema']
    const hasRequired = required.every(r => Object.keys(map).some(k => k.includes(r) || k.includes('codigo') || k.includes('descrip')))
    
    const rows = jsonData.slice(1)
    for (const r of rows) {
      const row = r as any[]
      // Helper to safely get cell by header name
      const getVal = (key: string, key2?: string, key3?: string) => {
        let idx = headers.findIndex(h => h.includes(key))
        if (idx < 0 && key2) idx = headers.findIndex(h => h.includes(key2))
        if (idx < 0 && key3) idx = headers.findIndex(h => h.includes(key3))
        return idx >= 0 ? row[idx] : undefined
      }

      let idRaw = getVal('id')
      let codigoRaw = getVal('código', 'codigo')
      const descripcion = getVal('concepto', 'descripcion', 'descripción')
      const unidad = getVal('unidad')
      const cantidad = getVal('cantidad')
      const precio = getVal('precio unitario', 'precio', 'costo')
      const sistemaRaw = getVal('sistema')
      const categoria = getVal('categoría', 'categoria')

      if (!codigoRaw || !descripcion || !precio) continue // Skip invalid rows

      // Estandarización de Código: Trim, Uppercase, Espacios a Guiones Bajos
      const codigoNormalized = String(codigoRaw).trim().toUpperCase().replace(/\s+/g, '_')

      // Check duplicates in this batch
      if (seen.has(codigoNormalized)) continue
      seen.add(codigoNormalized)

      // Normalize Sistema
      let sys = String(sistemaRaw).toUpperCase()
      
      // Prioridad: Inferencia por Prefijo de Código Estandarizado
      if (codigoNormalized.startsWith('CCTV_')) sys = 'CCTV'
      else if (codigoNormalized.startsWith('ACC_')) sys = 'ACCESO'
      else if (codigoNormalized.startsWith('VOC_')) sys = 'VOCEO'
      else if (codigoNormalized.startsWith('FIR_')) sys = 'INCENDIO'
      // Fallback: Inferencia por nombre de sistema
      else if (sys.includes('CCTV')) sys = 'CCTV'
      else if (sys.includes('ACCES')) sys = 'ACCESO'
      else if (sys.includes('VOCEO')) sys = 'VOCEO'
      else if (sys.includes('INCENDIO') || sys.includes('FIRE')) sys = 'INCENDIO'
      else sys = 'CCTV' // Default

      const q: QuoteRow = {
        id: String(idRaw || ''),
        codigo: codigoNormalized,
        descripcion: String(descripcion || 'Sin descripción'),
        unidad: String(unidad || 'pza.'),
        cantidad: Number(cantidad) || 1,
        precio_unitario: Number(precio) || 0,
        proveedor: 'Plantilla_Admin',
        fecha_vigencia: new Date(),
        sistema: sys,
        categoria: normalizeCategory(sys, String(descripcion || ''), String(categoria || ''))
      }

      // Validate with Zod
      const res = QuoteRowSchema.safeParse(q)
      if (res.success) {
        allRows.push(res.data)
      }
    }
  }

  return allRows
}
