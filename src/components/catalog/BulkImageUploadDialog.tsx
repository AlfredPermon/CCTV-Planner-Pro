'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'

interface BulkImageUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkImageUploadDialog({ open, onOpenChange }: BulkImageUploadDialogProps) {
  const { toast } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ name: string; status: 'success' | 'error'; error?: string }[]>([])

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    const validFiles = Array.from(selectedFiles).filter(f => f.type.startsWith('image/'))
    setFiles(prev => [...prev, ...validFiles])
  }

  const uploadImages = async () => {
    if (files.length === 0) return
    setUploading(true)
    setProgress(0)
    setResults([])

    const chunkSize = 10 // Subir en lotes
    let completed = 0
    const newResults: typeof results = []

    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize)
      const formData = new FormData()
      chunk.forEach(f => formData.append('files', f))

      try {
        const res = await fetch('/api/upload-images', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (res.ok) {
          chunk.forEach(f => newResults.push({ name: f.name, status: 'success' }))
        } else {
          chunk.forEach(f => newResults.push({ name: f.name, status: 'error', error: data.error || 'Error' }))
        }
      } catch (err: any) {
        chunk.forEach(f => newResults.push({ name: f.name, status: 'error', error: err.message }))
      }
      completed += chunk.length
      setProgress(Math.round((completed / files.length) * 100))
    }

    setResults(newResults)
    setUploading(false)
    toast({ title: 'Subida completada', description: `Se procesaron ${files.length} imágenes.` })
  }

  const handleClose = () => {
    if (!uploading) {
      setFiles([])
      setResults([])
      setProgress(0)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Subir Imágenes de Modelos</DialogTitle>
          <DialogDescription>
            Sube las imágenes de los dispositivos. Asegúrate de que el nombre del archivo coincida con el modelo (ej. <code>FD9166-HN.png</code> o <code>FD9166-HN.jpg</code>).
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div
            className="border-2 border-dashed rounded-md p-8 text-center shrink-0 hover:border-primary transition-colors cursor-pointer"
            onClick={() => document.getElementById('bulk-image-upload-input')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFiles(e.dataTransfer.files)
            }}
          >
            <div className="text-sm text-muted-foreground">Arrastra y suelta imágenes aquí o haz clic para seleccionar</div>
            <Input 
              id="bulk-image-upload-input" 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={(e) => handleFiles(e.target.files)} 
            />
          </div>

          {files.length > 0 && (
            <div className="flex-1 flex flex-col gap-2 min-h-50">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Imágenes seleccionadas: {files.length}</span>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={uploading}>Limpiar</Button>
              </div>
              
              <ScrollArea className="flex-1 border rounded-md p-2">
                <div className="space-y-1">
                  {files.map((f, i) => {
                    const result = results.find(r => r.name === f.name)
                    return (
                      <div key={i} className="flex justify-between items-center text-xs p-1 border-b last:border-0">
                        <span className="truncate">{f.name}</span>
                        {result ? (
                          <span className={result.status === 'success' ? 'text-green-600' : 'text-destructive'}>
                            {result.status === 'success' ? '✓ Subido' : `✗ ${result.error}`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {uploading && (
            <div className="space-y-2 shrink-0">
              <div className="flex justify-between text-xs">
                <span>Subiendo...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>Cerrar</Button>
          <Button onClick={uploadImages} disabled={uploading || files.length === 0 || results.length === files.length}>
            {uploading ? 'Subiendo...' : 'Subir imágenes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
