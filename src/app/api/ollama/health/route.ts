import { NextResponse } from 'next/server'
import { ping, models, ensureModelAvailable, getConfig } from '@/lib/ollama/client'

export async function GET() {
  const cfg = getConfig()
  const p = await ping()
  const m = await models()
  const e = await ensureModelAvailable()
  return NextResponse.json({
    base_url: cfg.base,
    model: cfg.model,
    reachable: p.ok,
    models: m.models,
    model_available: e.available,
  })
}
