import { NextRequest } from 'next/server'
import { classifyIntent, hasDeviceTerm } from '@/lib/botip/intent'
import { CCTV_DOME_CAMERA, formatDeviceFeatures } from '@/lib/botip/knowledge'
import { computeCoveragePercent } from '@/lib/cctv/geometry'

function respond(message: string, context: any): string {
  const intent = classifyIntent(message)
  const cameras = context?.cameras ?? []
  const floorPlan = context?.floorPlan ?? null
  if (intent === 'caracteristicas' && (hasDeviceTerm(message, 'domo') || hasDeviceTerm(message, 'cámara domo'))) {
    return formatDeviceFeatures(CCTV_DOME_CAMERA)
  }
  if (intent === 'dimensionamiento' || intent === 'proyecto') {
    const bandwidth = cameras.reduce((acc: number, c: any) => acc + (c.bitrate ?? 0), 0)
    const storagePerDay = cameras.reduce((acc: number, c: any) => acc + ((c.bitrate ?? 0) * 3600 * 24) / 8, 0)
    const coverage = computeCoveragePercent(cameras, floorPlan)
    const recNet = bandwidth > 1000 ? '10 Gigabit Ethernet' : 'Gigabit Ethernet'
    const storageGBDay = (storagePerDay / 1024).toFixed(1)
    return [
      `Diseño con ${cameras.length} cámaras.`,
      `Cobertura aprox.: ${coverage}% del plano.`,
      `Ancho de banda estimado: ${bandwidth.toFixed(1)} Mbps → Red: ${recNet}.`,
      `Almacenamiento diario: ${storageGBDay} GB.`,
      floorPlan ? `Plano: ${floorPlan.name} (${floorPlan.width}x${floorPlan.height}).` : 'Sin plano cargado.',
    ].join('\n')
  }
  if (intent === 'definicion' && (hasDeviceTerm(message, 'domo') || hasDeviceTerm(message, 'cámara domo'))) {
    return CCTV_DOME_CAMERA.definition
  }
  return 'Indique si busca definición, características, comparación o aplicación de un dispositivo, o pida dimensionamiento del proyecto.'
}

export async function GET(_req: NextRequest) {
  const cams = [
    { id: 'c1', name: 'Cam 1', bitrate: 4 },
    { id: 'c2', name: 'Cam 2', bitrate: 4 },
    { id: 'c3', name: 'Cam 3', bitrate: 4 },
    { id: 'c4', name: 'Cam 4', bitrate: 4 },
    { id: 'c5', name: 'Cam 5', bitrate: 4 },
    { id: 'c6', name: 'Cam 6', bitrate: 4 },
  ]
  const context = { cameras: cams, floorPlan: { name: 'Plano A', width: 2000, height: 1500 } }
  const cases = [
    { name: 'Características cámara domo', q: '¿cuáles son las características de una cámara tipo domo?' },
    { name: 'Definición cámara domo', q: 'Definición de cámara domo' },
    { name: 'Dimensionamiento CCTV', q: '¿cuánto ancho de banda necesito para 6 cámaras 4MP?' },
    { name: 'Pregunta genérica incendio', q: '¿qué es un detector de humo?' },
  ]
  const results = cases.map((c) => {
    const r = respond(c.q, context)
    return {
      name: c.name,
      response: r,
      checks: {
        noProjectLeak: !/(Cobertura|Mbps|GB|Plano)/.test(r) || c.name.includes('Dimensionamiento'),
        hasBulletsWhenFeatures: c.name.includes('Características') ? /Características principales:/i.test(r) : true,
        startsWithDefinitionWhenFeatures: c.name.includes('Características') ? CCTV_DOME_CAMERA.definition.startsWith(r.split('\n')[0]) : true,
      },
    }
  })
  const ok = results.every((r) => r.checks.noProjectLeak && r.checks.hasBulletsWhenFeatures && r.checks.startsWithDefinitionWhenFeatures)
  return new Response(JSON.stringify({ ok, results }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
