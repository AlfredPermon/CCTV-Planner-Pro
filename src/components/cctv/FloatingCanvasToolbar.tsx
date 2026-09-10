'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { useRef } from 'react'
import {
  Palette,
  X,
  MousePointer,
  Pencil,
  ArrowRight,
  Type,
  Circle,
  Square,
  RectangleHorizontal,
  Triangle,
  Shapes,
  Trash2,
  PaintBucket,
  Sliders,
  Undo2,
  Redo2,
  Image as ImageIcon,
  Group,
  Ungroup,
  Box,
  Car,
  User,
  Armchair,
  Laptop,
  Trees
} from 'lucide-react'
import type { AnnotationType, ObjectCategory, ObjectSubtype } from '@/lib/cctv/types'

export type ActiveTool = 'select' | AnnotationType

export interface FloatingCanvasToolbarProps {
  activeTool: ActiveTool
  onSelectTool: (tool: ActiveTool) => void
  strokeColor: string
  onStrokeColorChange: (color: string) => void
  strokeWidth: number
  onStrokeWidthChange: (width: number) => void
  fillColor: string
  onFillColorChange: (color: string) => void
  fillEnabled: boolean
  onFillEnabledChange: (enabled: boolean) => void
  selectedAnnotationId: string | null
  onDeleteSelectedAnnotation?: () => void
  onClearAllAnnotations?: () => void
  canUndo?: boolean
  onUndo?: () => void
  canRedo?: boolean
  onRedo?: () => void
  onAddImage?: (dataUrl: string, width: number, height: number) => void
  onAddObject?: (category: ObjectCategory, subtype: ObjectSubtype, color?: string) => void
  selectedCount?: number
  isGroupSelected?: boolean
  onGroupSelected?: () => void
  onUngroupSelected?: () => void
}

export function FloatingCanvasToolbar({
  activeTool,
  onSelectTool,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  fillColor,
  onFillColorChange,
  fillEnabled,
  onFillEnabledChange,
  selectedAnnotationId,
  onDeleteSelectedAnnotation,
  canUndo = false,
  onUndo,
  canRedo = false,
  onRedo,
  onAddImage,
  onAddObject,
  selectedCount = 0,
  isGroupSelected = false,
  onGroupSelected,
  onUngroupSelected
}: FloatingCanvasToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onAddImage) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (!dataUrl) return
      const img = new Image()
      img.onload = () => {
        const aspect = img.width / img.height
        const targetW = 160
        const targetH = Math.round(targetW / aspect)
        onAddImage(dataUrl, targetW, targetH)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  const [isOpen, setIsOpen] = useState(false)
  const [shapesOpen, setShapesOpen] = useState(false)
  const [objectsOpen, setObjectsOpen] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ObjectCategory>('vehicles')
  const [objectColor, setObjectColor] = useState<string>('#3b82f6')

  const isShapeActive = ['circle', 'square', 'rectangle', 'triangle'].includes(activeTool)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute top-4 left-4 z-30 flex flex-col items-start gap-2 transition-all duration-300 ease-in-out pointer-events-auto">
        {/* Ícono de Acceso Principal (Vista Colapsada) */}
        {!isOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="h-11 w-11 rounded-2xl border border-primary/20 bg-primary/95 text-primary-foreground shadow-xl backdrop-blur hover:scale-105 transition-transform"
                onClick={() => setIsOpen(true)}
                aria-label="Abrir barra de herramientas de dibujo"
              >
                <Palette className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Herramientas de Dibujo y Anotación 2D
            </TooltipContent>
          </Tooltip>
        )}

        {/* Ventana Flotante Desplegada Verticalmente (De arriba hacia abajo) */}
        {isOpen && (
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.55)] backdrop-blur animate-in fade-in slide-in-from-top-3 duration-200">
            {/* Botón para cerrar / colapsar la barra */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setIsOpen(false)
                    onSelectTool('select')
                  }}
                  aria-label="Cerrar barra flotante"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Cerrar Herramientas</TooltipContent>
            </Tooltip>

            <div className="w-full h-px bg-border/60 my-0.5" />

            {/* 1. Herramienta Selección / Puntero */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'select' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => onSelectTool('select')}
                >
                  <MousePointer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Puntero / Selección</TooltipContent>
            </Tooltip>

            {/* 2. Herramienta Dibujo a Mano Alzada */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'freehand' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => onSelectTool('freehand')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Dibujo a Mano Alzada</TooltipContent>
            </Tooltip>

            {/* 3. Herramienta Flechas */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'arrow' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => onSelectTool('arrow')}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Flecha Indicadora</TooltipContent>
            </Tooltip>

            {/* 4. Selector de Formas Geométricas Básicas */}
            <Popover open={shapesOpen} onOpenChange={setShapesOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant={isShapeActive ? 'default' : 'ghost'}
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                    >
                      <Shapes className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Formas Geométricas</TooltipContent>
              </Tooltip>

              <PopoverContent side="right" align="start" sideOffset={10} className="w-48 p-2 rounded-xl border border-border/80 bg-card shadow-lg backdrop-blur">
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant={activeTool === 'circle' ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={() => {
                      onSelectTool('circle')
                      setShapesOpen(false)
                    }}
                  >
                    <Circle className="h-3.5 w-3.5" />
                    Círculo
                  </Button>

                  <Button
                    variant={activeTool === 'square' ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={() => {
                      onSelectTool('square')
                      setShapesOpen(false)
                    }}
                  >
                    <Square className="h-3.5 w-3.5" />
                    Cuadrado
                  </Button>

                  <Button
                    variant={activeTool === 'rectangle' ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={() => {
                      onSelectTool('rectangle')
                      setShapesOpen(false)
                    }}
                  >
                    <RectangleHorizontal className="h-3.5 w-3.5" />
                    Rectángulo
                  </Button>

                  <Button
                    variant={activeTool === 'triangle' ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={() => {
                      onSelectTool('triangle')
                      setShapesOpen(false)
                    }}
                  >
                    <Triangle className="h-3.5 w-3.5" />
                    Triángulo
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* 5. Selector de Objetos 2D Personalizados */}
            <Popover open={objectsOpen} onOpenChange={setObjectsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant={activeTool === 'object' ? 'default' : 'ghost'}
                      size="icon"
                      className="h-9 w-9 rounded-xl text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50"
                    >
                      <Box className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Objetos y Personas 2D</TooltipContent>
              </Tooltip>

              <PopoverContent side="right" align="start" sideOffset={10} className="w-72 p-3 rounded-2xl border border-border/80 bg-card shadow-xl backdrop-blur space-y-3">
                <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Catálogo Objetos 2D</span>
                  <span className="text-[10px] text-muted-foreground/80 font-normal">Vista desde arriba</span>
                </div>

                {/* Selector de Categoría */}
                <div className="grid grid-cols-4 gap-1 bg-muted/50 p-1 rounded-xl">
                  <Button
                    variant={selectedCategory === 'vehicles' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10px] px-1.5 gap-1 rounded-lg"
                    onClick={() => setSelectedCategory('vehicles')}
                  >
                    <Car className="h-3 w-3" />
                    Autos
                  </Button>
                  <Button
                    variant={selectedCategory === 'people' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10px] px-1.5 gap-1 rounded-lg"
                    onClick={() => setSelectedCategory('people')}
                  >
                    <User className="h-3 w-3" />
                    Personas
                  </Button>
                  <Button
                    variant={selectedCategory === 'office' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10px] px-1.5 gap-1 rounded-lg"
                    onClick={() => setSelectedCategory('office')}
                  >
                    <Armchair className="h-3 w-3" />
                    Muebles
                  </Button>
                  <Button
                    variant={selectedCategory === 'greenery' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10px] px-1.5 gap-1 rounded-lg"
                    onClick={() => {
                      setSelectedCategory('greenery')
                      if (objectColor === '#3b82f6') setObjectColor('#10b981')
                    }}
                  >
                    <Trees className="h-3 w-3 text-emerald-500" />
                    Verdes
                  </Button>
                </div>

                {/* Paleta de Color Predefinido para Objetos */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Color del Objeto</Label>
                  <div className="flex items-center gap-1.5">
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#64748b', '#0f172a'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`h-5 w-5 rounded-full border transition-transform ${objectColor === c ? 'scale-125 ring-2 ring-primary ring-offset-1' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setObjectColor(c)}
                      />
                    ))}
                    <Input
                      type="color"
                      value={objectColor}
                      onChange={(e) => setObjectColor(e.target.value)}
                      className="h-6 w-7 p-0.5 rounded cursor-pointer ml-auto"
                    />
                  </div>
                </div>

                {/* Listado de Elementos por Categoría */}
                <div className="grid grid-cols-1 gap-1 pt-1 border-t border-border/60">
                  {selectedCategory === 'vehicles' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('vehicles', 'car_sedan', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <Car className="h-4 w-4 text-blue-500" />
                        Auto Sedán (4.5m x 1.9m)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('vehicles', 'car_suv', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <Car className="h-4 w-4 text-emerald-500" />
                        Camioneta SUV (4.8m x 2.0m)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('vehicles', 'truck', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <Car className="h-4 w-4 text-amber-500" />
                        Camioneta / Pick-up (5.2m x 2.1m)
                      </Button>
                    </>
                  )}

                  {selectedCategory === 'people' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('people', 'person_man', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <User className="h-4 w-4 text-indigo-500" />
                        Persona - Hombre (0.55m x 0.45m)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('people', 'person_woman', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <User className="h-4 w-4 text-pink-500" />
                        Persona - Mujer (0.50m x 0.40m)
                      </Button>
                    </>
                  )}

                  {selectedCategory === 'office' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('office', 'desk', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <Box className="h-4 w-4 text-slate-600" />
                        Escritorio (1.5m x 0.8m)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('office', 'office_chair', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <Armchair className="h-4 w-4 text-slate-700" />
                        Silla de Oficina (0.6m x 0.6m)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('office', 'computer', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <Laptop className="h-4 w-4 text-cyan-600" />
                        Computadora (0.5m x 0.4m)
                      </Button>
                    </>
                  )}

                  {selectedCategory === 'greenery' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('greenery', 'tree', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <Trees className="h-4 w-4 text-emerald-600" />
                        Árbol de Sombra (3.0m x 3.0m)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-9 text-xs"
                        onClick={() => {
                          if (onAddObject) onAddObject('greenery', 'plant', objectColor)
                          setObjectsOpen(false)
                        }}
                      >
                        <Trees className="h-4 w-4 text-green-500" />
                        Planta / Arbusto (1.0m x 1.0m)
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* 6. Herramienta Texto */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'text' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => onSelectTool('text')}
                >
                  <Type className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Agregar Texto</TooltipContent>
            </Tooltip>

            {/* 6. Herramienta Agregar Imagen */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Agregar Imagen</TooltipContent>
            </Tooltip>

            {/* 7. Agrupar / Desagrupar */}
            {onGroupSelected && selectedCount >= 2 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-purple-600 hover:bg-purple-50"
                    onClick={onGroupSelected}
                  >
                    <Group className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Agrupar Elementos (Ctrl+G)</TooltipContent>
              </Tooltip>
            )}

            {onUngroupSelected && isGroupSelected && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-purple-600 hover:bg-purple-50"
                    onClick={onUngroupSelected}
                  >
                    <Ungroup className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Desagrupar (Ctrl+Shift+G)</TooltipContent>
              </Tooltip>
            )}

            <div className="w-full h-px bg-border/60 my-0.5" />

            {/* 6. Estilos (Color, Grosor de Línea, Relleno) */}
            <Popover open={styleOpen} onOpenChange={setStyleOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl relative">
                      <Sliders className="h-4 w-4" />
                      <span
                        className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-background"
                        style={{ backgroundColor: strokeColor }}
                      />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Estilos y Colores</TooltipContent>
              </Tooltip>

              <PopoverContent side="right" align="start" sideOffset={10} className="w-64 p-3 rounded-2xl border border-border bg-card shadow-xl space-y-3">
                <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Configuración de Trazo
                </div>

                {/* Color de Línea */}
                <div className="space-y-1">
                  <Label className="text-xs">Color de Trazo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => onStrokeColorChange(e.target.value)}
                      className="h-8 w-12 p-0.5 rounded cursor-pointer"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{strokeColor}</span>
                  </div>
                </div>

                {/* Grosor de Línea */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <Label>Grosor de Trazo</Label>
                    <span className="text-muted-foreground font-mono">{strokeWidth}px</span>
                  </div>
                  <Slider
                    min={1}
                    max={12}
                    step={1}
                    value={[strokeWidth]}
                    onValueChange={(val) => onStrokeWidthChange(val[0])}
                  />
                </div>

                {/* Relleno */}
                <div className="space-y-2 border-t pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="fill-enabled"
                      checked={fillEnabled}
                      onCheckedChange={(chk) => onFillEnabledChange(!!chk)}
                    />
                    <Label htmlFor="fill-enabled" className="text-xs cursor-pointer">
                      Habilitar Relleno
                    </Label>
                  </div>

                  {fillEnabled && (
                    <div className="flex items-center gap-2 pl-5">
                      <PaintBucket className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="color"
                        value={fillColor.startsWith('rgba') ? '#3b82f6' : fillColor}
                        onChange={(e) => onFillColorChange(e.target.value)}
                        className="h-7 w-10 p-0.5 rounded cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="w-full h-px bg-border/60 my-0.5" />

            {/* 7. Deshacer y Rehacer */}
            {onUndo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    disabled={!canUndo}
                    onClick={onUndo}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Deshacer (Ctrl+Z)</TooltipContent>
              </Tooltip>
            )}

            {onRedo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    disabled={!canRedo}
                    onClick={onRedo}
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Rehacer (Ctrl+Y)</TooltipContent>
              </Tooltip>
            )}

            {/* 8. Eliminar Selección */}
            {selectedAnnotationId && onDeleteSelectedAnnotation && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                    onClick={onDeleteSelectedAnnotation}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Eliminar Anotación Seleccionada</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
