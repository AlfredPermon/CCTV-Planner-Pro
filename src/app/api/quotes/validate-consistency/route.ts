import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { COMPONENT_CODES, getCodeCategory } from '@/lib/costs/component_codes'

export const runtime = 'nodejs'
export const maxDuration = 60

function normalizeCodeSample(s: string) {
  const trimmed = s.trim()
  const upper = trimmed.toUpperCase()
  const snake = upper.replace(/\s+/g, '_')
  return snake
}

function isCanonicalCode(s: string) {
  return /^[A-Z0-9_]+$/.test(s) && s === s.trim()
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const strict = !!body?.strict

  const systems: Array<keyof typeof COMPONENT_CODES> = ['CCTV', 'ACCESO', 'VOCEO', 'INCENDIO']

  const report: any = {
    resumen: {
      sistemas: systems,
      fecha: new Date().toISOString(),
      strict,
    },
    porSistema: {} as Record<string, any>,
    anomalías: {
      codigosNoCanonicos: [] as Array<{ codigo: string; sugerido: string }>,
      codigosDuplicadosProveedorVigente: [] as Array<{ codigo: string; proveedor: string; vigentes: number }>,
      componentesSinCatalogo: [] as Array<{ codigo: string }>,
    },
  }

  // Validar categorías requeridas y precios vigentes (compatible con códigos numéricos)
  for (const sistema of systems) {
    const required = COMPONENT_CODES[sistema]
    const preciosVigentes: Array<{ canonical: string; precio: number; codigo_resuelto?: string }> = []
    const faltantesPrecio: string[] = []
    const faltantesCatalogo: Array<{ canonical: string; categoria: string }> = []

    for (const canonical of required) {
      const { categoria } = getCodeCategory(canonical)
      const catalogEntries = await db.cat_componentes.findMany({
        where: { sistema, categoria },
        select: { codigo_componente: true },
      })
      const codesInCategory = catalogEntries.map((c) => c.codigo_componente)
      if (codesInCategory.length === 0) {
        faltantesCatalogo.push({ canonical, categoria })
        faltantesPrecio.push(canonical)
        continue
      }
      const cot = await db.cotizaciones_historico.findMany({
        where: { codigo_componente: { in: codesInCategory }, vigente: true },
        orderBy: { fecha_actualizacion: 'desc' },
        take: 1,
      })
      if (cot.length === 0) {
        faltantesPrecio.push(canonical)
      } else {
        preciosVigentes.push({
          canonical,
          precio: Number(cot[0].costo_unitario),
          codigo_resuelto: cot[0].codigo_componente,
        })
      }
    }

    report.porSistema[sistema] = {
      requiredCodes: required,
      preciosVigentes,
      faltantesPrecio,
      faltantesCatalogo,
    }
  }

  // Anomalías de codificación y duplicados por proveedor
  const allQuotes = await db.cotizaciones_historico.findMany({
    where: { vigente: true },
    select: { codigo_componente: true, proveedor: true },
  })
  const seenByProvider = new Map<string, number>()
  for (const q of allQuotes) {
    const key = `${q.codigo_componente}::${q.proveedor}`
    seenByProvider.set(key, (seenByProvider.get(key) ?? 0) + 1)
    if (!isCanonicalCode(q.codigo_componente)) {
      report.anomalías.codigosNoCanonicos.push({
        codigo: q.codigo_componente,
        sugerido: normalizeCodeSample(q.codigo_componente),
      })
    }
  }
  for (const [key, count] of seenByProvider.entries()) {
    if (count > 1) {
      const [codigo, proveedor] = key.split('::')
      report.anomalías.codigosDuplicadosProveedorVigente.push({ codigo, proveedor, vigentes: count })
    }
  }

  // Componentes vigentes sin fila en catálogo (integridad blanda)
  const distinctCodes = Array.from(new Set(allQuotes.map((q) => q.codigo_componente)))
  const catMissing = await db.cat_componentes.findMany({
    where: { codigo_componente: { notIn: distinctCodes } },
    select: { codigo_componente: true },
  })
  for (const c of catMissing) {
    report.anomalías.componentesSinCatalogo.push({ codigo: c.codigo_componente })
  }

  return new Response(JSON.stringify(report), { status: 200 })
}
