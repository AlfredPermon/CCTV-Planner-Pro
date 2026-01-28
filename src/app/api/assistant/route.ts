import { NextResponse } from 'next/server'
import { computeCoveragePercent } from '@/lib/cctv/geometry'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message: string = body.message ?? ''
    const cameras = body.context?.cameras ?? []
    const floorPlan = body.context?.floorPlan ?? null
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
    const response = `Pregunta: ${message}\n${summary}\nSugerencia: revise posiciones para cubrir puntos ciegos y ajuste FOV.`
    return NextResponse.json({ response })
  } catch {
    return NextResponse.json({ response: 'Error procesando la solicitud' }, { status: 400 })
  }
}
