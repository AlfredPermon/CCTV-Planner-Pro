'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Network, HardDrive } from 'lucide-react'
import type { Camera, FloorPlan } from '@/app/page'
import { computeCoveragePercent } from '@/lib/cctv/geometry'
import { generateSpecsMarkdown } from '@/lib/cctv/specs'

interface CalculationsPanelProps { cameras: Camera[]; floorPlan: FloorPlan | null }

export default function CalculationsPanel({ cameras, floorPlan }: CalculationsPanelProps) {
  const totalBandwidth = cameras.reduce((acc, cam) => acc + cam.bitrate, 0)
  const storagePerDay = cameras.reduce((acc, cam) => acc + (cam.bitrate * 3600 * 24) / 8, 0)
  const coverage = computeCoveragePercent(cameras, floorPlan)
  const storageGBDay = storagePerDay / 1024

  const handleExportSpecs = () => {
    const md = generateSpecsMarkdown(cameras, floorPlan, coverage, totalBandwidth, storageGBDay)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cctv-specs.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Cámaras</CardTitle><div className="text-3xl font-bold">{cameras.length}</div></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Ancho de Banda</CardTitle><div className="text-3xl font-bold">{totalBandwidth.toFixed(1)}</div><p className="text-xs text-muted-foreground">Mbps total</p></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Almacenamiento Diario</CardTitle><div className="text-3xl font-bold">{(storagePerDay / 1024).toFixed(1)}</div><p className="text-xs text-muted-foreground">GB por día</p></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Cobertura Aproximada</CardTitle><div className="text-3xl font-bold">{coverage}%</div><p className="text-xs text-muted-foreground">Área del plano cubierta</p></CardHeader></Card>
      </div>
      <Tabs defaultValue="bandwidth" className="w-full">
        <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="bandwidth">Red</TabsTrigger><TabsTrigger value="storage">Almacenamiento</TabsTrigger><TabsTrigger value="cameras">Cámaras</TabsTrigger><TabsTrigger value="specs">Especificaciones</TabsTrigger></TabsList>
        <TabsContent value="bandwidth" className="space-y-4"><Card><CardHeader><CardTitle>Análisis de Ancho de Banda</CardTitle></CardHeader><CardContent className="space-y-4"><div><Progress value={Math.min(100, (totalBandwidth / 1000) * 100)} /><p className="text-xs text-muted-foreground mt-2">Recomendación: {totalBandwidth > 1000 ? '10 Gigabit Ethernet' : 'Gigabit Ethernet'}</p></div></CardContent></Card></TabsContent>
        <TabsContent value="storage" className="space-y-4"><Card><CardHeader><CardTitle>Cálculo de Almacenamiento</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-4"><div className="text-center p-4 bg-muted/50 rounded-lg"><div className="text-2xl font-bold">{(storagePerDay / 1024).toFixed(1)}</div><div className="text-xs text-muted-foreground">GB/día</div></div><div className="text-center p-4 bg-muted/50 rounded-lg"><div className="text-2xl font-bold">{(storagePerDay * 7 / 1024).toFixed(1)}</div><div className="text-xs text-muted-foreground">GB/semana</div></div><div className="text-center p-4 bg-muted/50 rounded-lg"><div className="text-2xl font-bold">{(storagePerDay * 30 / 1024).toFixed(1)}</div><div className="text-xs text-muted-foreground">GB/mes</div></div></CardContent></Card></TabsContent>
        <TabsContent value="cameras" className="space-y-4"><Card><CardHeader><CardTitle>Inventario</CardTitle></CardHeader><CardContent>{cameras.length === 0 ? (<p className="text-sm text-muted-foreground">No hay cámaras</p>) : (<div className="space-y-2">{cameras.map((c, i) => (<div key={c.id} className="p-3 border rounded"><div className="font-semibold text-sm">{c.name}</div><div className="text-xs text-muted-foreground capitalize">{c.type} - {c.resolution}</div></div>))}</div>)}</CardContent></Card></TabsContent>
        <TabsContent value="specs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Especificaciones Técnicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Genera un documento Markdown con el resumen técnico del diseño actual.
              </p>
              <button
                type="button"
                onClick={handleExportSpecs}
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
              >
                Exportar especificaciones (.md)
              </button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
