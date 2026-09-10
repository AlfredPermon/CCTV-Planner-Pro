import type { Camera, FloorPlan } from '@/lib/cctv/types'

export function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function pointInFOV(px: number, py: number, camera: Camera, radius: number) {
  const dx = px - camera.x
  const dy = py - camera.y
  const dist = Math.hypot(dx, dy)
  if (dist > radius) return false
  const angle = Math.atan2(dy, dx)
  const dir = degToRad(camera.rotation)
  let delta = angle - dir
  while (delta > Math.PI) delta -= 2 * Math.PI
  while (delta < -Math.PI) delta += 2 * Math.PI
  const half = degToRad(camera.fov / 2)
  return Math.abs(delta) <= half
}

export function computeFloorPlanDrawRect(floorPlan: FloorPlan | null) {
  if (!floorPlan) return { x: 50, y: 50, w: 0, h: 0 }
  const aspect = floorPlan.width / floorPlan.height || 1
  let w = Math.min(700, 800)
  let h = w / aspect
  if (h > 500) { h = 500; w = h * aspect }
  return { x: 50, y: 50, w, h }
}

export function computeCoveragePercent(cameras: Camera[], floorPlan: FloorPlan | null) {
  const rect = computeFloorPlanDrawRect(floorPlan)
  if (!rect.w || !rect.h) return 0
  const step = 20
  let covered = 0
  let total = 0
  const radius = 120
  for (let y = rect.y; y <= rect.y + rect.h; y += step) {
    for (let x = rect.x; x <= rect.x + rect.w; x += step) {
      total++
      if (cameras.some(cam => pointInFOV(x, y, cam, radius))) covered++
    }
  }
  return Math.round((covered / total) * 100)
}
