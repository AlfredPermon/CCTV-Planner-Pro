'use client'

import { useState, Dispatch, SetStateAction, RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  Wrench,
  X,
  Hand,
  Ruler,
  ZoomIn,
  Maximize2,
  ZoomOut,
  RotateCcw,
  Grid
} from 'lucide-react'
import type { FloorPlan } from '@/lib/cctv/types'

export interface FloatingDesignToolbarProps {
  toolMode: 'select' | 'pan' | 'measure'
  setToolMode: Dispatch<SetStateAction<'select' | 'pan' | 'measure'>>
  scale: number
  setScale: Dispatch<SetStateAction<number>>
  setPan: Dispatch<SetStateAction<{ x: number; y: number }>>
  setCursor: Dispatch<SetStateAction<string>>
  floorPlan: FloorPlan | null
  measureStateRef: RefObject<{ ax?: number; ay?: number; bx?: number; by?: number } | null>
  setMeasureTempPoint: Dispatch<SetStateAction<{ x: number; y: number } | null>>
  showGrid?: boolean
  onToggleGrid?: () => void
  isFitToWindow?: boolean
  onToggleFitWindow?: () => void
}

export function FloatingDesignToolbar({
  toolMode,
  setToolMode,
  scale,
  setScale,
  setPan,
  setCursor,
  floorPlan,
  measureStateRef,
  setMeasureTempPoint,
  showGrid = false,
  onToggleGrid,
  isFitToWindow = false,
  onToggleFitWindow
}: FloatingDesignToolbarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handlePanToggle = () => {
    if (floorPlan?.locked) return
    setToolMode((prev) => {
      const next = prev === 'pan' ? 'select' : 'pan'
      setCursor(next === 'pan' ? 'grab' : 'crosshair')
      if (measureStateRef) measureStateRef.current = null
      setMeasureTempPoint(null)
      return next
    })
  }

  const handleMeasureToggle = () => {
    setToolMode((prev) => {
      const next = prev === 'measure' ? 'select' : 'measure'
      setCursor('crosshair')
      if (measureStateRef) measureStateRef.current = null
      setMeasureTempPoint(null)
      return next
    })
  }

  const handleResetView = () => {
    setPan({ x: 0, y: 0 })
    setScale(1)
    setToolMode('select')
    setCursor('crosshair')
  }

  const handleFitClick = () => {
    if (onToggleFitWindow) {
      onToggleFitWindow()
    } else {
      setScale(1)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 transition-all duration-300 ease-in-out pointer-events-auto">
        {/* Trigger Button (Collapsed State - Bottom Left Corner) */}
        {!isOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-2xl border border-white/40 dark:border-white/15 bg-white/30 dark:bg-slate-900/50 text-foreground shadow-xl backdrop-blur-md backdrop-saturate-150 hover:bg-white/50 dark:hover:bg-slate-800/70 hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-200"
                onClick={() => setIsOpen(true)}
                aria-label="Abrir Herramientas Diseño"
              >
                <Wrench className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Herramientas Diseño
            </TooltipContent>
          </Tooltip>
        )}

        {/* Expanded Toolbar (Horizontal Left-to-Right Glassmorphism in Bottom Left Corner) */}
        {isOpen && (
          <div className="flex flex-row items-center gap-2 max-w-[calc(100vw-2.5rem)] sm:max-w-[calc(100vw-4rem)] overflow-x-auto scrollbar-none rounded-2xl border border-white/40 dark:border-white/15 bg-white/30 dark:bg-slate-900/50 p-2 shadow-[0_18px_45px_-20px_rgba(0,0,0,0.35)] backdrop-blur-md backdrop-saturate-150 animate-in fade-in slide-in-from-left-3 duration-200">
            {/* Close button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border border-white/30 dark:border-white/15 bg-white/10 dark:bg-slate-800/20 text-muted-foreground hover:bg-destructive/20 hover:text-destructive hover:border-destructive/40 focus-visible:ring-2 focus-visible:ring-destructive transition-colors backdrop-blur-sm shrink-0"
                  onClick={() => setIsOpen(false)}
                  aria-label="Cerrar Herramientas Diseño"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Cerrar Herramientas Diseño</TooltipContent>
            </Tooltip>

            <div className="h-5 w-px bg-white/30 dark:bg-white/15 mx-0.5 shrink-0" />

            {/* Hand / Pan Tool */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={toolMode === 'pan' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 px-3 rounded-xl border transition-all duration-150 backdrop-blur-sm shrink-0 ${
                    toolMode === 'pan'
                      ? 'border-primary/60 bg-primary/25 text-primary shadow-inner font-semibold'
                      : 'border-white/30 dark:border-white/15 bg-white/10 dark:bg-slate-800/20 text-foreground hover:bg-white/30 dark:hover:bg-slate-700/40'
                  }`}
                  onClick={handlePanToggle}
                  aria-label="Manito para desplazamiento"
                >
                  <Hand className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Manito (Desplazamiento)</TooltipContent>
            </Tooltip>

            {/* Measure Tool */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={toolMode === 'measure' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 px-3 rounded-xl border transition-all duration-150 backdrop-blur-sm shrink-0 ${
                    toolMode === 'measure'
                      ? 'border-primary/60 bg-primary/25 text-primary font-semibold shadow-inner'
                      : 'border-white/30 dark:border-white/15 bg-white/10 dark:bg-slate-800/20 text-foreground hover:bg-white/30 dark:hover:bg-slate-700/40'
                  }`}
                  onClick={handleMeasureToggle}
                  disabled={!floorPlan?.scaleMetersPerPixel}
                  aria-label="Herramienta de Medición"
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {!floorPlan?.scaleMetersPerPixel ? 'Defina la escala primero' : 'Herramienta de Medición'}
              </TooltipContent>
            </Tooltip>

            <div className="h-5 w-px bg-white/30 dark:bg-white/15 mx-0.5 shrink-0" />

            {/* Grid Toggle Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showGrid ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 px-3 rounded-xl border transition-all duration-150 backdrop-blur-sm shrink-0 ${
                    showGrid
                      ? 'border-primary/60 bg-primary/25 text-primary font-semibold shadow-inner'
                      : 'border-white/30 dark:border-white/15 bg-white/10 dark:bg-slate-800/20 text-foreground hover:bg-white/30 dark:hover:bg-slate-700/40'
                  }`}
                  onClick={() => onToggleGrid && onToggleGrid()}
                  aria-label="Activar/Desactivar Cuadrícula (Grid)"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {showGrid ? 'Ocultar Cuadrícula (Grid)' : 'Mostrar Cuadrícula (Grid)'}
              </TooltipContent>
            </Tooltip>

            {/* Zoom In */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-xl border border-white/30 dark:border-white/15 bg-white/10 dark:bg-slate-800/20 text-foreground hover:bg-white/30 dark:hover:bg-slate-700/40 transition-all duration-150 backdrop-blur-sm shrink-0"
                  onClick={() => setScale((prev) => Math.min(3, prev * 1.2))}
                  aria-label="Aumentar zoom"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Aumentar zoom (+)</TooltipContent>
            </Tooltip>

            {/* Fit / Full Canvas Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isFitToWindow ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 px-3 rounded-xl border transition-all duration-150 backdrop-blur-sm shrink-0 ${
                    isFitToWindow
                      ? 'border-primary/60 bg-primary/25 text-primary font-semibold shadow-inner'
                      : 'border-white/30 dark:border-white/15 bg-white/10 dark:bg-slate-800/20 text-foreground hover:bg-white/30 dark:hover:bg-slate-700/40'
                  }`}
                  onClick={handleFitClick}
                  aria-label="Ampliar canva (Reset Zoom)"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isFitToWindow ? 'Restablecer Zoom Original' : 'Ampliar canva (Ajustar a Pantalla)'}
              </TooltipContent>
            </Tooltip>

            {/* Zoom Out */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-xl border border-white/30 dark:border-white/15 bg-white/10 dark:bg-slate-800/20 text-foreground hover:bg-white/30 dark:hover:bg-slate-700/40 transition-all duration-150 backdrop-blur-sm shrink-0"
                  onClick={() => setScale((prev) => Math.max(0.25, prev * 0.8))}
                  aria-label="Disminuir zoom"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Disminuir zoom (-)</TooltipContent>
            </Tooltip>

            {/* Reset / Refresh View */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-xl border border-white/30 dark:border-white/15 bg-white/10 dark:bg-slate-800/20 text-foreground hover:bg-white/30 dark:hover:bg-slate-700/40 transition-all duration-150 backdrop-blur-sm shrink-0"
                  onClick={handleResetView}
                  aria-label="Actualizar vista del lienzo"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Actualizar vista del lienzo</TooltipContent>
            </Tooltip>

            {/* Active Scale Info Text */}
            {floorPlan?.scaleMetersPerPixel !== undefined && (
              <div className="ml-1 text-xs font-medium text-foreground/80 bg-white/20 dark:bg-slate-800/30 border border-white/20 dark:border-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm whitespace-nowrap shrink-0">
                Escala activa: {floorPlan.scaleMetersPerPixel.toFixed(4)} m/px {floorPlan.locked ? '(bloqueado)' : ''}
              </div>
            )}

            {/* Canvas Shortcuts info & Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 text-xs text-muted-foreground/90 font-mono cursor-default bg-white/10 dark:bg-slate-800/20 border border-white/20 dark:border-white/10 px-2.5 py-1 rounded-lg backdrop-blur-sm whitespace-nowrap shrink-0">
                  Copiar <kbd className="px-1 rounded bg-black/10 dark:bg-white/10">Ctrl</kbd>+<kbd className="px-1 rounded bg-black/10 dark:bg-white/10">C</kbd> · Pegar <kbd className="px-1 rounded bg-black/10 dark:bg-white/10">Ctrl</kbd>+<kbd className="px-1 rounded bg-black/10 dark:bg-white/10">V</kbd>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Atajos disponibles en el lienzo</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

