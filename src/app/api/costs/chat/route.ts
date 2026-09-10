
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { chat, ChatMessage, ensureModelAvailable } from '@/lib/ollama/client'
import { buildConsultantPrompt } from '@/lib/ollama/prompts'

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })),
  context: z.any().optional() // Current form state to inject if starting
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parse = bodySchema.safeParse(json)
    if (!parse.success) {
      return new Response(JSON.stringify({ error: 'Invalid body', details: parse.error }), { status: 400 })
    }

    const { messages, context } = parse.data

    // Check Ollama availability
    const health = await ensureModelAvailable()
    if (!health.ok || !health.available) {
      console.error('[Costs/Chat] Ollama unavailable', health)
      return new Response(JSON.stringify({ 
        error: 'Ollama service not available or model missing', 
        details: health 
      }), { status: 503 })
    }

    // Prepare messages
    let fullMessages = [...messages]
    
    // If no system prompt at start, inject it
    if (fullMessages.length === 0 || fullMessages[0].role !== 'system') {
      const systemPrompt = await buildConsultantPrompt(context)
      fullMessages.unshift({ role: 'system', content: systemPrompt })
    }

    console.log('[Costs/Chat] Sending request to Ollama...')
    const controller = new AbortController()
    // 90s timeout for Ollama
    const timeout = setTimeout(() => controller.abort(), 90000)

      // Call Ollama
      const response = await chat(fullMessages) // chat function needs to support signal or we wrap it
      clearTimeout(timeout)
      
      if (!response.ok) {
        console.error('[Costs/Chat] Ollama error response', response)
        return new Response(JSON.stringify({ error: 'Failed to generate response from AI' }), { status: 500 })
      }

      // Process response to handle <think> blocks from DeepSeek
    let text = response.text
    
    // Remove <think> blocks for clean display, but keep them for internal logging if needed
    // DeepSeek R1 uses <think>...</think> for Chain of Thought
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

    // Check for JSON block in response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
    let extractedData = null
    
    if (jsonMatch) {
      try {
        extractedData = JSON.parse(jsonMatch[1])
      } catch (e) {
        console.warn('Failed to parse JSON from AI response', e)
      }
    }

    return new Response(JSON.stringify({
      message: text,
      data: extractedData
    }), { status: 200 })

  } catch (e: any) {
    if (e.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'AI Timeout - Model took too long to respond' }), { status: 504 })
    }
    console.error('[Costs/Chat] Internal error', e)
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 })
  }
}