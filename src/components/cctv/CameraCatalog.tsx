'use client'
import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Video, Globe, ScanLine, RotateCw, Info, Check, Search } from 'lucide-react'
import type { Camera } from '@/app/page'

interface CameraCatalogProps { onAddCamera: (type: Camera['type']) => void; detailed?: boolean; disabled?: boolean }

// Mock Vivotek Camera Database - Reduced size for initial load
// In a real app, this would be fetched from an API
const VIVOTEK_CAMERAS = [
  {
    id: 'fd9166-hn',
    model: 'FD9166-HN',
    type: 'dome',
    series: 'F-Series',
    resolution: '2MP',
    fps: 30,
    focalLength: '2.8mm',
    fov: 109,
    ir: '10m',
    wdr: 'WDR Pro',
    ipRating: 'IP54',
    power: 'PoE',
    description: 'Ultra-mini Fixed Dome Network Camera'
  },
  {
    id: 'ib9360-h',
    model: 'IB9360-H',
    type: 'bullet',
    series: 'I-Series',
    resolution: '2MP',
    fps: 30,
    focalLength: '3.6mm',
    fov: 88,
    ir: '30m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: 'Mini Bullet Network Camera'
  },
  {
    id: 'fe9191',
    model: 'FE9191',
    type: 'fisheye',
    series: 'F-Series',
    resolution: '12MP',
    fps: 20,
    focalLength: '1.29mm',
    fov: 360,
    ir: '10m',
    wdr: 'WDR Pro',
    ipRating: 'IP54',
    power: 'PoE',
    description: 'H.265 Fisheye Network Camera'
  },
  {
    id: 'cc9381-hv',
    model: 'CC9381-HV',
    type: 'panoramic',
    series: 'C-Series',
    resolution: '5MP',
    fps: 30,
    focalLength: '1.45mm',
    fov: 180,
    ir: '15m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: '180° Panoramic Network Camera'
  },
  {
    id: 'sd9364-ehl',
    model: 'SD9364-EHL',
    type: 'ptz',
    series: 'S-Series',
    resolution: '2MP',
    fps: 60,
    focalLength: '4.3-129mm',
    fov: 60,
    ir: '150m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE+',
    description: 'Speed Dome Network Camera'
  }
] as const

const cameraTypes = [
  { type: 'dome' as const, name: 'Cámara Domo', description: 'Ideal para interiores', icon: Video, fov: 90 },
  { type: 'fisheye' as const, name: 'Ojo de Pez 360°', description: 'Visión panorámica completa', icon: Globe, fov: 360 },
  { type: 'bullet' as const, name: 'Cámara Bala', description: 'Para exteriores', icon: ScanLine, fov: 60 },
  { type: 'panoramic' as const, name: 'Panorámica 180°', description: 'Cobertura panorámica', icon: ScanLine, fov: 180 },
  { type: 'ptz' as const, name: 'PTZ', description: 'Control completo', icon: RotateCw, fov: 90 }
]

export default function CameraCatalog({ onAddCamera, detailed = false, disabled = false }: CameraCatalogProps) {
  if (detailed) {
    return (
      <ScrollArea className="h-80 md:h-105 lg:h-130 pr-1 md:pr-2">
        <div className="space-y-4">
          {VIVOTEK_CAMERAS.map((camera) => {
            const typeInfo = cameraTypes.find(t => t.type === camera.type) || cameraTypes[0]
            const Icon = typeInfo.icon
            return (
              <Card key={camera.id} className="cursor-pointer hover:border-primary transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg"><Icon className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{camera.model}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{camera.description}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => onAddCamera(camera.type as any)} disabled={disabled}>Agregar</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">{camera.resolution}</Badge>
                        <Badge variant="secondary" className="text-xs">{camera.series}</Badge>
                        <Badge variant="secondary" className="text-xs">FOV: {camera.fov}°</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="h-80 md:h-105 lg:h-130 pr-1 md:pr-2">
      <div className="space-y-4">
        {cameraTypes.map((camera) => {
          const Icon = camera.icon
          return (
            <Card key={camera.type} className="cursor-pointer hover:border-primary transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg"><Icon className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div><h4 className="font-semibold text-sm">{camera.name}</h4><p className="text-xs text-muted-foreground mt-1">{camera.description}</p></div>
                      {!detailed && (<Button size="sm" variant="outline" onClick={() => onAddCamera(camera.type)} disabled={disabled}>Agregar</Button>)}
                    </div>
                    <div className="flex items-center gap-2 mt-2"><Badge variant="secondary" className="text-xs">FOV: {camera.fov}°</Badge></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}
