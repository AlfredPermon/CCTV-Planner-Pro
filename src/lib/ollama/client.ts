export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:1.5b'

export async function ping(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { method: 'GET' })
    if (!res.ok) return { ok: false, error: `status_${res.status}` }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network_error' }
  }
}

export async function models(): Promise<{ ok: boolean; models: string[] }> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { method: 'GET' })
    const data = await res.json()
    const names = Array.isArray(data?.models) ? data.models.map((m: any) => m.name) : []
    return { ok: res.ok, models: names }
  } catch {
    return { ok: false, models: [] }
  }
}

export async function ensureModelAvailable(model = OLLAMA_MODEL): Promise<{ ok: boolean; available: boolean; models?: string[] }> {
  const p = await ping()
  if (!p.ok) return { ok: false, available: false }
  const m = await models()
  
  // Check exact match first
  if (m.models.includes(model)) return { ok: true, available: true, models: m.models }
  
  // Check with :latest suffix if not present
  if (!model.includes(':') && m.models.includes(`${model}:latest`)) return { ok: true, available: true, models: m.models }
  
  // Check if available model starts with requested model name (e.g. 'llama3.1' matches 'llama3.1:latest')
  const partialMatch = m.models.some(available => available.startsWith(model))
  if (partialMatch) return { ok: true, available: true, models: m.models }

  return { ok: true, available: false, models: m.models }
}

export async function generate(prompt: string, model = OLLAMA_MODEL): Promise<{ ok: boolean; text: string }> {
  // Auto-resolve model name if possible (simple logic: append :latest if needed)
  // Ideally we should reuse the resolved name from ensureModelAvailable but for now let's rely on Ollama's partial matching handling or just send what we have.
  // Actually, Ollama API usually handles 'llama3.1' resolving to 'llama3.1:latest' automatically.
  // The issue was strictly in our client-side validation logic 'ensureModelAvailable'.
  
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    })
    if (!res.ok) return { ok: false, text: '' }
    const data = await res.json()
    return { ok: true, text: data?.response ?? '' }
  } catch {
    return { ok: false, text: '' }
  }
}

export async function chat(messages: ChatMessage[], model = OLLAMA_MODEL): Promise<{ ok: boolean; text: string }> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
    })
    if (!res.ok) return { ok: false, text: '' }
    const data = await res.json()
    const text = data?.message?.content ?? ''
    return { ok: true, text }
  } catch {
    return { ok: false, text: '' }
  }
}

export function getConfig() {
  return { base: OLLAMA_BASE, model: OLLAMA_MODEL }
}
