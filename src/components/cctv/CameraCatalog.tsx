'use client'
import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Search, Plus, Edit, Trash2, ImagePlus } from 'lucide-react'
import { useCatalog } from '@/lib/catalog/useCatalog'
import type { CatalogModel } from '@/lib/catalog/types'
import type { Camera } from '@/lib/cctv/types'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/catalog/ImportDialog'
import { BulkImageUploadDialog } from '@/components/catalog/BulkImageUploadDialog'

export const VIVOTEK_CAMERAS = [
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
  },
  {
    id: 'fd9387-ehtv-v3',
    model: 'FD9387-EHTV-V3',
    type: 'dome',
    series: 'V-Series',
    resolution: '5MP',
    fps: 30,
    focalLength: '2.7-13.5mm',
    fov: 109,
    ir: '50m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: 'Cámara IP domo exterior 5 MP, Lente varifocal 2.7-13.5mm, IR 50mts, Real Sight Engine IA'
  },
  {
    id: 'ib9383-htv',
    model: 'IB9383-HTV',
    type: 'bullet',
    series: 'V-Series',
    resolution: '5MP',
    fps: 30,
    focalLength: '2.8-12mm',
    fov: 90,
    ir: '30m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: 'Cámara IP bullet exterior 5 MP'
  },
  {
    id: 'ib9387-ehtv-v3',
    model: 'IB9387-EHTV-V3',
    type: 'bullet',
    series: 'V-Series',
    resolution: '5MP',
    fps: 30,
    focalLength: '2.7-13.5mm',
    fov: 109,
    ir: '50m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: 'Cámara IP bullet exterior 5 MP, Lente varifocal 2.7-13.5mm, IR II 50mts'
  },
  {
    id: 'ib9387-lpr-v3',
    model: 'IB9387-LPR-V3',
    type: 'bullet',
    series: 'V-Series',
    resolution: '5MP',
    fps: 30,
    focalLength: '2.7-13.5mm',
    fov: 109,
    ir: '50m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: 'Cámara IP bullet exterior ANPR 5 MP, lente varifocal 2.7-13.5mm, WDR PRO'
  },
  {
    id: 'fe9382-ehv-v2',
    model: 'FE9382-EHV-v2',
    type: 'fisheye',
    series: 'F-Series',
    resolution: '6MP',
    fps: 30,
    focalLength: '1.6mm',
    fov: 360,
    ir: '20m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: 'Cámara IP fisheye exterior 6 MP, panorámica 360º, Smart IR II 20m, Deep Search, WDR Pro, Smart VCA, Stream III'
  },
  {
    id: 'cc9381-hv-v2',
    model: 'CC9381-HV-v2',
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
    description: 'Cámara IP panorámica exterior de 5 MP con visión 180º, Smart IR 15 Mts, IP66'
  },
  {
    id: 'ms9390-ehv-v2',
    model: 'MS9390-EHV-v2',
    type: 'panoramic',
    series: 'M-Series',
    resolution: '8MP (4K)',
    fps: 30,
    focalLength: '2.8mm',
    fov: 180,
    ir: '20m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: 'Cámara IP panorámica exterior 8 MP (4K) de 180°, con IR 20m, WDR Pro, Visión SNV, además micrófono integrado'
  },
  {
    id: 'ms9321-ehv-v2',
    model: 'MS9321-EHV-v2',
    type: 'panoramic',
    series: 'M-Series',
    resolution: '20MP',
    fps: 30,
    focalLength: '3.8mm',
    fov: 180,
    ir: '30m',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: 'Cámara IP panorámica exterior 20 MP, 4 lentes fijos 3.8mm, Smart IR 30mts, WDR PRO, Audio, Smart VCA'
  },
  {
    id: 'sc9133-rlt',
    model: 'SC9133-RLT',
    type: 'fisheye',
    series: 'S-Series',
    resolution: '3MP',
    fps: 30,
    focalLength: '1.6mm',
    fov: 360,
    ir: '—',
    wdr: 'WDR Pro',
    ipRating: 'IP66',
    power: 'PoE',
    description: 'Cámara IP con analítico de conteo de personas integrado de IA 3 MP, con vista hemisférica 360º, Protección IP66, IK10'
  },
  {
    id: 'sd9384-ehl',
    model: 'SD9384-EHL',
    type: 'ptz',
    series: 'S-Series',
    resolution: '5MP',
    fps: 60,
    focalLength: '4.3-129mm',
    fov: 60,
    ir: '200m',
    wdr: 'WDR Pro',
    ipRating: 'IP66/IK10',
    power: 'PoE+',
    description: 'Cámara IP PTZ Exterior 5 MP con Zoom Óptico 30x, Smart IR 200m y Tracking, Protección Nema4X/IP66/IK10'
  },
  {
    id: 'sd9383-ehl',
    model: 'SD9383-EHL',
    type: 'ptz',
    series: 'S-Series',
    resolution: '5MP',
    fps: 60,
    focalLength: '4.3-129mm',
    fov: 60,
    ir: '200m',
    wdr: 'WDR Pro',
    ipRating: 'IP66/IK10',
    power: 'PoE+',
    description: 'Cámara IP PTZ Exterior 5 MP con Zoom Óptico'
  },
  {
    id: 'sd9394-ehl',
    model: 'SD9394-EHL',
    type: 'ptz',
    series: 'S-Series',
    resolution: '8MP',
    fps: 60,
    focalLength: '4.8-154mm',
    fov: 60,
    ir: '250m',
    wdr: 'WDR Pro',
    ipRating: 'IP66/IK10',
    power: 'PoE+',
    description: 'Cámara IP PTZ Exterior 8 MP, 32x Zoom Óptico, Smart IR 250mts, Protección Nema4X, IP66, IK10, WDR Pro, Smart Tracking'
  }
]

interface CameraCatalogProps {
  onAddCamera?: (type: Camera['type'], modelId?: string, modelName?: string) => void
  onAddCameraWithoutLegend?: (type: Camera['type'], modelId?: string, modelName?: string) => void
  onPickModel?: (model: any) => void
  detailed?: boolean
  disabled?: boolean
  compact?: boolean
}

export default function CameraCatalog({ onAddCamera, onPickModel, detailed = true, disabled = false, compact = false }: CameraCatalogProps) {
  const { items, add, update, remove } = useCatalog('cameras')
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [imageUploadOpen, setImageUploadOpen] = useState(false)
  const [current, setCurrent] = useState<CatalogModel | null>(null)
  const [form, setForm] = useState<Omit<CatalogModel, 'id'>>({ marca: '', modelo: '', codigo: '', descripcion: '', notas: '' })
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<CatalogModel | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(m =>
      m.marca.toLowerCase().includes(q) ||
      m.modelo.toLowerCase().includes(q) ||
      m.codigo.toLowerCase().includes(q)
    )
  }, [items, query])

  function resetForm() {
    setForm({ marca: '', modelo: '', codigo: '', descripcion: '', notas: '' })
    setImageFile(null)
    setError(null)
  }

  function validRequired(f: Omit<CatalogModel, 'id'>) {
    return f.marca.trim() && f.modelo.trim() && f.codigo.trim()
  }

  async function uploadImage(file: File, filename: string) {
    const formData = new FormData()
    formData.append('files', file)
    formData.append(`filename_${file.name}`, `${filename}.png`)
    const res = await fetch('/api/upload-images', {
      method: 'POST',
      body: formData
    })
    if (!res.ok) {
      throw new Error('Error al subir la imagen')
    }
  }

  function genId(): string {
    // No comments allowed: generate a reasonably unique id
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return `cam-${Date.now()}-${Math.floor(Math.random() * 100000)}`
  }

  function openCreate() {
    resetForm()
    setCreateOpen(true)
  }

  function openEdit(m: CatalogModel) {
    setCurrent(m)
    setForm({ marca: m.marca, modelo: m.modelo, codigo: m.codigo, descripcion: m.descripcion ?? '', notas: m.notas ?? '' })
    setEditOpen(true)
    setError(null)
  }

  async function submitCreate() {
    if (!validRequired(form)) {
      setError('Marca, modelo y código son obligatorios.')
      toast({ title: 'Validación fallida', description: 'Marca, modelo y código son obligatorios.', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      if (imageFile) {
        await uploadImage(imageFile, form.modelo)
      }
      add({ id: genId(), ...form })
      setCreateOpen(false)
      resetForm()
      toast({ title: 'Creación exitosa', description: 'El modelo fue creado correctamente.' })
    } catch (e: any) {
      setError(e?.message || 'Error al crear el modelo.')
      toast({ title: 'Error', description: e?.message || 'Error al crear el modelo.', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  async function submitEdit() {
    if (!current) return
    if (!validRequired(form)) {
      setError('Marca, modelo y código son obligatorios.')
      toast({ title: 'Validación fallida', description: 'Marca, modelo y código son obligatorios.', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      if (imageFile) {
        await uploadImage(imageFile, form.modelo)
      }
      update(current.id, { ...form })
      setEditOpen(false)
      setCurrent(null)
      resetForm()
      toast({ title: 'Actualización exitosa', description: 'El modelo fue actualizado correctamente.' })
    } catch (e: any) {
      setError(e?.message || 'Error al actualizar el modelo.')
      toast({ title: 'Error', description: e?.message || 'Error al actualizar el modelo.', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  function onDelete(id: string) {
    remove(id)
    toast({ title: 'Eliminación exitosa', description: 'El modelo fue eliminado correctamente.' })
  }

  return (
    <div className={compact ? 'flex flex-col h-full' : 'space-y-4 p-1'}>
      {/* Barra de herramientas */}
      <div className={compact ? 'flex flex-col gap-2 p-3 border-b border-border/60 shrink-0' : 'flex flex-wrap items-center gap-2'}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, modelo o código"
            className="pl-9 text-xs h-8 sm:h-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button onClick={openCreate} disabled={disabled} size="sm" className="h-8 text-xs px-2.5">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nuevo modelo
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)} disabled={disabled} size="sm" className="h-8 text-xs px-2.5">
            Importar Excel
          </Button>
          <Button variant="outline" onClick={() => setImageUploadOpen(true)} disabled={disabled} size="sm" className="h-8 w-8 p-0" title="Subir imágenes para los modelos">
            <ImagePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className={compact ? 'flex-1 p-3' : 'h-80 md:h-105 lg:h-130 pr-1 md:pr-2'}>
        <div className="grid grid-cols-1 gap-3 w-full">
          {filtered.map((m) => (
            <Card key={m.id} className="hover:border-primary transition-all w-full overflow-hidden">
              <CardContent className="p-3">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold truncate">{m.marca} — {m.modelo}</div>
                      <div className="text-[11px] text-muted-foreground truncate">Código: {m.codigo}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(m)} disabled={disabled} className="h-7 w-7 p-0" title="Editar">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={disabled}
                        className="h-7 w-7 p-0"
                        title="Eliminar"
                        onClick={() => {
                          setItemToDelete(m);
                          setDeleteConfirmText('');
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-muted/30 rounded-md border flex items-center justify-center overflow-hidden">
                      <img
                        src={`/FOTOS_SISTEMAS/${m.modelo.toUpperCase()}.png`}
                        alt={m.modelo}
                        className="object-contain w-full h-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.endsWith(`${m.modelo.toUpperCase()}.png`)) {
                            target.src = `/FOTOS_SISTEMAS/${m.modelo}.png`;
                          }
                          else if (target.src.endsWith(`${m.modelo}.png`)) {
                            target.src = `/FOTOS_SISTEMAS/${m.modelo.toLowerCase()}.png`;
                          }
                          else {
                            target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>';
                            target.className = 'object-contain w-8 h-8 opacity-50';
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {m.descripcion && <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed" title={m.descripcion}>{m.descripcion}</div>}
                        {m.notas && <div className="text-[10px] mt-1 text-primary/80 font-medium truncate">{m.notas}</div>}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2.5"
                          disabled={disabled || !onPickModel}
                          onClick={() => {
                            if (onPickModel) onPickModel(m)
                          }}
                          title="Sembrar dispositivo haciendo clic en el plano (ESC para cancelar)"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Sembrar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground px-2">Sin resultados</div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo modelo</DialogTitle>
            <DialogDescription>Completa los datos del modelo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Marca" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            <Input placeholder="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            <Input placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            <Input placeholder="Descripción (opcional)" value={form.descripcion ?? ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            <Input placeholder="Notas (opcional)" value={form.notas ?? ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            <div className="space-y-1">
              <label className="text-xs font-medium">Imagen del modelo (opcional)</label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
            {error && <div className="text-xs text-destructive">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={uploading}>Cancelar</Button>
            <Button onClick={submitCreate} disabled={uploading}>{uploading ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar modelo</DialogTitle>
            <DialogDescription>Actualiza los datos del modelo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Marca" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            <Input placeholder="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            <Input placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            <Input placeholder="Descripción (opcional)" value={form.descripcion ?? ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            <Input placeholder="Notas (opcional)" value={form.notas ?? ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            <div className="space-y-1">
              <label className="text-xs font-medium">Actualizar imagen (opcional)</label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
            {error && <div className="text-xs text-destructive">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={uploading}>Cancelar</Button>
            <Button onClick={submitEdit} disabled={uploading}>{uploading ? 'Guardando...' : 'Guardar cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Para eliminar el modelo <strong>{itemToDelete?.modelo}</strong>, escribe "ELIMINAR" a continuación para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Escribe ELIMINAR"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToDelete(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== 'ELIMINAR'}
              onClick={() => {
                if (itemToDelete) onDelete(itemToDelete.id);
                setItemToDelete(null);
                setDeleteConfirmText('');
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="cameras" />
      <BulkImageUploadDialog open={imageUploadOpen} onOpenChange={setImageUploadOpen} />
    </div>
  )
}
