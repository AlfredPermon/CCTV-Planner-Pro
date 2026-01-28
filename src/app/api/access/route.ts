import { NextRequest } from 'next/server'
import { planIntegration, type IntegrationDevice } from '@/lib/access/integration'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const devices: IntegrationDevice[] = Array.isArray(body?.devices) ? body.devices : []
    const result = planIntegration(devices)
    return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Bad Request' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
}
