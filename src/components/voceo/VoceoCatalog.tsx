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
import { Search, Plus, Edit, Trash2, ImagePlus, Megaphone, Volume2, LayoutGrid } from 'lucide-react'
import { useCatalog } from '@/lib/catalog/useCatalog'
import type { CatalogModel } from '@/lib/catalog/types'
import { useToast } from '@/hooks/use-toast'
import { ImportDialog } from '@/components/catalog/ImportDialog'
import { BulkImageUploadDialog } from '@/components/catalog/BulkImageUploadDialog'
import { inferVoceoDeviceType, type VoceoDeviceType } from '@/lib/voceo/device'
import { getVoceoColor } from '@/lib/voceo/iconRegistry'

export type { VoceoDeviceType }

interface VoceoCatalogProps {
  onAddDevice?: (type: VoceoDeviceType, modelId?: string, modelName?: string) => void
  onAddDeviceWithoutLegend?: (type: VoceoDeviceType, modelId?: string, modelName?: string) => void
  onPickModel?: (model: any) => void
  disabled?: boolean
  compact?: boolean
}

export const VOCEO_DEVICES = [
  {
    id: 'ceiling-speaker-8w',
    name: 'Bocina de Techo 8W',
    type: 'speaker' as const,
    image: 'https://via.placeholder.com/120x90?text=Speaker+8W',
    specs: [
      'Impedancia 8Ω / 70V',
      'Rango: 90Hz–18kHz',
      'Montaje empotrado'
    ],
    priceUSD: 18,
    availability: 'Stock inmediato'
  },
  {
    id: 'outdoor-horn-15w',
    name: 'Corneta Exterior 15W',
    type: 'horn' as const,
    image: 'https://via.placeholder.com/120x90?text=Horn+15W',
    specs: [
      'IP65 resistente a intemperie',
      'Cobertura direccional',
      '70/100V seleccionable'
    ],
    priceUSD: 32,
    availability: 'Stock inmediato'
  },
  {
    id: 'voceo-panel-basic',
    name: 'Panel de Voceo Básico',
    type: 'panel' as const,
    image: 'https://via.placeholder.com/120x90?text=Voceo+Panel',
    specs: [
      'Selector de zonas',
      'Entrada de micrófono',
      'Salidas 70/100V'
    ],
    priceUSD: 75,
    availability: 'Bajo pedido (3-5 días)'
  },
  {
    id: 'ip-paging-server',
    name: 'IP Paging Server - Servidor IP para sistemas de voceo',
    type: 'panel' as const,
    image: 'https://via.placeholder.com/120x90?text=IP+Paging+Server',
    specs: [
      'CPU: Intel Core I3 Haswell SOC 4005U',
      'Memoria: DDR3L SO-DIMM (hasta 8GB)',
      'Protocolos de Audio: SIP 2.0, HTTP, MQTT, G.711, G.722, G.729',
      'Protocolos de Red: TCP/IP, DHCP, SNMP',
      'Streaming: RTP, RTSP, Unicast, Multicast, PoE, VPN',
      'Seguridad: HTTPS, VPN, SSH, Encriptación, 802.1x'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  },
  {
    id: 'sxc001',
    name: 'SXC001 - Parlante de techo',
    type: 'speaker' as const,
    image: 'https://via.placeholder.com/120x90?text=SXC001',
    specs: [
      'Potencia: 10W/15W',
      'Frecuencia: 70Hz-20KH',
      'Dimensiones: ø235mm'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  },
  {
    id: 'sxw001',
    name: 'SXW001 - Parlante de pared',
    type: 'speaker' as const,
    image: 'https://via.placeholder.com/120x90?text=SXW001',
    specs: [
      'Potencia: 10W/15W',
      'Frecuencia: 110Hz-20KHz',
      'Dimensiones: 260x180x122mm'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  },
  {
    id: 'sxwe02',
    name: 'SXWE02 - Bocina exterior',
    type: 'horn' as const,
    image: 'https://via.placeholder.com/120x90?text=SXWE02',
    specs: [
      'Potencia: 20W',
      'Frecuencia: 350Hz-5KHz',
      'Dimensiones: 205x283x256mm'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  },
  {
    id: 'rcu-ip',
    name: 'RCU-IP - Terminal de llamado de enfermera',
    type: 'panel' as const,
    image: 'https://via.placeholder.com/120x90?text=RCU-IP',
    specs: [
      'Alimentación: PoE/12V',
      'Audio: 2W',
      'Micrófono integrado'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  },
  {
    id: 'dtl-enf',
    name: 'DTL-ENF - Luminaria para sistema de llamado',
    type: 'panel' as const,
    image: 'https://via.placeholder.com/120x90?text=DTL-ENF',
    specs: [
      'Alimentación: 12V',
      'LED RGB'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  },
  {
    id: 'ipac18',
    name: 'IPAC18 - Placa PCB para integración',
    type: 'panel' as const,
    image: 'https://via.placeholder.com/120x90?text=IPAC18',
    specs: [
      'Dimensiones: 71x60mm',
      'Alimentación: 12VDC'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  },
  {
    id: 'ipac19',
    name: 'IPAC19 - Placa PCB para audio multizona',
    type: 'panel' as const,
    image: 'https://via.placeholder.com/120x90?text=IPAC19',
    specs: [
      'Dimensiones: 100x110mm',
      'Alimentación: 12VDC/PoE'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  },
  {
    id: 'ca88',
    name: 'CA88 - Placa PCB para seguridad integrada',
    type: 'panel' as const,
    image: 'https://via.placeholder.com/120x90?text=CA88',
    specs: [
      'Dimensiones: 100x110mm',
      'Alimentación: 12-24VDC/PoE'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  },
  {
    id: 'panel-control',
    name: 'Panel Control - Módulo de estadísticas del sistema',
    type: 'panel' as const,
    image: 'https://via.placeholder.com/120x90?text=Panel+Control',
    specs: [
      'Tiempos de respuesta',
      'Log de eventos',
      'Reportes',
      'Históricos',
      'Exportación',
      'Filtros'
    ],
    priceUSD: 0,
    availability: 'Bajo pedido'
  }
] satisfies Array<{
  id: string
  name: string
  type: VoceoDeviceType
  image: string
  specs: string[]
  priceUSD: number
  availability: string
}>

export default function VoceoCatalog({ disabled = false, onAddDevice, onAddDeviceWithoutLegend, onPickModel, compact = false }: VoceoCatalogProps) {
  const { items, add, update, remove } = useCatalog('voceo')
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
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return `voc-${Date.now()}-${Math.floor(Math.random() * 100000)}`
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
                          setItemToDelete(m)
                          setDeleteConfirmText('')
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
                          const target = e.target as HTMLImageElement
                          const modelUpper = `${m.modelo.toUpperCase()}.png`
                          const modelExact = `${m.modelo}.png`
                          const modelLower = `${m.modelo.toLowerCase()}.png`
                          const codeUpper = `${m.codigo.toUpperCase()}.png`
                          const codeExact = `${m.codigo}.png`
                          const codeLower = `${m.codigo.toLowerCase()}.png`
                          if (target.src.endsWith(modelUpper)) {
                            target.src = `/FOTOS_SISTEMAS/${m.codigo.toUpperCase()}.png`
                          } else if (target.src.endsWith(codeUpper)) {
                            target.src = `/FOTOS_SISTEMAS/${m.modelo}.png`
                          } else if (target.src.endsWith(modelExact)) {
                            target.src = `/FOTOS_SISTEMAS/${m.codigo}.png`
                          } else if (target.src.endsWith(codeExact)) {
                            target.src = `/FOTOS_SISTEMAS/${m.modelo.toLowerCase()}.png`
                          } else if (target.src.endsWith(modelLower)) {
                            target.src = `/FOTOS_SISTEMAS/${m.codigo.toLowerCase()}.png`
                          } else if (target.src.endsWith(codeLower)) {
                            target.src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
                            target.className = 'object-contain w-8 h-8 opacity-50'
                          } else {
                            target.src = `/FOTOS_SISTEMAS/${m.modelo.toUpperCase()}.png`
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

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="voceo" />
      <BulkImageUploadDialog open={imageUploadOpen} onOpenChange={setImageUploadOpen} />
    </div>
  )
}
