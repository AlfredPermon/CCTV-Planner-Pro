'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Calculator, Save, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { generateCostReportPdf } from '@/lib/pdf/cost_report'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { validarParametros, mapaValidaciones } from '@/lib/costs/validation'

import { AICostAssistant } from './AICostAssistant'
import { Sparkles } from 'lucide-react'

type ProjectParams = {
  nombre: string
  usuario: string
  ubicacion: string
  areaTotal: number
  tipoEdificacion: string
  fechaEjecucion: string
  complejidad: string
  inflacion: number
  impuestos: number
  utilidad: number
}

type CommercialParams = {
  incluirInstalacion: boolean
  incluirMantenimiento: boolean
  anosMantenimiento: number
  considerarIntegracion: boolean
  incluirCapacitacion: boolean
}

type SystemSpecifics = {
  cctv: { incluir: boolean; tipo: string; resolucion: string; dias: number }
  acceso: { incluir: boolean; tipoLectores: string; niveles: string }
  voceo: { incluir: boolean; zonas: number; calidad: string }
  incendio: { incluir: boolean; tipoSensores: string; integracion: boolean }
  parquimetro: { incluir: boolean; espacios: number; tipoControl: string }
}

export default function CostsUI() {
  const { toast } = useToast()
  const [project, setProject] = useState<ProjectParams>({
    nombre: 'Proyecto Nuevo',
    usuario: 'Admin',
    ubicacion: 'CDMX',
    areaTotal: 1000,
    tipoEdificacion: 'OFICINAS',
    fechaEjecucion: new Date().toISOString().split('T')[0],
    complejidad: 'Medio',
    inflacion: 5,
    impuestos: 16,
    utilidad: 20
  })

  const [commercial, setCommercial] = useState<CommercialParams>({
    incluirInstalacion: true,
    incluirMantenimiento: false,
    anosMantenimiento: 1,
    considerarIntegracion: false,
    incluirCapacitacion: true
  })

  const [specs, setSpecs] = useState<SystemSpecifics>({
    cctv: { incluir: true, tipo: 'IP', resolucion: '4MP', dias: 30 },
    acceso: { incluir: false, tipoLectores: 'Biometría', niveles: 'Alto' },
    voceo: { incluir: false, zonas: 4, calidad: 'Estándar' },
    incendio: { incluir: false, tipoSensores: 'Direccionable', integracion: true },
    parquimetro: { incluir: false, espacios: 50, tipoControl: 'Barrera' }
  })

  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [useAI, setUseAI] = useState(false)
  const [showAssistant, setShowAssistant] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [liveValid, setLiveValid] = useState<Record<string, { valido: boolean; mensaje: string }>>({})

  const [cctv, setCctv] = useState({ dispositivos: 0, distanciaPromedio: 50 })
  const [acceso, setAcceso] = useState({ dispositivos: 0, distanciaPromedio: 30 })
  const [voceo, setVoceo] = useState({ dispositivos: 0, distanciaPromedio: 40 })
  const [incendio, setIncendio] = useState({ dispositivos: 0, distanciaPromedio: 20 })


  const recomputeValidations = () => {
    const reglas = validarParametros({
      cctv: cctv.dispositivos > 0 ? { dispositivos: cctv.dispositivos, distancia: cctv.distanciaPromedio } : undefined,
      acceso: acceso.dispositivos > 0 ? { dispositivos: acceso.dispositivos, distancia: acceso.distanciaPromedio } : undefined,
      voceo: voceo.dispositivos > 0 ? { dispositivos: voceo.dispositivos, distancia: voceo.distanciaPromedio } : undefined,
      incendio: incendio.dispositivos > 0 ? { dispositivos: incendio.dispositivos, distancia: incendio.distanciaPromedio } : undefined,
    })
    setLiveValid(mapaValidaciones(reglas))
  }

  const handleAssistantApply = (params: any, analysis: any) => {
    // Aplicación de parámetros por IA (Simplificada)
    setAiAnalysis(analysis)
    setUseAI(true)
    toast({ title: 'Parámetros actualizados', description: 'Se han aplicado las optimizaciones del asistente.' })
  }

  const handleCalculate = async () => {
    setLoading(true)
    try {
      // Cálculo Paramétrico de Dispositivos (Reglas del Motor Frontend)
      let dispositivosCCTV = specs.cctv.incluir ? Math.ceil(project.areaTotal / (project.tipoEdificacion === 'COMERCIAL' ? 50 : 80)) : 0
      let dispositivosAcceso = specs.acceso.incluir ? Math.ceil(project.areaTotal / 200) : 0 // Paramétrico simple
      let dispositivosVoceo = specs.voceo.incluir ? Math.ceil(project.areaTotal / 100) : 0
      let dispositivosIncendio = specs.incendio.incluir ? Math.ceil(project.areaTotal / (project.tipoEdificacion === 'OFICINAS' ? 83 : 100)) : 0

      // Ajustes por complejidad
      const dist = project.complejidad === 'Alto' ? 60 : 40

      const payload = {
        nombreProyecto: project.nombre,
        usuario: project.usuario,
        inflacionPct: project.inflacion,
        impuestosPct: project.impuestos,
        utilidadPct: project.utilidad,
        useAI,
        cctv: specs.cctv.incluir ? {
          conteo: { dispositivos: cctv.dispositivos > 0 ? cctv.dispositivos : dispositivosCCTV },
          params: { distanciaPromedioCableadoMts: cctv.distanciaPromedio > 0 ? cctv.distanciaPromedio : dist, factorRedundancia: 1.05 }
        } : undefined,
        acceso: specs.acceso.incluir ? {
          conteo: { dispositivos: acceso.dispositivos > 0 ? acceso.dispositivos : dispositivosAcceso },
          params: { distanciaPromedioCableadoMts: acceso.distanciaPromedio > 0 ? acceso.distanciaPromedio : dist }
        } : undefined,
        voceo: specs.voceo.incluir ? {
          conteo: { dispositivos: voceo.dispositivos > 0 ? voceo.dispositivos : dispositivosVoceo },
          params: { distanciaPromedioCableadoMts: voceo.distanciaPromedio > 0 ? voceo.distanciaPromedio : dist }
        } : undefined,
        incendio: specs.incendio.incluir ? {
          conteo: { dispositivos: incendio.dispositivos > 0 ? incendio.dispositivos : dispositivosIncendio },
          params: { distanciaPromedioCableadoMts: incendio.distanciaPromedio > 0 ? incendio.distanciaPromedio : dist }
        } : undefined
      }

      const res = await fetch('/api/costs/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Error en cálculo')
      }
      
      let data = await res.json()

      // Aplicar Ajustes Comerciales (Mantenimiento, Capacitación, etc.)
      // Para efectos del prototipo paramétrico, los sumamos como indirectos
      const factorInstalacion = commercial.incluirInstalacion ? (project.complejidad === 'Alto' ? 0.30 : 0.20) : 0
      const factorMantenimiento = commercial.incluirMantenimiento ? (0.05 * commercial.anosMantenimiento) : 0
      const extraCapacitacion = commercial.incluirCapacitacion ? 5000 : 0

      const baseMateriales = data.totales.materiales
      const nuevaManoObra = baseMateriales * factorInstalacion
      data.totales.manoObra = nuevaManoObra
      const nuevoSubtotal = baseMateriales + nuevaManoObra + extraCapacitacion + (baseMateriales * factorMantenimiento)
      data.totales.impuestos = nuevoSubtotal * (project.impuestos / 100)
      data.totales.utilidad = nuevoSubtotal * (project.utilidad / 100)
      data.totales.totalFinal = nuevoSubtotal + data.totales.impuestos + data.totales.utilidad

      data.costoMetroCuadrado = data.totales.totalFinal / project.areaTotal

      setResults(data)
      toast({ title: 'Cálculo exitoso', description: `Total: $${data.totales.totalFinal.toLocaleString(undefined, {minimumFractionDigits: 2})}` })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo realizar el cálculo'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    if (!results || !results.proyectoId) return
    try {
      const res = await fetch('/api/costs/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: results.proyectoId,
          nombreProyecto: project.nombre,
          totales: results.totales,
          items: results.resultados.flatMap((sys: any) =>
            sys.items.map((item: any) => ({
              sistema: sys.sistema,
              componente: item.componente,
              descripcion: item.descripcion,
              unidad_medida: item.unidad_medida,
              cantidad: item.cantidad,
              costo_unitario: item.costo_unitario,
              costo_total: item.costo_total,
            }))
          ),
        })
      })
      if (!res.ok) throw new Error('Error en exportación')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Costos_${project.nombre}.xlsx`
      a.click()
    } catch (e) {
      toast({ title: 'Error', description: 'Falló la exportación a Excel', variant: 'destructive' })
    }
  }

  const handleExportPdf = () => {
    if (!results) return
    generateCostReportPdf(results, {
      orientation: 'portrait',
      format: 'letter',
      marginTop: 40,
      marginBottom: 40,
      marginLeft: 40,
      marginRight: 40,
      imageQuality: 1,
      projectTitle: project.nombre,
      author: project.usuario,
      version: '1.0',
      aiAnalysis
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Panel Izquierdo: Parámetros */}
      <Card className="lg:col-span-1 flex flex-col h-full">
        <CardHeader>
          <CardTitle>Parámetros del Proyecto</CardTitle>
          <CardDescription>Configure las variables de entrada</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            {/* General */}
            <div className="space-y-4 border p-4 rounded-md bg-muted/20">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Información del proyecto</h3>
              <div className="grid grid-cols-1 gap-2">
                <Label>Nombre del proyecto</Label>
                <Input value={project.nombre} onChange={e => setProject({...project, nombre: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Ubicación</Label><Input value={project.ubicacion} onChange={e => setProject({...project, ubicacion: e.target.value})} /></div>
                <div><Label>Área total a cubrir (m²)</Label><Input type="number" value={project.areaTotal} onChange={e => setProject({...project, areaTotal: parseFloat(e.target.value) || 0})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tipo de edificación</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={project.tipoEdificacion} onChange={e => setProject({...project, tipoEdificacion: e.target.value})}>
                    <option value="OFICINAS">Oficinas</option>
                    <option value="HOSPITAL">Hospital</option>
                    <option value="COMERCIAL">Comercial</option>
                    <option value="INDUSTRIAL">Industrial</option>
                  </select>
                </div>
                <div><Label>Fecha estimada</Label><Input type="date" value={project.fechaEjecucion} onChange={e => setProject({...project, fechaEjecucion: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Inflación %</Label><Input type="number" value={project.inflacion} onChange={e => setProject({...project, inflacion: parseFloat(e.target.value)})} /></div>
                <div><Label>Impuesto %</Label><Input type="number" value={project.impuestos} onChange={e => setProject({...project, impuestos: parseFloat(e.target.value)})} /></div>
                <div><Label>Utilidad %</Label><Input type="number" value={project.utilidad} onChange={e => setProject({...project, utilidad: parseFloat(e.target.value)})} /></div>
              </div>
            </div>

            {/* Parámetros adicionales */}
            <div className="space-y-4 border p-4 rounded-md bg-muted/20">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Parámetros adicionales</h3>
              <div className="flex items-center justify-between">
                <Label>Incluir instalación</Label>
                <Switch checked={commercial.incluirInstalacion} onCheckedChange={c => setCommercial({...commercial, incluirInstalacion: c})} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Incluir mantenimiento</Label>
                <Switch checked={commercial.incluirMantenimiento} onCheckedChange={c => setCommercial({...commercial, incluirMantenimiento: c})} />
              </div>
              {commercial.incluirMantenimiento && (
                <div className="grid grid-cols-1 gap-2 pl-4 border-l-2">
                  <Label>Años de mantenimiento</Label>
                  <Input type="number" value={commercial.anosMantenimiento} onChange={e => setCommercial({...commercial, anosMantenimiento: parseInt(e.target.value) || 1})} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Considerar integración con sistemas existentes</Label>
                <Switch checked={commercial.considerarIntegracion} onCheckedChange={c => setCommercial({...commercial, considerarIntegracion: c})} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Incluir capacitación</Label>
                <Switch checked={commercial.incluirCapacitacion} onCheckedChange={c => setCommercial({...commercial, incluirCapacitacion: c})} />
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2">
                  <Label>Factor de complejidad de instalación</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={project.complejidad} onChange={e => setProject({...project, complejidad: e.target.value})}>
                    <option value="Bajo">Bajo (Ej. Obra Gris)</option>
                    <option value="Medio">Medio (Estándar)</option>
                    <option value="Alto">Alto (Ej. Hospital en operación, turnos nocturnos)</option>
                  </select>
              </div>
            </div>

            {/* Subsistemas Tabs */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Requerimientos Específicos</h3>
              <Tabs defaultValue="cctv">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="cctv">CCTV</TabsTrigger>
                  <TabsTrigger value="acceso">Acceso</TabsTrigger>
                  <TabsTrigger value="voceo">Voceo</TabsTrigger>
                  <TabsTrigger value="fire">Fire</TabsTrigger>
                  <TabsTrigger value="parq">Parq.</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cctv" className="space-y-4 border p-4 rounded-md mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Switch checked={specs.cctv.incluir} onCheckedChange={c => setSpecs({...specs, cctv: {...specs.cctv, incluir: c}})} />
                    <Label className="font-bold">Incluir CCTV</Label>
                  </div>
                  {specs.cctv.incluir && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Cantidad de cámaras (0 = auto por área)</Label>
                        <Input type="number" value={cctv.dispositivos} onChange={e => { setCctv({...cctv, dispositivos: parseInt(e.target.value) || 0}); recomputeValidations() }} />
                      </div>
                      <div>
                        <Label>Distancia cable (m) por cámara</Label>
                        <Input type="number" value={cctv.distanciaPromedio} onChange={e => { setCctv({...cctv, distanciaPromedio: parseInt(e.target.value) || 0}); recomputeValidations() }} />
                      </div>
                      <div>
                        <Label>Tipo de cámaras</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={specs.cctv.tipo} onChange={e => setSpecs({...specs, cctv: {...specs.cctv, tipo: e.target.value}})}>
                          <option value="IP">IP</option>
                          <option value="Analógica">Analógica</option>
                        </select>
                      </div>
                      <div>
                        <Label>Resolución</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={specs.cctv.resolucion} onChange={e => setSpecs({...specs, cctv: {...specs.cctv, resolucion: e.target.value}})}>
                          <option value="2MP">2MP</option>
                          <option value="4MP">4MP</option>
                          <option value="4K">4K</option>
                        </select>
                      </div>
                      <div className="col-span-2"><Label>Días de almacenamiento</Label><Input type="number" value={specs.cctv.dias} onChange={e => setSpecs({...specs, cctv: {...specs.cctv, dias: parseInt(e.target.value) || 0}})} /></div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="acceso" className="space-y-4 border p-4 rounded-md mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Switch checked={specs.acceso.incluir} onCheckedChange={c => setSpecs({...specs, acceso: {...specs.acceso, incluir: c}})} />
                    <Label className="font-bold">Incluir Control de Acceso</Label>
                  </div>
                  {specs.acceso.incluir && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Cantidad de lectores (0 = auto por área)</Label>
                        <Input type="number" value={acceso.dispositivos} onChange={e => { setAcceso({...acceso, dispositivos: parseInt(e.target.value) || 0}); recomputeValidations() }} />
                      </div>
                      <div>
                        <Label>Distancia cable (m) por lector</Label>
                        <Input type="number" value={acceso.distanciaPromedio} onChange={e => { setAcceso({...acceso, distanciaPromedio: parseInt(e.target.value) || 0}); recomputeValidations() }} />
                      </div>
                      <div>
                        <Label>Tipo de lectores</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={specs.acceso.tipoLectores} onChange={e => setSpecs({...specs, acceso: {...specs.acceso, tipoLectores: e.target.value}})}>
                          <option value="Tarjeta">Tarjeta</option>
                          <option value="Biometría">Biometría</option>
                          <option value="Móvil">Móvil</option>
                        </select>
                      </div>
                      <div>
                        <Label>Nivel de seguridad</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={specs.acceso.niveles} onChange={e => setSpecs({...specs, acceso: {...specs.acceso, niveles: e.target.value}})}>
                          <option value="Básico">Básico</option>
                          <option value="Alto">Alto (Esclusas)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="voceo" className="space-y-4 border p-4 rounded-md mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Switch checked={specs.voceo.incluir} onCheckedChange={c => setSpecs({...specs, voceo: {...specs.voceo, incluir: c}})} />
                    <Label className="font-bold">Incluir Voceo IP</Label>
                  </div>
                  {specs.voceo.incluir && (
                    <div className="grid grid-cols-1 gap-4">
                      <div><Label>Zonas de voceo (independientes)</Label><Input type="number" value={specs.voceo.zonas} onChange={e => setSpecs({...specs, voceo: {...specs.voceo, zonas: parseInt(e.target.value) || 0}})} /></div>
                      <div>
                        <Label>Calidad de audio</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={specs.voceo.calidad} onChange={e => setSpecs({...specs, voceo: {...specs.voceo, calidad: e.target.value}})}>
                          <option value="Estándar">Estándar (Voz)</option>
                          <option value="Alta">Alta (Música ambiental)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="fire" className="space-y-4 border p-4 rounded-md mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Switch checked={specs.incendio.incluir} onCheckedChange={c => setSpecs({...specs, incendio: {...specs.incendio, incluir: c}})} />
                    <Label className="font-bold">Incluir Detección contra Incendios</Label>
                  </div>
                  {specs.incendio.incluir && (
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Tipo de sensores</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={specs.incendio.tipoSensores} onChange={e => setSpecs({...specs, incendio: {...specs.incendio, tipoSensores: e.target.value}})}>
                          <option value="Convencional">Convencional</option>
                          <option value="Direccionable">Direccionable</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Integración (Elevadores/HVAC)</Label>
                        <Switch checked={specs.incendio.integracion} onCheckedChange={c => setSpecs({...specs, incendio: {...specs.incendio, integracion: c}})} />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="parq" className="space-y-4 border p-4 rounded-md mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Switch checked={specs.parquimetro.incluir} onCheckedChange={c => setSpecs({...specs, parquimetro: {...specs.parquimetro, incluir: c}})} />
                    <Label className="font-bold">Incluir Parquímetros</Label>
                  </div>
                  {specs.parquimetro.incluir && (
                    <div className="grid grid-cols-1 gap-4">
                      <div><Label>Cantidad de espacios</Label><Input type="number" value={specs.parquimetro.espacios} onChange={e => setSpecs({...specs, parquimetro: {...specs.parquimetro, espacios: parseInt(e.target.value) || 0}})} /></div>
                      <div>
                        <Label>Tipo de control</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={specs.parquimetro.tipoControl} onChange={e => setSpecs({...specs, parquimetro: {...specs.parquimetro, tipoControl: e.target.value}})}>
                          <option value="Barrera">Barrera vehicular</option>
                          <option value="Boleto">Expendedora de boleto</option>
                        </select>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={loading}>
                    {loading ? 'Calculando...' : <><Calculator className="mr-2 h-4 w-4" /> Calcular Costos</>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar cálculo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se registrará el proyecto en la base de datos y se generará auditoría. ¿Desea continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCalculate}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="grid grid-cols-2 gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={!results}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Exportar a Excel</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se descargará un archivo .xlsx con el detalle calculado. ¿Desea continuar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleExportExcel}>Exportar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" onClick={handleExportPdf} disabled={!results}>
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Panel Derecho: Resultados */}
      <Card className="lg:col-span-2 flex flex-col h-full">
        <CardHeader>
          <CardTitle>Desglose de Costos</CardTitle>
          <CardDescription>Resultados detallados por subsistema</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {!results ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Ingrese parámetros y presione Calcular
            </div>
          ) : (
            <div className="flex flex-col h-full gap-4">
              {/* Resumen Totales */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div>
                  <div className="text-xs text-muted-foreground">Materiales</div>
                  <div className="text-lg font-bold">${results.totales.materiales.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Mano de Obra</div>
                  <div className="text-lg font-bold">${results.totales.manoObra.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Impuestos</div>
                  <div className="text-lg font-bold">${results.totales.impuestos.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                <div className="text-primary">
                  <div className="text-xs font-semibold">TOTAL FINAL</div>
                  <div className="text-2xl font-bold">${results.totales.totalFinal.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                <div className="text-secondary-foreground border-l-2 pl-4">
                  <div className="text-xs font-semibold">Costo por m²</div>
                  <div className="text-2xl font-bold">${results.costoMetroCuadrado.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
              </div>

              {/* Validaciones */}
              {results.validaciones && Object.keys(results.validaciones).length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Advertencias Técnicas</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 text-xs">
                      {Object.entries(results.validaciones).map(([k, v]: any) => (
                        !v.valido && <li key={k}>{k}: {v.mensaje}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              {results.missingCostos && results.missingCostos.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Precios faltantes</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 text-xs">
                      {results.missingCostos.map((m: any) => (
                        <li key={`${m.sistema}-${m.componente}`}>{m.sistema}: {m.componente}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Tablas Detalle */}
              <ScrollArea className="flex-1 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sistema</TableHead>
                      <TableHead>Componente</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Unitario</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.resultados.flatMap((sys: any) =>
                      sys.items.map((item: any) => (
                        <TableRow key={`${sys.sistema}-${item.item}`}>
                          <TableCell className="font-medium">{sys.sistema}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{item.descripcion}</span>
                              <span className="text-xs text-muted-foreground">{item.componente}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.cantidad.toFixed(2)} {item.unidad_medida}</TableCell>
                          <TableCell className={item.costo_unitario === 0 ? 'text-right text-destructive' : 'text-right'}>${item.costo_unitario.toFixed(2)}</TableCell>
                          <TableCell className={item.costo_total === 0 ? 'text-right font-semibold text-destructive' : 'text-right font-semibold'}>${item.costo_total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AICostAssistant 
        open={showAssistant} 
        onOpenChange={setShowAssistant} 
        currentContext={{ specs, project, commercial }}
        onApplyChanges={handleAssistantApply}
      />
    </div>
  )
}
