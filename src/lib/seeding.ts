import type { FloorPlan } from '@/lib/cctv/types'

export function cloneFloorPlan(base: FloorPlan): FloorPlan {
  return {
    ...base,
    id: crypto.randomUUID(),
    locked: base.locked,
    scaleMetersPerPixel: base.scaleMetersPerPixel,
    scalePoints: base.scalePoints
  }
}

export function createCleanLayer<T>(devices: T[]): T[] {
  return []
}
