'use client'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import type { CatalogType, CatalogModel } from '@/lib/catalog/types'
import { parseExcel, mapRowToModel } from '@/lib/catalog/importExcel'
import { useCatalog } from '@/lib/catalog/useCatalog'

type ImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: CatalogType
}

type RowState = {
  model: CatalogModel
  error?: string
  status: 'pending' | 'valid' | 'invalid' | 'imported'
}

export function ImportDialog({ open, onOpenChange, type }: ImportDialogProps) {
  const { items, add } = useCatalog(type)
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<RowState[]>([])
  const [progress, setProgress] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [logUrl, setLogUrl] = useState<string | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    parseExcel(f).then(res => {
      if (!res.columnsValid) {
        toast({
          title: 'Validación fallida',
          description: `Faltan columnas: ${res.missingColumns.join(', ')}`,
          variant: 'destructive'
        })
        setRows([])
        return
      }
      const states: RowState[] = res.rows.map(r => {
        const m = mapRowToModel(r)
        if (!m.marca || !m.modelo || !m.codigo) {
          return { model: m, status: 'invalid', error: 'Campos obligatorios vacíos' }
        }
        const dup = items.some(it => it.codigo === m.codigo)
        if (dup) {
          return { model: m, status: 'invalid', error: 'Código duplicado' }
        }
        return { model: m, status: 'valid' }
      })
      setRows(states)
      toast({ title: 'Archivo cargado', description: 'Revisa el preview antes de importar' })
    })
  }, [items, toast])

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      if (logUrl) URL.revokeObjectURL(logUrl)
      setFile(null)
      setRows([])
      setProgress(0)
      setProcessing(false)
      setLogUrl(null)
    }
  }, [onOpenChange, logUrl])

  useEffect(() => {
    const el = dropRef.current
    if (!open || !el) return
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      el.classList.add('border-primary')
    }
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      el.classList.remove('border-primary')
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      el.classList.remove('border-primary')
      const f = e.dataTransfer?.files?.[0]
      if (f) handleFile(f)
    }
    el.addEventListener('dragover', onDragOver as any)
    el.addEventListener('dragleave', onDragLeave as any)
    el.addEventListener('drop', onDrop as any)
    return () => {
      el.removeEventListener('dragover', onDragOver as any)
      el.removeEventListener('dragleave', onDragLeave as any)
      el.removeEventListener('drop', onDrop as any)
    }
  }, [open])

  

  function generateLog(invalid: RowState[]) {
    const content = invalid.map(r => ({
      marca: r.model.marca,
      modelo: r.model.modelo,
      codigo: r.model.codigo,
      descripcion: r.model.descripcion,
      notas: r.model.notas,
      error: r.error || 'Error desconocido'
    }))
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    if (logUrl) URL.revokeObjectURL(logUrl)
    setLogUrl(url)
  }

  async function importAll() {
    const valid = rows.filter(r => r.status === 'valid')
    const invalid = rows.filter(r => r.status === 'invalid')
    if (invalid.length > 0) generateLog(invalid)
    setProcessing(true)
    const chunkSize = 50
    let imported = 0
    for (let i = 0; i < valid.length; i += chunkSize) {
      const chunk = valid.slice(i, i + chunkSize)
      for (const r of chunk) {
        try {
          await Promise.resolve(add(r.model))
          r.status = 'imported'
          imported++
        } catch (e: any) {
          r.status = 'invalid'
          r.error = String(e?.message || e)
          invalid.push(r)
        }
      }
      setProgress(Math.round((imported / valid.length) * 100))
      await new Promise(res => setTimeout(res, 50))
    }
    setProcessing(false)
    if (invalid.length) generateLog(invalid)
    toast({
      title: 'Importación completada',
      description: `Importados: ${imported}. Errores: ${invalid.length}.`
    })
  }

  const canImport = useMemo(() => rows.some(r => r.status === 'valid'), [rows])

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar desde Excel</DialogTitle>
          <DialogDescription>Arrastra tu archivo o selecciónalo para importar modelos al catálogo</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div
            ref={dropRef}
            className="border border-dashed rounded-md p-6 text-center shrink-0"
            role="button"
            tabIndex={0}
            aria-label="Zona de carga de archivo Excel"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('excel-upload')?.click() }}
          >
            <div className="text-sm text-muted-foreground">Arrastra y suelta el archivo aquí</div>
            <div className="my-2">o</div>
            <Input id="excel-upload" type="file" accept=".xlsx,.xls" onChange={onFileSelect} />
          </div>
          {processing && (
            <div className="space-y-2 shrink-0">
              <div className="text-sm">Procesando…</div>
              <Progress value={progress} />
            </div>
          )}
          {!!rows.length && (
            <ScrollArea className="flex-1 min-h-50 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">Marca</TableHead>
                    <TableHead className="w-[20%]">Modelo</TableHead>
                    <TableHead className="w-[15%]">Código</TableHead>
                    <TableHead className="w-[30%]">Descripción</TableHead>
                    <TableHead className="w-[10%]">Notas</TableHead>
                    <TableHead className="w-[10%]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{r.model.marca}</TableCell>
                      <TableCell>{r.model.modelo}</TableCell>
                      <TableCell>{r.model.codigo}</TableCell>
                      <TableCell className="truncate max-w-50" title={r.model.descripcion}>{r.model.descripcion}</TableCell>
                      <TableCell>{r.model.notas}</TableCell>
                      <TableCell className={r.status === 'invalid' ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                        {r.status}{r.error ? `: ${r.error}` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          {logUrl && (
            <div className="text-sm shrink-0">
              <a href={logUrl} download={`import-log-${type}.json`} className="text-primary underline">Descargar log de errores</a>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 shrink-0 mt-2">
          <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>Cerrar</Button>
          <Button onClick={importAll} disabled={!canImport || processing}>Confirmar importación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
