'use client'
import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Camera, FloorPlan } from '@/lib/cctv/types'

interface Message { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date }
interface AssistantPanelProps { cameras: Camera[]; floorPlan: FloorPlan | null }

export default function AssistantPanel({ cameras, floorPlan }: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([{ id: '1', role: 'assistant', content: '¡Hola! Soy BotIp, tu asistente experto en CCTV y sistemas de baja tensión. ¿En qué puedo ayudarte hoy?', timestamp: new Date() }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<'unknown' | 'connected' | 'disconnected' | 'model_missing'>('unknown')
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => { 
    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight 
  }, [messages])

  // Verificar estado de Ollama al montar el componente
  useEffect(() => {
    const checkOllamaStatus = async () => {
      try {
        const response = await fetch('/api/ollama/health')
        const data = await response.json()
        
        if (!data.reachable) {
          setOllamaStatus('disconnected')
          setMessages(prev => [...prev, { 
            id: crypto.randomUUID(), 
            role: 'system', 
            content: '⚠️ **Ollama no está disponible**: El servidor local no responde. Por favor ejecuta `ollama serve` en una terminal.', 
            timestamp: new Date() 
          }])
        } else if (!data.model_available) {
          setOllamaStatus('model_missing')
          setMessages(prev => [...prev, { 
            id: crypto.randomUUID(), 
            role: 'system', 
            content: `⚠️ **Modelo no disponible**: El modelo configurado no está descargado. Modelos disponibles: ${data.models?.length > 0 ? data.models.join(', ') : 'Ninguno'}. Ejecuta \`ollama pull <nombre-modelo>\`.`, 
            timestamp: new Date() 
          }])
        } else {
          setOllamaStatus('connected')
        }
      } catch {
        setOllamaStatus('disconnected')
      }
    }
    
    checkOllamaStatus()
  }, [])

  const handleSendMessage = async () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: input, timestamp: new Date() }])
    setInput('')
    setIsLoading(true)
    try {
      const response = await fetch('/api/assistant', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ message: input, context: { cameras, floorPlan } }) 
      })
      const data = await response.json()
      
      // Actualizar estado de Ollama basado en la respuesta
      if (data.success === false && data.error) {
        setOllamaStatus('disconnected')
      }
      
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.response, timestamp: new Date() }])
    } catch (error: any) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'system', content: `❌ Error de conexión: ${error?.message || 'Error desconocido'}`, timestamp: new Date() }])
      setOllamaStatus('disconnected')
    } finally { 
      setIsLoading(false) 
    }
  }

  const getStatusBadge = () => {
    switch (ollamaStatus) {
      case 'connected':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Ollama Conectado</Badge>
      case 'disconnected':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Ollama Desconectado</Badge>
      case 'model_missing':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Modelo No Disponible</Badge>
      default:
        return <Badge variant="outline">Verificando...</Badge>
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="h-150 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                BotIp - Asistente CCTV
              </div>
              {getStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>}
                    {m.role === 'system' && <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center"><AlertCircle className="h-4 w-4 text-destructive" /></div>}
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      m.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : m.role === 'system'
                        ? 'bg-destructive/10 border border-destructive/20'
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Procesando pregunta...</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Pregunta sobre CCTV, control de acceso, incendios o voceo IP..." 
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Estado del Sistema</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ollama</span>
              {getStatusBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cámaras</span>
              <Badge variant="outline">{cameras.length} cámaras</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plano</span>
              <Badge variant={floorPlan ? 'default' : 'secondary'}>{floorPlan ? 'Cargado' : 'Sin plano'}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Comandos Rápidos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start text-xs h-auto py-2" onClick={() => setInput('¿Qué es una cámara domo?')}>
              📹 Definición de cámara domo
            </Button>
            <Button variant="outline" className="w-full justify-start text-xs h-auto py-2" onClick={() => setInput('Características de cámaras domo')}>
              ⚙️ Características técnicas
            </Button>
            <Button variant="outline" className="w-full justify-start text-xs h-auto py-2" onClick={() => setInput('Realiza el dimensionamiento del proyecto')}>
              📐 Dimensionar proyecto
            </Button>
            <Button variant="outline" className="w-full justify-start text-xs h-auto py-2" onClick={() => setInput('¿Cuál es la diferencia entre cámara domo y bullet?')}>
              🔄 Comparación de dispositivos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
