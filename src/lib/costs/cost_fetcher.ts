import { db } from '@/lib/db'

export async function fetchCostoVigente(codigoComponente: string): Promise<number> {
  const quote = await db.cotizaciones_historico.findFirst({
    where: { codigo_componente: codigoComponente, vigente: true },
    orderBy: { fecha_actualizacion: 'desc' },
  })
  if (!quote) {
    console.warn(`[CostFetcher] No se encontró precio vigente para: ${codigoComponente}`)
    return 0
  }
  return Number(quote.costo_unitario)
}
