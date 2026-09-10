import type { Camera, FloorPlan } from '@/lib/cctv/types'

export function generateSpecsMarkdown(
  cameras: Camera[],
  floorPlan: FloorPlan | null,
  coveragePercent: number,
  totalBandwidthMbps: number,
  storageGBDay: number
) {
  const lines: string[] = []
  lines.push(`# Especificaciones Técnicas del Sistema CCTV`)
  lines.push('')
  lines.push(`- Cámaras: ${cameras.length}`)
  lines.push(`- Cobertura aproximada: ${coveragePercent}%`)
  lines.push(`- Ancho de banda total: ${totalBandwidthMbps.toFixed(1)} Mbps`)
  lines.push(`- Almacenamiento diario estimado: ${storageGBDay.toFixed(1)} GB`)
  if (floorPlan) {
    lines.push(`- Plano: ${floorPlan.name} (${floorPlan.width}x${floorPlan.height}px)`)
  } else {
    lines.push(`- Plano: no cargado`)
  }
  lines.push('')
  lines.push(`## Inventario de Cámaras`)
  cameras.forEach((c, i) => {
    lines.push(`- ${i + 1}. ${c.name} | Tipo: ${c.type} | Resolución: ${c.resolution} | FOV: ${c.fov}° | Bitrate: ${c.bitrate} Mbps | FPS: ${c.fps}`)
  })
  lines.push('')
  lines.push(`## Recomendaciones`)
  const recNet = totalBandwidthMbps > 1000 ? '10 Gigabit Ethernet' : 'Gigabit Ethernet'
  lines.push(`- Red sugerida: ${recNet}`)
  lines.push(`- Ajuste posiciones para cubrir puntos ciegos y reducir solapes innecesarios.`)
  return lines.join('\n')
}
