import { NextResponse } from 'next/server'
import { getConfig, ensureModelAvailable, generate, chat } from '@/lib/ollama/client'

function coherenceChecks(text: string, minLen = 20) {
  const okLen = (text || '').trim().length >= minLen
  const hasSentences = /[.!?]\s|[\n]/.test(text)
  const noApologySpam = !/(lo siento|como ia|no puedo)/i.test(text)
  return okLen && hasSentences && noApologySpam
}

export async function GET() {
  const cfg = getConfig()
  const ensure = await ensureModelAvailable()
  if (!ensure.ok) {
    return NextResponse.json({ ok: false, error: 'service_unreachable', cfg })
  }
  if (!ensure.available) {
    return NextResponse.json({ ok: false, error: 'model_not_available', cfg })
  }

  const g = await generate('Responde en una sola oración clara: ¿qué es una cámara domo?')
  const c = await chat([
    { role: 'system', content: 'Responde de forma técnica y concisa en español.' },
    { role: 'user', content: 'Enumera 5 características de una cámara domo en viñetas.' },
  ])

  const results = [
    { name: 'generate_definicion', ok: g.ok && coherenceChecks(g.text) },
    { name: 'chat_caracteristicas', ok: c.ok && coherenceChecks(c.text) && /-\s/.test(c.text) },
  ]
  const ok = results.every((r) => r.ok)
  return NextResponse.json({ ok, cfg, results, samples: { generate: g.text, chat: c.text } })
}
