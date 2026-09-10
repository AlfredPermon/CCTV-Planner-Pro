export const EXPORT_BASE_W = 1600
export const EXPORT_BASE_H = 1100

export type RenderDesignMode =
  | 'all'
  | 'cams'
  | 'devices'
  | 'access'
  | 'voceo'
  | 'fire'
  | 'parking'

export interface ExportFloorPlanLike {
  url: string
  width: number
  height: number
  scaleMetersPerPixel?: number
}

export interface ExportSpatialProjectLike {
  floorPlan?: ExportFloorPlanLike | null
  floorPlanAccess?: ExportFloorPlanLike | null
  floorPlanVoceo?: ExportFloorPlanLike | null
  floorPlanFire?: ExportFloorPlanLike | null
  floorPlanParking?: ExportFloorPlanLike | null
}

export interface SpatialTransform {
  baseW: number
  baseH: number
  scale: number
  offsetX: number
  offsetY: number
  targetW: number
  targetH: number
}

export interface FloorPlanBounds {
  x: number
  y: number
  w: number
  h: number
}

export function computeUniformTransform(baseW: number, baseH: number, targetW: number, targetH: number) {
  const scale = Math.min(targetW / baseW, targetH / baseH)
  const offsetX = Math.round((targetW - baseW * scale) / 2)
  const offsetY = Math.round((targetH - baseH * scale) / 2)
  return { scale, offsetX, offsetY }
}

export function getFloorPlanForMode(
  data: ExportSpatialProjectLike,
  mode: RenderDesignMode
): ExportFloorPlanLike | null {
  switch (mode) {
    case 'access':
    case 'devices':
      return data.floorPlanAccess ?? data.floorPlan ?? null
    case 'voceo':
      return data.floorPlanVoceo ?? data.floorPlan ?? null
    case 'fire':
      return data.floorPlanFire ?? data.floorPlan ?? null
    case 'parking':
      return data.floorPlanParking ?? data.floorPlan ?? null
    default:
      return data.floorPlan ?? null
  }
}

export function computeFloorPlanBounds(
  floorPlan: ExportFloorPlanLike | null | undefined,
  baseW = EXPORT_BASE_W,
  baseH = EXPORT_BASE_H
): FloorPlanBounds | null {
  if (!floorPlan) return null

  const sourceW = floorPlan.width > 0 ? floorPlan.width : 1000
  const sourceH = floorPlan.height > 0 ? floorPlan.height : 700
  const aspect = sourceW / Math.max(1, sourceH)

  const marginPct = 0.04
  const marginX = Math.max(30, baseW * marginPct)
  const marginY = Math.max(30, baseH * marginPct)
  const maxW = baseW - marginX * 2
  const maxH = baseH - marginY * 2

  let drawW = maxW
  let drawH = drawW / Math.max(aspect, 0.0001)
  if (drawH > maxH) {
    drawH = maxH
    drawW = drawH * aspect
  }

  drawW = Math.max(120, drawW)
  drawH = Math.max(120, drawH)

  const x = (baseW - drawW) / 2
  const y = (baseH - drawH) / 2
  return { x, y, w: drawW, h: drawH }
}

export function applySpatialTransform(transform: SpatialTransform, x: number, y: number) {
  return {
    x: Math.round(transform.offsetX + x * transform.scale),
    y: Math.round(transform.offsetY + y * transform.scale),
  }
}

export function computeRenderLayout(
  data: ExportSpatialProjectLike,
  targetW: number,
  targetH: number,
  mode: RenderDesignMode = 'all'
) {
  const uniform = computeUniformTransform(EXPORT_BASE_W, EXPORT_BASE_H, targetW, targetH)
  const transform: SpatialTransform = {
    baseW: EXPORT_BASE_W,
    baseH: EXPORT_BASE_H,
    scale: uniform.scale,
    offsetX: uniform.offsetX,
    offsetY: uniform.offsetY,
    targetW,
    targetH,
  }
  const floorPlan = getFloorPlanForMode(data, mode)
  const floorPlanBoundsBase = computeFloorPlanBounds(floorPlan, EXPORT_BASE_W, EXPORT_BASE_H)
  const floorPlanBounds = floorPlanBoundsBase
    ? {
        x: Math.round(transform.offsetX + floorPlanBoundsBase.x * transform.scale),
        y: Math.round(transform.offsetY + floorPlanBoundsBase.y * transform.scale),
        w: Math.round(floorPlanBoundsBase.w * transform.scale),
        h: Math.round(floorPlanBoundsBase.h * transform.scale),
      }
    : null

  return {
    transform,
    floorPlan,
    floorPlanBoundsBase,
    floorPlanBounds,
  }
}
