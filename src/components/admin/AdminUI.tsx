'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, Save, Shield, Lock, Activity, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Role = 'ADMIN' | 'EDITOR' | 'VIEWER'

type UploadLog = {
  id: string
  fileName: string
  date: Date
  status: 'success' | 'error'
  details: string
}

type CleanupSummary = {
  dryRun: boolean
  deleted: {
    detalle_calculos: number
    proyectos_calculos: number
    audit_log: number
  }
  protectedCatalogs: Record<string, { components: number; quotes: number }>
}

export default function AdminUI() {
  const { toast } = useToast()
  const [role, setRole] = useState<Role>('ADMIN') // Simulación de rol actual
  const [uploading, setUploading] = useState(false)
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([])
  const [cleanupRunning, setCleanupRunning] = useState(false)
  const [cleanupSummary, setCleanupSummary] = useState<CleanupSummary | null>(null)
  
  // Estado para edición unitaria (mock data inicial)
  const [items, setItems] = useState([
    { codigo: 'CAM-001', descripcion: 'Cámara IP Domo 4MP', costo: 120.50, proveedor: 'Hikvision' },
    { codigo: 'CBL-CAT6', descripcion: 'Cable UTP Cat6 Bobina 305m', costo: 180.00, proveedor: 'Panduit' },
    { codigo: 'ACC-CTRL', descripcion: 'Controladora 2 Puertas', costo: 450.00, proveedor: 'ZKTeco' },
  ])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (role === 'VIEWER') {
      toast({ title: 'Acceso Denegado', description: 'No tiene permisos para cargar archivos', variant: 'destructive' })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/quotes/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (res.ok) {
        toast({ title: 'Carga Exitosa', description: `Se procesaron ${data.inserted} registros.` })
        setUploadLogs(prev => [{
          id: Math.random().toString(36),
          fileName: file.name,
          date: new Date(),
          status: 'success',
          details: `Insertados: ${data.inserted}`
        }, ...prev])
      } else {
        toast({ title: 'Error', description: data.error || 'Error en carga', variant: 'destructive' })
        setUploadLogs(prev => [{
          id: Math.random().toString(36),
          fileName: file.name,
          date: new Date(),
          status: 'error',
          details: data.error || 'Error desconocido'
        }, ...prev])
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Fallo de conexión', variant: 'destructive' })
      setUploadLogs(prev => [{
        id: Math.random().toString(36),
        fileName: file.name,
        date: new Date(),
        status: 'error',
        details: 'Fallo de red o servidor'
      }, ...prev])
    } finally {
      setUploading(false)
      // Reset input value to allow uploading same file again
      e.target.value = ''
    }
  }

  const handlePriceUpdate = (idx: number, newPrice: string) => {
    if (role === 'VIEWER') return
    const newItems = [...items]
    newItems[idx].costo = parseFloat(newPrice) || 0
    setItems(newItems)
  }

  const saveChanges = async () => {
    if (role !== 'ADMIN' && role !== 'EDITOR') return
    // Aquí iría la llamada al API unitaria
    // await fetch('/api/quotes/update', ...)
    toast({ title: 'Guardado', description: 'Cambios aplicados correctamente' })
  }

  const runSafeCleanup = async (dryRun: boolean) => {
    if (role !== 'ADMIN') return

    setCleanupRunning(true)
    try {
      const res = await fetch('/api/admin/safe-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      })
      const data = await res.json()

      if (!res.ok) {
        const issueText = Array.isArray(data?.validation?.issues)
          ? data.validation.issues.map((issue: { scope: string; message: string }) => `${issue.scope}: ${issue.message}`).join(' | ')
          : null
        throw new Error(issueText || data?.error || 'No se pudo ejecutar la limpieza segura.')
      }

      const protectedCatalogs = Object.fromEntries(
        Object.entries(data.post?.protectedCatalogs ?? {}).map(([system, metrics]) => [
          system,
          {
            components: Number((metrics as { components?: number }).components ?? 0),
            quotes: Number((metrics as { quotes?: number }).quotes ?? 0),
          },
        ])
      )

      setCleanupSummary({
        dryRun: Boolean(data.dryRun),
        deleted: {
          detalle_calculos: Number(data.deleted?.detalle_calculos ?? 0),
          proyectos_calculos: Number(data.deleted?.proyectos_calculos ?? 0),
          audit_log: Number(data.deleted?.audit_log ?? 0),
        },
        protectedCatalogs,
      })

      toast({
        title: dryRun ? 'Validación completada' : 'Limpieza segura completada',
        description: dryRun
          ? 'La simulación confirmó que los catálogos protegidos permanecen intactos.'
          : 'Se limpiaron datos operativos y se validó la integridad de catálogos protegidos.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo ejecutar la limpieza segura.'
      toast({
        title: 'Limpieza segura fallida',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setCleanupRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Panel de Administración de Catálogos</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Simular Rol:</span>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Administrador</SelectItem>
              <SelectItem value="EDITOR">Editor</SelectItem>
              <SelectItem value="VIEWER">Consulta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Carga Masiva */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Actualización Masiva
            </CardTitle>
            <CardDescription>Cargue archivos Excel con nuevas listas de precios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4 hover:bg-muted/50 transition-colors relative cursor-pointer">
              {uploading ? (
                 <div className="flex flex-col items-center animate-pulse">
                   <Activity className="h-10 w-10 text-primary mb-2" />
                   <p className="text-sm">Procesando archivo...</p>
                 </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Arrastre un archivo o haga clic para cargar</p>
                    <p className="text-xs text-muted-foreground">Soporta .xlsx, .xls (Máx 5MB)</p>
                  </div>
                </>
              )}
              <Input 
                type="file" 
                accept=".xlsx, .xls" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileUpload}
                disabled={role === 'VIEWER' || uploading}
                title={role === 'VIEWER' ? "Solo lectura" : "Cargar archivo"}
              />
            </div>
            {role === 'VIEWER' && <Badge variant="destructive" className="mt-2 w-full justify-center">Modo Solo Lectura - Carga Deshabilitada</Badge>}
            
            <div className="mt-6 flex justify-between items-center border-t pt-4">
               <div className="text-xs text-muted-foreground">
                 {uploadLogs.length > 0 ? `Última carga: ${uploadLogs[0].date.toLocaleTimeString()}` : 'Sin actividad reciente'}
               </div>
               <Button variant="outline" size="sm" onClick={() => window.open('/api/quotes/template')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Plantilla
              </Button>
            </div>

            {/* Historial de Actividad */}
            {uploadLogs.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-3 w-3" /> Historial de Sesión</h4>
                <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                  {uploadLogs.map(log => (
                    <div key={log.id} className="flex items-start justify-between text-xs p-2 bg-muted/30 rounded border">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-30" title={log.fileName}>{log.fileName}</span>
                          <span className="text-muted-foreground">{log.details}</span>
                        </div>
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">{log.date.toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edición Unitaria Rápida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Edición Rápida
            </CardTitle>
            <CardDescription>Ajuste precios unitarios de items clave</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Proveedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.codigo}>
                    <TableCell className="font-medium">{item.codigo}</TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-xs text-muted-foreground">$</span>
                        <Input 
                          type="number" 
                          className="pl-6 h-8 w-24" 
                          value={item.costo}
                          onChange={(e) => handlePriceUpdate(idx, e.target.value)}
                          disabled={role === 'VIEWER'}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.proveedor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveChanges} disabled={role === 'VIEWER'}>
                Guardar Cambios
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {role === 'ADMIN' && (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Zona de Peligro (Solo Admin)
            </CardTitle>
            <CardDescription>
              Limpia únicamente datos operativos y excluye explícitamente catálogos protegidos de CCTV, Acceso, Voceo, Incendio y Parquímetro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" size="sm" onClick={() => runSafeCleanup(true)} disabled={cleanupRunning}>
                {cleanupRunning ? 'Validando...' : 'Validar limpieza segura'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => runSafeCleanup(false)} disabled={cleanupRunning}>
                {cleanupRunning ? 'Ejecutando...' : 'Ejecutar limpieza segura'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Se purgan únicamente tablas operativas: detalle_calculos, proyectos_calculos y audit_log.
            </p>
            {cleanupSummary && (
              <div className="rounded-md border bg-background/80 p-3 space-y-2 text-sm">
                <div className="font-medium">
                  {cleanupSummary.dryRun ? 'Última simulación' : 'Última ejecución'}:
                  {' '}
                  detalles {cleanupSummary.deleted.detalle_calculos},
                  {' '}
                  proyectos {cleanupSummary.deleted.proyectos_calculos},
                  {' '}
                  auditoría {cleanupSummary.deleted.audit_log}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Object.entries(cleanupSummary.protectedCatalogs).map(([system, metrics]) => (
                    <span key={system} className="mr-3 inline-block">
                      {system}: {metrics.components} componentes / {metrics.quotes} cotizaciones
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
