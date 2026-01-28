'use client'
import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Send, Bot } from 'lucide-react'
import type { Camera, FloorPlan } from '@/app/page'

interface Message { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }
interface AssistantPanelProps { cameras: Camera[]; floorPlan: FloorPlan | null }

export default function AssistantPanel({ cameras, floorPlan }: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([{ id: '1', role: 'assistant', content: '¡Hola! Soy BotIp.', timestamp: new Date() }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: input, timestamp: new Date() }])
    setInput('')
    setIsLoading(true)
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: input, context: { cameras, floorPlan } }) })
      const data = await response.json()
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.response, timestamp: new Date() }])
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Error', timestamp: new Date() }])
    } finally { setIsLoading(false) }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="h-150 flex flex-col">
          <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />BotIp - Asistente CCTV</CardTitle></CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>}
                    <div className={`max-w-[80%] rounded-lg p-3 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-sm">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="border-t p-4"><div className="flex gap-2"><Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pregunta..." disabled={isLoading} /><Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon"><Send className="h-4 w-4" /></Button></div></div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4"><Card><CardHeader><CardTitle>Estado</CardTitle></CardHeader><CardContent><Badge variant="outline">{cameras.length} cámaras</Badge></CardContent></Card></div>
    </div>
  )
}
