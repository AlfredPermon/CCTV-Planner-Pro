import { NextRequest } from 'next/server'
import { z } from 'zod'
import { calcularSubsistemas, calcularTotales, detectarCostosFaltantes } from '@/lib/costs/engine'
import { db } from '@/lib/db'
import { validarParametros, mapaValidaciones } from '@/lib/costs/validation'
import { logAudit } from '@/lib/audit/logger'
import { ensureModelAvailable, chat, ChatMessage } from '@/lib/ollama/client'
import { getRequiredCodes, COMPONENT_CODES, getCodeCategory } from '@/lib/costs/component_codes'
import { buildCostAgentPrompt } from '@/lib/ollama/prompts'

const sistemaSchema = z.object({
  conteo: z.object({ dispositivos: z.number().int().nonnegative() }),
  params: z.object({
    distanciaPromedioCableadoMts: z.number().positive().optional(),
    puntosConexionPorDispositivo: z.number().int().positive().optional(),
    requisitosPotencia: z.object({ fuentePorNDispositivos: z.number().int().positive().optional() }).optional(),
    factorRedundancia: z.number().positive().optional(),
  }),
})

const bodySchema = z.object({
  nombreProyecto: z.string(),
  usuario: z.string(),
  inflacionPct: z.number().nonnegative(),
  impuestosPct: z.number().nonnegative(),
  utilidadPct: z.number().nonnegative(),
  useAI: z.boolean().optional(),
  cctv: sistemaSchema.optional(),
  acceso: sistemaSchema.optional(),
  voceo: sistemaSchema.optional(),
  incendio: sistemaSchema.optional(),
})

export async function POST(req: NextRequest) {
  const json = await req.json()
  const parse = bodySchema.safeParse(json)
  if (!parse.success) {
    return new Response(JSON.stringify({ error: 'Formato inválido', details: parse.error.flatten() }), { status: 400 })
  }

  const input = parse.data
  await logAudit({
    module: 'COSTS',
    action: 'CALCULATE_START',
    user: input.usuario,
    status: 'SUCCESS',
    payload: { input },
  })
  console.info('[COSTS] CALCULATE_START', {
    nombreProyecto: input.nombreProyecto,
    usuario: input.usuario,
    sistemas: {
      cctv: !!input.cctv,
      acceso: !!input.acceso,
      voceo: !!input.voceo,
      incendio: !!input.incendio,
    },
    useAI: !!input.useAI,
  })

  let entrada = {
    cctv: input.cctv as any,
    acceso: input.acceso as any,
    voceo: input.voceo as any,
    incendio: input.incendio as any,
  }

  const aiInfo: { requested: boolean; used: boolean; reason?: string } = {
    requested: !!input.useAI,
    used: false,
  }

  if (input.useAI) {
    const ai = await ensureModelAvailable()
    if (ai.ok && ai.available) {
      const systemPrompt = await buildCostAgentPrompt()
      const AiResponseSchema = z
        .object({
          cctv: sistemaSchema.optional(),
          acceso: sistemaSchema.optional(),
          voceo: sistemaSchema.optional(),
          incendio: sistemaSchema.optional(),
          sugerencias_bom: z
            .array(
              z.object({
                codigo: z.string(),
                cantidad_estimada: z.number(),
                razonamiento: z.string().optional(),
              })
            )
            .optional(),
        })
        .strict()
      const msg: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            solicitud: 'Optimiza parámetros técnicos y, si corresponde, sugiere cantidades por código sin precios.',
            cctv: entrada.cctv,
            acceso: entrada.acceso,
            voceo: entrada.voceo,
            incendio: entrada.incendio,
          }),
        },
      ]
      const res = await chat(msg)
      if (res.ok && res.text) {
        try {
          const parsed = AiResponseSchema.safeParse(JSON.parse(res.text))
          if (parsed.success) {
            const j = parsed.data as any
            entrada = {
              cctv: j.cctv ?? entrada.cctv,
              acceso: j.acceso ?? entrada.acceso,
              voceo: j.voceo ?? entrada.voceo,
              incendio: j.incendio ?? entrada.incendio,
            }
            aiInfo.used = true
          } else {
            aiInfo.reason = 'Respuesta IA inválida'
          }
        } catch {
          aiInfo.reason = 'Respuesta IA inválida'
        }
      } else {
        aiInfo.reason = 'Respuesta IA inválida'
      }
    } else {
      aiInfo.reason = 'Ollama no disponible'
    }
  }

  const requiredCodes = getRequiredCodes(entrada)
  console.info('[COSTS] Required codes (canonical)', requiredCodes)
  // Resolver precios por categoría/sistema
  // En lugar de buscar por códigos estandarizados (que fallan con códigos reales del cliente), 
  // buscamos TODOS los componentes vigentes de los sistemas solicitados.
  const sistemasSolicitados = Object.keys(entrada).filter(k => entrada[k as keyof typeof entrada]).map(s => s.toUpperCase())
  
  const priceMap = new Map<string, number>()
  const itemsMap = new Map<string, any[]>()
  const missingCodes: string[] = []

  for (const sis of sistemasSolicitados) {
    const catalog = await db.cat_componentes.findMany({
      where: { sistema: sis },
      include: {
        cotizaciones: {
          where: { vigente: true },
          orderBy: { fecha_actualizacion: 'desc' },
          take: 1
        }
      }
    })
    
    const validItems = catalog.filter(c => c.cotizaciones.length > 0).map(c => ({
      codigo: c.codigo_componente,
      descripcion: c.descripcion,
      unidad_medida: c.unidad_medida,
      categoria: c.categoria,
      cantidad: 1, // En el modelo de DB actual cat_componentes no tiene cantidad, 
                   // en el futuro se puede mapear desde una tabla de plantillas
      costo_unitario: Number(c.cotizaciones[0].costo_unitario)
    }))
    
    itemsMap.set(sis, validItems)
  }

  // CostFetcher dummy para mantener compatibilidad si es necesario, pero usaremos lógica dinámica en engine.ts o aquí.
  const costFetcher = async (codigoComponente: string) => {
    return 0 // Reemplazado por lógica dinámica abajo
  }

  // Lógica dinámica de cálculo: si un sistema tiene N dispositivos, multiplicamos la cantidad de cada item en el catálogo
  // por los dispositivos, o simplemente usamos la cantidad 1 (o la de base) * dispositivos o factores.
  const resultados: any[] = []
  
  for (const sysKey of Object.keys(entrada)) {
    const sysData = entrada[sysKey as keyof typeof entrada]
    if (!sysData) continue
    
    const sis = sysKey.toUpperCase()
    const n = sysData.conteo.dispositivos || 1
    const dist = sysData.params.distanciaPromedioCableadoMts || 50
    const itemsDB = itemsMap.get(sis) || []
    
    const itemsCalc = itemsDB.map((item, idx) => {
      // Usar la cantidad base definida en la plantilla (o 1 si no está presente)
      const baseQty = item.cantidad ?? 1
      
      // Regla paramétrica simple: si es cable/tubería multiplicamos por distancia * n, si es equipo por n * baseQty
      let qty = n * baseQty
      const isCable = item.descripcion.toUpperCase().includes('CABLE') || item.categoria.toUpperCase() === 'CABLE'
      if (isCable) {
        qty = n * dist * baseQty
      }
      
      return {
        item: idx + 1,
        componente: item.codigo,
        descripcion: item.descripcion,
        unidad_medida: item.unidad_medida,
        cantidad: qty,
        costo_unitario: item.costo_unitario,
        costo_total: Number((qty * item.costo_unitario).toFixed(2))
      }
    })

    const subtotal = itemsCalc.reduce((acc, cur) => acc + cur.costo_total, 0)
    resultados.push({
      sistema: sis,
      items: itemsCalc,
      subtotal: Number(subtotal.toFixed(2))
    })
  }

  console.info('[COSTS] Resultados por sistema dinámicos', resultados.map(r => ({ sistema: r.sistema, items: r.items.length, subtotal: r.subtotal })))
  const totales = calcularTotales(resultados, {
    nombreProyecto: input.nombreProyecto,
    usuario: input.usuario,
    inflacionPct: input.inflacionPct,
    impuestosPct: input.impuestosPct,
    utilidadPct: input.utilidadPct,
  })
  console.info('[COSTS] Totales proyecto', totales)
  const requestedSystems =
    (entrada.cctv ? 1 : 0) +
    (entrada.acceso ? 1 : 0) +
    (entrada.voceo ? 1 : 0) +
    (entrada.incendio ? 1 : 0)
  const itemsCount = resultados.reduce((n, r) => n + r.items.length, 0)
  const allUnitCostsZero = resultados.length > 0 && resultados.every((r) => r.items.every((i) => i.costo_unitario === 0))

  const reglas = validarParametros({
    cctv: input.cctv ? { dispositivos: input.cctv.conteo.dispositivos, distancia: input.cctv.params.distanciaPromedioCableadoMts ?? 0 } : undefined,
    acceso: input.acceso ? { dispositivos: input.acceso.conteo.dispositivos, distancia: input.acceso.params.distanciaPromedioCableadoMts ?? 0 } : undefined,
    voceo: input.voceo ? { dispositivos: input.voceo.conteo.dispositivos, distancia: input.voceo.params.distanciaPromedioCableadoMts ?? 0 } : undefined,
    incendio: input.incendio ? { dispositivos: input.incendio.conteo.dispositivos, distancia: input.incendio.params.distanciaPromedioCableadoMts ?? 0 } : undefined,
  })

  const validaciones = mapaValidaciones(reglas)
  const missingCostos = detectarCostosFaltantes(resultados)
  if (missingCostos.length > 0) {
    console.warn(`[Costos] Precios faltantes: ${missingCostos.map((m) => m.componente).join(', ')}`)
  }
  const criticalSystems: Array<{ sistema: string; motivo: string }> = []
  if (entrada.cctv && (!itemsMap.get('CCTV') || itemsMap.get('CCTV')!.length === 0)) {
    criticalSystems.push({ sistema: 'CCTV', motivo: 'Sin precios vigentes cargados en Administración' })
  }
  if (entrada.acceso && (!itemsMap.get('ACCESO') || itemsMap.get('ACCESO')!.length === 0)) {
    criticalSystems.push({ sistema: 'ACCESO', motivo: 'Sin precios vigentes cargados en Administración' })
  }
  if (entrada.voceo && (!itemsMap.get('VOCEO') || itemsMap.get('VOCEO')!.length === 0)) {
    criticalSystems.push({ sistema: 'VOCEO', motivo: 'Sin precios vigentes cargados en Administración' })
  }
  if (entrada.incendio && (!itemsMap.get('INCENDIO') || itemsMap.get('INCENDIO')!.length === 0)) {
    criticalSystems.push({ sistema: 'INCENDIO', motivo: 'Sin precios vigentes cargados en Administración' })
  }
  const integridad = {
    requiredCodes,
    missingCodes,
    preciosUsados: Array.from(priceMap.entries()).map(([codigo, precio]) => ({ codigo, precio })),
    criticalSystems,
    requestedSystems,
    itemsCount,
    allUnitCostsZero,
  }
  if (requestedSystems > 0 && allUnitCostsZero) {
    await logAudit({
      module: 'COSTS',
      action: 'CALCULATE_END',
      user: input.usuario,
      status: 'ERROR',
      payload: {
        reason: 'Sin precios vigentes para los códigos requeridos',
        integridad,
        entrada,
      },
    })
    return new Response(
      JSON.stringify({
        error: 'Precios no disponibles para los sistemas seleccionados',
        details: integridad,
      }),
      { status: 422 }
    )
  }
  const proyecto = await db.proyectos_calculos.create({
    data: {
      nombre_proyecto: input.nombreProyecto,
      usuario: input.usuario,
      total_calculado: totales.totalFinal,
      detalles: {
        create: resultados.flatMap((r) =>
          r.items.map((i) => ({
            componente: i.componente,
            descripcion: i.descripcion,
            unidad_medida: i.unidad_medida,
            cantidad: i.cantidad,
            costo_unitario: i.costo_unitario,
            costo_total: i.costo_total,
            sistema: r.sistema,
            item: i.item,
          }))
        ),
      },
    },
    include: { detalles: true },
  })

  await logAudit({
    module: 'COSTS',
    action: 'CALCULATE_END',
    user: input.usuario,
    status: 'SUCCESS',
    payload: {
      proyectoId: proyecto.id_proyecto,
      entrada,
      requiredCodes,
      preciosUsados: Array.from(priceMap.entries()),
      resultados,
      totales,
      warnings: validaciones,
      missingCostos,
      criticalSystems,
      ai: aiInfo,
    },
  })

  return new Response(
    JSON.stringify({
      resultados,
      totales,
      validaciones,
      proyectoId: proyecto.id_proyecto,
      missingCostos,
      ai: aiInfo,
      integridad,
      errores: criticalSystems,
    }),
    { status: 200 }
  )
}
