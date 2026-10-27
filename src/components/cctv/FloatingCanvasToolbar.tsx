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
  Box
} from 'lucide-react'
import type { AnnotationType, ObjectCategory, ObjectSubtype } from '@/lib/cctv/types'

/* ==========================================================================
 * Glifos vectoriales realistas (vista superior) utilizados en el catálogo de
 * "Objetos y Personas 2D". Reproducen el aspecto de cada objeto tal y como se
 * dibuja sobre el lienzo, ofreciendo una previsualización profesional.
 * ========================================================================== */
type GlyphProps = { className?: string }

const glyphShadow = 'rgba(15, 23, 42, 0.18)'
const glyphStroke = 'rgba(15, 23, 42, 0.55)'

function CarSedanGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="15" width="38" height="18" rx="8" fill={glyphShadow} />
      <rect x="10" y="11.5" width="7" height="4" rx="2" fill="#0f172a" />
      <rect x="10" y="32.5" width="7" height="4" rx="2" fill="#0f172a" />
      <rect x="31" y="11.5" width="7" height="4" rx="2" fill="#0f172a" />
      <rect x="31" y="32.5" width="7" height="4" rx="2" fill="#0f172a" />
      <rect x="4" y="14" width="40" height="20" rx="8" fill="currentColor" stroke={glyphStroke} strokeWidth="1.2" />
      <rect x="5" y="15" width="38" height="6" rx="5" fill="#ffffff" opacity="0.18" />
      <rect x="14" y="17" width="19" height="14" rx="5" fill="rgba(15,23,42,0.78)" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.8" />
      <rect x="20" y="19.5" width="8" height="9" rx="3" fill="currentColor" />
      <rect x="20" y="19.5" width="8" height="9" rx="3" fill="#ffffff" opacity="0.22" />
      <rect x="41" y="16.5" width="3" height="4" rx="1.2" fill="#fde68a" />
      <rect x="41" y="27.5" width="3" height="4" rx="1.2" fill="#fde68a" />
      <rect x="4" y="16.5" width="3" height="4" rx="1.2" fill="#ef4444" />
      <rect x="4" y="27.5" width="3" height="4" rx="1.2" fill="#ef4444" />
      <rect x="15" y="11.5" width="4" height="3" rx="1.2" fill={glyphStroke} />
      <rect x="15" y="33.5" width="4" height="3" rx="1.2" fill={glyphStroke} />
    </svg>
  )
}

function CarSuvGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="15" width="38" height="18" rx="6" fill={glyphShadow} />
      <rect x="9.5" y="10.5" width="8" height="4.5" rx="2" fill="#0f172a" />
      <rect x="9.5" y="33" width="8" height="4.5" rx="2" fill="#0f172a" />
      <rect x="30.5" y="10.5" width="8" height="4.5" rx="2" fill="#0f172a" />
      <rect x="30.5" y="33" width="8" height="4.5" rx="2" fill="#0f172a" />
      <rect x="3.5" y="13.5" width="41" height="21" rx="6" fill="currentColor" stroke={glyphStroke} strokeWidth="1.2" />
      <rect x="4.5" y="14.5" width="39" height="6" rx="5" fill="#ffffff" opacity="0.18" />
      <rect x="12" y="14.6" width="24" height="1.6" rx="0.8" fill="rgba(15,23,42,0.5)" />
      <rect x="12" y="31.8" width="24" height="1.6" rx="0.8" fill="rgba(15,23,42,0.5)" />
      <rect x="12" y="16.5" width="25" height="15" rx="4" fill="rgba(15,23,42,0.78)" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.8" />
      <rect x="19" y="19.5" width="11" height="9" rx="3" fill="currentColor" />
      <rect x="19" y="19.5" width="11" height="9" rx="3" fill="#ffffff" opacity="0.22" />
      <rect x="41" y="16" width="3.5" height="4.5" rx="1.3" fill="#fde68a" />
      <rect x="41" y="27.5" width="3.5" height="4.5" rx="1.3" fill="#fde68a" />
      <rect x="3.5" y="16" width="3" height="4.5" rx="1.3" fill="#ef4444" />
      <rect x="3.5" y="27.5" width="3" height="4.5" rx="1.3" fill="#ef4444" />
      <rect x="13" y="10.5" width="4.5" height="3.2" rx="1.3" fill={glyphStroke} />
      <rect x="13" y="34.3" width="4.5" height="3.2" rx="1.3" fill={glyphStroke} />
    </svg>
  )
}

function TruckGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="15" width="38" height="18" rx="4" fill={glyphShadow} />
      <rect x="8.5" y="11" width="8" height="4.5" rx="1.8" fill="#0f172a" />
      <rect x="8.5" y="32.5" width="8" height="4.5" rx="1.8" fill="#0f172a" />
      <rect x="31.5" y="11" width="8" height="4.5" rx="1.8" fill="#0f172a" />
      <rect x="31.5" y="32.5" width="8" height="4.5" rx="1.8" fill="#0f172a" />
      <rect x="3.5" y="13.5" width="41" height="21" rx="4" fill="currentColor" stroke={glyphStroke} strokeWidth="1.2" />
      <rect x="4.5" y="14.5" width="39" height="6" rx="4" fill="#ffffff" opacity="0.18" />
      <rect x="6" y="16.5" width="17" height="15" rx="1.5" fill="rgba(15,23,42,0.18)" stroke="rgba(15,23,42,0.45)" strokeWidth="0.9" />
      <line x1="10.2" y1="17.5" x2="10.2" y2="30.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
      <line x1="14.5" y1="17.5" x2="14.5" y2="30.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
      <line x1="18.8" y1="17.5" x2="18.8" y2="30.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
      <rect x="25" y="16.5" width="16" height="15" rx="3.5" fill="rgba(15,23,42,0.78)" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.8" />
      <rect x="29.5" y="19.5" width="7.5" height="9" rx="2.5" fill="currentColor" />
      <rect x="29.5" y="19.5" width="7.5" height="9" rx="2.5" fill="#ffffff" opacity="0.22" />
      <rect x="41" y="16" width="3.5" height="4.5" rx="1.3" fill="#fde68a" />
      <rect x="41" y="27.5" width="3.5" height="4.5" rx="1.3" fill="#fde68a" />
      <rect x="3.5" y="16" width="3" height="4.5" rx="1.3" fill="#ef4444" />
      <rect x="3.5" y="27.5" width="3" height="4.5" rx="1.3" fill="#ef4444" />
      <rect x="24" y="11" width="4.5" height="3.2" rx="1.3" fill={glyphStroke} />
      <rect x="24" y="33.8" width="4.5" height="3.2" rx="1.3" fill={glyphStroke} />
    </svg>
  )
}

function PersonManGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="25" cy="29" rx="10" ry="8" fill={glyphShadow} />
      <ellipse cx="21" cy="21" rx="3.2" ry="4" fill="currentColor" stroke={glyphStroke} strokeWidth="0.9" transform="rotate(-30 21 21)" />
      <ellipse cx="21" cy="35" rx="3.2" ry="4" fill="currentColor" stroke={glyphStroke} strokeWidth="0.9" transform="rotate(30 21 35)" />
      <ellipse cx="24" cy="28" rx="9.5" ry="7.5" fill="currentColor" stroke={glyphStroke} strokeWidth="1" />
      <ellipse cx="21" cy="26" rx="5.5" ry="4.4" fill="#ffffff" opacity="0.14" />
      <circle cx="24" cy="18" r="6.2" fill="#1f2937" stroke="rgba(15,23,42,0.6)" strokeWidth="0.9" />
      <ellipse cx="25.6" cy="18.6" rx="3.4" ry="4.2" fill="#f3c9a1" />
      <circle cx="22" cy="15.8" r="1.8" fill="#ffffff" opacity="0.18" />
    </svg>
  )
}

function PersonWomanGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="25" cy="29" rx="9" ry="7.5" fill={glyphShadow} />
      <ellipse cx="21.5" cy="21.5" rx="3" ry="3.8" fill="currentColor" stroke={glyphStroke} strokeWidth="0.9" transform="rotate(-30 21.5 21.5)" />
      <ellipse cx="21.5" cy="34.5" rx="3" ry="3.8" fill="currentColor" stroke={glyphStroke} strokeWidth="0.9" transform="rotate(30 21.5 34.5)" />
      <ellipse cx="24" cy="28" rx="8.6" ry="7" fill="currentColor" stroke={glyphStroke} strokeWidth="1" />
      <ellipse cx="21.2" cy="26" rx="5" ry="4" fill="#ffffff" opacity="0.14" />
      <ellipse cx="22.6" cy="18" rx="7.4" ry="8.2" fill="#4c1d95" />
      <circle cx="24" cy="17.6" r="5.8" fill="#4c1d95" stroke="rgba(15,23,42,0.6)" strokeWidth="0.9" />
      <ellipse cx="25.6" cy="18.4" rx="3.1" ry="3.9" fill="#f3c9a1" />
      <circle cx="22.4" cy="15.6" r="1.6" fill="#ffffff" opacity="0.16" />
    </svg>
  )
}

function DeskGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="14" width="39" height="21" rx="4" fill={glyphShadow} />
      <rect x="4" y="13" width="40" height="21" rx="4" fill="currentColor" stroke={glyphStroke} strokeWidth="1.1" />
      <rect x="5" y="14" width="38" height="6" rx="3.5" fill="#ffffff" opacity="0.2" />
      <rect x="6" y="15" width="36" height="17" rx="3" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
      <rect x="34" y="15.5" width="7.5" height="16" rx="1.6" fill="rgba(15,23,42,0.22)" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.8" />
      <rect x="36" y="18.5" width="3.4" height="1.2" rx="0.6" fill="#ffffff" opacity="0.75" />
      <rect x="36" y="22.4" width="3.4" height="1.2" rx="0.6" fill="#ffffff" opacity="0.75" />
      <rect x="36" y="26.3" width="3.4" height="1.2" rx="0.6" fill="#ffffff" opacity="0.75" />
    </svg>
  )
}

function OfficeChairGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="25.5" cy="25.5" r="12" fill={glyphShadow} />
      <g stroke={glyphStroke} strokeWidth="1.8">
        <line x1="24" y1="24" x2="24" y2="11" />
        <line x1="24" y1="24" x2="36.4" y2="20" />
        <line x1="24" y1="24" x2="31.6" y2="34.6" />
        <line x1="24" y1="24" x2="16.4" y2="34.6" />
        <line x1="24" y1="24" x2="11.6" y2="20" />
      </g>
      <g fill="#111827">
        <circle cx="24" cy="10.6" r="1.7" />
        <circle cx="37" cy="19.7" r="1.7" />
        <circle cx="32" cy="35.2" r="1.7" />
        <circle cx="16" cy="35.2" r="1.7" />
        <circle cx="11" cy="19.7" r="1.7" />
      </g>
      <path d="M 24 33 A 9 9 0 0 1 24 15" fill="none" stroke={glyphStroke} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="7" fill="currentColor" stroke={glyphStroke} strokeWidth="1" />
      <circle cx="24" cy="24" r="7" fill="#ffffff" opacity="0.15" />
    </svg>
  )
}

function ComputerGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="12" width="38" height="24" rx="3" fill="rgba(15,23,42,0.14)" />
      <rect x="7" y="8" width="34" height="10" rx="2.2" fill="#111827" stroke={glyphStroke} strokeWidth="0.9" />
      <rect x="9.4" y="10" width="29.2" height="6" rx="1.4" fill="#38bdf8" />
      <rect x="9.4" y="10" width="29.2" height="2.4" rx="1.2" fill="#7dd3fc" />
      <rect x="12" y="26" width="22" height="9" rx="2" fill="currentColor" stroke={glyphStroke} strokeWidth="0.9" />
      <rect x="13.8" y="27.6" width="18.4" height="1.4" rx="0.7" fill="#ffffff" opacity="0.35" />
      <rect x="13.8" y="30" width="18.4" height="1.4" rx="0.7" fill="#ffffff" opacity="0.35" />
      <rect x="13.8" y="32.4" width="18.4" height="1.4" rx="0.7" fill="#ffffff" opacity="0.35" />
      <rect x="36" y="27" width="6" height="8" rx="3" fill="#475569" stroke={glyphStroke} strokeWidth="0.8" />
    </svg>
  )
}

function TreeGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="26" cy="26" r="15" fill={glyphShadow} />
      <circle cx="24" cy="24" r="16" fill="currentColor" stroke={glyphStroke} strokeWidth="1.1" />
      <circle cx="24" cy="24" r="11.5" fill="#ffffff" opacity="0.14" />
      <g fill="#ffffff" opacity="0.16">
        <circle cx="24" cy="14.5" r="5" />
        <circle cx="33.5" cy="29.5" r="5" />
        <circle cx="14.5" cy="29.5" r="5" />
      </g>
      <g fill="#000000" opacity="0.12">
        <circle cx="24" cy="32" r="4.6" />
        <circle cx="32" cy="18" r="4.6" />
        <circle cx="16" cy="18" r="4.6" />
      </g>
      <circle cx="20.5" cy="20.5" r="4" fill="#ffffff" opacity="0.18" />
      <circle cx="24" cy="24" r="2.6" fill="#6b3f16" stroke="rgba(15,23,42,0.5)" strokeWidth="0.8" />
    </svg>
  )
}

function PlantGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="25.5" cy="25.5" r="15" fill={glyphShadow} />
      <circle cx="24" cy="24" r="15" fill="#b45309" stroke={glyphStroke} strokeWidth="1.1" />
      <circle cx="24" cy="24" r="12.4" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.9" />
      <circle cx="24" cy="24" r="11.4" fill="#3f2a15" />
      <g fill="currentColor">
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse key={i} cx="24" cy="16" rx="3.5" ry="6.4" transform={`rotate(${i * 45} 24 24)`} />
        ))}
      </g>
      <g fill="#000000" opacity="0.18">
        {Array.from({ length: 4 }).map((_, i) => (
          <ellipse key={i} cx="24" cy="16" rx="3.5" ry="6.4" transform={`rotate(${i * 90 + 45} 24 24)`} />
        ))}
      </g>
      <circle cx="24" cy="24" r="3.2" fill="#166534" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
    </svg>
  )
}

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
                    <CarSedanGlyph className="h-4 w-4" />
                    Autos
                  </Button>
                  <Button
                    variant={selectedCategory === 'people' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10px] px-1.5 gap-1 rounded-lg"
                    onClick={() => setSelectedCategory('people')}
                  >
                    <PersonManGlyph className="h-4 w-4" />
                    Personas
                  </Button>
                  <Button
                    variant={selectedCategory === 'office' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10px] px-1.5 gap-1 rounded-lg"
                    onClick={() => setSelectedCategory('office')}
                  >
                    <OfficeChairGlyph className="h-4 w-4" />
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
                    <TreeGlyph className="h-4 w-4 text-emerald-500" />
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
                        <CarSedanGlyph className="h-5 w-5 text-blue-500" />
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
                        <CarSuvGlyph className="h-5 w-5 text-emerald-500" />
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
                        <TruckGlyph className="h-5 w-5 text-amber-500" />
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
                        <PersonManGlyph className="h-5 w-5 text-indigo-500" />
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
                        <PersonWomanGlyph className="h-5 w-5 text-pink-500" />
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
                        <DeskGlyph className="h-5 w-5 text-slate-600" />
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
                        <OfficeChairGlyph className="h-5 w-5 text-slate-700" />
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
                        <ComputerGlyph className="h-5 w-5 text-cyan-600" />
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
                        <TreeGlyph className="h-5 w-5 text-emerald-600" />
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
                        <PlantGlyph className="h-5 w-5 text-green-500" />
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
