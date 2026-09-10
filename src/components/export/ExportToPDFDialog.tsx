'use client'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import {
  PdfOptions,
  exportSubsystemPdf,
  exportMultipleSubsystemsPdf,
  exportCoverPng,
  exportCoverSvg,
  generateSubsystemPreviewUrl,
  generateMultipleSubsystemsPreviewUrl,
} from '@/lib/pdf/export'
import { buildExportProjectData, type ExportProjectSnapshot } from '@/lib/pdf/exportProjectData'
import {
  validateExportProject,
  type ValidationResult,
  type ValidationIssue,
} from '@/lib/pdf/exportValidation'

const schema = z.object({
  orientation: z.enum(['portrait', 'landscape']),
  format: z.enum(['a4', 'letter', 'legal', 'tabloid', 'a3', 'b4']),
  marginTop: z.number().min(0).max(50),
  marginRight: z.number().min(0).max(50),
  marginBottom: z.number().min(0).max(50),
  marginLeft: z.number().min(0).max(50),
  imageQuality: z.number().min(0.1).max(1),
  title: z.string().optional(),
  companyName: z.string().optional(),
  subject: z.string().optional(),
  author: z.string().optional(),
  projectTitle: z.string().optional(),
  description: z.string().optional(),
  exportDesign: z.boolean(),
  exportCatalog: z.boolean(),
  exportCalculations: z.boolean(),
  subsystems: z.array(z.enum(['cctv', 'access', 'voceo', 'fire', 'cam_individual', 'parking'])),
  coverEnabled: z.boolean().optional(),
  coverBw: z.boolean().optional(),
  coverPrimaryColor: z.string().optional(),
  coverSecondaryColor: z.string().optional(),
  coverBgColor: z.string().optional(),
  coverFont: z.enum(['Helvetica','Arial','Roboto']).optional(),
  hideFovLines: z.boolean().optional(),
})

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectSnapshot?: Partial<ExportProjectSnapshot>
}

export function ExportToPDFDialog({ open, onOpenChange, projectSnapshot }: Props) {
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      orientation: 'portrait',
      format: 'a4',
      marginTop: 15,
      marginRight: 12,
      marginBottom: 15,
      marginLeft: 12,
      imageQuality: 0.92,
      exportDesign: true,
      exportCatalog: false,
      exportCalculations: false,
      subsystems: (() => {
        try {
          const saved = typeof window !== 'undefined' ? localStorage.getItem('pdf-subsystems') : null
          if (saved) {
            const arr = JSON.parse(saved)
            if (Array.isArray(arr) && arr.length > 0) return arr
          }
        } catch {}
        return ['cctv']
      })(),
      coverEnabled: true,
      coverBw: false,
      coverPrimaryColor: '#0f172a',
      coverSecondaryColor: '#334155',
      coverBgColor: '#ffffff',
      coverFont: 'Helvetica',
      title: 'Planificación CCTV',
      companyName: '',
      subject: '',
      author: '',
      projectTitle: '',
      description: '',
      hideFovLines: projectSnapshot?.hideFovLines ?? (typeof window !== 'undefined' && sessionStorage.getItem('cctv-hide-fov-lines') === '1'),
    },
    mode: 'onChange',
  })

  // Persistir selección de subsistemas
  const subsystems = form.watch('subsystems')
  if (subsystems) {
    try { localStorage.setItem('pdf-subsystems', JSON.stringify(subsystems)) } catch {}
  }

  const [isGenerating, setIsGenerating] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Validación instantánea del proyecto cada vez que cambia el snapshot
  // de subsistemas: muestra advertencias y errores antes de generar el
  // PDF para que el usuario pueda corregir antes de descargar.
  const projectSnapshotForValidation = useMemo(() => {
    try {
      return buildExportProjectData(
        projectSnapshot,
        typeof window !== 'undefined' ? window.localStorage : undefined
      )
    } catch {
      return null
    }
  }, [projectSnapshot])
  const validation: ValidationResult = useMemo(() => {
    if (!projectSnapshotForValidation) {
      return { ok: true, issues: [] }
    }
    return validateExportProject(projectSnapshotForValidation)
  }, [projectSnapshotForValidation])
  const selectedSubsystems = (form.watch('subsystems') ?? []) as ('cctv'|'access'|'voceo'|'fire'|'cam_individual'|'parking')[]
  const issueAppliesToSubsystem = (issue: ValidationIssue, subsystem: typeof selectedSubsystems[number]) => {
    const kindMap: Record<string, string> = {
      cctv: 'cameras',
      cam_individual: 'cameras',
      access: 'accessDevices',
      voceo: 'voceoDevices',
      fire: 'fireDevices',
      parking: 'parkingDevices',
    }
    const floorPlanFieldMap: Record<string, string[]> = {
      cctv: ['floorPlan'],
      cam_individual: ['floorPlan'],
      access: ['floorPlanAccess', 'floorPlan'],
      voceo: ['floorPlanVoceo', 'floorPlan'],
      fire: ['floorPlanFire', 'floorPlan'],
      parking: ['floorPlanParking', 'floorPlan'],
    }
    if (issue.kind) {
      return issue.kind === kindMap[subsystem]
    }
    if (issue.field) {
      const issueField = issue.field
      return floorPlanFieldMap[subsystem].some(field => issueField === field || issueField.startsWith(`${field}.`))
    }
    return true
  }
  const validationBySubsystem = useMemo(() => {
    if (!projectSnapshotForValidation) return {} as Record<string, ValidationIssue[]>
    const result: Record<string, ValidationIssue[]> = {}
    const subs = ['cctv', 'access', 'voceo', 'fire', 'cam_individual', 'parking'] as const
    for (const s of subs) {
      result[s] = validation.issues.filter(issue => issueAppliesToSubsystem(issue, s))
    }
    return result
  }, [projectSnapshotForValidation, validation])
  const selectedValidationIssues = useMemo(
    () =>
      selectedSubsystems.length === 0
        ? validation.issues
        : validation.issues.filter(issue => selectedSubsystems.some(subsystem => issueAppliesToSubsystem(issue, subsystem))),
    [selectedSubsystems, validation]
  )
  useEffect(() => {
    setPreviewError(null)
    if (open) {
      const snapHide = projectSnapshot?.hideFovLines ?? (typeof window !== 'undefined' && sessionStorage.getItem('cctv-hide-fov-lines') === '1')
      form.setValue('hideFovLines', !!snapHide)
    }
  }, [projectSnapshot, open, form])
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const getProjectSnapshot = () =>
    buildExportProjectData(projectSnapshot, typeof window !== 'undefined' ? window.localStorage : undefined)

  function buildPdfOptions(values: z.infer<typeof schema>): PdfOptions {
    return {
      orientation: values.orientation,
      format: values.format,
      marginTop: values.marginTop,
      marginRight: values.marginRight,
      marginBottom: values.marginBottom,
      marginLeft: values.marginLeft,
      imageQuality: values.imageQuality,
      title: values.title,
      subject: values.subject,
      author: values.author,
      companyName: values.companyName,
      projectTitle: values.projectTitle,
      description: values.description,
      logoDataUrl,
      version: 'v1.0',
      coverEnabled: values.coverEnabled ?? true,
      coverTheme: values.coverBw ? 'bw' : 'color',
      coverPrimaryColor: values.coverPrimaryColor,
      coverSecondaryColor: values.coverSecondaryColor,
      coverBgColor: values.coverBgColor,
      coverFont: values.coverFont,
    }
  }

  function buildProjectForExport(values: z.infer<typeof schema>) {
    const snapshot = getProjectSnapshot()
    return {
      ...snapshot,
      hideFovLines: values.hideFovLines ?? snapshot.hideFovLines ?? false,
      companyName: values.companyName,
      author: values.author,
      projectTitle: values.projectTitle || values.title || '',
      version: 'v1.0',
      logoDataUrl,
    }
  }

  function getExportFilename(subsystemsToExport: typeof selectedSubsystems) {
    if (subsystemsToExport.length !== 1) {
      return 'Sistemas_Seleccionados.pdf'
    }
    const [subsystem] = subsystemsToExport
    return (
      subsystem === 'cctv' ? 'CCTV.pdf' :
      subsystem === 'access' ? 'Control_de_Acceso.pdf' :
      subsystem === 'voceo' ? 'Voceo.pdf' :
      subsystem === 'fire' ? 'Incendio.pdf' :
      subsystem === 'parking' ? 'Parquimetro.pdf' :
      'Camaras_Individuales.pdf'
    )
  }

  async function handlePreview() {
    setIsGenerating(true)
    setPreviewError(null)
    try {
      const v = form.getValues()
      const subsystemsToPreview = (v.subsystems ?? []) as typeof selectedSubsystems
      if (subsystemsToPreview.length === 0) {
        setPreviewError('Seleccione al menos un sistema para generar la vista previa.')
        return
      }
      const opts = buildPdfOptions(v)
      const project = buildProjectForExport(v)
      const filename = getExportFilename(subsystemsToPreview)
      const url =
        subsystemsToPreview.length === 1
          ? await generateSubsystemPreviewUrl(project as any, opts, subsystemsToPreview[0] as any, filename)
          : await generateMultipleSubsystemsPreviewUrl(project as any, opts, subsystemsToPreview as any, filename)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(url)
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'No se pudo generar la vista previa.')
      console.error('Error generando vista previa', e)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleExport() {
    setIsGenerating(true)
    try {
      const v = form.getValues()
      const selectedSubsystems = v.subsystems ?? []
      if (!selectedSubsystems || selectedSubsystems.length === 0) {
        alert('Seleccione al menos un sistema a exportar.')
        return
      }
      if (selectedSubsystems.length > 5) {
        const proceed = confirm(`Ha seleccionado ${selectedSubsystems.length} sistemas. ¿Desea continuar?`)
        if (!proceed) { return }
      }
      const opts = buildPdfOptions(v)
      const project = buildProjectForExport(v)
      // Validaciones por subsistema
      const has = (key: 'cctv'|'access'|'voceo'|'fire'|'cam_individual'|'parking') => {
        if (key === 'cctv' || key === 'cam_individual') return (project.cameras && project.cameras.length > 0)
        if (key === 'access') return (project.accessDevices && project.accessDevices.length > 0)
        if (key === 'voceo') return (project.voceoDevices && project.voceoDevices.length > 0)
        if (key === 'fire') return (project.fireDevices && project.fireDevices.length > 0)
        if (key === 'parking') return (project.parkingDevices && project.parkingDevices.length > 0)
        return false
      }
      // Bloqueo si la validación reporta errores críticos en los subsistemas seleccionados
      const kindMap: Record<string, string> = {
        cctv: 'cameras', cam_individual: 'cameras',
        access: 'accessDevices', voceo: 'voceoDevices',
        fire: 'fireDevices', parking: 'parkingDevices',
      }
      const blockingIssues = selectedSubsystems.flatMap(s =>
        (validationBySubsystem[s] ?? []).filter(i => i.level === 'error' && i.kind === kindMap[s])
      )
      if (blockingIssues.length > 0) {
        const summary = blockingIssues.slice(0, 5)
          .map(i => `• ${i.message}`).join('\n')
        const proceed = confirm(
          `Se detectaron ${blockingIssues.length} problema(s) crítico(s) que podrían afectar la exportación:\n\n${summary}\n\n¿Desea continuar de todos modos?`
        )
        if (!proceed) return
      }
      const invalid = selectedSubsystems.filter(s => !has(s as any))
      if (invalid.length > 0) {
        alert(`No existen dispositivos para: ${invalid.join(', ')}. Ajuste la selección.`)
        return
      }
      if (selectedSubsystems.length === 1) {
        const subsystem = selectedSubsystems[0] as any
        const fname = getExportFilename(selectedSubsystems)
        await exportSubsystemPdf(project as any, opts, subsystem, fname)
      } else {
        const fname = getExportFilename(selectedSubsystems)
        await exportMultipleSubsystemsPdf(project as any, opts, selectedSubsystems as any, fname)
      }
    } catch (e) {
      console.error('Error exportando PDF', e)
      const msg = e instanceof Error ? e.message : 'Ocurrió un error inesperado durante la exportación.'
      alert(`No se pudo completar la exportación: ${msg}`)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setLogoDataUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v)
      if (!v && previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setPreviewError(null)
      }
    }}>
      <DialogContent className="max-w-[96vw] xl:max-w-[1480px] 2xl:max-w-[1600px] w-full h-[94vh] max-h-[980px] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-2xl border border-border/80 shadow-2xl bg-background">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-background z-10">
          <div>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              Exportar a PDF
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Configura los metadatos del documento y previsualiza el resultado antes de exportar.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-5 text-sm">
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={isGenerating} size="lg" className="h-10 px-8 text-sm font-semibold shadow-md">
              {isGenerating ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 h-full max-h-full overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-muted/10">
          {/* Left Panel: Configuration Form */}
          <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-5 min-h-0 h-full max-h-full overflow-y-auto border-r bg-background p-6 md:p-7 scroll-smooth scrollbar-thin flex flex-col">
            <Form {...form}>
              <form className="space-y-8 pr-2 pb-32 flex-1 min-h-0" onSubmit={(e) => e.preventDefault()}>
                {/* General Information Section */}
                <section className="space-y-5">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/80">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary font-bold text-xs">1</span>
                    <h3 className="font-semibold text-lg text-foreground">Información General</h3>
                  </div>
                  <div className="flex flex-col gap-5">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-foreground">Título del Documento</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 px-3.5 text-sm rounded-lg border-border/80 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20 w-full bg-background" placeholder="Ej. Planificación CCTV Edificio Central" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="text-sm font-semibold text-foreground">Compañía / Empresa</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-11 px-3.5 text-sm rounded-lg border-border/80 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20 w-full bg-background" placeholder="Ej. Seguridad Integral S.A." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="author"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="text-sm font-semibold text-foreground">Autor / Responsable</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-11 px-3.5 text-sm rounded-lg border-border/80 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20 w-full bg-background" placeholder="Ej. Ing. Carlos Pérez" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      <FormField
                        control={form.control}
                        name="projectTitle"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="text-sm font-semibold text-foreground">Proyecto / Ubicación</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-11 px-3.5 text-sm rounded-lg border-border/80 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20 w-full bg-background" placeholder="Ej. Sistema CCTV Torre Norte" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="text-sm font-semibold text-foreground">Asunto / Memoria</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-11 px-3.5 text-sm rounded-lg border-border/80 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20 w-full bg-background" placeholder="Ej. Memoria Técnica y Planos" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormItem className="w-full">
                      <FormLabel className="text-sm font-semibold text-foreground">Logotipo de Empresa</FormLabel>
                      <FormControl>
                        <div className="w-full">
                          {logoDataUrl ? (
                            <div className="flex items-center gap-3 p-2.5 border rounded-lg bg-muted/20 w-full">
                              <img src={logoDataUrl} alt="Logo preview" className="h-10 w-auto max-w-[120px] object-contain rounded border p-1 bg-white shrink-0" />
                              <span className="text-xs font-medium text-emerald-600 truncate flex-1">Logo listo para incluir en PDF</span>
                              <Button type="button" variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setLogoDataUrl(undefined)}>
                                Quitar
                              </Button>
                            </div>
                          ) : (
                            <Input type="file" accept="image/*" onChange={handleLogoFile} className="h-11 pt-2 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 w-full cursor-pointer" />
                          )}
                        </div>
                      </FormControl>
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold text-foreground">Descripción del Informe</FormLabel>
                          <FormControl>
                            <Textarea rows={4} {...field} className="resize-y min-h-[100px] text-sm p-3.5 rounded-lg border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 w-full leading-relaxed bg-background" placeholder="Ej. Resumen de la infraestructura de videovigilancia, cobertura de cámaras y dispositivos de seguridad..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                {/* Content & Systems Section */}
                <section className="space-y-5">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/80">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary font-bold text-xs">2</span>
                    <h3 className="font-semibold text-lg text-foreground">Contenido y Sistemas</h3>
                  </div>

                  <div className="bg-muted/20 rounded-xl p-4.5 border border-border/70 space-y-5">
                    <FormField
                      control={form.control}
                      name="subsystems"
                      render={({ field }) => {
                        const allOptions = ['cctv','access','voceo','fire','cam_individual','parking'] as const
                        type Subsystem = typeof allOptions[number]
                        const current = (Array.isArray(field.value) ? field.value : []) as Subsystem[]
                        const allChecked = current.length === allOptions.length
                        const toggleAll = (checked: boolean) => {
                          const next: Subsystem[] = checked ? [...allOptions] : []
                          field.onChange(next)
                        }
                        const toggleOne = (key: Subsystem, checked: boolean) => {
                          const set = new Set<Subsystem>(current)
                          if (checked) set.add(key)
                          else set.delete(key)
                          field.onChange(Array.from(set) as Subsystem[])
                        }
                        return (
                          <FormItem>
                            <div className="flex items-center justify-between mb-3">
                              <FormLabel className="text-sm font-semibold">Subsistemas a Incluir</FormLabel>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="select-all" checked={allChecked} onCheckedChange={(v) => toggleAll(!!v)} />
                                <Label htmlFor="select-all" className="cursor-pointer text-xs font-medium text-muted-foreground">Seleccionar Todos</Label>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {[
                                { id: 'cctv', label: 'CCTV (Sistema General)' },
                                { id: 'access', label: 'Control de Acceso' },
                                { id: 'voceo', label: 'Sistema de Voceo' },
                                { id: 'fire', label: 'Detección de Incendio' },
                                { id: 'cam_individual', label: 'Cámaras Individuales' },
                                { id: 'parking', label: 'Sistema de Parquímetro' }
                              ].map((item) => (
                                <div key={item.id} className="flex items-center space-x-3 p-2.5 rounded-lg border bg-background hover:bg-muted/40 transition-colors">
                                  <Checkbox
                                    id={item.id}
                                    checked={current.includes(item.id as any)}
                                    onCheckedChange={(v) => toggleOne(item.id as any, !!v)}
                                    className="h-4.5 w-4.5"
                                  />
                                  <Label htmlFor={item.id} className="cursor-pointer text-sm font-medium flex-1">{item.label}</Label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    {/* Pre-validation Panel */}
                    <div className="pt-4 border-t border-border/70 mt-4">
                      <FormLabel className="text-sm font-semibold mb-3 flex items-center justify-between">
                        <span>Validación Previa del Proyecto</span>
                        {validation.ok ? (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">Disposición Correcta</span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                            {validation.issues.length} aviso(s)
                          </span>
                        )}
                      </FormLabel>
                      {selectedValidationIssues.length === 0 ? (
                        <p className="text-xs text-muted-foreground bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-lg p-3 border border-emerald-200/60">
                          ✓ No se detectaron problemas. Todos los dispositivos cuentan con coordenadas válidas y se dibujarán correctamente.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {selectedValidationIssues.slice(0, 5).map((issue, idx) => (
                            <div
                              key={idx}
                              className={`text-xs p-2.5 rounded-lg border ${
                                issue.level === 'error'
                                  ? 'bg-red-50 border-red-200 text-red-700'
                                  : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}
                            >
                              <div className="font-semibold">
                                {issue.level === 'error' ? '✗' : '⚠'} {issue.code}
                                {issue.kind ? <span className="font-normal text-muted-foreground"> · {issue.kind}</span> : null}
                              </div>
                              <div>{issue.message}</div>
                            </div>
                          ))}
                          {selectedValidationIssues.length > 5 && (
                            <p className="text-xs text-muted-foreground">…y {selectedValidationIssues.length - 5} más</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border/70 mt-4">
                      <FormLabel className="text-sm font-semibold mb-3 block">Opciones de Cobertura y Visualización</FormLabel>
                      <FormField
                        control={form.control}
                        name="hideFovLines"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2.5 space-y-0 p-2.5 rounded-lg border bg-background hover:bg-muted/40 transition-colors">
                            <FormControl>
                              <Checkbox
                                checked={!!field.value}
                                onCheckedChange={(v) => {
                                  const val = !!v
                                  field.onChange(val)
                                  try { sessionStorage.setItem('cctv-hide-fov-lines', val ? '1' : '0') } catch {}
                                }}
                                className="h-4.5 w-4.5 border-primary/60 data-[state=checked]:bg-primary"
                              />
                            </FormControl>
                            <Label className="font-medium cursor-pointer text-xs flex-1">
                              Ocultar líneas FOV y valor de distancia
                            </Label>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-4 border-t border-border/70 mt-4">
                      <FormLabel className="text-sm font-semibold mb-3 block">Secciones Adicionales del Informe</FormLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name="exportDesign"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2.5 space-y-0 p-2.5 rounded-lg border bg-background hover:bg-muted/40">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-4.5 w-4.5" />
                              </FormControl>
                              <Label className="font-medium cursor-pointer text-xs">Plano Diseño</Label>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="exportCatalog"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2.5 space-y-0 p-2.5 rounded-lg border bg-background hover:bg-muted/40">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-4.5 w-4.5" />
                              </FormControl>
                              <Label className="font-medium cursor-pointer text-xs">Catálogo</Label>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="exportCalculations"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2.5 space-y-0 p-2.5 rounded-lg border bg-background hover:bg-muted/40">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-4.5 w-4.5" />
                              </FormControl>
                              <Label className="font-medium cursor-pointer text-xs">Cálculos DRI</Label>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Cover Page Section */}
                <section className="space-y-5">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/80">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary font-bold text-xs">3</span>
                    <h3 className="font-semibold text-lg text-foreground">Portada y Estilo</h3>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-row items-center gap-6 p-3 rounded-lg border bg-muted/20">
                        <FormField
                          control={form.control}
                          name="coverEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2.5 space-y-0">
                              <FormControl>
                                <Checkbox checked={!!field.value} onCheckedChange={field.onChange} className="h-4.5 w-4.5" />
                              </FormControl>
                              <Label className="font-semibold cursor-pointer text-sm">Incluir Portada</Label>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coverBw"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2.5 space-y-0">
                              <FormControl>
                                <Checkbox checked={!!field.value} onCheckedChange={field.onChange} className="h-4.5 w-4.5" />
                              </FormControl>
                              <Label className="font-medium cursor-pointer text-sm">Blanco y Negro</Label>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="coverPrimaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Color Primario</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2 border rounded-lg p-1.5 bg-background">
                                  <Input type="color" {...field} className="h-7 w-8 p-0 border-0 cursor-pointer rounded" />
                                  <span className="text-xs font-mono text-muted-foreground uppercase">{field.value}</span>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coverSecondaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Color Secundario</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2 border rounded-lg p-1.5 bg-background">
                                  <Input type="color" {...field} className="h-7 w-8 p-0 border-0 cursor-pointer rounded" />
                                  <span className="text-xs font-mono text-muted-foreground uppercase">{field.value}</span>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coverBgColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Color de Fondo</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2 border rounded-lg p-1.5 bg-background">
                                  <Input type="color" {...field} className="h-7 w-8 p-0 border-0 cursor-pointer rounded" />
                                  <span className="text-xs font-mono text-muted-foreground uppercase">{field.value}</span>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="coverFont"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold">Tipografía de Portada</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 w-full bg-background">
                                <SelectValue placeholder="Selecciona tipografía" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Helvetica">Helvetica (Estándar)</SelectItem>
                              <SelectItem value="Arial">Arial (Moderna)</SelectItem>
                              <SelectItem value="Roboto">Roboto (Limpia)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                {/* Page Format Section */}
                <section className="space-y-5 pb-10">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/80">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary font-bold text-xs">4</span>
                    <h3 className="font-semibold text-lg text-foreground">Formato de Página</h3>
                  </div>

                  <div className="flex flex-col gap-5">
                    <FormField
                      control={form.control}
                      name="format"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold">Tamaño de Hoja</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 w-full bg-background">
                                <SelectValue placeholder="Selecciona formato" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="a4">A4 (210 x 297 mm)</SelectItem>
                              <SelectItem value="letter">Carta (216 x 279 mm)</SelectItem>
                              <SelectItem value="legal">Oficio (216 x 356 mm)</SelectItem>
                              <SelectItem value="tabloid">Tabloide (279 x 432 mm)</SelectItem>
                              <SelectItem value="a3">A3 (297 x 420 mm)</SelectItem>
                              <SelectItem value="b4">B4 (250 x 353 mm)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="orientation"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold">Orientación de Hoja</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-3 w-full">
                              <div className="flex items-center space-x-2 border rounded-lg p-3 bg-background hover:bg-muted/40 cursor-pointer">
                                <RadioGroupItem value="portrait" id="portrait" />
                                <Label htmlFor="portrait" className="cursor-pointer font-medium text-sm flex-1">Vertical (Portrait)</Label>
                              </div>
                              <div className="flex items-center space-x-2 border rounded-lg p-3 bg-background hover:bg-muted/40 cursor-pointer">
                                <RadioGroupItem value="landscape" id="landscape" />
                                <Label htmlFor="landscape" className="cursor-pointer font-medium text-sm flex-1">Horizontal (Landscape)</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2.5">
                      <Label className="text-sm font-semibold">Márgenes del Documento (mm)</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                        <FormField
                          control={form.control}
                          name="marginTop"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Arriba (Top)</FormLabel>
                              <FormControl>
                                <Input type="number" step="1" min={0} max={50} {...field} onChange={(e) => field.onChange(Number(e.target.value))} className="h-10 text-sm text-center bg-background" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="marginBottom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Abajo (Bottom)</FormLabel>
                              <FormControl>
                                <Input type="number" step="1" min={0} max={50} {...field} onChange={(e) => field.onChange(Number(e.target.value))} className="h-10 text-sm text-center bg-background" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="marginLeft"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Izquierda (Left)</FormLabel>
                              <FormControl>
                                <Input type="number" step="1" min={0} max={50} {...field} onChange={(e) => field.onChange(Number(e.target.value))} className="h-10 text-sm text-center bg-background" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="marginRight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Derecha (Right)</FormLabel>
                              <FormControl>
                                <Input type="number" step="1" min={0} max={50} {...field} onChange={(e) => field.onChange(Number(e.target.value))} className="h-10 text-sm text-center bg-background" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="imageQuality"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm font-semibold">Calidad de Imagen e Ilustraciones</FormLabel>
                          <div className="flex items-center gap-4 border rounded-lg p-3 bg-background">
                            <FormControl>
                              <Slider
                                defaultValue={[field.value * 100]}
                                onValueChange={(v) => field.onChange(v[0] / 100)}
                                min={10}
                                max={100}
                                step={1}
                                className="flex-1"
                              />
                            </FormControl>
                            <span className="text-sm font-mono font-semibold w-12 text-right">{Math.round(field.value * 100)}%</span>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                {/* Colchón/Espaciador inferior amplio para garantizar scroll completo sin cortes */}
                <div className="h-32 md:h-40 w-full shrink-0 pointer-events-none" aria-hidden="true" />
              </form>
            </Form>
          </div>

          {/* Right Panel: Preview */}
          <div className="lg:col-span-6 xl:col-span-7 min-h-0 h-full max-h-full overflow-y-auto border-l bg-slate-100 dark:bg-slate-900/50 p-6 md:p-7 relative scroll-smooth scrollbar-thin flex flex-col space-y-6">
            <div className="flex-1 flex flex-col gap-6 shrink-0">
              {/* Previsualización rápida del lienzo */}
              <CanvasPreviewPanel
                projectSnapshot={projectSnapshotForValidation}
                subsystems={(form.watch('subsystems') ?? []) as ('cctv'|'access'|'voceo'|'fire'|'cam_individual'|'parking')[]}
                hasError={selectedValidationIssues.some(i => i.level === 'error')}
                errorCount={selectedValidationIssues.filter(i => i.level === 'error').length}
                warningCount={selectedValidationIssues.filter(i => i.level === 'warning').length}
              />

              {previewUrl ? (
                <div className="border rounded-xl shadow-xl overflow-hidden bg-white animate-in fade-in duration-500 min-h-[480px] h-[580px] shrink-0">
                  <object data={previewUrl} type="application/pdf" className="w-full h-full min-h-[480px]">
                    <iframe src={previewUrl} className="w-full h-full min-h-[480px]" title="Vista previa del PDF" />
                  </object>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-background/60 p-8 min-h-[220px] shrink-0">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <path d="M12 18v-6"/>
                      <path d="m9 15 3 3 3-3"/>
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold mb-1">Vista Previa del PDF Documento</h3>
                  <p className="max-w-md text-center text-xs text-muted-foreground">
                    Presiona "Actualizar Vista Previa" a continuación para compilar y visualizar el archivo PDF final.
                  </p>
                  {previewError ? (
                    <p className="mt-3 max-w-md text-center text-xs font-semibold text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
                      {previewError}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="pt-2 pb-12 flex justify-center shrink-0">
              <Button
                type="button"
                variant="default"
                size="lg"
                onClick={handlePreview}
                disabled={isGenerating}
                className="w-full max-w-md shadow-lg hover:shadow-xl transition-all h-12 text-base font-semibold"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span> Generando Vista Previa...
                  </>
                ) : (
                  <>Actualizar Vista Previa</>
                )}
              </Button>
            </div>

            {/* Colchón inferior adicional para evitar recortes al scroll */}
            <div className="h-16 w-full shrink-0 pointer-events-none" aria-hidden="true" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Componente de previsualización rápida del lienzo. Renderiza en un canvas
 * independiente (no en el PDF) un esquema a baja resolución del plano +
 * dispositivos para que el usuario pueda detectar errores de disposición
 * sin tener que generar el PDF completo.
 *
 * Se actualiza automáticamente cuando cambia `projectSnapshot` o `subsystems`.
 */
function CanvasPreviewPanel({
  projectSnapshot,
  subsystems,
  hasError,
  errorCount,
  warningCount,
}: {
  projectSnapshot: any
  subsystems: ('cctv'|'access'|'voceo'|'fire'|'cam_individual'|'parking')[]
  hasError: boolean
  errorCount: number
  warningCount: number
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function renderPreview() {
      if (typeof document === 'undefined') return
      setRendering(true)
      try {
        // Importación dinámica para no romper el tree-shaking de la página
        // si la UI nunca abre el dialog.
        const { renderDesignCanvas } = await import('@/lib/pdf/export')
        // Tamaño razonable para previsualización (ratio 4:3 del lienzo base)
        const targetW = 600
        const targetH = 450
        // Elegimos un modo único: si solo hay un subsistema, mostramos su
        // vista específica; si hay varios, mostramos 'all' para tener
        // un panorama completo.
        const mode = subsystems.length <= 1
          ? (subsystems[0] === 'cctv' || subsystems[0] === 'cam_individual'
              ? 'cams'
              : (subsystems[0] as 'access'|'voceo'|'fire'|'parking' | undefined) ?? 'all')
          : 'all'
        const canvas = await renderDesignCanvas(projectSnapshot, targetW, targetH, mode)
        if (cancelled) return
        setDataUrl(canvas.toDataURL('image/png'))
      } catch (e) {
        console.error('Error renderizando previsualización rápida', e)
        if (!cancelled) setDataUrl(null)
      } finally {
        if (!cancelled) setRendering(false)
      }
    }
    renderPreview()
    return () => { cancelled = true }
  }, [projectSnapshot, subsystems])

  return (
    <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Vista Previa del Lienzo</h4>
          {!hasError ? (
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              Disposición correcta
            </span>
          ) : (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {errorCount} error · {warningCount} aviso
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {subsystems.length} subsistema(s) seleccionado(s)
        </span>
      </div>
      <div className="relative aspect-4/3 bg-slate-50">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Vista previa del lienzo con dispositivos"
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {rendering ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span> Renderizando…
              </span>
            ) : (
              <span>Sin contenido para mostrar.</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
