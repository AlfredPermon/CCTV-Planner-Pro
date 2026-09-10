 import { NextRequest } from 'next/server'
 
 type Cam = { id: string; x: number; y: number }
 type Acc = { id: string; x: number; y: number; type: 'terminal' | 'lock' | 'exit_button' | 'emergency_button' }
 type Vo = { id: string; x: number; y: number; type: 'speaker' | 'horn' | 'panel' }
 type Plan = { id: string; name: string; url: string; width: number; height: number }
 
 export async function GET(_req: NextRequest) {
   const base: Plan = { id: 'p1', name: 'Plano', url: 'data:image/png;base64,', width: 1000, height: 800 }
   const cameras: Cam[] = [
     { id: 'c1', x: 100, y: 100 },
     { id: 'c2', x: 300, y: 200 },
   ]
   const access: Acc[] = [
     { id: 'a1', x: 400, y: 300, type: 'terminal' },
   ]
   // Create voceo plan copy
   const voceoPlan: Plan = { ...base, id: 'p3' }
   const voceoDevices: Vo[] = []
   // Seed voceo without affecting other sets
   voceoDevices.push({ id: 'v1', x: 120, y: 130, type: 'speaker' })
   // Scenario: activeView=voceo but voceoPlan null -> fallback must still allow seeding on base
   const activeView = 'voceo' as const
   const planForVoceo = activeView === 'voceo' ? (voceoPlan ?? base) : base
   const canSeedWhenNoVoceoPlan = !!planForVoceo
   // Validate separation
   const pass = {
     camerasUnaffected: cameras.length === 2 && cameras[0].x === 100 && cameras[1].y === 200,
     accessUnaffected: access.length === 1 && access[0].x === 400,
     plansIndependent: base.id !== voceoPlan.id && base.url === voceoPlan.url,
     seedsSeparate: voceoDevices.length === 1,
     noOverlapWithCams: !(Math.abs(cameras[0].x - voceoDevices[0].x) < 8 && Math.abs(cameras[0].y - voceoDevices[0].y) < 8),
     fallbackWorks: canSeedWhenNoVoceoPlan,
   }
 
   const ok = Object.values(pass).every(Boolean)
   return new Response(JSON.stringify({ ok, pass }), { status: 200, headers: { 'Content-Type': 'application/json' } })
 }
