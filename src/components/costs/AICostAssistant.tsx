
'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Send, Bot, User, Check, X, Loader2, Sparkles, FileText, ArrowRight, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'

interface AICostAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentContext: any
  onApplyChanges: (optimizedParams: any, analysisData: any) => void
}

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function AICostAssistant({ open, onOpenChange, currentContext, onApplyChanges }: AICostAssistantProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      // Start the conversation automatically? Or wait for user?
      // Let's send an initial greeting from the AI by triggering the backend with empty messages if we want, 
      // OR just show a welcome message locally. 
      // Better: trigger backend to get the first greeting which comes from the System Prompt.
      startConversation()
    }
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const startConversation = async () => {
    setLoading(true)
    try {
      // Send empty messages array to trigger system prompt initialization
      const res = await fetch('/api/costs/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], context: currentContext })
      })
      const data = await res.json()
      if (data.message) {
        setMessages([{ role: 'assistant', content: data.message }])
      }
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo iniciar el asistente', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const newMsg: Message = { role: 'user', content: inputValue }
    const updatedMessages = [...messages, newMsg]
    setMessages(updatedMessages)
    setInputValue('')
    setLoading(true)

    try {
      const res = await fetch('/api/costs/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, context: currentContext })
      })
      
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      
      if (data.data) {
        setAnalysisData(data.data)
        toast({ title: 'Análisis Completado', description: 'Revisa los resultados optimizados.' })
      }

    } catch (e: any) {
      const msg = e.message || 'Fallo al enviar mensaje'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
      // Remove failed user message from state to allow retry? Or just keep it.
      // Better to keep it but maybe show error indicator. For now just toast.
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleApply = () => {
    if (analysisData && analysisData.optimized_params) {
      onApplyChanges(analysisData.optimized_params, analysisData)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Asistente de Ingeniería IA
          </DialogTitle>
          <DialogDescription>
            Levantamiento consultivo y optimización de infraestructura
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Chat Section */}
          <div className={`flex flex-col flex-1 border-r ${analysisData ? 'hidden md:flex md:w-1/2' : 'w-full'}`}>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`rounded-lg p-3 max-w-[80%] text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {m.content.split('```json')[0]} {/* Hide raw JSON if present in text */}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs text-muted-foreground">Analizando...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
              <Input 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                onKeyDown={handleKeyDown}
                placeholder="Describe el proyecto..." 
                disabled={loading || !!analysisData}
              />
              <Button onClick={handleSendMessage} disabled={loading || !inputValue.trim() || !!analysisData}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results Section (Conditional) */}
          {analysisData && (
            <div className="flex-1 flex flex-col bg-muted/10 md:w-1/2 overflow-hidden">
              <div className="p-4 border-b bg-background">
                <h3 className="font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Resultados del Análisis
                </h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  {/* Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Resumen Ejecutivo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{analysisData.summary}</p>
                    </CardContent>
                  </Card>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-primary">{analysisData.optimization_metrics?.improvement_pct}%</div>
                        <p className="text-xs text-muted-foreground">Mejora Estimada</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{analysisData.optimization_metrics?.added_components_count}</div>
                        <p className="text-xs text-muted-foreground">Items Adicionales</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Additional Recommendations */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Infraestructura Recomendada</h4>
                    <div className="space-y-2">
                      {analysisData.additional_recommendations?.map((rec: any, i: number) => (
                        <div key={i} className="bg-card border rounded-lg p-3 text-sm">
                          <div className="flex justify-between font-medium">
                            <span>{rec.descripcion}</span>
                            <Badge variant="outline">x{rec.cantidad}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{rec.razon}</p>
                          {rec.codigo && <div className="text-[10px] text-muted-foreground mt-1 font-mono">{rec.codigo}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Value Add */}
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300 mb-1">Valor Agregado</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {analysisData.optimization_metrics?.value_add_estimate}
                    </p>
                  </div>
                </div>
              </ScrollArea>
              <div className="p-4 border-t bg-background flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={handleApply}>
                  Aplicar Cambios
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
