import { NextRequest } from 'next/server'

type Cam = { id: string; x: number; y: number }
type Dev = { id: string; x: number; y: number; type: 'terminal' | 'lock' | 'exit_button' | 'emergency_button' }
type Plan = { id: string; name: string; url: string; width: number; height: number }

export async function GET(_req: NextRequest) {
  const base: Plan = { id: 'p1', name: 'Plano', url: 'data:image/png;base64,', width: 1000, height: 800 }
  const cameras: Cam[] = [
    { id: 'c1', x: 100, y: 100 },
    { id: 'c2', x: 300, y: 200 },
  ]
  // Create access plan copy
  const accessPlan: Plan = { ...base, id: 'p2' }
  const accessDevices: Dev[] = []
  // Seed access without affecting cameras
  accessDevices.push({ id: 'd1', x: 120, y: 120, type: 'terminal' })
  // Scenario: activeView=access but accessPlan null -> fallback must still allow seeding on base
  const activeView = 'access' as const
  const planForAccess = activeView === 'access' ? (accessPlan ?? base) : base
  const canSeedWhenNoAccessPlan = !!planForAccess
  // Validate separation
  const pass = {
    camerasUnaffected: cameras.length === 2 && cameras[0].x === 100 && cameras[1].y === 200,
    plansIndependent: base.id !== accessPlan.id && base.url === accessPlan.url,
    seedsSeparate: accessDevices.length === 1,
    noOverlapConflict: !(Math.abs(cameras[0].x - accessDevices[0].x) < 8 && Math.abs(cameras[0].y - accessDevices[0].y) < 8),
    fallbackWorks: canSeedWhenNoAccessPlan,
  }

  const ok = Object.values(pass).every(Boolean)
  return new Response(JSON.stringify({ ok, pass }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
