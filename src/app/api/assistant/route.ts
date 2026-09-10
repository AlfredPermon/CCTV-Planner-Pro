import { NextResponse } from 'next/server'
import { computeCoveragePercent } from '@/lib/cctv/geometry'
import { classifyIntent, hasDeviceTerm } from '@/lib/botip/intent'
import { CCTV_DOME_CAMERA, formatDeviceFeatures } from '@/lib/botip/knowledge'
import { chat, getConfig, ensureModelAvailable } from '@/lib/ollama/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message: string = body.message ?? ''
    const cameras = body.context?.cameras ?? []
    const floorPlan = body.context?.floorPlan ?? null
    const intent = classifyIntent(message)

    let response = ''

    if (intent === 'caracteristicas' && (hasDeviceTerm(message, 'domo') || hasDeviceTerm(message, 'cámara domo'))) {
      response = formatDeviceFeatures(CCTV_DOME_CAMERA)
    } else if (intent === 'definicion' && (hasDeviceTerm(message, 'domo') || hasDeviceTerm(message, 'cámara domo'))) {
      response = CCTV_DOME_CAMERA.definition
    } else if (intent === 'dimensionamiento' || intent === 'proyecto') {
      const bandwidth = cameras.reduce((acc: number, c: any) => acc + (c.bitrate ?? 0), 0)
      const storagePerDay = cameras.reduce((acc: number, c: any) => acc + ((c.bitrate ?? 0) * 3600 * 24) / 8, 0)
      const coverage = computeCoveragePercent(cameras, floorPlan)
      const recNet = bandwidth > 1000 ? '10 Gigabit Ethernet' : 'Gigabit Ethernet'
      const storageGBDay = (storagePerDay / 1024).toFixed(1)
      const summary =
        `Diseño con ${cameras.length} cámaras.\n` +
        `Cobertura aprox.: ${coverage}% del plano.\n` +
        `Ancho de banda estimado: ${bandwidth.toFixed(1)} Mbps → Red: ${recNet}.\n` +
        `Almacenamiento diario: ${storageGBDay} GB.\n` +
        (floorPlan ? `Plano: ${floorPlan.name} (${floorPlan.width}x${floorPlan.height}).` : 'Sin plano cargado.')
      response = summary + '\nSugerencia: valide ubicaciones y evite puntos ciegos.'
    } else {
      const cfg = getConfig()
      const ok = await ensureModelAvailable()
      if (ok.ok && ok.available) {
        const r = await chat([
          { role: 'system', content: 'Responde de forma técnica, precisa y concisa en español para sistemas de baja tensión (CCTV, control de acceso, detección de incendios y voceo IP). Evita cálculos y datos de proyecto salvo que se soliciten.' },
          { role: 'user', content: message },
        ], cfg.model)
        response = r.text || 'Sin respuesta del modelo.'
      } else {
        response = 'Indique si busca definición, características, comparación o aplicación, o pida dimensionamiento del proyecto.'
      }
    }
    return NextResponse.json({ response })
  } catch {
    return NextResponse.json({ response: 'Error procesando la solicitud' }, { status: 400 })
  }
}
