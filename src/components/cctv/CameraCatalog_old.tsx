'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Video, Globe, ScanLine, RotateCw } from 'lucide-react'
import type { Camera } from '@/app/page'

interface CameraCatalogProps { onAddCamera: (type: Camera['type']) => void; detailed?: boolean }

const cameraTypes = [
  { type: 'dome' as const, name: 'Cámara Domo', description: 'Ideal para interiores', icon: Video, fov: 90 },
  { type: 'fisheye' as const, name: 'Ojo de Pez 360°', description: 'Visión panorámica completa', icon: Globe, fov: 360 },
  { type: 'bullet' as const, name: 'Cámara Bala', description: 'Para exteriores', icon: ScanLine, fov: 60 },
  { type: 'panoramic' as const, name: 'Panorámica 180°', description: 'Cobertura panorámica', icon: ScanLine, fov: 180 },
  { type: 'ptz' as const, name: 'PTZ', description: 'Control completo', icon: RotateCw, fov: 90 }
]

export default function CameraCatalog({ onAddCamera, detailed = false }: CameraCatalogProps) {
  return (
    <div className="space-y-4">
      {cameraTypes.map((camera, index) => {
        const Icon = camera.icon
        return (
          <div key={camera.type}>
            <Card className="cursor-pointer hover:border-primary transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg"><Icon className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div><h4 className="font-semibold text-sm">{camera.name}</h4><p className="text-xs text-muted-foreground mt-1">{camera.description}</p></div>
                      {!detailed && (<Button size="sm" variant="outline" onClick={() => onAddCamera(camera.type)}>Agregar</Button>)}
                    </div>
                    <div className="flex items-center gap-2 mt-2"><Badge variant="secondary" className="text-xs">FOV: {camera.fov}°</Badge></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {index < cameraTypes.length - 1 && !detailed && <div className="my-2 border-t" />}
          </div>
        )
      })}
    </div>
  )
}
