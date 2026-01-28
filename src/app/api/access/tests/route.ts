import { NextRequest } from 'next/server'
import { planIntegration, getSupportedProtocols } from '@/lib/access/integration'

export async function GET(_req: NextRequest) {
  const devices = [
    { id: 'd1', modelId: 'speedface-v5lp', type: 'terminal' as const },
    { id: 'd2', modelId: 'maglock-600lb-buzzer', type: 'lock' as const },
    { id: 'd3', modelId: 'zk-teco-tleb102', type: 'exit_button' as const }
  ]
  const result = planIntegration(devices)

  const tests = [
    {
      name: 'SpeedFace V5LP soporta Wiegand',
      pass: getSupportedProtocols('speedface-v5lp', 'terminal').includes('Wiegand')
    },
    {
      name: 'Maglock usa relé',
      pass: getSupportedProtocols('maglock-600lb-buzzer', 'lock').includes('Relay')
    },
    {
      name: 'Plan estima ancho de banda > 0',
      pass: result.network.bandwidthEstimateMbps > 0
    }
  ]
  const allPass = tests.every(t => t.pass)
  return new Response(JSON.stringify({ ok: allPass, tests, result }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
