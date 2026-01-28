'use client'
import { useState } from 'react'
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
import { generatePreviewUrl, PdfOptions, exportProfessionalPdf } from '@/lib/pdf/export'

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
})

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ExportToPDFDialog({ open, onOpenChange }: Props) {
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
      title: 'Planificación CCTV',
      companyName: '',
      subject: '',
      author: '',
      projectTitle: '',
      description: '',
    },
    mode: 'onChange',
  })

  const selectors = () => {
    const s: string[] = []
    const v = form.getValues()
    if (v.exportDesign) s.push('#export-design-card')
    if (v.exportCatalog) s.push('#export-catalog-card')
    if (v.exportCalculations) s.push('#export-calculations-card')
    return s
  }

  const [isGenerating, setIsGenerating] = useState(false)

  async function handlePreview() {
    setIsGenerating(true)
    try {
      const v = form.getValues()
      const opts: PdfOptions = {
        orientation: v.orientation,
        format: v.format,
        marginTop: v.marginTop,
        marginRight: v.marginRight,
        marginBottom: v.marginBottom,
        marginLeft: v.marginLeft,
        imageQuality: v.imageQuality,
        title: v.title,
        subject: v.subject,
        author: v.author,
        companyName: v.companyName,
        projectTitle: v.projectTitle,
        description: v.description,
        logoDataUrl,
      }
      const url = await generatePreviewUrl(selectors(), opts)
      setPreviewUrl(url)
    } catch (e) {
      console.error('Error generando vista previa', e)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleExport() {
    setIsGenerating(true)
    try {
      const v = form.getValues()
      const opts: PdfOptions = {
        orientation: v.orientation,
        format: v.format,
        marginTop: v.marginTop,
        marginRight: v.marginRight,
        marginBottom: v.marginBottom,
        marginLeft: v.marginLeft,
        imageQuality: v.imageQuality,
        title: v.title,
        subject: v.subject,
        author: v.author,
        companyName: v.companyName,
        projectTitle: v.projectTitle,
        description: v.description,
        logoDataUrl,
        version: 'v1.0',
      }
      let floorPlan: any = null
      let cameras: any[] = []
      let accessDevices: any[] = []
      let iconScales: Record<string, number> | undefined = undefined
      let cameraDescriptions: Record<string, string> | undefined = undefined
      try {
        const fp = localStorage.getItem('cctv-floorPlan')
        const cams = localStorage.getItem('cctv-cameras')
        const devices = localStorage.getItem('cctv-accessDevices')
        const scales = localStorage.getItem('cctv-iconScales')
        const desc = localStorage.getItem('cctv-cameraDescriptions')
        if (fp) floorPlan = JSON.parse(fp)
        if (cams) cameras = JSON.parse(cams)
        if (devices) accessDevices = JSON.parse(devices)
        if (scales) iconScales = JSON.parse(scales)
        if (desc) cameraDescriptions = JSON.parse(desc)
      } catch {}
      await exportProfessionalPdf(
        {
          floorPlan: floorPlan,
          cameras: cameras || [],
          accessDevices: accessDevices || [],
          iconScales,
          companyName: v.companyName,
          author: v.author,
          projectTitle: v.projectTitle || v.title || '',
          version: 'v1.0',
          logoDataUrl,
          cameraDescriptions,
        },
        opts,
        (v.title || 'Documento') + '.pdf'
      )
    } catch (e) {
      console.error('Error exportando PDF', e)
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
      if (!v) setPreviewUrl(null)
    }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Exportar a PDF</DialogTitle>
          <DialogDescription>
            Configura el documento y selecciona el contenido a exportar. Previsualiza antes de descargar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título del documento</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de compañía</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="author"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Autor</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="projectTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título del proyecto</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asunto</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormItem>
                    <FormLabel>Logotipo de la compañía</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={handleLogoFile} />
                    </FormControl>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="orientation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orientación</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="portrait" id="portrait" />
                              <Label htmlFor="portrait">Vertical</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="landscape" id="landscape" />
                              <Label htmlFor="landscape">Horizontal</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tamaño de página</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona formato" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="a4">A4</SelectItem>
                            <SelectItem value="letter">Carta</SelectItem>
                            <SelectItem value="legal">Oficio</SelectItem>
                            <SelectItem value="tabloid">Tabloide</SelectItem>
                            <SelectItem value="a3">A3</SelectItem>
                            <SelectItem value="b4">B4</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="marginTop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Margen superior (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marginBottom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Margen inferior (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marginLeft"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Margen izquierdo (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marginRight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Margen derecho (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="imageQuality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calidad de imagen</FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Slider
                              defaultValue={[field.value * 100]}
                              onValueChange={(v) => field.onChange(v[0] / 100)}
                              min={10}
                              max={100}
                              step={1}
                            />
                          </FormControl>
                          <span className="text-sm w-10 text-right">{Math.round(field.value * 100)}%</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <FormLabel>Exportar datos</FormLabel>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="exportDesign"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <Label className="font-normal cursor-pointer" onClick={() => field.onChange(!field.value)}>
                              Plano de Diseño
                            </Label>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="exportCatalog"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <Label className="font-normal cursor-pointer" onClick={() => field.onChange(!field.value)}>
                              Catálogo
                            </Label>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="exportCalculations"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <Label className="font-normal cursor-pointer" onClick={() => field.onChange(!field.value)}>
                              Cálculos
                            </Label>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4">
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={handlePreview} disabled={isGenerating}>
                  {isGenerating ? 'Generando...' : 'Vista previa'}
                </Button>
                <Button type="button" onClick={handleExport} disabled={isGenerating}>
                  {isGenerating ? 'Exportando...' : 'Exportar PDF'}
                </Button>
              </div>

              {previewUrl && (
                <div className="border rounded-md overflow-hidden">
                  <object data={previewUrl} type="application/pdf" className="w-full h-105">
                    <iframe src={previewUrl} className="w-full h-105" />
                  </object>
                </div>
              )}
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
