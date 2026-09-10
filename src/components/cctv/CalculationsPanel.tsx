'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Network, HardDrive } from 'lucide-react'
import type { Camera, FloorPlan } from '@/lib/cctv/types'
import { computeCoveragePercent } from '@/lib/cctv/geometry'
import { generateSpecsMarkdown } from '@/lib/cctv/specs'

import { calculateDRI } from '@/lib/cctv/coverage'

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
      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Cámaras</CardTitle><div className="text-3xl font-bold">{cameras.length}</div></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Ancho de Banda</CardTitle><div className="text-3xl font-bold">{totalBandwidth.toFixed(1)}</div><p className="text-xs text-muted-foreground">Mbps total</p></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Almacenamiento Diario</CardTitle><div className="text-3xl font-bold">{(storagePerDay / 1024).toFixed(1)}</div><p className="text-xs text-muted-foreground">GB por día</p></CardHeader></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Cobertura Aproximada</CardTitle><div className="text-3xl font-bold">{coverage}%</div><p className="text-xs text-muted-foreground">Área del plano cubierta</p></CardHeader></Card>
      </div>
      <Tabs defaultValue="dri" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dri">Cobertura DRI</TabsTrigger>
          <TabsTrigger value="bandwidth">Red</TabsTrigger>
          <TabsTrigger value="storage">Almacenamiento</TabsTrigger>
          <TabsTrigger value="cameras">Cámaras</TabsTrigger>
          <TabsTrigger value="specs">Especificaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="dri" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cálculo de Distancias de Cobertura según Norma EN 62676-4 (DRI)</CardTitle>
            </CardHeader>
            <CardContent>
              {cameras.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay cámaras en el lienzo para calcular cobertura.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground text-left">
                        <th className="p-2">Cámara</th>
                        <th className="p-2">Modelo / Tipo</th>
                        <th className="p-2">Focal</th>
                        <th className="p-2">Sensor</th>
                        <th className="p-2 text-center text-amber-600 font-bold">Identificación (I)</th>
                        <th className="p-2 text-center text-yellow-600 font-bold">Reconocimiento (R)</th>
                        <th className="p-2 text-center text-emerald-600 font-bold">Observación (O)</th>
                        <th className="p-2 text-center text-sky-600 font-bold">Detección (D)</th>
                      </tr>
                      <tr className="border-b text-xs text-muted-foreground/70 bg-muted/20 text-center">
                        <th colSpan={4} className="p-1 text-left">Píxeles por Metro (PPM)</th>
                        <th className="p-1">250 px/m</th>
                        <th className="p-1">125 px/m</th>
                        <th className="p-1">63 px/m</th>
                        <th className="p-1">25 px/m</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cameras.map((c) => {
                        const dri = calculateDRI({
                          rh: c.horizontalRes || c.resolution,
                          focalMm: c.focalLength,
                          sensorWidthMm: c.sensorWidth,
                          sensorFormat: c.sensorFormat,
                          cameraType: c.type
                        })
                        return (
                          <tr key={c.id} className="border-b hover:bg-muted/20 transition-colors">
                            <td className="p-2 font-medium">{c.name}</td>
                            <td className="p-2 text-xs capitalize">{c.modelName || c.type} ({c.resolution})</td>
                            <td className="p-2 text-xs">{dri.focalMm} mm</td>
                            <td className="p-2 text-xs">{dri.sensorFormat} ({dri.sensorWidthMm}mm)</td>
                            <td className="p-2 text-center font-semibold text-amber-700 bg-amber-50/40 dark:bg-amber-950/20">{dri.identificationMeters.toFixed(1)} m</td>
                            <td className="p-2 text-center font-semibold text-yellow-700 bg-yellow-50/40 dark:bg-yellow-950/20">{dri.recognitionMeters.toFixed(1)} m</td>
                            <td className="p-2 text-center font-semibold text-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20">{dri.observationMeters.toFixed(1)} m</td>
                            <td className="p-2 text-center font-semibold text-sky-700 bg-sky-50/40 dark:bg-sky-950/20">{dri.detectionMeters.toFixed(1)} m</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
