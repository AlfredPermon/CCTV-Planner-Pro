'use client'
import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Trash2, RotateCcw, ZoomIn, ZoomOut, Maximize2, Target, Eye, Hand, Ruler } from 'lucide-react'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import type { Camera, FloorPlan, AccessDevice, VoceoDevice, FireDevice, ParkingDevice, CanvasAnnotation, ObjectCategory, ObjectSubtype } from '@/lib/cctv/types'
import { FloatingCanvasToolbar, type ActiveTool } from '@/components/cctv/FloatingCanvasToolbar'
import { FloatingDesignToolbar } from '@/components/cctv/FloatingDesignToolbar'
import { drawAnnotation, isPointInAnnotation, hitTestAnnotationHandles, rotatePoint, unrotatePoint, getAnnotationCenter, getAnnotationBoundingBox, type AnnotationHandleKey } from '@/lib/cctv/annotations'
import { drawCameraCoverage, getCoverageHandles, CAMERA_TYPE_COLORS } from '@/lib/cctv/coverageRenderer'
import {
  DEFAULT_ACCESS_LABEL_BG_COLOR,
  DEFAULT_ACCESS_LABEL_BORDER_COLOR,
  DEFAULT_ACCESS_LABEL_FONT_COLOR,
  DEFAULT_ACCESS_LABEL_OFFSET_X,
  DEFAULT_ACCESS_LABEL_OFFSET_Y,
  DEFAULT_ACCESS_LABEL_OUTLINE_COLOR,
  getAccessCanvasLabelLayout,
  resolveAccessLabelFontColor,
  resolveAccessLabelFontFamily,
  resolveAccessLabelFontSize,
} from '@/lib/access/device'
import { drawAccessIcon } from '@/lib/access/iconRegistry'
import { drawVoceoIcon, getVoceoColor } from '@/lib/voceo/iconRegistry'
import { drawFireIcon, getFireColor } from '@/lib/incendio/iconRegistry'

/**
 * Dibuja una imagen en el contexto destino aplicando una reducción de alta calidad
 * en pasos sucesivos (factor ≤ 2× por iteración) sobre un canvas intermediario
 * independiente. Esto preserva mejor la nitidez que un único drawImage cuando la
 * imagen origen es mucho más grande que el destino, y es robusto frente a
 * imágenes pequeñas (en cuyo caso copia 1:1 sin pasos intermedios).
 *
 * No requiere dependencias externas. Crea y reutiliza hasta 2 canvas off-screen
 * de tamaño acotado al destino, por lo que el consumo de memoria es constante.
 */
export function drawHighQualityImage(
  destCtx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) {
  const sw = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || dWidth
  const sh = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height || dHeight
  if (sw <= 0 || sh <= 0 || dWidth <= 0 || dHeight <= 0) return

  // Crea un canvas "working" con la mejor calidad posible.
  const make = (w: number, h: number) => {
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w))
    c.height = Math.max(1, Math.round(h))
    const cx = c.getContext('2d')
    if (cx) {
      cx.imageSmoothingEnabled = true
      cx.imageSmoothingQuality = 'high'
    }
    return { c, cx }
  }

  // Caso 1: ampliación → un solo paso con alta calidad es suficiente.
  if (sw <= dWidth && sh <= dHeight) {
    destCtx.drawImage(img, dx, dy, dWidth, dHeight)
    return
  }

  // Caso 2: reducción → pasos sucesivos de factor 2 (técnica "Mitchell" simplificada).
  let curW = sw
  let curH = sh
  let source: CanvasImageSource = img
  let stage: { c: HTMLCanvasElement; cx: CanvasRenderingContext2D | null } | null = null
  while (curW > dWidth * 2 || curH > dHeight * 2) {
    const nextW = Math.max(dWidth, Math.floor(curW / 2))
    const nextH = Math.max(dHeight, Math.floor(curH / 2))
    const next = make(nextW, nextH)
    if (!stage || !stage.cx) {
      next.cx!.drawImage(source, 0, 0, nextW, nextH)
    } else {
      next.cx!.drawImage(stage.c, 0, 0, nextW, nextH)
    }
    stage = next
    curW = nextW
    curH = nextH
    source = stage.c
  }

  if (stage) {
    destCtx.drawImage(stage.c, dx, dy, dWidth, dHeight)
  } else {
    destCtx.drawImage(img, dx, dy, dWidth, dHeight)
  }
}

/**
 * Icono SVG animado con 3 flechas curvas circulares en rotación continua (conforme al diseño de referencia provisto).
 */
export function ThreeArrowsCircleIcon({ className = 'h-5 w-5', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 100 100"
      fill="currentColor"
      {...props}
    >
      <g transform="translate(50,50)">
        {/* Flecha 1 */}
        <g>
          <path d="M 0 -38 A 38 38 0 0 1 32.9 19" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          <polygon points="36,26 24,15 38,10" fill="currentColor" />
        </g>
        {/* Flecha 2 (120° rotación) */}
        <g transform="rotate(120)">
          <path d="M 0 -38 A 38 38 0 0 1 32.9 19" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          <polygon points="36,26 24,15 38,10" fill="currentColor" />
        </g>
        {/* Flecha 3 (240° rotación) */}
        <g transform="rotate(240)">
          <path d="M 0 -38 A 38 38 0 0 1 32.9 19" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          <polygon points="36,26 24,15 38,10" fill="currentColor" />
        </g>
      </g>
    </svg>
  )
}

/**
 * Desplaza una anotaciones y recursivamente todos sus hijos (si es un grupo) en dx, dy.
 */
function translateAnnotation(initial: CanvasAnnotation, dx: number, dy: number): CanvasAnnotation {
  const updated: CanvasAnnotation = {
    ...initial,
    x: initial.x + dx,
    y: initial.y + dy
  }
  if (initial.endX !== undefined) {
    updated.endX = initial.endX + dx
  }
  if (initial.endY !== undefined) {
    updated.endY = initial.endY + dy
  }
  if (initial.points) {
    updated.points = initial.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
  }
  if (initial.children) {
    updated.children = initial.children.map(child => translateAnnotation(child, dx, dy))
  }
  return updated
}

/**
 * Escala una anotación y recursivamente todos sus hijos (si es un grupo).
 */
function scaleAnnotation(
  initial: CanvasAnnotation,
  newMinX: number,
  newMinY: number,
  scaleX: number,
  scaleY: number,
  origBox: { minX: number; minY: number }
): CanvasAnnotation {
  const dx = (initial.x - origBox.minX) * scaleX
  const dy = (initial.y - origBox.minY) * scaleY
  const updated: CanvasAnnotation = {
    ...initial,
    x: newMinX + dx,
    y: newMinY + dy
  }
  if (initial.width !== undefined) updated.width = Math.max(5, initial.width * scaleX)
  if (initial.height !== undefined) updated.height = Math.max(5, initial.height * scaleY)
  if (initial.endX !== undefined) updated.endX = newMinX + (initial.endX - origBox.minX) * scaleX
  if (initial.endY !== undefined) updated.endY = newMinY + (initial.endY - origBox.minY) * scaleY
  if (initial.fontSize !== undefined) updated.fontSize = Math.max(8, Math.round(initial.fontSize * scaleY))
  if (initial.points) {
    updated.points = initial.points.map(p => ({
      x: newMinX + (p.x - origBox.minX) * scaleX,
      y: newMinY + (p.y - origBox.minY) * scaleY
    }))
  }
  if (initial.children) {
    updated.children = initial.children.map(child => scaleAnnotation(child, newMinX, newMinY, scaleX, scaleY, origBox))
  }
  return updated
}

interface CCTVCanvasProps {
  cameras: Camera[]
  accessDevices: AccessDevice[]
  voceoDevices: VoceoDevice[]
  fireDevices: FireDevice[]
  parkingDevices?: ParkingDevice[]
  floorPlan: FloorPlan | null
  view?: 'cameras' | 'parking' | 'access' | 'voceo' | 'fire' | 'combined'
  selectedCamera: string | null
  selectedAccessDevice: string | null
  selectedVoceoDevice: string | null
  selectedFireDevice: string | null
  selectedParkingDevice?: string | null
  onCameraSelect: (id: string | null) => void
  onAccessDeviceSelect: (id: string | null) => void
  onVoceoDeviceSelect: (id: string | null) => void
  onFireDeviceSelect: (id: string | null) => void
  onParkingDeviceSelect?: (id: string | null) => void
  onCameraUpdate: (id: string, updates: Partial<Camera>) => void
  onAccessDeviceUpdate: (id: string, updates: Partial<AccessDevice>) => void
  onVoceoDeviceUpdate: (id: string, updates: Partial<VoceoDevice>) => void
  onFireDeviceUpdate: (id: string, updates: Partial<FireDevice>) => void
  onParkingDeviceUpdate?: (id: string, updates: Partial<ParkingDevice>) => void
  onCameraDelete: (id: string) => void
  onAccessDeviceDelete: (id: string) => void
  onVoceoDeviceDelete: (id: string) => void
  onFireDeviceDelete: (id: string) => void
  onParkingDeviceDelete?: (id: string) => void
  iconScales: Record<string, number>
  onIconScaleChange: (id: string, value: number) => void
  defineScaleMode?: boolean
  onScalePointsSelected?: (ax: number, ay: number, bx: number, by: number, pixelDistance: number) => void
  onCameraCreate: (cam: Camera) => void
  onAccessDeviceCreate: (dev: AccessDevice) => void
  onVoceoDeviceCreate: (dev: VoceoDevice) => void
  onFireDeviceCreate: (dev: FireDevice) => void
  onParkingDeviceCreate?: (dev: { x: number; y: number; rotation: number; labelOffsetX?: number; labelOffsetY?: number }) => void
  onFireDeviceSeedCreate?: (dev: { x: number; y: number; rotation: number; labelOffsetX?: number; labelOffsetY?: number }) => void
  onCameraSeedCreate?: (dev: { x: number; y: number; rotation: number; labelOffsetX?: number; labelOffsetY?: number }) => void
  onAccessSeedCreate?: (dev: { x: number; y: number; rotation: number; labelOffsetX?: number; labelOffsetY?: number }) => void
  onVoceoSeedCreate?: (dev: { x: number; y: number; rotation: number; labelOffsetX?: number; labelOffsetY?: number }) => void
  parkingSeedName?: string | null
  fireSeedName?: string | null
  cameraSeedName?: string | null
  accessSeedName?: string | null
  voceoSeedName?: string | null
  clearToken?: number
  onCancelSeeding?: () => void
  annotations?: CanvasAnnotation[]
  onAnnotationsChange?: (annotations: CanvasAnnotation[]) => void
  /** Controla la visibilidad de las líneas punteadas rojas del FOV y el label de distancia.
   *  No afecta los cálculos DRI ni la lógica de cobertura. */
  hideFovLines?: boolean
  flashId?: string | null
}

export default function CCTVCanvas({
  cameras,
  accessDevices,
  voceoDevices,
  fireDevices,
  parkingDevices = [],
  floorPlan,
  view = 'combined',
  selectedCamera,
  selectedAccessDevice,
  selectedVoceoDevice,
  selectedFireDevice,
  selectedParkingDevice,
  flashId,
  onCameraSelect,
  onAccessDeviceSelect,
  onVoceoDeviceSelect,
  onFireDeviceSelect,
  onParkingDeviceSelect,
  onCameraUpdate,
  onAccessDeviceUpdate,
  onVoceoDeviceUpdate,
  onFireDeviceUpdate,
  onParkingDeviceUpdate,
  onCameraDelete,
  onAccessDeviceDelete,
  onVoceoDeviceDelete,
  onFireDeviceDelete,
  onParkingDeviceDelete,
  iconScales,
  onIconScaleChange,
  defineScaleMode,
  onScalePointsSelected,
  onCameraCreate,
  onAccessDeviceCreate,
  onVoceoDeviceCreate,
  onFireDeviceCreate,
  onParkingDeviceCreate,
  onFireDeviceSeedCreate,
  onCameraSeedCreate,
  onAccessSeedCreate,
  onVoceoSeedCreate,
  parkingSeedName,
  fireSeedName,
  cameraSeedName,
  accessSeedName,
  voceoSeedName,
  clearToken,
  onCancelSeeding,
  annotations: propsAnnotations,
  onAnnotationsChange,
  hideFovLines = false
}: CCTVCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const floorPlanImageRef = useRef<HTMLImageElement | null>(null)
  const [, forceUpdate] = useState({})
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hoveredCamera, setHoveredCamera] = useState<string | null>(null)
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null)
  const [hoveredVoceo, setHoveredVoceo] = useState<string | null>(null)
  const [hoveredFire, setHoveredFire] = useState<string | null>(null)
  const [hoveredParking, setHoveredParking] = useState<string | null>(null)
  const [interaction, setInteraction] = useState<'idle' | 'move' | 'rotate'>('idle')
  const interactionStateRef = useRef<{ id: string | null; kind: 'camera' | 'device' | 'voceo' | 'fire' | 'parking' | 'label_camera' | 'label_device' | 'label_voceo' | 'label_fire' | 'label_parking' | null; startX: number; startY: number; initialOffsetX?: number; initialOffsetY?: number }>({ id: null, kind: null, startX: 0, startY: 0 })
  const [rotateAnglePreview, setRotateAnglePreview] = useState<number | null>(null)
  const [toolMode, setToolMode] = useState<'select' | 'pan' | 'measure'>('select')
  const [showGrid, setShowGrid] = useState<boolean>(false)
  const [isFitToWindow, setIsFitToWindow] = useState<boolean>(false)
  const savedZoomStateRef = useRef<{ scale: number; pan: { x: number; y: number } } | null>(null)

  // Estado de Anotaciones y Herramientas Flotantes de Dibujo
  const [internalAnnotations, setInternalAnnotations] = useState<CanvasAnnotation[]>([])
  const currentAnnotations = propsAnnotations ?? internalAnnotations

  const setAnnotations = useCallback(
    (action: CanvasAnnotation[] | ((prev: CanvasAnnotation[]) => CanvasAnnotation[])) => {
      if (onAnnotationsChange) {
        if (typeof action === 'function') {
          onAnnotationsChange(action(currentAnnotations))
        } else {
          onAnnotationsChange(action)
        }
      } else {
        setInternalAnnotations(action)
      }
    },
    [onAnnotationsChange, currentAnnotations]
  )

  // Historial Deshacer / Rehacer para Anotaciones
  const [annotationUndoStack, setAnnotationUndoStack] = useState<CanvasAnnotation[][]>([])
  const [annotationRedoStack, setAnnotationRedoStack] = useState<CanvasAnnotation[][]>([])

  const pushAnnotationHistory = useCallback((prevAnnotations: CanvasAnnotation[]) => {
    setAnnotationUndoStack(stack => [...stack.slice(-25), prevAnnotations])
    setAnnotationRedoStack([])
  }, [])

  const handleUndoAnnotation = useCallback(() => {
    if (annotationUndoStack.length === 0) return
    const prev = annotationUndoStack[annotationUndoStack.length - 1]
    setAnnotationRedoStack(stack => [currentAnnotations, ...stack])
    setAnnotationUndoStack(stack => stack.slice(0, -1))
    if (onAnnotationsChange) onAnnotationsChange(prev)
    else setInternalAnnotations(prev)
    toast({ title: 'Deshecho', description: 'Cambio de anotación deshecho' })
  }, [annotationUndoStack, currentAnnotations, onAnnotationsChange])

  const handleRedoAnnotation = useCallback(() => {
    if (annotationRedoStack.length === 0) return
    const next = annotationRedoStack[0]
    setAnnotationUndoStack(stack => [...stack, currentAnnotations])
    setAnnotationRedoStack(stack => stack.slice(1))
    if (onAnnotationsChange) onAnnotationsChange(next)
    else setInternalAnnotations(next)
    toast({ title: 'Rehecho', description: 'Cambio de anotación rehecho' })
  }, [annotationRedoStack, currentAnnotations, onAnnotationsChange])

  const [activeDrawingTool, setActiveDrawingTool] = useState<ActiveTool>('select')
  const [strokeColor, setStrokeColor] = useState<string>('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState<number>(3)
  const [fillColor, setFillColor] = useState<string>('rgba(239, 68, 68, 0.2)')
  const [fillEnabled, setFillEnabled] = useState<boolean>(false)
  const isAnnotationVisibleInView = useCallback(
    (ann: CanvasAnnotation) => {
      if (!ann.view) return true
      if (view === 'combined') return true
      return ann.view === view
    },
    [view]
  )

  const visibleAnnotations = useMemo(
    () => currentAnnotations.filter(isAnnotationVisibleInView),
    [currentAnnotations, isAnnotationVisibleInView]
  )

  // Selección Múltiple y Agrupación de Anotaciones
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([])
  const selectedAnnotationId = selectedAnnotationIds.length > 0 ? selectedAnnotationIds[0] : null
  const setSelectedAnnotationId = useCallback((id: string | null) => {
    if (id === null) setSelectedAnnotationIds([])
    else setSelectedAnnotationIds([id])
  }, [])

  const [inlineTextEditor, setInlineTextEditor] = useState<{ id: string; text: string; x: number; y: number } | null>(null)
  const annotationClipboardRef = useRef<CanvasAnnotation[] | null>(null)
  const [hasAnnotationClipboard, setHasAnnotationClipboard] = useState(false)
  const [drawingAnnotation, setDrawingAnnotation] = useState<CanvasAnnotation | null>(null)
  const annotationDragRef = useRef<{ active: boolean; startX: number; startY: number; initialAnns: CanvasAnnotation[] } | null>(null)
  const marqueeDragRef = useRef<{ active: boolean; startX: number; startY: number; currentX: number; currentY: number } | null>(null)
  const coverageHandleDragRef = useRef<{ active: boolean; cameraId: string; handleKind: 'red_marker' | 'corner1' | 'corner2'; startX: number; startY: number; initialMeters: number; initialFov: number } | null>(null)
  const handleDragRef = useRef<{
    active: boolean
    kind: 'rotate' | 'scale'
    handleKey: AnnotationHandleKey
    startX: number
    startY: number
    initialAnn: CanvasAnnotation
    center: { cx: number; cy: number }
  } | null>(null)

  // Handlers para Agrupar y Desagrupar
  const handleGroupAnnotations = useCallback(() => {
    if (selectedAnnotationIds.length < 2) return
    pushAnnotationHistory(currentAnnotations)
    const selectedItems = currentAnnotations.filter(a => selectedAnnotationIds.includes(a.id))
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    selectedItems.forEach(item => {
      const box = getAnnotationBoundingBox(item)
      if (box.minX < minX) minX = box.minX
      if (box.minY < minY) minY = box.minY
      if (box.maxX > maxX) maxX = box.maxX
      if (box.maxY > maxY) maxY = box.maxY
    })
    const groupAnn: CanvasAnnotation = {
      id: crypto.randomUUID(),
      type: 'group',
      x: minX,
      y: minY,
      width: Math.max(20, maxX - minX),
      height: Math.max(20, maxY - minY),
      children: selectedItems,
      view
    }
    setAnnotations(prev => [
      ...prev.filter(a => !selectedAnnotationIds.includes(a.id)),
      groupAnn
    ])
    setSelectedAnnotationIds([groupAnn.id])
    toast({ title: 'Elementos Agrupados', description: `${selectedItems.length} elementos agrupados exitosamente` })
  }, [selectedAnnotationIds, currentAnnotations, pushAnnotationHistory, setAnnotations, view])

  const handleUngroupAnnotation = useCallback(() => {
    if (selectedAnnotationIds.length !== 1) return
    const groupAnn = currentAnnotations.find(a => a.id === selectedAnnotationIds[0] && a.type === 'group')
    if (!groupAnn || !groupAnn.children) return
    pushAnnotationHistory(currentAnnotations)
    const center = getAnnotationCenter(groupAnn)
    const rotation = groupAnn.rotation || 0

    const children = groupAnn.children.map(c => {
      if (rotation === 0) return c
      const centerChild = getAnnotationCenter(c)
      const rotatedChildCenter = rotatePoint(centerChild.cx, centerChild.cy, center.cx, center.cy, rotation)
      const dx = rotatedChildCenter.x - centerChild.cx
      const dy = rotatedChildCenter.y - centerChild.cy
      const rotatedChild = translateAnnotation(c, dx, dy)
      rotatedChild.rotation = ((c.rotation || 0) + rotation) % 360
      return rotatedChild
    })

    const childrenIds = children.map(c => c.id)
    setAnnotations(prev => [
      ...prev.filter(a => a.id !== groupAnn.id),
      ...children
    ])
    setSelectedAnnotationIds(childrenIds)
    toast({ title: 'Elementos Desagrupados', description: `${children.length} elementos desagrupados` })
  }, [selectedAnnotationIds, currentAnnotations, pushAnnotationHistory, setAnnotations])

  // Handlers para Copiar y Pegar Anotaciones
  const handleCopyAnnotation = useCallback(() => {
    const selectedItems = currentAnnotations.filter(a => selectedAnnotationIds.includes(a.id))
    if (selectedItems.length === 0) return
    annotationClipboardRef.current = JSON.parse(JSON.stringify(selectedItems))
    setHasAnnotationClipboard(true)
    toast({ title: 'Anotación Copiada', description: `${selectedItems.length} elementos copiados al portapapeles` })
  }, [currentAnnotations, selectedAnnotationIds])

  const handlePasteAnnotation = useCallback(() => {
    if (!annotationClipboardRef.current || annotationClipboardRef.current.length === 0) return
    pushAnnotationHistory(currentAnnotations)
    const newCopies: CanvasAnnotation[] = annotationClipboardRef.current.map(item => {
      const copy = JSON.parse(JSON.stringify(item)) as CanvasAnnotation
      copy.id = crypto.randomUUID()
      copy.x += 25
      copy.y += 25
      if (copy.endX !== undefined) copy.endX += 25
      if (copy.endY !== undefined) copy.endY += 25
      if (copy.points) copy.points = copy.points.map(p => ({ x: p.x + 25, y: p.y + 25 }))
      // El pegado ocurre sobre la vista activa, así que la copia se siembra
      // aquí sin importar la vista original del portapapeles.
      copy.view = view
      return copy
    })
    setAnnotations(prev => [...prev, ...newCopies])
    setSelectedAnnotationIds(newCopies.map(c => c.id))
    toast({ title: 'Anotación Pegada', description: `${newCopies.length} elementos pegados en el lienzo` })
  }, [currentAnnotations, pushAnnotationHistory, setAnnotations, view])

  const isSeeding = (view === 'parking' && !!parkingSeedName)
    || (view === 'fire' && !!fireSeedName)
    || (view === 'cameras' && !!cameraSeedName)
    || (view === 'access' && !!accessSeedName)
    || (view === 'voceo' && !!voceoSeedName);

  const emptyCursor = toolMode === 'measure'
    ? 'crosshair'
    : isSeeding
      ? 'crosshair'
      : 'default';
  
  const [cursor, setCursor] = useState<string>(emptyCursor)
  const [prevEmptyCursor, setPrevEmptyCursor] = useState<string>(emptyCursor)
  const measureStateRef = useRef<{ ax?: number; ay?: number } | null>(null)

  if (emptyCursor !== prevEmptyCursor) {
    setPrevEmptyCursor(emptyCursor)
    if (!hoveredCamera && !hoveredDevice && !hoveredVoceo && !hoveredFire && !hoveredParking && toolMode !== 'pan') {
      setCursor(emptyCursor)
    }
  }
  const [measureTempPoint, setMeasureTempPoint] = useState<{ x: number; y: number } | null>(null)
  const panDragRef = useRef<{ active: boolean; startCx: number; startCy: number; startPanX: number; startPanY: number }>({ active: false, startCx: 0, startCy: 0, startPanX: 0, startPanY: 0 })
  const scalePickRef = useRef<{ ax?: number; ay?: number; bx?: number; by?: number } | null>(null)
  const [tempScalePoint, setTempScalePoint] = useState<{ x: number; y: number } | null>(null)
  const [editingLabel, setEditingLabel] = useState<{ id: string; kind: 'camera' | 'device' | 'voceo' | 'fire' | 'parking'; value: string } | null>(null)
  const [editingPos, setEditingPos] = useState<{ left: number; top: number } | null>(null)
  const [missingLabel, setMissingLabel] = useState<{ id: string; kind: 'camera' | 'device' | 'voceo' | 'fire' | 'parking'; value: string } | null>(null)
  const [clipboard, setClipboard] = useState<{ kind: 'camera' | 'device' | 'voceo' | 'fire' | 'parking'; data: any } | null>(null)
  const [copiedFlashId, setCopiedFlashId] = useState<string | null>(null)
  const [lastContext, setLastContext] = useState<{ target: 'camera' | 'device' | 'voceo' | 'fire' | 'parking' | 'empty'; id?: string; wx: number; wy: number } | null>(null)
  const [prevClearToken, setPrevClearToken] = useState<number | undefined>(undefined)
  const [freeRotationCameraId, setFreeRotationCameraId] = useState<string | null>(null)

  // Estado de animación: rotación continua de 360° para indicar ciclo de activación.
  // Se activa cuando un dispositivo recibe "ciclo de activación" (copiado/pegado/activación).
  const [activationRotation, setActivationRotation] = useState<number>(0)
  const [isActivationAnimating, setIsActivationAnimating] = useState<boolean>(false)
  const activationAnimRef = useRef<number | null>(null)
  const activationStartRef = useRef<number>(0)

  // Posición del cursor en coords de mundo cuando estamos en modo sembrado.
  const [seedPreview, setSeedPreview] = useState<{ x: number; y: number } | null>(null)

  // Inicia/Detiene la animación de rotación 360° usando requestAnimationFrame.
  useEffect(() => {
    if (!isActivationAnimating) return
    activationStartRef.current = performance.now()
    const duration = 900 // 0.9s por ciclo de 360° (fluido y continuo si se reactiva)

    const tick = (now: number) => {
      const elapsed = now - activationStartRef.current
      // Módulo: completa exactamente 360° por ciclo y se reinicia sin "saltos".
      const phase = (elapsed % duration) / duration
      setActivationRotation(phase * 360)
      activationAnimRef.current = requestAnimationFrame(tick)
    }
    activationAnimRef.current = requestAnimationFrame(tick)
    return () => {
      if (activationAnimRef.current !== null) {
        cancelAnimationFrame(activationAnimRef.current)
        activationAnimRef.current = null
      }
    }
  }, [isActivationAnimating])

  // Use ref to track animation state to avoid setState in effect
  const activationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (flashId) {
      // Clear any existing timeout
      if (activationTimeoutRef.current) {
        clearTimeout(activationTimeoutRef.current)
      }
      // Set animation state via raf to avoid direct setState in effect
      requestAnimationFrame(() => {
        setIsActivationAnimating(true)
        activationTimeoutRef.current = setTimeout(() => {
          setIsActivationAnimating(false)
        }, 900)
      })
    }
    return () => {
      if (activationTimeoutRef.current) {
        clearTimeout(activationTimeoutRef.current)
      }
    }
  }, [flashId])

  if (clearToken !== undefined && clearToken !== prevClearToken) {
    setPrevClearToken(clearToken)
    setScale(1)
    setPan({ x: 0, y: 0 })
    setToolMode('select')
    setCursor(emptyCursor)
    setRotateAnglePreview(null)
    setMeasureTempPoint(null)
  }

  useEffect(() => {
    if (clearToken !== undefined) {
      measureStateRef.current = null
    }
  }, [clearToken])

  // Dimensiones lógicas del lienzo. El canvas real puede escalarse por DPR; aquí se
  // trabaja en píxeles lógicos (CSS px) para mantener una geometría estable e
  // independiente del tamaño del contenedor y del nivel de zoom del navegador.
  const LOGICAL_CANVAS_W = 1600
  const LOGICAL_CANVAS_H = 1100

  // Ajusta el plano para que aproveche el lienzo, conservando proporciones y
  // dejando márgenes uniformes en los cuatro lados. Si el plano no tiene
  // dimensiones declaradas (cargas muy antiguas), se usa la resolución natural
  // de la imagen como fallback.
  const getBackgroundBounds = useCallback(() => {
    if (!floorPlan || !floorPlanImageRef.current) return null

    const img = floorPlanImageRef.current
    const naturalW = (floorPlan.width && floorPlan.width > 0) ? floorPlan.width : (img.naturalWidth || img.width || 1000)
    const naturalH = (floorPlan.height && floorPlan.height > 0) ? floorPlan.height : (img.naturalHeight || img.height || 700)
    const aspectRatio = naturalW / naturalH

    // Margen uniforme del 4% del lienzo en cada lado (mínimo 30px lógicos)
    // para evitar que el plano pegue contra los bordes.
    const marginPct = 0.04
    const marginX = Math.max(30, LOGICAL_CANVAS_W * marginPct)
    const marginY = Math.max(30, LOGICAL_CANVAS_H * marginPct)
    const maxW = LOGICAL_CANVAS_W - marginX * 2
    const maxH = LOGICAL_CANVAS_H - marginY * 2

    let drawW = maxW
    let drawH = drawW / aspectRatio
    if (drawH > maxH) {
      drawH = maxH
      drawW = drawH * aspectRatio
    }
    // Tamaño mínimo razonable para evitar planos invisibles.
    drawW = Math.max(120, drawW)
    drawH = Math.max(120, drawH)

    const x = (LOGICAL_CANVAS_W - drawW) / 2
    const y = (LOGICAL_CANVAS_H - drawH) / 2
    return { x, y, w: drawW, h: drawH }
  }, [floorPlan])

  // Handler para Inserción de Imágenes
  const handleAddImage = useCallback((dataUrl: string, w: number, h: number) => {
    pushAnnotationHistory(currentAnnotations)
    const bounds = getBackgroundBounds()
    const cx = bounds ? bounds.x + bounds.w / 2 - w / 2 : 400
    const cy = bounds ? bounds.y + bounds.h / 2 - h / 2 : 300
    const newImg: CanvasAnnotation = {
      id: crypto.randomUUID(),
      type: 'image',
      x: cx,
      y: cy,
      width: w,
      height: h,
      imageUrl: dataUrl,
      view
    }
    setAnnotations(prev => [...prev, newImg])
    setSelectedAnnotationIds([newImg.id])
    toast({ title: 'Imagen Añadida', description: 'Imagen insertada en el lienzo' })
  }, [currentAnnotations, pushAnnotationHistory, setAnnotations, getBackgroundBounds, view])

  // Tabla de dimensiones reales en metros para cada subtipo de objeto 2D (vista desde arriba)
  const OBJECT_REAL_METERS: Record<ObjectSubtype, { w: number; h: number }> = useMemo(() => ({
    car_sedan: { w: 4.5, h: 1.9 },
    car_suv: { w: 4.8, h: 2.0 },
    truck: { w: 5.2, h: 2.1 },
    person_man: { w: 0.55, h: 0.45 },
    person_woman: { w: 0.5, h: 0.4 },
    desk: { w: 1.5, h: 0.8 },
    office_chair: { w: 0.6, h: 0.6 },
    computer: { w: 0.5, h: 0.4 },
    tree: { w: 3.0, h: 3.0 },
    plant: { w: 1.0, h: 1.0 }
  }), [])

  // Handler para Inserción de Objetos 2D Personalizados con ajuste a escala activa
  const handleAddObject = useCallback(
    (category: ObjectCategory, subtype: ObjectSubtype, color?: string) => {
      pushAnnotationHistory(currentAnnotations)
      const bounds = getBackgroundBounds()
      const realMeters = OBJECT_REAL_METERS[subtype] || { w: 2, h: 1 }

      let w: number
      let h: number

      if (floorPlan?.scaleMetersPerPixel && floorPlan.scaleMetersPerPixel > 0) {
        // Calcular píxeles exactos según la escala activa del plano (m / (m/px))
        w = Math.max(10, Math.round(realMeters.w / floorPlan.scaleMetersPerPixel))
        h = Math.max(8, Math.round(realMeters.h / floorPlan.scaleMetersPerPixel))
      } else {
        // Fallback conservando la proporción física realista
        const baseSize = subtype.startsWith('car') || subtype === 'truck' ? 90 : subtype.startsWith('person') ? 22 : 45
        const aspect = realMeters.w / realMeters.h
        w = baseSize
        h = Math.round(baseSize / aspect)
      }

      const cx = bounds ? bounds.x + bounds.w / 2 - w / 2 : 400
      const cy = bounds ? bounds.y + bounds.h / 2 - h / 2 : 300

      const newObj: CanvasAnnotation = {
        id: crypto.randomUUID(),
        type: 'object',
        objectCategory: category,
        objectSubtype: subtype,
        x: cx,
        y: cy,
        width: w,
        height: h,
        realWidthMeters: realMeters.w,
        realHeightMeters: realMeters.h,
        fillColor: color || strokeColor || '#3b82f6',
        strokeColor: '#1e293b',
        fillEnabled: true,
        view
      }

      setAnnotations(prev => [...prev, newObj])
      setSelectedAnnotationIds([newObj.id])
      toast({
        title: 'Objeto Añadido',
        description: `Objeto 2D (${subtype}) insertado y ajustado a la escala activa`
      })
    },
    [currentAnnotations, pushAnnotationHistory, setAnnotations, getBackgroundBounds, floorPlan, strokeColor, view, OBJECT_REAL_METERS]
  )

  useEffect(() => {
    if (!floorPlan) { floorPlanImageRef.current = null; return }
    if (!floorPlanImageRef.current || floorPlanImageRef.current.src !== floorPlan.url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      // Asegura que el navegador decodifique la imagen antes del primer render
      // (si la API existe). Esto evita parpadeos y garantiza que la imagen esté
      // lista con su resolución natural completa al momento de pintarla.
      const handleLoaded = () => {
        floorPlanImageRef.current = img
        // Decodifica de forma asíncrona (mejora nitidez y previene FOUT).
        const anyImg = img as HTMLImageElement & { decode?: () => Promise<void> }
        if (typeof anyImg.decode === 'function') {
          anyImg.decode().then(() => forceUpdate({})).catch(() => forceUpdate({}))
        } else {
          forceUpdate({})
        }
      }
      img.onload = handleLoaded
      img.onerror = () => { floorPlanImageRef.current = null; forceUpdate({}) }
      img.src = floorPlan.url
    }
  }, [floorPlan?.url])

  // Ajuste HiDPI: iguala la resolución interna del canvas al devicePixelRatio para texto nítido
  // cuando el usuario reduce el tamaño de fuente o hace zoom out.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handleResize = () => {
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect.width * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      forceUpdate({})
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedoAnnotation()
        } else {
          handleUndoAnnotation()
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRedoAnnotation()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        if (e.shiftKey) {
          handleUngroupAnnotation()
        } else {
          handleGroupAnnotations()
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedAnnotationIds.length > 0) {
        e.preventDefault()
        handleCopyAnnotation()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && annotationClipboardRef.current?.length) {
        e.preventDefault()
        handlePasteAnnotation()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationIds.length > 0) {
        pushAnnotationHistory(currentAnnotations)
        setAnnotations(prev => prev.filter(a => !selectedAnnotationIds.includes(a.id)))
        setSelectedAnnotationIds([])
      }
      if (e.key === 'Escape') {
        if (isFitToWindow) {
          // Inline logic to avoid forward reference
          if (savedZoomStateRef.current) {
            setScale(savedZoomStateRef.current.scale)
            setPan(savedZoomStateRef.current.pan)
          } else {
            setScale(1)
            setPan({ x: 0, y: 0 })
          }
          setIsFitToWindow(false)
          toast({ title: 'Vista Restablecida', description: 'Salida de pantalla completa, contenedor original restaurado' })
          return
        }
        if (freeRotationCameraId) {
          setFreeRotationCameraId(null)
        }
        if (activeDrawingTool !== 'select') {
          setActiveDrawingTool('select')
          setDrawingAnnotation(null)
        }
        if (toolMode === 'measure') {
          measureStateRef.current = null
          setMeasureTempPoint(null)
          forceUpdate({})
        }
        if (onCancelSeeding) onCancelSeeding()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    toolMode,
    onCancelSeeding,
    selectedAnnotationIds,
    activeDrawingTool,
    setAnnotations,
    currentAnnotations,
    pushAnnotationHistory,
    handleUndoAnnotation,
    handleRedoAnnotation,
    handleGroupAnnotations,
    handleUngroupAnnotation,
    handleCopyAnnotation,
    handlePasteAnnotation
  ])

  useEffect(() => {
    const handleKeyDownCopyPaste = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        if (selectedCamera) {
          const cam = cameras.find(c => c.id === selectedCamera)
          if (cam) {
            setClipboard({ kind: 'camera', data: cam })
            setCopiedFlashId(cam.id)
            setIsActivationAnimating(true)
            setTimeout(() => { setCopiedFlashId(null); setIsActivationAnimating(false) }, 900)
            toast({ title: 'Copiado', description: 'Dispositivo copiado al portapapeles' })
          }
        } else if (selectedAccessDevice) {
          const dev = accessDevices.find(d => d.id === selectedAccessDevice)
          if (dev) {
            setClipboard({ kind: 'device', data: dev })
            setCopiedFlashId(dev.id)
            setIsActivationAnimating(true)
            setTimeout(() => { setCopiedFlashId(null); setIsActivationAnimating(false) }, 900)
            toast({ title: 'Copiado', description: 'Dispositivo copiado al portapapeles' })
          }
        } else {
          toast({ title: 'No hay selección', description: 'Seleccione un dispositivo para copiar', variant: 'destructive' })
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        if (!clipboard) {
          toast({ title: 'Portapapeles vacío', description: 'No hay dispositivo para pegar', variant: 'destructive' })
          return
        }
        const src = clipboard.data as any
        const bounds = getBackgroundBounds()
        let nx = (src.x ?? 0) + 24
        let ny = (src.y ?? 0) + 24
        if (bounds) {
          nx = Math.min(bounds.x + bounds.w, Math.max(bounds.x, nx))
          ny = Math.min(bounds.y + bounds.h, Math.max(bounds.y, ny))
        }
        if (clipboard.kind === 'camera') {
          const newCam: Camera = { ...src, id: crypto.randomUUID(), name: `${src.name} (Copia)`, x: nx, y: ny }
          onCameraCreate(newCam)
        } else {
          const newDev: AccessDevice = { ...src, id: crypto.randomUUID(), name: `${src.name} (Copia)`, x: nx, y: ny }
          onAccessDeviceCreate(newDev)
        }
        toast({ title: 'Pegado', description: 'Dispositivo pegado' })
      }
    }
    window.addEventListener('keydown', handleKeyDownCopyPaste)
    return () => window.removeEventListener('keydown', handleKeyDownCopyPaste)
  }, [selectedCamera, selectedAccessDevice, cameras, accessDevices, clipboard, getBackgroundBounds, onCameraCreate, onAccessDeviceCreate])

  useEffect(() => {
    const needCam = cameras.filter(c => iconScales[c.id] === undefined)
    const needDev = accessDevices.filter(d => iconScales[d.id] === undefined)
    const needFire = fireDevices.filter(d => iconScales[d.id] === undefined)
    needCam.forEach(c => onIconScaleChange(c.id, 1))
    needDev.forEach(d => onIconScaleChange(d.id, 0.8))
    needFire.forEach(d => onIconScaleChange(d.id, 0.9))
  }, [cameras, accessDevices, fireDevices, iconScales, onIconScaleChange])

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
    const w = canvas.width || (1600 * dpr)
    const h = canvas.height || (1100 * dpr)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, w, h)
    // Habilitar suavizado de alta calidad para texto y líneas nítidos en HiDPI.
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.textBaseline = 'top'
    ctx.save()
    // Aplica el escalado HiDPI una sola vez. La geometría interna se mantiene
    // en el espacio de mundo (800x600 lógico) para no tocar la lógica existente.
    ctx.scale(dpr, dpr)
    ctx.translate(pan.x, pan.y)
    ctx.scale(scale, scale)

    if (floorPlan && floorPlanImageRef.current && floorPlanImageRef.current.complete) {
      const img = floorPlanImageRef.current
      const bounds = getBackgroundBounds()
      if (bounds) {
        // Render de alta calidad: cuando el plano tiene una resolución nativa mayor que el
        // destino, primero se reduce en pasos (cada paso ≤2×) hacia un canvas intermediario.
        // Esto preserva los detalles finos y evita el aliasing típico de un único drawImage
        // a una escala muy pequeña. El suavizado se aplica también al destino.
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        drawHighQualityImage(ctx, img, bounds.x, bounds.y, bounds.w, bounds.h)
        ctx.strokeStyle = '#64748b'
        ctx.lineWidth = 2 / scale
        ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h)
      }

      if (defineScaleMode && scalePickRef.current) {
        const { ax, ay, bx, by } = scalePickRef.current
        
        // Helper to draw a square marker
        const drawMarker = (x: number, y: number) => {
          ctx.fillStyle = '#00ff00' // Green fill
          ctx.strokeStyle = '#000000' // Black border
          ctx.lineWidth = 1 / scale
          const size = 6 / scale
          ctx.fillRect(x - size/2, y - size/2, size, size)
          ctx.strokeRect(x - size/2, y - size/2, size, size)
        }

        // Draw start point
        if (ax !== undefined && ay !== undefined) {
          drawMarker(ax, ay)
          
          // Determine end point (either fixed bx/by or temporary mouse position)
          let endX = bx
          let endY = by
          
          if (endX === undefined && tempScalePoint) {
            endX = tempScalePoint.x
            endY = tempScalePoint.y
          }
          
          // Draw line and end marker if we have a destination
          if (endX !== undefined && endY !== undefined) {
            drawMarker(endX, endY)
            
            // Draw dashed line
            ctx.beginPath()
            ctx.moveTo(ax, ay)
            ctx.lineTo(endX, endY)
            ctx.strokeStyle = '#ff0000' // Red line
            ctx.lineWidth = 2 / scale
            ctx.setLineDash([5 / scale, 5 / scale])
            ctx.stroke()
            ctx.setLineDash([])
            
            // Draw distance label
            const midX = (ax + endX) / 2
            const midY = (ay + endY) / 2
            const dx = endX - ax
            const dy = endY - ay
            const pixelDist = Math.sqrt(dx * dx + dy * dy)
            
            ctx.save()
            ctx.translate(midX, midY)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
            const text = `${Math.round(pixelDist)} px`
            ctx.font = `bold ${12 / scale}px monospace`
            const metrics = ctx.measureText(text)
            const padding = 4 / scale
            ctx.fillRect(
              -metrics.width / 2 - padding, 
              -12 / scale - padding, 
              metrics.width + padding * 2, 
              16 / scale + padding * 2
            )
            ctx.fillStyle = '#00ffff' // Cyan text
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(text, 0, -4 / scale)
            ctx.restore()
          }
        }
      }
    }

    // Renderizado de Cuadrícula Sutil (Grid) en tiempo real (sobre el plano y fondo para máxima visibilidad)
    if (showGrid) {
      ctx.save()
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.32)'
      ctx.lineWidth = 1 / scale
      ctx.beginPath()
      const gridSize = 40
      const minX = -3000
      const maxX = 5000
      const minY = -3000
      const maxY = 4000
      for (let gx = minX; gx <= maxX; gx += gridSize) {
        ctx.moveTo(gx, minY)
        ctx.lineTo(gx, maxY)
      }
      for (let gy = minY; gy <= maxY; gy += gridSize) {
        ctx.moveTo(minX, gy)
        ctx.lineTo(maxX, gy)
      }
      ctx.stroke()

      // Puntos de intersección CAD para refinamiento estético y alineación de dispositivos
      ctx.fillStyle = 'rgba(2, 132, 199, 0.5)'
      for (let gx = minX; gx <= maxX; gx += gridSize) {
        for (let gy = minY; gy <= maxY; gy += gridSize) {
          ctx.fillRect(gx - 1 / scale, gy - 1 / scale, 2 / scale, 2 / scale)
        }
      }
      ctx.restore()
    }

    // Measurement Tool Drawing (Independent of floorPlan image loading state, but conceptually linked)
    if (toolMode === 'measure' && measureStateRef.current?.ax !== undefined && measureStateRef.current?.ay !== undefined) {
      const { ax, ay } = measureStateRef.current
      let endX = measureTempPoint?.x
      let endY = measureTempPoint?.y

      if (endX !== undefined && endY !== undefined) {
        // Draw marker at start
        ctx.fillStyle = '#10b981' // emerald-500
        ctx.beginPath()
        ctx.arc(ax, ay, 4 / scale, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1 / scale
        ctx.stroke()
        
        // Draw dashed line
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 2 / scale
        ctx.setLineDash([5 / scale, 5 / scale])
        ctx.stroke()
        ctx.setLineDash([])

        // Draw marker at end (current cursor)
        ctx.fillStyle = '#10b981'
        ctx.beginPath()
        ctx.arc(endX, endY, 4 / scale, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Calculate and draw distance
        const dx = endX - ax
        const dy = endY - ay
        const distPx = Math.sqrt(dx * dx + dy * dy)
        
        let label = `${Math.round(distPx)} px`
        if (floorPlan?.scaleMetersPerPixel) {
          const distM = distPx * floorPlan.scaleMetersPerPixel
          label = `${distM.toFixed(2)} m`
        }

        const midX = (ax + endX) / 2
        const midY = (ay + endY) / 2
        
        ctx.save()
        ctx.translate(midX, midY)
        ctx.font = `bold ${14 / scale}px sans-serif` // Increased font size
        const metrics = ctx.measureText(label)
        const padding = 8 / scale // Increased padding
        
        // Draw label background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)' // Lighter background for better plan visibility
        ctx.strokeStyle = '#10b981' // Green border
        ctx.lineWidth = 1 / scale
        
        ctx.beginPath()
        ctx.roundRect(
          -metrics.width / 2 - padding,
          -14 / scale - padding,
          metrics.width + padding * 2,
          20 / scale + padding * 2,
          4 / scale
        )
        ctx.fill()
        ctx.stroke()
        
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, 0, -4 / scale)
        ctx.restore()
      }
    }

    const drawCameras = view === 'cameras' || view === 'combined'
    const drawDevices = view === 'access' || view === 'combined'
    const drawVoceo = view === 'voceo' || view === 'combined'
    const drawFire = view === 'fire' || view === 'combined'
    const drawParking = view === 'parking' || view === 'combined'

    if (drawCameras) cameras.forEach(camera => {
      const isSelected = camera.id === selectedCamera
      const isCopiedFlash = camera.id === copiedFlashId || camera.id === flashId
      const typeColors = CAMERA_TYPE_COLORS[camera.type] || CAMERA_TYPE_COLORS.dome
      ctx.save()
      ctx.translate(camera.x, camera.y)
      const iconScale = iconScales[camera.id] ?? 1
      const iconColor = isSelected ? typeColors.selectedIcon : typeColors.icon
      ctx.fillStyle = iconColor
      if (isSelected) {
        ctx.shadowColor = typeColors.icon
        ctx.shadowBlur = 10
      }
      
      const dirAngle = camera.rotation * (Math.PI / 180)

      if (camera.type === 'bullet') {
        ctx.save()
        ctx.rotate(dirAngle)
        ctx.fillRect(-10 * iconScale, -6 * iconScale, 20 * iconScale, 12 * iconScale)
        ctx.restore()
      } else if (camera.type === 'ptz') {
        ctx.beginPath()
        ctx.moveTo(0, -14 * iconScale)
        ctx.lineTo(12 * iconScale, 7 * iconScale)
        ctx.lineTo(-12 * iconScale, 7 * iconScale)
        ctx.closePath()
        ctx.fill()
      } else if (camera.type === 'fisheye') {
        ctx.beginPath()
        ctx.arc(0, 0, 14 * iconScale, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, 6 * iconScale, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // dome / panoramic / default
        ctx.beginPath()
        ctx.arc(0, 0, 12 * iconScale, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.strokeStyle = isSelected ? '#2563eb' : typeColors.stroke
      ctx.lineWidth = 2 / scale
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(16 * iconScale * Math.cos(dirAngle), 16 * iconScale * Math.sin(dirAngle))
      ctx.stroke()
      
      if (isCopiedFlash) {
        ctx.save()
        const now = Date.now()
        const phase = (now % 900) / 900 // 0 to 1 smooth loop

        // 1. Halo de resplandor radial brillante
        const glowGrad = ctx.createRadialGradient(0, 0, 4 * iconScale, 0, 0, 48 * iconScale)
        glowGrad.addColorStop(0, 'rgba(37, 99, 235, 0.55)')
        glowGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.35)')
        glowGrad.addColorStop(1, 'rgba(59, 130, 246, 0)')
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(0, 0, 48 * iconScale, 0, Math.PI * 2)
        ctx.fill()

        // 2. Anillos concéntricos animados de onda expansiva
        const waveOffsets = [0, 0.33, 0.66]
        for (const offset of waveOffsets) {
          const wavePhase = (phase + offset) % 1
          const radius = (12 + wavePhase * 36) * iconScale
          const alpha = (1 - wavePhase) * 0.85
          ctx.beginPath()
          ctx.arc(0, 0, radius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`
          ctx.lineWidth = Math.max(1.8, (3.5 * (1 - wavePhase)) / scale)
          ctx.stroke()
        }

        // 3. Anillo de contraste sólido de alto impacto
        ctx.beginPath()
        ctx.arc(0, 0, 22 * iconScale, 0, Math.PI * 2)
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 3 / scale
        ctx.stroke()
        ctx.restore()
      }
      // Cobertura dinámica calculada según norma DRI y la escala activa del plano (m/px)
      drawCameraCoverage({
        ctx,
        camera,
        scaleMetersPerPixel: floorPlan?.scaleMetersPerPixel,
        isSelected,
        viewportScale: scale,
        animationTime: Date.now(),
        hideFovLines
      })
      if (isSelected && rotateAnglePreview !== null) {
        ctx.fillStyle = '#0f172a'
        ctx.font = `bold ${11 / scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(`${Math.round(rotateAnglePreview)}°`, 0, -20)
      }
      ctx.restore()
      const lx = camera.x + (camera.labelOffsetX ?? 0)
      const ly = camera.y + (camera.labelOffsetY ?? -20)
      const labelVisible = camera.labelVisible ?? camera.name.trim().length > 0
      if (labelVisible && camera.name.trim().length > 0) {
        const fontSize = camera.labelFontSize ?? 10
        const fontFamily = camera.labelFontFamily ?? 'Arial'
        const fontWeight = camera.labelFontWeight ?? 'normal'
        const fontStyle = camera.labelFontStyle ?? 'normal'
        ctx.save()
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const textMetrics = ctx.measureText(camera.name)
        const paddingX = 4 / scale
        const paddingY = 2 / scale
        const bgWidth = textMetrics.width + paddingX * 2
        const bgHeight = (fontSize / scale) + paddingY * 2
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
        ctx.beginPath()
        ctx.roundRect(lx - bgWidth / 2, ly - bgHeight / 2, bgWidth, bgHeight, 3 / scale)
        ctx.fill()
        ctx.fillStyle = camera.labelFontColor || '#1e293b'
        ctx.fillText(camera.name, lx, ly)
        ctx.restore()
      }
    })
    // draw access devices
    if (drawDevices) accessDevices.forEach(dev => {
      const isSelected = dev.id === selectedAccessDevice
      const isCopiedFlash = dev.id === copiedFlashId
      ctx.save()
      ctx.translate(dev.x, dev.y)
      // Animación de rotación 360° completa por ciclo: se aplica al ícono completo.
      if (isCopiedFlash && isActivationAnimating) {
        ctx.rotate((activationRotation * Math.PI) / 180)
      }
      const iconScale = iconScales[dev.id] ?? 0.8
      const iconState = isSelected ? 'selected' : (dev.id === hoveredDevice ? 'hover' : 'normal')
      drawAccessIcon(ctx, {
        iconKey: dev.iconKey,
        type: dev.type,
        state: iconState,
        iconScale,
        viewportScale: scale,
        rotationDeg: dev.rotation,
        drawDirection: true
      })
      if (isCopiedFlash) {
        ctx.beginPath()
        // anillo de "copiado" consistente para todas las categorías
        ctx.arc(0, 0, (18 * iconScale) / 2 + 6, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(37,99,235,0.6)'
        ctx.lineWidth = 2 / scale
        ctx.stroke()
      }
      ctx.restore()
      const labelVisible = dev.labelVisible ?? dev.name.trim().length > 0
      if (labelVisible && dev.name.trim().length > 0) {
        const fontSize = resolveAccessLabelFontSize(dev.labelFontSize)
        const fontFamily = resolveAccessLabelFontFamily(dev.labelFontFamily)
        const fontWeight = dev.labelFontWeight ?? 'normal'
        const fontStyle = dev.labelFontStyle ?? 'normal'
        ctx.save()
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const textMetrics = ctx.measureText(dev.name)
        const layout = getAccessCanvasLabelLayout({
          x: dev.x,
          y: dev.y,
          textWidth: textMetrics.width,
          viewportScale: scale,
          fontSize,
          labelOffsetX: dev.labelOffsetX,
          labelOffsetY: dev.labelOffsetY,
        })
        ctx.fillStyle = DEFAULT_ACCESS_LABEL_BG_COLOR
        ctx.strokeStyle = DEFAULT_ACCESS_LABEL_BORDER_COLOR
        ctx.lineWidth = Math.max(0.85 / scale, 0.5 / scale)
        ctx.beginPath()
        ctx.roundRect(layout.left, layout.top, layout.width, layout.height, layout.radius)
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = DEFAULT_ACCESS_LABEL_OUTLINE_COLOR
        ctx.lineWidth = Math.max(1.15 / scale, 0.75 / scale)
        ctx.lineJoin = 'round'
        ctx.fillStyle = resolveAccessLabelFontColor(dev.labelFontColor)
        ctx.strokeText(dev.name, layout.centerX, layout.centerY)
        ctx.fillText(dev.name, layout.centerX, layout.centerY)
        ctx.restore()
      }
    })
    // draw voceo devices
    if (drawVoceo) voceoDevices.forEach(dev => {
      const isSelected = dev.id === selectedVoceoDevice
      const isCopiedFlash = dev.id === copiedFlashId
      ctx.save()
      ctx.translate(dev.x, dev.y)
      // Animación de rotación 360° completa por ciclo
      if (isCopiedFlash && isActivationAnimating) {
        ctx.rotate((activationRotation * Math.PI) / 180)
      }
      const iconScale = iconScales[dev.id] ?? 0.9
      const iconState = isSelected ? 'selected' : (dev.id === hoveredDevice ? 'hover' : 'normal')
      drawVoceoIcon(ctx, {
        type: dev.type,
        state: iconState,
        iconScale,
        viewportScale: scale,
        rotationDeg: dev.rotation,
        drawDirection: true
      })
      if (isCopiedFlash) {
        const size = 18 * iconScale
        const colors = getVoceoColor(dev.type)
        ctx.beginPath()
        ctx.arc(0, 0, (size / 2) + 4, 0, Math.PI * 2)
        ctx.strokeStyle = colors.primary
        ctx.lineWidth = 2 / scale
        ctx.stroke()
      }
      ctx.restore()
      const lx = dev.x + (dev.labelOffsetX ?? 0)
      const ly = dev.y + (dev.labelOffsetY ?? -18)
      const labelVisible = dev.labelVisible ?? dev.name.trim().length > 0
      if (labelVisible && dev.name.trim().length > 0) {
        const fontSize = dev.labelFontSize ?? 11
        const fontFamily = dev.labelFontFamily ?? 'sans-serif'
        const fontWeight = dev.labelFontWeight ?? 'normal'
        const fontStyle = dev.labelFontStyle ?? 'normal'
        ctx.save()
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const textMetrics = ctx.measureText(dev.name)
        const paddingX = 4 / scale
        const paddingY = 2 / scale
        const bgWidth = textMetrics.width + paddingX * 2
        const bgHeight = (fontSize / scale) + paddingY * 2
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
        ctx.beginPath()
        ctx.roundRect(lx - bgWidth / 2, ly - bgHeight / 2, bgWidth, bgHeight, 3 / scale)
        ctx.fill()
        ctx.fillStyle = dev.labelFontColor || '#1e293b'
        ctx.fillText(dev.name, lx, ly)
        ctx.restore()
      }
    })
    // draw fire devices
    if (drawFire) fireDevices.forEach(dev => {
      const isSelected = dev.id === selectedFireDevice
      const isCopiedFlash = dev.id === copiedFlashId
      ctx.save()
      ctx.translate(dev.x, dev.y)
      // Animación de rotación 360° completa por ciclo
      if (isCopiedFlash && isActivationAnimating) {
        ctx.rotate((activationRotation * Math.PI) / 180)
      }
      const iconScale = iconScales[dev.id] ?? 0.9
      const iconState = isSelected ? 'selected' : (dev.id === hoveredDevice ? 'hover' : 'normal')
      drawFireIcon(ctx, {
        type: dev.type,
        state: iconState,
        iconScale,
        viewportScale: scale,
        rotationDeg: dev.rotation,
        drawDirection: true
      })
      if (isCopiedFlash) {
        const size = 18 * iconScale
        const colors = getFireColor(dev.type)
        ctx.beginPath()
        ctx.arc(0, 0, (size / 2) + 4, 0, Math.PI * 2)
        ctx.strokeStyle = colors.primary
        ctx.lineWidth = 2 / scale
        ctx.stroke()
      }
      ctx.restore()

      // --- Render device label ---
      const labelVisible = dev.labelVisible ?? dev.name.trim().length > 0
      if (labelVisible && dev.name.trim().length > 0) {
        const lx = dev.x + (dev.labelOffsetX ?? 0)
        const ly = dev.y + (dev.labelOffsetY ?? -18)
        ctx.fillStyle = '#1e293b'
        
        // Build font string with all properties
        const fontSize = dev.labelFontSize ?? 11
        const fontFamily = dev.labelFontFamily ?? 'sans-serif'
        const fontWeight = dev.labelFontWeight ?? 'normal'
        const fontStyle = dev.labelFontStyle ?? 'normal'
        
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Draw label background
        const textMetrics = ctx.measureText(dev.name)
        const paddingX = 4 / scale
        const paddingY = 2 / scale
        const bgWidth = textMetrics.width + paddingX * 2
        const bgHeight = (fontSize / scale) + paddingY * 2

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
        ctx.beginPath()
        ctx.roundRect(lx - bgWidth/2, ly - bgHeight/2, bgWidth, bgHeight, 3 / scale)
        ctx.fill()
        
        ctx.fillStyle = dev.labelFontColor || '#1e293b'
        ctx.fillText(dev.name, lx, ly)
      }
    })
    // draw parking devices
    if (drawParking) parkingDevices.forEach(dev => {
      const isSelected = dev.id === selectedParkingDevice
      const isCopiedFlash = dev.id === copiedFlashId
      ctx.save()
      ctx.translate(dev.x, dev.y)
      const iconScale = iconScales[dev.id] ?? 1
      const size = 20 * iconScale
      const half = size / 2

      ctx.rotate((dev.rotation * Math.PI) / 180)
      
      if (isSelected) {
        ctx.shadowColor = 'rgba(37,99,235,0.6)'
        ctx.shadowBlur = 8
      }

      if (dev.type === 'barrier_left') {
        ctx.fillStyle = isSelected ? '#ef4444' : '#f87171'
        ctx.fillRect(size * 0.1, -size * 0.3, size * 0.3, size * 0.6)
        ctx.fillStyle = '#facc15'
        ctx.fillRect(-size * 0.9, -size * 0.1, size * 1.1, size * 0.2)
        ctx.fillStyle = '#000'
        ctx.fillRect(-size * 0.8, -size * 0.1, size * 0.15, size * 0.2)
        ctx.fillRect(-size * 0.5, -size * 0.1, size * 0.15, size * 0.2)
      } else if (dev.type === 'barrier_right') {
        ctx.fillStyle = isSelected ? '#ef4444' : '#f87171'
        ctx.fillRect(-size * 0.4, -size * 0.3, size * 0.3, size * 0.6)
        ctx.fillStyle = '#facc15'
        ctx.fillRect(-size * 0.2, -size * 0.1, size * 1.1, size * 0.2)
        ctx.fillStyle = '#000'
        ctx.fillRect(size * 0.1, -size * 0.1, size * 0.15, size * 0.2)
        ctx.fillRect(size * 0.4, -size * 0.1, size * 0.15, size * 0.2)
      } else if (dev.type === 'barrier') {
        ctx.fillStyle = isSelected ? '#ef4444' : '#f87171'
        ctx.fillRect(-size * 0.3, size * 0.1, size * 0.6, size * 0.4)
        ctx.fillStyle = '#facc15'
        ctx.fillRect(-size * 0.1, -size * 0.9, size * 0.2, size * 1.1)
        ctx.fillStyle = '#000'
        ctx.fillRect(-size * 0.1, -size * 0.7, size * 0.2, size * 0.15)
        ctx.fillRect(-size * 0.1, -size * 0.4, size * 0.2, size * 0.15)
      } else if (dev.type === 'uhf_reader') {
        ctx.fillStyle = isSelected ? '#3b82f6' : '#60a5fa'
        ctx.beginPath()
        ctx.roundRect(-half, -half, size, size, 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5 / scale
        ctx.beginPath()
        ctx.arc(-half * 0.4, 0, half * 0.4, -Math.PI / 3, Math.PI / 3)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(-half * 0.4, 0, half * 0.8, -Math.PI / 3, Math.PI / 3)
        ctx.stroke()
      } else if (dev.type === 'magnetic_loop') {
        ctx.strokeStyle = isSelected ? '#10b981' : '#34d399'
        ctx.lineWidth = Math.max(1, 1.5 / scale)
        ctx.setLineDash([4 / scale, 4 / scale])
        ctx.strokeRect(-half * 0.8, -size * 0.8, size * 0.8, size * 1.6)
        ctx.setLineDash([])
        ctx.fillStyle = isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(52, 211, 153, 0.2)'
        ctx.fillRect(-half * 0.8, -size * 0.8, size * 0.8, size * 1.6)
      } else if (dev.type === 'tag') {
        ctx.fillStyle = isSelected ? '#f59e0b' : '#fbbf24'
        ctx.beginPath()
        ctx.roundRect(-half * 0.8, -half * 0.5, size * 0.8, size * 0.5, 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillRect(-half * 0.6, -half * 0.3, size * 0.6, size * 0.3)
        ctx.fillStyle = isSelected ? '#f59e0b' : '#fbbf24'
        ctx.beginPath()
        ctx.arc(-half * 0.2, 0, half * 0.15, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // parking_meter or generic
        ctx.beginPath()
        ctx.arc(0, 0, half, 0, 2 * Math.PI)
        ctx.fillStyle = isSelected ? '#3b82f6' : '#94a3b8'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2 / scale
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.font = `${10 * iconScale}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('P', 0, 0)
      }

      if (isSelected) {
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 1 / scale
        ctx.setLineDash([2 / scale, 2 / scale])
        ctx.strokeRect(-half - 4, -half - 4, size + 8, size + 8)
        ctx.setLineDash([])
        // draw rotation handle
        ctx.beginPath()
        ctx.moveTo(0, -half - 4)
        ctx.lineTo(0, -half - 12)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, -half - 12, 3 / scale, 0, 2 * Math.PI)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.stroke()
      }

      if (isCopiedFlash) {
        ctx.beginPath()
        ctx.arc(0, 0, half + 8, 0, Math.PI * 2)
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 2 / scale
        ctx.stroke()
      }
      ctx.restore()
      
      const lx = dev.x + (dev.labelOffsetX ?? 0)
      const ly = dev.y + (dev.labelOffsetY ?? -18)
      const labelVisible = dev.labelVisible ?? dev.name.trim().length > 0
      if (labelVisible && dev.name.trim().length > 0) {
        ctx.save()
        ctx.translate(lx, ly)
        const fontSize = dev.labelFontSize ?? 10
        const fontFamily = dev.labelFontFamily ?? 'sans-serif'
        const fontWeight = dev.labelFontWeight ?? 'normal'
        const fontStyle = dev.labelFontStyle ?? 'normal'
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const textWidth = ctx.measureText(dev.name).width
        const padX = 4 / scale, padY = 2 / scale

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
        const bgW = textWidth + padX * 2
        const bgH = fontSize / scale + padY * 2
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath()
          ctx.roundRect(-textWidth / 2 - padX, -fontSize / (2 * scale) - padY, bgW, bgH, 3 / scale)
          ctx.fill()
        } else {
          ctx.fillRect(-textWidth / 2 - padX, -fontSize / (2 * scale) - padY, bgW, bgH)
        }

        ctx.fillStyle = dev.labelFontColor || (isSelected ? '#3b82f6' : '#1e293b')
        ctx.fillText(dev.name, 0, 0)

        if (isSelected) {
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1 / scale
          ctx.setLineDash([2 / scale, 2 / scale])
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath()
            ctx.roundRect(-textWidth / 2 - padX, -fontSize / (2 * scale) - padY, bgW, bgH, 3 / scale)
            ctx.stroke()
          } else {
            ctx.strokeRect(-textWidth / 2 - padX, -fontSize / (2 * scale) - padY, bgW, bgH)
          }
          ctx.setLineDash([])
        }
        ctx.restore()
      }
    })

    // Overlay visual en canvas cuando se encuentra activo el modo de rotación libre por clic derecho
    if (freeRotationCameraId) {
      const rotCam = cameras.find(c => c.id === freeRotationCameraId)
      if (rotCam) {
        ctx.save()
        ctx.translate(rotCam.x, rotCam.y)
        const ringR = 42 / scale
        ctx.strokeStyle = '#0ea5e9'
        ctx.lineWidth = 2.5 / scale
        ctx.setLineDash([5 / scale, 4 / scale])
        ctx.beginPath()
        ctx.arc(0, 0, ringR, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])

        const rad = (rotCam.rotation * Math.PI) / 180
        ctx.strokeStyle = '#0284c7'
        ctx.lineWidth = 2 / scale
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(rad) * (ringR + 14 / scale), Math.sin(rad) * (ringR + 14 / scale))
        ctx.stroke()

        const labelText = `Rotación: ${rotCam.rotation}°`
        ctx.font = `bold ${11 / scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const tw = ctx.measureText(labelText).width
        const padX = 5 / scale, padY = 2.5 / scale
        const bgW = tw + padX * 2
        const bgH = 15 / scale + padY * 2
        ctx.fillStyle = 'rgba(14, 165, 233, 0.95)'
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath()
          ctx.roundRect(-bgW / 2, -ringR - bgH - 4 / scale, bgW, bgH, 4 / scale)
          ctx.fill()
        } else {
          ctx.fillRect(-bgW / 2, -ringR - bgH - 4 / scale, bgW, bgH)
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillText(labelText, 0, -ringR - bgH / 2 - 4 / scale)

        ctx.restore()
      }
    }

    // Indicador visual de "sembrado" en la posición del cursor durante el modo seed.
    if (isSeeding && seedPreview) {
      ctx.save()
      ctx.translate(seedPreview.x, seedPreview.y)
      ctx.rotate((activationRotation * Math.PI) / 180)
      const ringRadius = 14
      ctx.strokeStyle = 'rgba(37,99,235,0.85)'
      ctx.lineWidth = 2 / scale
      ctx.setLineDash([4 / scale, 3 / scale])
      ctx.beginPath()
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Cruz central
      ctx.strokeStyle = 'rgba(37,99,235,0.95)'
      ctx.lineWidth = 2 / scale
      ctx.beginPath()
      ctx.moveTo(-ringRadius + 4, 0)
      ctx.lineTo(ringRadius - 4, 0)
      ctx.moveTo(0, -ringRadius + 4)
      ctx.lineTo(0, ringRadius - 4)
      ctx.stroke()

      // Etiqueta con el nombre del modelo sin prefijos visuales heredados del CTA de sembrado.
      const rawLabelText = cameraSeedName || accessSeedName || voceoSeedName || fireSeedName || parkingSeedName || 'Sembrar'
      const labelText = rawLabelText.replace(/^\s*\+\s*/, '').trim() || 'Sembrar'
      ctx.font = `${11 / scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const tw = ctx.measureText(labelText).width
      const padX = 4 / scale, padY = 2 / scale
      const bgW = tw + padX * 2
      const bgH = 14 / scale + padY * 2
      ctx.fillStyle = 'rgba(37,99,235,0.95)'
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(-bgW / 2, -ringRadius - bgH - 2 / scale, bgW, bgH, 3 / scale)
        ctx.fill()
      } else {
        ctx.fillRect(-bgW / 2, -ringRadius - bgH - 2 / scale, bgW, bgH)
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillText(labelText, 0, -ringRadius - bgH / 2 - 2 / scale)
      ctx.restore()
    }
    // segregación se hace al dibujar (no al persistir) para no perder
    // contenido al alternar entre vistas.
    visibleAnnotations.forEach(ann => {
      drawAnnotation(ctx, ann, selectedAnnotationIds.includes(ann.id), scale)
    })
    if (selectedAnnotationIds.length > 1) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      visibleAnnotations.filter(a => selectedAnnotationIds.includes(a.id)).forEach(ann => {
        const box = getAnnotationBoundingBox(ann)
        if (box.minX < minX) minX = box.minX
        if (box.minY < minY) minY = box.minY
        if (box.maxX > maxX) maxX = box.maxX
        if (box.maxY > maxY) maxY = box.maxY
      })
      if (minX !== Infinity) {
        ctx.save()
        ctx.strokeStyle = '#8b5cf6'
        ctx.lineWidth = 2 / scale
        ctx.setLineDash([6 / scale, 4 / scale])
        ctx.strokeRect(minX - 4 / scale, minY - 4 / scale, (maxX - minX) + 8 / scale, (maxY - minY) + 8 / scale)
        ctx.setLineDash([])
        ctx.fillStyle = '#8b5cf6'
        ctx.font = `bold ${11 / scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(`${selectedAnnotationIds.length} Seleccionados — Presione Ctrl+G para Agrupar`, minX + (maxX - minX) / 2, minY - 8 / scale)
        ctx.restore()
      }
    }

    // Cuadro de selección múltiple tipo Marquee (arrastre sobre espacio vacío)
    if (marqueeDragRef.current?.active) {
      const { startX, startY, currentX, currentY } = marqueeDragRef.current
      const minX = Math.min(startX, currentX)
      const minY = Math.min(startY, currentY)
      const w = Math.abs(currentX - startX)
      const h = Math.abs(currentY - startY)

      ctx.save()
      ctx.fillStyle = 'rgba(37, 99, 235, 0.12)'
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 1.5 / scale
      ctx.setLineDash([4 / scale, 4 / scale])
      ctx.fillRect(minX, minY, w, h)
      ctx.strokeRect(minX, minY, w, h)
    }

    if (drawingAnnotation && isAnnotationVisibleInView(drawingAnnotation)) {
      drawAnnotation(ctx, drawingAnnotation, false, scale)
    }

    ctx.restore()
  }, [cameras, accessDevices, voceoDevices, fireDevices, parkingDevices, floorPlan, scale, pan, selectedCamera, selectedAccessDevice, selectedVoceoDevice, selectedFireDevice, selectedParkingDevice, iconScales, rotateAnglePreview, getBackgroundBounds, defineScaleMode, tempScalePoint, toolMode, measureTempPoint, copiedFlashId, view, hoveredDevice, isActivationAnimating, activationRotation, seedPreview, cameraSeedName, accessSeedName, voceoSeedName, fireSeedName, parkingSeedName, isSeeding, currentAnnotations, selectedAnnotationIds, drawingAnnotation, freeRotationCameraId, isAnnotationVisibleInView, visibleAnnotations, hideFovLines, showGrid])

  useEffect(() => { drawScene() }, [drawScene])

  const selectedCameraData = cameras.find(c => c.id === selectedCamera)
  const selectedDeviceData = accessDevices.find(d => d.id === selectedAccessDevice)
  const selectedVoceoData = voceoDevices.find(d => d.id === selectedVoceoDevice)
  const selectedFireData = fireDevices.find(d => d.id === selectedFireDevice)

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { cx: 0, cy: 0 }
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
    const rect = canvas.getBoundingClientRect()
    const cx = ((clientX - rect.left) * (canvas.width / rect.width)) / dpr
    const cy = ((clientY - rect.top) * (canvas.height / rect.height)) / dpr
    return { cx, cy }
  }

  const toWorldCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const { cx, cy } = toCanvasCoords(clientX, clientY)
    return { x: (cx - pan.x) / scale, y: (cy - pan.y) / scale }
  }

  const getOverlayPosition = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current
    const content = contentRef.current
    if (!canvas || !content) return { left: 0, top: 0 }

    const canvasRect = canvas.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    return {
      left: (canvasRect.left - contentRect.left) + (cx * (canvasRect.width / canvas.width)),
      top: (canvasRect.top - contentRect.top) + (cy * (canvasRect.height / canvas.height)),
    }
  }, [])

  const hitTestCamera = (wx: number, wy: number) => {
    let hitId: string | null = null
    if (view !== 'cameras' && view !== 'combined') return null
    for (let i = cameras.length - 1; i >= 0; i--) {
      const c = cameras[i]
      const r = Math.max(12 * (iconScales[c.id] ?? 1), 6 / scale)
      const dx = wx - c.x
      const dy = wy - c.y
      if (dx * dx + dy * dy <= r * r) { hitId = c.id; break }
    }
    return hitId
  }
  const hitTestDevice = (wx: number, wy: number) => {
    let hitId: string | null = null
    if (view !== 'access' && view !== 'combined') return null
    for (let i = accessDevices.length - 1; i >= 0; i--) {
      const d = accessDevices[i]
      const r = Math.max(10 * (iconScales[d.id] ?? 0.8), 6 / scale)
      const dx = wx - d.x
      const dy = wy - d.y
      if (dx * dx + dy * dy <= r * r) { hitId = d.id; break }
    }
    return hitId
  }
  const hitTestVoceo = (wx: number, wy: number) => {
    let hitId: string | null = null
    if (view !== 'voceo' && view !== 'combined') return null
    for (let i = voceoDevices.length - 1; i >= 0; i--) {
      const d = voceoDevices[i]
      const r = Math.max(10 * (iconScales[d.id] ?? 0.9), 6 / scale)
      const dx = wx - d.x
      const dy = wy - d.y
      if (dx * dx + dy * dy <= r * r) { hitId = d.id; break }
    }
    return hitId
  }
  const hitTestFire = (wx: number, wy: number) => {
    let hitId: string | null = null
    if (view !== 'fire' && view !== 'combined') return null
    for (let i = fireDevices.length - 1; i >= 0; i--) {
      const d = fireDevices[i]
      const r = Math.max(10 * (iconScales[d.id] ?? 0.9), 6 / scale)
      const dx = wx - d.x
      const dy = wy - d.y
      if (dx * dx + dy * dy <= r * r) { hitId = d.id; break }
    }
    return hitId
  }
  const hitTestParking = (wx: number, wy: number) => {
    if (view !== 'parking' && view !== 'combined') return null
    let hitId: string | null = null
    for (let i = parkingDevices.length - 1; i >= 0; i--) {
      const d = parkingDevices[i]
      const r = Math.max(24 * (iconScales[d.id] ?? 1), 10 / scale)
      const dx = wx - d.x
      const dy = wy - d.y
      if (dx * dx + dy * dy <= r * r) { hitId = d.id; break }
    }
    return hitId
  }
  const hitTestLabelCamera = (wx: number, wy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    if (view !== 'cameras' && view !== 'combined') return null
    for (let i = cameras.length - 1; i >= 0; i--) {
      const c = cameras[i]
      const labelVisible = c.labelVisible ?? c.name.trim().length > 0
      if (!labelVisible || c.name.trim().length === 0) continue
      const fontSize = c.labelFontSize ?? 10
      const fontFamily = c.labelFontFamily ?? 'Arial'
      const fontWeight = c.labelFontWeight ?? 'normal'
      const fontStyle = c.labelFontStyle ?? 'normal'
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`
      const lx = c.x + (c.labelOffsetX ?? 0)
      const ly = c.y + (c.labelOffsetY ?? -20)
      const textWidth = ctx.measureText(c.name).width
      const paddingX = 4 / scale
      const paddingY = 2 / scale
      const left = lx - textWidth / 2 - paddingX
      const right = lx + textWidth / 2 + paddingX
      const top = ly - (fontSize / scale) / 2 - paddingY
      const bottom = ly + (fontSize / scale) / 2 + paddingY
      if (wx >= left && wx <= right && wy >= top && wy <= bottom) return c.id
    }
    return null
  }
  const hitTestLabelDevice = (wx: number, wy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    if (view !== 'access' && view !== 'combined') return null
    for (let i = accessDevices.length - 1; i >= 0; i--) {
      const d = accessDevices[i]
      const labelVisible = d.labelVisible ?? d.name.trim().length > 0
      if (!labelVisible || d.name.trim().length === 0) continue
      const fontSize = resolveAccessLabelFontSize(d.labelFontSize)
      const fontFamily = resolveAccessLabelFontFamily(d.labelFontFamily)
      const fontWeight = d.labelFontWeight ?? 'normal'
      const fontStyle = d.labelFontStyle ?? 'normal'
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`
      const textWidth = ctx.measureText(d.name).width
      const layout = getAccessCanvasLabelLayout({
        x: d.x,
        y: d.y,
        textWidth,
        viewportScale: scale,
        fontSize,
        labelOffsetX: d.labelOffsetX,
        labelOffsetY: d.labelOffsetY,
      })
      if (wx >= layout.left && wx <= layout.right && wy >= layout.top && wy <= layout.bottom) return d.id
    }
    return null
  }
  const hitTestLabelVoceo = (wx: number, wy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    if (view !== 'voceo' && view !== 'combined') return null
    for (let i = voceoDevices.length - 1; i >= 0; i--) {
      const d = voceoDevices[i]
      const labelVisible = d.labelVisible ?? d.name.trim().length > 0
      if (!labelVisible || d.name.trim().length === 0) continue
      const fontSize = d.labelFontSize ?? 11
      const fontFamily = d.labelFontFamily ?? 'sans-serif'
      const fontWeight = d.labelFontWeight ?? 'normal'
      const fontStyle = d.labelFontStyle ?? 'normal'
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`
      const lx = d.x + (d.labelOffsetX ?? 0)
      const ly = d.y + (d.labelOffsetY ?? -18)
      const textWidth = ctx.measureText(d.name).width
      const paddingX = 4 / scale
      const paddingY = 2 / scale
      const left = lx - textWidth / 2 - paddingX
      const right = lx + textWidth / 2 + paddingX
      const top = ly - (fontSize / scale) / 2 - paddingY
      const bottom = ly + (fontSize / scale) / 2 + paddingY
      if (wx >= left && wx <= right && wy >= top && wy <= bottom) return d.id
    }
    return null
  }
  const hitTestLabelFire = (wx: number, wy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    if (view !== 'fire' && view !== 'combined') return null
    for (let i = fireDevices.length - 1; i >= 0; i--) {
      const d = fireDevices[i]
      const labelVisible = d.labelVisible ?? d.name.trim().length > 0
      if (!labelVisible || d.name.trim().length === 0) continue
      
      const fontSize = d.labelFontSize ?? 11
      const fontFamily = d.labelFontFamily ?? 'sans-serif'
      const fontWeight = d.labelFontWeight ?? 'normal'
      const fontStyle = d.labelFontStyle ?? 'normal'
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`
      
      const lx = d.x + (d.labelOffsetX ?? 0)
      const ly = d.y + (d.labelOffsetY ?? -18)
      const textWidth = ctx.measureText(d.name).width
      const paddingX = 4 / scale
      const paddingY = 2 / scale
      
      const left = lx - textWidth / 2 - paddingX
      const right = lx + textWidth / 2 + paddingX
      const top = ly - (fontSize / scale) / 2 - paddingY
      const bottom = ly + (fontSize / scale) / 2 + paddingY
      
      if (wx >= left && wx <= right && wy >= top && wy <= bottom) return d.id
    }
    return null
  }

  const hitTestLabelParking = (wx: number, wy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    if (view !== 'parking' && view !== 'combined') return null

    for (let i = parkingDevices.length - 1; i >= 0; i--) {
      const d = parkingDevices[i]
      const labelVisible = d.labelVisible ?? d.name.trim().length > 0
      if (!labelVisible || d.name.trim().length === 0) continue
      const fontSize = d.labelFontSize ?? 10
      const fontFamily = d.labelFontFamily ?? 'sans-serif'
      const fontWeight = d.labelFontWeight ?? 'normal'
      const fontStyle = d.labelFontStyle ?? 'normal'
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize / scale}px ${fontFamily}`

      const lx = d.x + (d.labelOffsetX ?? 0)
      const ly = d.y + (d.labelOffsetY ?? -18)
      const textWidth = ctx.measureText(d.name).width
      const paddingX = 4 / scale
      const paddingY = 2 / scale
      const left = lx - textWidth / 2 - paddingX
      const right = lx + textWidth / 2 + paddingX
      const top = ly - (fontSize / scale) / 2 - paddingY
      const bottom = ly + (fontSize / scale) / 2 + paddingY

      if (wx >= left && wx <= right && wy >= top && wy <= bottom) return d.id
    }
    return null
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toWorldCoords(e.clientX, e.clientY)

    if (freeRotationCameraId) {
      const cam = cameras.find(c => c.id === freeRotationCameraId)
      if (cam) {
        const dx = x - cam.x
        const dy = y - cam.y
        const angleRad = Math.atan2(dy, dx)
        let deg = Math.round((angleRad * 180 / Math.PI) + 360) % 360
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15 % 360
        }
        onCameraUpdate(cam.id, { rotation: deg })
        setCursor('crosshair')
        forceUpdate({})
        return
      }
    }

    if (handleDragRef.current?.active && selectedAnnotationId) {
      const initial = handleDragRef.current.initialAnn
      const handleKey = handleDragRef.current.handleKey
      const center = handleDragRef.current.center

      if (handleDragRef.current.kind === 'rotate') {
        const angleRad = Math.atan2(y - center.cy, x - center.cx)
        let deg = (angleRad * 180 / Math.PI) + 90
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15
        }
        const normalizedDeg = (deg % 360 + 360) % 360

        setAnnotations(prev => prev.map(ann => ann.id === selectedAnnotationId ? { ...ann, rotation: normalizedDeg } : ann))
        setCursor('alias')
        forceUpdate({})
        return
      }

      if (handleDragRef.current.kind === 'scale') {
        const unrotatedMouse = unrotatePoint(x, y, center.cx, center.cy, initial.rotation || 0)
        const unrotatedStart = unrotatePoint(handleDragRef.current.startX, handleDragRef.current.startY, center.cx, center.cy, initial.rotation || 0)

        const box = getAnnotationBoundingBox(initial)
        const initialW = Math.max(10, box.maxX - box.minX)
        const initialH = Math.max(10, box.maxY - box.minY)

        const dx = unrotatedMouse.x - unrotatedStart.x
        const dy = unrotatedMouse.y - unrotatedStart.y

        let newMinX = box.minX
        let newMinY = box.minY
        let newMaxX = box.maxX
        let newMaxY = box.maxY

        if (handleKey.includes('e')) newMaxX = Math.max(newMinX + 10, box.maxX + dx)
        if (handleKey.includes('w')) newMinX = Math.min(newMaxX - 10, box.minX + dx)
        if (handleKey.includes('s')) newMaxY = Math.max(newMinY + 10, box.maxY + dy)
        if (handleKey.includes('n')) newMinY = Math.min(newMaxY - 10, box.minY + dy)

        let newW = newMaxX - newMinX
        let newH = newMaxY - newMinY

        if (e.shiftKey || initial.type === 'square' || initial.type === 'circle') {
          const ratio = Math.max(0.1, Math.max(newW / initialW, newH / initialH))
          newW = initialW * ratio
          newH = initialH * ratio
        }

        const scaleX = newW / initialW
        const scaleY = newH / initialH

        setAnnotations(prev => prev.map(ann => {
          if (ann.id !== selectedAnnotationId) return ann
          return scaleAnnotation(initial, newMinX, newMinY, scaleX, scaleY, { minX: box.minX, minY: box.minY })
        }))

        setCursor('nwse-resize')
        forceUpdate({})
        return
      }
    }

    if (coverageHandleDragRef.current?.active) {
      const { cameraId, handleKind } = coverageHandleDragRef.current
      const cam = cameras.find(c => c.id === cameraId)
      if (cam) {
        const distPx = Math.hypot(x - cam.x, y - cam.y)
        const effectiveScale = (floorPlan?.scaleMetersPerPixel && floorPlan.scaleMetersPerPixel > 0) ? floorPlan.scaleMetersPerPixel : 0.05
        const newMeters = Math.max(0.5, Math.round((distPx * effectiveScale) * 10) / 10)

        if (handleKind === 'red_marker') {
          onCameraUpdate(cam.id, { customRadiusMeters: newMeters })
          setCursor('nwse-resize')
        } else if (handleKind === 'corner1' || handleKind === 'corner2') {
          const dx = x - cam.x
          const dy = y - cam.y
          const mouseAngle = Math.atan2(dy, dx)
          const dirAngle = (cam.rotation * Math.PI) / 180
          let diff = Math.abs(mouseAngle - dirAngle)
          while (diff > Math.PI) diff -= 2 * Math.PI
          while (diff < -Math.PI) diff += 2 * Math.PI
          const newFov = Math.max(15, Math.min(360, Math.round((Math.abs(diff) * 2 * 180) / Math.PI)))
          onCameraUpdate(cam.id, { fov: newFov, customRadiusMeters: newMeters })
          setCursor('ew-resize')
        }
        forceUpdate({})
        return
      }
    }

    if (drawingAnnotation) {
      setDrawingAnnotation(prev => {
        if (!prev) return null
        if (prev.type === 'freehand') {
          const pts = prev.points || []
          const lastPt = pts[pts.length - 1]
          if (lastPt) {
            const dist = Math.hypot(x - lastPt.x, y - lastPt.y)
            if (dist < 3 / scale) return prev
          }
          return { ...prev, points: [...pts, { x, y }] }
        } else if (prev.type === 'arrow') {
          return { ...prev, endX: x, endY: y }
        } else if (['circle', 'square', 'rectangle', 'triangle'].includes(prev.type)) {
          const dx = x - prev.x
          const dy = y - prev.y
          let w = Math.abs(dx)
          let h = Math.abs(dy)
          if (prev.type === 'square' || prev.type === 'circle') {
            const side = Math.max(w, h)
            w = side
            h = side
          }
          const startX = dx < 0 ? x : prev.x
          const startY = dy < 0 ? y : prev.y
          return { ...prev, x: startX, y: startY, width: w, height: h }
        }
        return prev
      })
      forceUpdate({})
      return
    }

    if (marqueeDragRef.current?.active) {
      marqueeDragRef.current.currentX = x
      marqueeDragRef.current.currentY = y
      forceUpdate({})
      return
    }

    if (annotationDragRef.current?.active && selectedAnnotationIds.length > 0) {
      const dx = x - annotationDragRef.current.startX
      const dy = y - annotationDragRef.current.startY
      const initialAnns = annotationDragRef.current.initialAnns

      setAnnotations(prev => prev.map(ann => {
        const initial = initialAnns.find(a => a.id === ann.id)
        if (!initial) return ann
        return translateAnnotation(initial, dx, dy)
      }))
      forceUpdate({})
      return
    }

    if (isSeeding) {
      setSeedPreview({ x, y })
    } else if (seedPreview) {
      setSeedPreview(null)
    }
    if (defineScaleMode) {
      setCursor('crosshair')
      if (scalePickRef.current?.ax !== undefined && scalePickRef.current?.bx === undefined) {
        setTempScalePoint({ x, y })
        // Force redraw via temp state update, effectively animating the line
      }
      return
    }
    if (toolMode === 'pan' && panDragRef.current.active) {
      const { cx, cy } = toCanvasCoords(e.clientX, e.clientY)
      const dx = cx - panDragRef.current.startCx
      const dy = cy - panDragRef.current.startCy
      setPan({ x: panDragRef.current.startPanX + dx, y: panDragRef.current.startPanY + dy })
      setCursor('grabbing')
      return
    }
    if (interaction === 'move' && interactionStateRef.current.id) {
      const id = interactionStateRef.current.id
      const kind = interactionStateRef.current.kind
      if (kind === 'camera') {
        requestAnimationFrame(() => onCameraUpdate(id, { x, y }))
      } else if (kind === 'device') {
        requestAnimationFrame(() => onAccessDeviceUpdate(id, { x, y }))
      } else if (kind === 'voceo') {
        requestAnimationFrame(() => onVoceoDeviceUpdate(id, { x, y }))
      } else if (kind === 'label_camera') {
        const dx = x - interactionStateRef.current.startX
        const dy = y - interactionStateRef.current.startY
        const initialOffsetX = interactionStateRef.current.initialOffsetX ?? 0
        const initialOffsetY = interactionStateRef.current.initialOffsetY ?? -20
        requestAnimationFrame(() => onCameraUpdate(id, { labelOffsetX: initialOffsetX + dx, labelOffsetY: initialOffsetY + dy }))
      } else if (kind === 'label_device') {
        const dx = x - interactionStateRef.current.startX
        const dy = y - interactionStateRef.current.startY
        const initialOffsetX = interactionStateRef.current.initialOffsetX ?? 0
        const initialOffsetY = interactionStateRef.current.initialOffsetY ?? -18
        requestAnimationFrame(() => onAccessDeviceUpdate(id, { labelOffsetX: initialOffsetX + dx, labelOffsetY: initialOffsetY + dy }))
      } else if (kind === 'label_voceo') {
        const dx = x - interactionStateRef.current.startX
        const dy = y - interactionStateRef.current.startY
        const initialOffsetX = interactionStateRef.current.initialOffsetX ?? 0
        const initialOffsetY = interactionStateRef.current.initialOffsetY ?? -18
        requestAnimationFrame(() => onVoceoDeviceUpdate(id, { labelOffsetX: initialOffsetX + dx, labelOffsetY: initialOffsetY + dy }))
      } else if (kind === 'fire') {
        requestAnimationFrame(() => onFireDeviceUpdate(id, { x, y }))
      } else if (kind === 'parking' && onParkingDeviceUpdate) {
        requestAnimationFrame(() => onParkingDeviceUpdate(id, { x, y }))
      } else if (kind === 'label_fire') {
        const dx = x - interactionStateRef.current.startX
        const dy = y - interactionStateRef.current.startY
        const initialOffsetX = interactionStateRef.current.initialOffsetX ?? 0
        const initialOffsetY = interactionStateRef.current.initialOffsetY ?? -18
        requestAnimationFrame(() => onFireDeviceUpdate(id, { labelOffsetX: initialOffsetX + dx, labelOffsetY: initialOffsetY + dy }))
      } else if (kind === 'label_parking' && onParkingDeviceUpdate) {
        const dx = x - interactionStateRef.current.startX
        const dy = y - interactionStateRef.current.startY
        const initialOffsetX = interactionStateRef.current.initialOffsetX ?? 0
        const initialOffsetY = interactionStateRef.current.initialOffsetY ?? -18
        requestAnimationFrame(() => onParkingDeviceUpdate(id, { labelOffsetX: initialOffsetX + dx, labelOffsetY: initialOffsetY + dy }))
      }
      setCursor('grabbing')
      return
    }
    if (interaction === 'rotate' && interactionStateRef.current.id) {
      const id = interactionStateRef.current.id
      const kind = interactionStateRef.current.kind
      if (kind === 'camera') {
        const cam = cameras.find(c => c.id === id)
        if (cam) {
          const angle = (Math.atan2(y - cam.y, x - cam.x) * 180) / Math.PI
          const normalized = (angle + 360) % 360
          setRotateAnglePreview(normalized)
          requestAnimationFrame(() => onCameraUpdate(id, { rotation: normalized }))
          setCursor('alias')
        }
      } else if (kind === 'device') {
        const dev = accessDevices.find(d => d.id === id)
        if (dev) {
          const angle = (Math.atan2(y - dev.y, x - dev.x) * 180) / Math.PI
          const normalized = (angle + 360) % 360
          requestAnimationFrame(() => onAccessDeviceUpdate(id, { rotation: normalized }))
          setCursor('alias')
        }
      } else if (kind === 'voceo') {
        const dev = voceoDevices.find(d => d.id === id)
        if (dev) {
          const angle = (Math.atan2(y - dev.y, x - dev.x) * 180) / Math.PI
          const normalized = (angle + 360) % 360
          requestAnimationFrame(() => onVoceoDeviceUpdate(id, { rotation: normalized }))
          setCursor('alias')
        }
      } else if (kind === 'fire') {
        const dev = fireDevices.find(d => d.id === id)
        if (dev) {
          const angle = (Math.atan2(y - dev.y, x - dev.x) * 180) / Math.PI
          const normalized = (angle + 360) % 360
          requestAnimationFrame(() => onFireDeviceUpdate(id, { rotation: normalized }))
          setCursor('alias')
        }
      } else if (kind === 'parking' && onParkingDeviceUpdate) {
        const dev = parkingDevices?.find(d => d.id === id)
        if (dev) {
          const angle = (Math.atan2(y - dev.y, x - dev.x) * 180) / Math.PI
          const normalized = (angle + 360) % 360
          requestAnimationFrame(() => onParkingDeviceUpdate(id, { rotation: normalized }))
          setCursor('alias')
        }
      }
      return
    }
    if (toolMode === 'measure') {
      // Only update the floating end point; keep anchor intact
      const bounds = getBackgroundBounds()
      if (bounds) {
        const inside = x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h
        if (!inside) return
      }
      if (measureStateRef.current?.ax !== undefined) {
        setMeasureTempPoint({ x, y })
        return
      }
    }
    if (toolMode === 'pan') {
      setHoveredCamera(null)
      setHoveredDevice(null)
      setHoveredVoceo(null)
      setHoveredFire(null)
      setCursor(panDragRef.current.active ? 'grabbing' : 'grab')
    } else {
      const camLabel = hitTestLabelCamera(x, y)
      const devLabel = camLabel ? null : hitTestLabelDevice(x, y)
      const voLabel = (camLabel || devLabel) ? null : hitTestLabelVoceo(x, y)
      const fireLabel = (camLabel || devLabel || voLabel) ? null : hitTestLabelFire(x, y)
      const pkLabel = (camLabel || devLabel || voLabel || fireLabel) ? null : hitTestLabelParking(x, y)
      if (camLabel || devLabel || voLabel || fireLabel || pkLabel) {
        setCursor('grab')
        return
      }
      const camId = hitTestCamera(x, y)
      const devId = camId ? null : hitTestDevice(x, y)
      const voId = (camId || devId) ? null : hitTestVoceo(x, y)
      const fireId = (camId || devId || voId) ? null : hitTestFire(x, y)
      const pkId = (camId || devId || voId || fireId) ? null : hitTestParking(x, y)
      setHoveredCamera(camId)
      setHoveredDevice(devId)
      setHoveredVoceo(voId)
      setHoveredFire(fireId)
      setHoveredParking(pkId)
      if (camId || devId || voId || fireId || pkId) setCursor('pointer')
      else setCursor(emptyCursor)
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (freeRotationCameraId) {
      if (e.button === 0) {
        setFreeRotationCameraId(null)
        setCursor(emptyCursor)
        return
      }
    }
    if (activeDrawingTool !== 'select') {
      const { x, y } = toWorldCoords(e.clientX, e.clientY)
      if (activeDrawingTool === 'text') {
        const textVal = prompt('Ingrese el texto para la anotación:', 'Nota')
        if (textVal && textVal.trim()) {
          const newAnn: CanvasAnnotation = {
            id: crypto.randomUUID(),
            type: 'text',
            x,
            y,
            text: textVal.trim(),
            fontColor: strokeColor,
            fontSize: 16,
            view
          }
          setAnnotations(prev => [...prev, newAnn])
          setSelectedAnnotationId(newAnn.id)
        }
        setActiveDrawingTool('select')
        return
      }

      const newAnn: CanvasAnnotation = {
        id: crypto.randomUUID(),
        type: activeDrawingTool as any,
        x,
        y,
        endX: x,
        endY: y,
        width: 0,
        height: 0,
        strokeColor,
        strokeWidth,
        fillColor,
        fillEnabled,
        view
      }
      setDrawingAnnotation(newAnn)
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      return
    }
    if (defineScaleMode) {
      const { x, y } = toWorldCoords(e.clientX, e.clientY)
      const bounds = getBackgroundBounds()
      if (!bounds) return
      const inside = x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h
      if (!inside) return
      if (!scalePickRef.current || scalePickRef.current.ax === undefined) {
        scalePickRef.current = { ax: x, ay: y }
        forceUpdate({})
        return
      }
      if (scalePickRef.current.bx === undefined) {
        scalePickRef.current.bx = x
        scalePickRef.current.by = y
        setTempScalePoint(null) // Clear temp point
        const dx = (scalePickRef.current.bx - scalePickRef.current.ax!)
        const dy = (scalePickRef.current.by - scalePickRef.current.ay!)
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (onScalePointsSelected) {
          onScalePointsSelected(scalePickRef.current.ax!, scalePickRef.current.ay!, scalePickRef.current.bx, scalePickRef.current.by, dist)
        }
        scalePickRef.current = null
        return
      }
      return
    }
    if (toolMode === 'measure') {
      const { x, y } = toWorldCoords(e.clientX, e.clientY)
      const bounds = getBackgroundBounds()
      if (bounds) {
        const inside = x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h
        if (!inside) return
      }
      // Set anchor on first click, update end point on subsequent click (freeze result)
      if (!measureStateRef.current || measureStateRef.current.ax === undefined) {
        measureStateRef.current = { ax: x, ay: y }
        setMeasureTempPoint({ x, y })
      } else {
        setMeasureTempPoint({ x, y })
      }
      return
    }
    if (toolMode === 'pan') {
      const { cx, cy } = toCanvasCoords(e.clientX, e.clientY)
      panDragRef.current = { active: true, startCx: cx, startCy: cy, startPanX: pan.x, startPanY: pan.y }
      setCursor('grab')
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      return
    }
    const { x, y } = toWorldCoords(e.clientX, e.clientY)

    // Hit testing de tiradores de cobertura de la cámara seleccionada (marcador rojo / esquinas)
    if (selectedCamera) {
      const selectedCam = cameras.find(c => c.id === selectedCamera)
      if (selectedCam) {
        const handles = getCoverageHandles(selectedCam, floorPlan?.scaleMetersPerPixel)
        const hitTol = 16 / scale
        const distRed = Math.hypot(x - handles.redMarker.x, y - handles.redMarker.y)
        let handleKind: 'red_marker' | 'corner1' | 'corner2' | null = null
        if (distRed <= hitTol) {
          handleKind = 'red_marker'
        } else if (handles.corner1 && Math.hypot(x - handles.corner1.x, y - handles.corner1.y) <= hitTol) {
          handleKind = 'corner1'
        } else if (handles.corner2 && Math.hypot(x - handles.corner2.x, y - handles.corner2.y) <= hitTol) {
          handleKind = 'corner2'
        }

        if (handleKind) {
          coverageHandleDragRef.current = {
            active: true,
            cameraId: selectedCam.id,
            handleKind,
            startX: x,
            startY: y,
            initialMeters: handles.radiusMeters,
            initialFov: selectedCam.fov || 90
          }
          const canvas = canvasRef.current
          if (canvas) canvas.setPointerCapture(e.pointerId)
          setCursor(handleKind === 'red_marker' ? 'nwse-resize' : 'ew-resize')
          return
        }
      }
    }

    // Hit testing de tiradores de escala y giro de la anotación seleccionada
    if (selectedAnnotationId) {
      const selectedAnn = visibleAnnotations.find(a => a.id === selectedAnnotationId)
      if (selectedAnn) {
        const handleHit = hitTestAnnotationHandles(x, y, selectedAnn, scale)
        if (handleHit) {
          pushAnnotationHistory(currentAnnotations)
          const center = getAnnotationCenter(selectedAnn)
          handleDragRef.current = {
            active: true,
            kind: handleHit === 'rotate' ? 'rotate' : 'scale',
            handleKey: handleHit,
            startX: x,
            startY: y,
            initialAnn: JSON.parse(JSON.stringify(selectedAnn)),
            center
          }
          const canvas = canvasRef.current
          if (canvas) canvas.setPointerCapture(e.pointerId)
          setCursor(handleHit === 'rotate' ? 'alias' : 'nwse-resize')
          return
        }
      }
    }

    // Hit testing de anotaciones antes que dispositivos
    const hitAnn = currentAnnotations.slice().reverse().find(a => isPointInAnnotation(x, y, a, 8 / scale))
    if (hitAnn) {
      let nextSelectedIds = selectedAnnotationIds
      if (e.shiftKey) {
        // Alternar selección con la tecla Shift presionada
        if (selectedAnnotationIds.includes(hitAnn.id)) {
          nextSelectedIds = selectedAnnotationIds.filter(id => id !== hitAnn.id)
        } else {
          nextSelectedIds = [...selectedAnnotationIds, hitAnn.id]
        }
      } else {
        // Si no presiona Shift y el elemento no estaba seleccionado, seleccionarlo únicamente a él
        if (!selectedAnnotationIds.includes(hitAnn.id)) {
          nextSelectedIds = [hitAnn.id]
        }
      }

      setSelectedAnnotationIds(nextSelectedIds)
      onCameraSelect(null)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)

      if (nextSelectedIds.length > 0) {
        pushAnnotationHistory(currentAnnotations)
        const draggedAnns = currentAnnotations.filter(a => nextSelectedIds.includes(a.id))
        annotationDragRef.current = {
          active: true,
          startX: x,
          startY: y,
          initialAnns: JSON.parse(JSON.stringify(draggedAnns))
        }
        const canvas = canvasRef.current
        if (canvas) canvas.setPointerCapture(e.pointerId)
        setCursor('grabbing')
        return
      }
    }

    const camLabel = hitTestLabelCamera(x, y)
    const devLabel = camLabel ? null : hitTestLabelDevice(x, y)
    const voLabel = (camLabel || devLabel) ? null : hitTestLabelVoceo(x, y)
    const fireLabel = (camLabel || devLabel || voLabel) ? null : hitTestLabelFire(x, y)
    const pkLabel = (camLabel || devLabel || voLabel || fireLabel) ? null : hitTestLabelParking(x, y)
    if (camLabel) {
      onCameraSelect(camLabel)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)
      const cam = cameras.find(c => c.id === camLabel)
      interactionStateRef.current = { id: camLabel, kind: 'label_camera', startX: x, startY: y, initialOffsetX: cam?.labelOffsetX ?? 0, initialOffsetY: cam?.labelOffsetY ?? -20 }
      setInteraction('move')
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      setCursor('grabbing')
      return
    }
    if (devLabel) {
      onCameraSelect(null)
      onAccessDeviceSelect(devLabel)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)
      const dev = accessDevices.find(d => d.id === devLabel)
      interactionStateRef.current = { 
        id: devLabel, 
        kind: 'label_device', 
        startX: x, 
        startY: y,
        initialOffsetX: dev?.labelOffsetX ?? 0,
        initialOffsetY: dev?.labelOffsetY ?? -18
      }
      setInteraction('move')
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      setCursor('grabbing')
      return
    }
    if (voLabel) {
      onCameraSelect(null)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(voLabel)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)
      const dev = voceoDevices.find(d => d.id === voLabel)
      interactionStateRef.current = { 
        id: voLabel, 
        kind: 'label_voceo', 
        startX: x, 
        startY: y,
        initialOffsetX: dev?.labelOffsetX ?? 0,
        initialOffsetY: dev?.labelOffsetY ?? -18
      }
      setInteraction('move')
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      setCursor('grabbing')
      return
    }
    if (fireLabel) {
      onCameraSelect(null)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(fireLabel)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)
      const dev = fireDevices.find(d => d.id === fireLabel)
      interactionStateRef.current = { 
        id: fireLabel, 
        kind: 'label_fire', 
        startX: x, 
        startY: y,
        initialOffsetX: dev?.labelOffsetX ?? 0,
        initialOffsetY: dev?.labelOffsetY ?? -18
      }
      setInteraction('move')
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      setCursor('grabbing')
      return
    }
    if (pkLabel) {
      onCameraSelect(null)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(pkLabel)
      const dev = parkingDevices?.find(d => d.id === pkLabel)
      interactionStateRef.current = { 
        id: pkLabel, 
        kind: 'label_parking', 
        startX: x, 
        startY: y,
        initialOffsetX: dev?.labelOffsetX ?? 0,
        initialOffsetY: dev?.labelOffsetY ?? -18
      }
      setInteraction('move')
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      setCursor('grabbing')
      return
    }
    const camId = hitTestCamera(x, y)
    const devId = camId ? null : hitTestDevice(x, y)
    const voId = (camId || devId) ? null : hitTestVoceo(x, y)
    const fireId = (camId || devId || voId) ? null : hitTestFire(x, y)
    const pkId = (camId || devId || voId || fireId) ? null : hitTestParking(x, y)
    if (camId) {
      onCameraSelect(camId)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)
      interactionStateRef.current = { id: camId, kind: 'camera', startX: x, startY: y }
      if (e.shiftKey && selectedCamera === camId) {
        setInteraction('rotate')
        setCursor('alias')
      } else {
        setInteraction('move')
        setCursor('grab')
      }
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
    } else if (devId) {
      onCameraSelect(null)
      onAccessDeviceSelect(devId)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)
      interactionStateRef.current = { id: devId, kind: 'device', startX: x, startY: y }
      if (e.shiftKey && selectedAccessDevice === devId) {
        setInteraction('rotate')
        setCursor('alias')
      } else {
        setInteraction('move')
        setCursor('grab')
      }
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
    } else if (voId) {
      onCameraSelect(null)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(voId)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)
      interactionStateRef.current = { id: voId, kind: 'voceo', startX: x, startY: y }
      if (e.shiftKey && selectedVoceoDevice === voId) {
        setInteraction('rotate')
        setCursor('alias')
      } else {
        setInteraction('move')
        setCursor('grab')
      }
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
    } else if (fireId) {
      onCameraSelect(null)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(fireId)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)
      interactionStateRef.current = { id: fireId, kind: 'fire', startX: x, startY: y }
      if (e.shiftKey && selectedFireDevice === fireId) {
        setInteraction('rotate')
        setCursor('alias')
      } else {
        setInteraction('move')
        setCursor('grab')
      }
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
    } else if (pkId) {
      onCameraSelect(null)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(pkId)
      interactionStateRef.current = { id: pkId, kind: 'parking', startX: x, startY: y }
      if (e.shiftKey && selectedParkingDevice === pkId) {
        setInteraction('rotate')
        setCursor('alias')
      } else {
        setInteraction('move')
        setCursor('grab')
      }
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
    } else {
      // Clic en espacio vacío: deseleccionar dispositivos y anotaciones
      onCameraSelect(null)
      onAccessDeviceSelect(null)
      onVoceoDeviceSelect(null)
      onFireDeviceSelect(null)
      if (onParkingDeviceSelect) onParkingDeviceSelect(null)
      if (!e.shiftKey) {
        setSelectedAnnotationIds([])
      }

      if (isSeeding) {
        if (view === 'parking' && onParkingDeviceCreate && parkingSeedName) {
          const bounds = getBackgroundBounds()
          if (bounds) {
            const inside = x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h
            if (!inside) { toast({ title: 'Fuera de límites', description: 'Coloque dentro del plano', variant: 'destructive' }); return }
          }
          const overlap = parkingDevices.some(d => Math.abs(d.x - x) < 12 && Math.abs(d.y - y) < 12)
          if (overlap) { toast({ title: 'Superposición', description: 'Muy cerca de otro dispositivo', variant: 'destructive' }); return }
          onParkingDeviceCreate({ x, y, rotation: 0, labelOffsetX: 0, labelOffsetY: -18 })
        } else if (view === 'fire' && onFireDeviceSeedCreate && fireSeedName) {
          const bounds = getBackgroundBounds()
          if (bounds) {
            const inside = x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h
            if (!inside) { toast({ title: 'Fuera de límites', description: 'Coloque dentro del plano', variant: 'destructive' }); return }
          }
          const overlap = fireDevices.some(d => Math.abs(d.x - x) < 12 && Math.abs(d.y - y) < 12)
          if (overlap) { toast({ title: 'Superposición', description: 'Muy cerca de otro dispositivo', variant: 'destructive' }); return }
          onFireDeviceSeedCreate({ x, y, rotation: 0, labelOffsetX: 0, labelOffsetY: -18 })
        } else if (view === 'cameras' && onCameraSeedCreate && cameraSeedName) {
          const bounds = getBackgroundBounds()
          if (bounds) {
            const inside = x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h
            if (!inside) { toast({ title: 'Fuera de límites', description: 'Coloque dentro del plano', variant: 'destructive' }); return }
          }
          const overlap = cameras.some(d => Math.abs(d.x - x) < 12 && Math.abs(d.y - y) < 12)
          if (overlap) { toast({ title: 'Superposición', description: 'Muy cerca de otro dispositivo', variant: 'destructive' }); return }
          onCameraSeedCreate({ x, y, rotation: 0, labelOffsetX: 0, labelOffsetY: -20 })
        } else if (view === 'access' && onAccessSeedCreate && accessSeedName) {
          const bounds = getBackgroundBounds()
          if (bounds) {
            const inside = x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h
            if (!inside) { toast({ title: 'Fuera de límites', description: 'Coloque dentro del plano', variant: 'destructive' }); return }
          }
          const overlap = accessDevices.some(d => Math.abs(d.x - x) < 12 && Math.abs(d.y - y) < 12)
          if (overlap) { toast({ title: 'Superposición', description: 'Muy cerca de otro dispositivo', variant: 'destructive' }); return }
          onAccessSeedCreate({ x, y, rotation: 0, labelOffsetX: DEFAULT_ACCESS_LABEL_OFFSET_X, labelOffsetY: DEFAULT_ACCESS_LABEL_OFFSET_Y })
        } else if (view === 'voceo' && onVoceoSeedCreate && voceoSeedName) {
          const bounds = getBackgroundBounds()
          if (bounds) {
            const inside = x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h
            if (!inside) { toast({ title: 'Fuera de límites', description: 'Coloque dentro del plano', variant: 'destructive' }); return }
          }
          const overlap = voceoDevices.some(d => Math.abs(d.x - x) < 12 && Math.abs(d.y - y) < 12)
          if (overlap) { toast({ title: 'Superposición', description: 'Muy cerca de otro dispositivo', variant: 'destructive' }); return }
          onVoceoSeedCreate({ x, y, rotation: 0, labelOffsetX: 0, labelOffsetY: -18 })
        }
      } else {
        // En espacio libre sin estar en modo sembrado: iniciar recuadro de selección Marquee Box
        marqueeDragRef.current = {
          active: true,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y
        }
        const canvas = canvasRef.current
        if (canvas) canvas.setPointerCapture(e.pointerId)
      }
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingAnnotation) {
      if (drawingAnnotation.type === 'freehand' && drawingAnnotation.points && drawingAnnotation.points.length > 1) {
        pushAnnotationHistory(currentAnnotations)
        setAnnotations(prev => [...prev, drawingAnnotation])
        setSelectedAnnotationId(drawingAnnotation.id)
      } else if (drawingAnnotation.type === 'arrow') {
        const dist = Math.hypot((drawingAnnotation.endX ?? 0) - drawingAnnotation.x, (drawingAnnotation.endY ?? 0) - drawingAnnotation.y)
        if (dist > 4) {
          pushAnnotationHistory(currentAnnotations)
          setAnnotations(prev => [...prev, drawingAnnotation])
          setSelectedAnnotationId(drawingAnnotation.id)
        }
      } else if (['circle', 'square', 'rectangle', 'triangle'].includes(drawingAnnotation.type)) {
        if ((drawingAnnotation.width || 0) > 4) {
          pushAnnotationHistory(currentAnnotations)
          setAnnotations(prev => [...prev, drawingAnnotation])
          setSelectedAnnotationId(drawingAnnotation.id)
        }
      }
      setDrawingAnnotation(null)
      const canvas = canvasRef.current
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
      setActiveDrawingTool('select')
      return
    }

    if (marqueeDragRef.current?.active) {
      const { startX, startY, currentX, currentY } = marqueeDragRef.current
      const minX = Math.min(startX, currentX)
      const minY = Math.min(startY, currentY)
      const maxX = Math.max(startX, currentX)
      const maxY = Math.max(startY, currentY)
      const w = maxX - minX
      const h = maxY - minY

      if (w > 5 || h > 5) {
        const selectedByMarquee = visibleAnnotations.filter(ann => {
          const box = getAnnotationBoundingBox(ann)
          return !(box.maxX < minX || box.minX > maxX || box.maxY < minY || box.minY > maxY)
        }).map(ann => ann.id)

        if (e.shiftKey) {
          setSelectedAnnotationIds(prev => Array.from(new Set([...prev, ...selectedByMarquee])))
        } else {
          setSelectedAnnotationIds(selectedByMarquee)
        }
      }
      marqueeDragRef.current = null
      const canvas = canvasRef.current
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
      forceUpdate({})
    }

    if (handleDragRef.current?.active) {
      handleDragRef.current = null
      const canvas = canvasRef.current
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
    }

    if (coverageHandleDragRef.current?.active) {
      coverageHandleDragRef.current = null
      const canvas = canvasRef.current
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
    }

    if (annotationDragRef.current?.active) {
      annotationDragRef.current = null
      const canvas = canvasRef.current
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId)
      }
    }
    if (defineScaleMode) {
      const canvas = canvasRef.current
      if (canvas) canvas.releasePointerCapture(e.pointerId)
      setCursor('crosshair')
      return
    }
    if (toolMode === 'pan' && panDragRef.current.active) {
      panDragRef.current.active = false
      setCursor('grab')
    } else {
      setInteraction('idle')
      interactionStateRef.current = { id: null, kind: null, startX: 0, startY: 0 }
      setRotateAnglePreview(null)
    }
    const canvas = canvasRef.current
    if (canvas) canvas.releasePointerCapture(e.pointerId)
    if (toolMode === 'pan') {
      setCursor('grab')
    } else {
      const { x, y } = toWorldCoords(e.clientX, e.clientY)
      const camId = hitTestCamera(x, y)
      const devId = camId ? null : hitTestDevice(x, y)
      const voId = (camId || devId) ? null : hitTestVoceo(x, y)
      const fireId = (camId || devId || voId) ? null : hitTestFire(x, y)
      const pkId = (camId || devId || voId || fireId) ? null : hitTestParking(x, y)
      setHoveredCamera(camId)
      setHoveredDevice(devId)
      setHoveredVoceo(voId)
      setHoveredFire(fireId)
      setHoveredParking(pkId)
      setCursor(camId || devId || voId || fireId || pkId ? 'pointer' : emptyCursor)
    }
  }

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!selectedCamera && !selectedAccessDevice && !selectedVoceoDevice && !selectedFireDevice && !selectedParkingDevice) return
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    const camId = hitTestCamera(x, y)
    const devId = hitTestDevice(x, y)
    const voId = hitTestVoceo(x, y)
    const fireId = hitTestFire(x, y)
    const pkId = hitTestParking(x, y)
    if (selectedCamera && camId === selectedCamera) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      const current = iconScales[selectedCamera] ?? 1
      const updated = Math.min(2, Math.max(0.1, current + delta))
      onIconScaleChange(selectedCamera, updated)
    } else if (selectedAccessDevice && devId === selectedAccessDevice) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      const current = iconScales[selectedAccessDevice] ?? 0.8
      const updated = Math.min(2, Math.max(0.1, current + delta))
      onIconScaleChange(selectedAccessDevice, updated)
    } else if (selectedVoceoDevice && voId === selectedVoceoDevice) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      const current = iconScales[selectedVoceoDevice] ?? 0.9
      const updated = Math.min(2, Math.max(0.1, current + delta))
      onIconScaleChange(selectedVoceoDevice, updated)
    } else if (selectedFireDevice && fireId === selectedFireDevice) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      const current = iconScales[selectedFireDevice] ?? 0.9
      const updated = Math.min(2, Math.max(0.1, current + delta))
      onIconScaleChange(selectedFireDevice, updated)
    } else if (selectedParkingDevice && pkId === selectedParkingDevice) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      const current = iconScales[selectedParkingDevice] ?? 1
      const updated = Math.min(2, Math.max(0.1, current + delta))
      onIconScaleChange(selectedParkingDevice, updated)
    }
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    const camId = hitTestCamera(x, y)
    if (camId) {
      e.preventDefault()
      e.stopPropagation()
      onCameraSelect(camId)
      setFreeRotationCameraId(camId)
      setLastContext({ target: 'camera', id: camId, wx: x, wy: y })
      toast({
        title: 'Modo Rotación Libre Activado',
        description: 'Mueva el ratón para girar la cámara. Clic Izquierdo o ESC para fijar el ángulo.'
      })
      return
    }
    const devId = hitTestDevice(x, y)
    const voId = (camId || devId) ? null : hitTestVoceo(x, y)
    const fireId = (camId || devId || voId) ? null : hitTestFire(x, y)
    const pkId = (camId || devId || voId || fireId) ? null : hitTestParking(x, y)
    if (devId) {
      setLastContext({ target: 'device', id: devId, wx: x, wy: y })
    } else if (voId) {
      setLastContext({ target: 'voceo', id: voId, wx: x, wy: y } as any)
    } else if (fireId) {
      setLastContext({ target: 'fire', id: fireId, wx: x, wy: y } as any)
    } else if (pkId) {
      setLastContext({ target: 'parking', id: pkId, wx: x, wy: y } as any)
    } else {
      if (onCancelSeeding) onCancelSeeding()
      setLastContext({ target: 'empty', wx: x, wy: y })
    }
  }

  const canCopy = lastContext?.target === 'camera' || lastContext?.target === 'device' || (lastContext as any)?.target === 'voceo' || (lastContext as any)?.target === 'fire' || (lastContext as any)?.target === 'parking'
  const canPasteHere = lastContext?.target === 'empty'

  const doCopy = () => {
    if (!lastContext) return
    if (lastContext.target === 'camera' && lastContext.id) {
      const cam = cameras.find(c => c.id === lastContext.id)
      if (!cam) { toast({ title: 'Error de copia', description: 'No se encontró la cámara bajo el cursor', variant: 'destructive' }); return }
      setClipboard({ kind: 'camera', data: cam })
      setCopiedFlashId(cam.id)
      setTimeout(() => setCopiedFlashId(null), 800)
      toast({ title: 'Copiado', description: 'Dispositivo copiado al portapapeles' })
    } else if (lastContext.target === 'device' && lastContext.id) {
      const dev = accessDevices.find(d => d.id === lastContext.id)
      if (!dev) { toast({ title: 'Error de copia', description: 'No se encontró el dispositivo bajo el cursor', variant: 'destructive' }); return }
      setClipboard({ kind: 'device', data: dev })
      setCopiedFlashId(dev.id)
      setTimeout(() => setCopiedFlashId(null), 800)
      toast({ title: 'Copiado', description: 'Dispositivo copiado al portapapeles' })
    } else if ((lastContext as any).target === 'voceo' && lastContext.id) {
      const dev = voceoDevices.find(d => d.id === lastContext.id)
      if (!dev) { toast({ title: 'Error de copia', description: 'No se encontró el dispositivo de Voceo bajo el cursor', variant: 'destructive' }); return }
      setClipboard({ kind: 'voceo', data: dev })
      setCopiedFlashId(dev.id)
      setIsActivationAnimating(true)
      setTimeout(() => { setCopiedFlashId(null); setIsActivationAnimating(false) }, 900)
      toast({ title: 'Copiado', description: 'Dispositivo copiado al portapapeles' })
    } else if ((lastContext as any).target === 'fire' && lastContext.id) {
      const dev = fireDevices.find(d => d.id === lastContext.id)
      if (!dev) { toast({ title: 'Error de copia', description: 'No se encontró el dispositivo de Incendio bajo el cursor', variant: 'destructive' }); return }
      setClipboard({ kind: 'fire' as any, data: dev as any })
      setCopiedFlashId(dev.id)
      setTimeout(() => setCopiedFlashId(null), 800)
      toast({ title: 'Copiado', description: 'Dispositivo copiado al portapapeles' })
    } else {
      toast({ title: 'Área inválida', description: 'Haga clic derecho sobre un dispositivo para copiar', variant: 'destructive' })
    }
  }

  const doPasteAt = () => {
    if (!lastContext) { toast({ title: 'Área inválida', description: 'Haga clic derecho en un área vacía del lienzo para pegar', variant: 'destructive' }); return }
    if (!clipboard) { toast({ title: 'Portapapeles vacío', description: 'No hay dispositivo para pegar', variant: 'destructive' }); return }
    const bounds = getBackgroundBounds()
    const wx = lastContext.wx
    const wy = lastContext.wy
    if (bounds) {
      const inside = wx >= bounds.x && wx <= bounds.x + bounds.w && wy >= bounds.y && wy <= bounds.y + bounds.h
      if (!inside) {
        toast({ title: 'Área inválida', description: 'Pegue dentro del plano', variant: 'destructive' })
        return
      }
    }
    const src = clipboard.data as any
    if (clipboard.kind === 'camera') {
      const newCam: Camera = { ...src, id: crypto.randomUUID(), name: `${src.name} (Copia)`, x: wx, y: wy }
      onCameraCreate(newCam)
    } else if (clipboard.kind === 'device') {
      const newDev: AccessDevice = { ...src, id: crypto.randomUUID(), name: `${src.name} (Copia)`, x: wx, y: wy }
      onAccessDeviceCreate(newDev)
    } else if (clipboard.kind === 'voceo') {
      const newDev: VoceoDevice = { ...(src as VoceoDevice), id: crypto.randomUUID(), name: `${(src as VoceoDevice).name} (Copia)`, x: wx, y: wy }
      onVoceoDeviceCreate(newDev)
    } else if (clipboard.kind === 'fire') {
      const newDev: FireDevice = { ...(src as FireDevice), id: crypto.randomUUID(), name: `${(src as FireDevice).name} (Copia)`, x: wx, y: wy }
      onFireDeviceCreate(newDev)
    } else if (clipboard.kind === 'parking' && onParkingDeviceCreate) {
      onParkingDeviceCreate({ ...src, x: wx, y: wy })
    }
    toast({ title: 'Pegado', description: 'Dispositivo pegado' })
  }

  const handleToggleGrid = useCallback(() => {
    setShowGrid(prev => {
      const next = !prev
      if (next) {
        toast({ title: 'Cuadrícula (Grid) Activada', description: 'Retícula sutil (40px) visible en el lienzo para alineación de elementos' })
      } else {
        toast({ title: 'Cuadrícula (Grid) Desactivada', description: 'Retícula sutil oculta del lienzo' })
      }
      return next
    })
  }, [])

  const handleToggleFitWindow = useCallback(() => {
    if (isFitToWindow) {
      if (savedZoomStateRef.current) {
        setScale(savedZoomStateRef.current.scale)
        setPan(savedZoomStateRef.current.pan)
      } else {
        setScale(1)
        setPan({ x: 0, y: 0 })
      }
      setIsFitToWindow(false)
      toast({ title: 'Vista Restablecida', description: 'Salida de pantalla completa, contenedor original restaurado' })
    } else {
      savedZoomStateRef.current = { scale, pan: { ...pan } }
      const bounds = getBackgroundBounds()
      const targetW = bounds ? bounds.w : LOGICAL_CANVAS_W
      const targetH = bounds ? bounds.h : LOGICAL_CANVAS_H
      const centerX = bounds ? (bounds.x + bounds.w / 2) : (LOGICAL_CANVAS_W / 2)
      const centerY = bounds ? (bounds.y + bounds.h / 2) : (LOGICAL_CANVAS_H / 2)
      
      const viewportW = typeof window !== 'undefined' ? window.innerWidth - 64 : LOGICAL_CANVAS_W
      const viewportH = typeof window !== 'undefined' ? window.innerHeight - 80 : LOGICAL_CANVAS_H
      
      const fitScaleX = viewportW / targetW
      const fitScaleY = viewportH / targetH
      const targetScale = Math.min(3, Math.max(0.25, Math.min(fitScaleX, fitScaleY)))
      
      // Pan centrado exacto para colocar el punto medio del lienzo/plano en el centro de la pantalla
      const targetPanX = Math.round((LOGICAL_CANVAS_W / 2) / targetScale - centerX)
      const targetPanY = Math.round((LOGICAL_CANVAS_H / 2) / targetScale - centerY)
      
      setScale(targetScale)
      setPan({ x: targetPanX, y: targetPanY })
      setIsFitToWindow(true)
      toast({ title: 'Lienzo Ampliado a Pantalla Completa', description: 'Modo pantalla completa activado. Presione ESC o vuelva a pulsar para salir' })
    }
  }, [isFitToWindow, scale, pan, getBackgroundBounds, LOGICAL_CANVAS_W, LOGICAL_CANVAS_H])

  return (
    <div className={`transition-all duration-300 ${isFitToWindow ? 'fixed inset-0 z-50 bg-slate-950/95 w-screen h-screen p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200' : 'relative h-full overflow-hidden'}`}>
      <FloatingCanvasToolbar
        activeTool={activeDrawingTool}
        onSelectTool={setActiveDrawingTool}
        strokeColor={strokeColor}
        onStrokeColorChange={(color) => {
          setStrokeColor(color)
          if (selectedAnnotationIds.length > 0) {
            pushAnnotationHistory(currentAnnotations)
            setAnnotations(prev =>
              prev.map(a => selectedAnnotationIds.includes(a.id) ? { ...a, strokeColor: color } : a)
            )
          }
        }}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        fillColor={fillColor}
        onFillColorChange={(color) => {
          setFillColor(color)
          if (selectedAnnotationIds.length > 0) {
            pushAnnotationHistory(currentAnnotations)
            setAnnotations(prev =>
              prev.map(a => selectedAnnotationIds.includes(a.id) ? { ...a, fillColor: color } : a)
            )
          }
        }}
        fillEnabled={fillEnabled}
        onFillEnabledChange={setFillEnabled}
        selectedAnnotationId={selectedAnnotationId}
        onDeleteSelectedAnnotation={() => {
          if (selectedAnnotationId) {
            setAnnotations(prev => prev.filter(a => a.id !== selectedAnnotationId))
            setSelectedAnnotationId(null)
          }
        }}
        onClearAllAnnotations={() => {
          setAnnotations([])
          setSelectedAnnotationId(null)
        }}
        canUndo={annotationUndoStack.length > 0}
        onUndo={handleUndoAnnotation}
        canRedo={annotationRedoStack.length > 0}
        onRedo={handleRedoAnnotation}
        onAddImage={handleAddImage}
        onAddObject={handleAddObject}
        selectedCount={selectedAnnotationIds.length}
        isGroupSelected={selectedAnnotationIds.length === 1 && currentAnnotations.find(a => a.id === selectedAnnotationIds[0])?.type === 'group'}
        onGroupSelected={handleGroupAnnotations}
        onUngroupSelected={handleUngroupAnnotation}
      />
      <FloatingDesignToolbar
        toolMode={toolMode}
        setToolMode={setToolMode}
        scale={scale}
        setScale={setScale}
        setPan={setPan}
        setCursor={setCursor}
        floorPlan={floorPlan}
        measureStateRef={measureStateRef}
        setMeasureTempPoint={setMeasureTempPoint}
        showGrid={showGrid}
        onToggleGrid={handleToggleGrid}
        isFitToWindow={isFitToWindow}
        onToggleFitWindow={handleToggleFitWindow}
      />
      <div className="h-full overflow-x-auto overflow-y-auto overscroll-x-contain scrollbar-gutter-both">
        {freeRotationCameraId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-slate-100 border border-sky-500/60 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-sky-500/20 text-sky-400 shrink-0">
              <ThreeArrowsCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-xs text-sky-400 flex items-center gap-2">
                <span>Modo Rotación Libre</span>
                <span className="bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded text-xs">
                  {cameras.find(c => c.id === freeRotationCameraId)?.rotation ?? 0}°
                </span>
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                Mueva el ratón para orientar | Clic Izquierdo o ESC para fijar
              </div>
            </div>
          </div>
        )}
        <div ref={contentRef} className="relative flex min-h-full w-max min-w-full items-start justify-start p-6 pb-24 lg:justify-center">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <Card className="overflow-hidden rounded-[28px] border border-border/70 bg-white p-0 shadow-[0_26px_70px_-42px_rgba(15,23,42,0.55)]">
                <canvas ref={canvasRef} width={1600} height={1100} className="block h-275 w-400 max-w-none bg-white" style={{ cursor, touchAction: 'none' }} onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel} onContextMenu={handleContextMenu} onDoubleClick={(e) => {
        if ((view === 'parking' && parkingSeedName)
          || (view === 'fire' && fireSeedName)
          || (view === 'cameras' && cameraSeedName)
          || (view === 'access' && accessSeedName)
          || (view === 'voceo' && voceoSeedName)) {
          if (onCancelSeeding) onCancelSeeding()
        }
        const { x, y } = toWorldCoords(e.clientX, e.clientY)

        const hitAnn = visibleAnnotations.slice().reverse().find(a => isPointInAnnotation(x, y, a, 8 / scale))
        if (hitAnn && hitAnn.type === 'text') {
          setInlineTextEditor({ id: hitAnn.id, text: hitAnn.text || '', x: hitAnn.x, y: hitAnn.y })
          return
        }

        const camLabel = hitTestLabelCamera(x, y)
        const devLabel = camLabel ? null : hitTestLabelDevice(x, y)
        if (camLabel) {
          const cam = cameras.find(c => c.id === camLabel)
          if (cam) {
            const lx = cam.x + (cam.labelOffsetX ?? 0)
            const ly = cam.y + (cam.labelOffsetY ?? -20)
            const cx = lx * scale + pan.x
            const cy = ly * scale + pan.y
            setEditingLabel({ id: camLabel, kind: 'camera', value: cam.name })
            setEditingPos(getOverlayPosition(cx, cy))
          }
        } else if (devLabel) {
          const dev = accessDevices.find(d => d.id === devLabel)
          if (dev) {
            const lx = dev.x + (dev.labelOffsetX ?? 0)
            const ly = dev.y + (dev.labelOffsetY ?? -18)
            const cx = lx * scale + pan.x
            const cy = ly * scale + pan.y
            setEditingLabel({ id: devLabel, kind: 'device', value: dev.name })
            setEditingPos(getOverlayPosition(cx, cy))
          }
        } else {
          const voLabel = hitTestLabelVoceo(x, y)
          if (voLabel) {
            const dev = voceoDevices.find(d => d.id === voLabel)
            if (dev) {
              const lx = dev.x + (dev.labelOffsetX ?? 0)
              const ly = dev.y + (dev.labelOffsetY ?? -18)
              const cx = lx * scale + pan.x
              const cy = ly * scale + pan.y
              setEditingLabel({ id: voLabel, kind: 'voceo', value: dev.name })
              setEditingPos(getOverlayPosition(cx, cy))
            }
          } else {
            const fireLabel = hitTestLabelFire(x, y)
            const pkLabel = (!camLabel && !devLabel && !voLabel && !fireLabel) ? hitTestLabelParking(x, y) : null
            
            if (fireLabel) {
              const dev = fireDevices.find(d => d.id === fireLabel)
              if (dev) {
                const lx = dev.x + (dev.labelOffsetX ?? 0)
                const ly = dev.y + (dev.labelOffsetY ?? -18)
                const cx = lx * scale + pan.x
                const cy = ly * scale + pan.y
                setEditingLabel({ id: fireLabel, kind: 'fire' as any, value: dev.name })
                setEditingPos(getOverlayPosition(cx, cy))
              }
            } else if (pkLabel) {
              const dev = parkingDevices?.find(d => d.id === pkLabel)
              if (dev) {
                const lx = dev.x + (dev.labelOffsetX ?? 0)
                const ly = dev.y + (dev.labelOffsetY ?? -18)
                const cx = lx * scale + pan.x
                const cy = ly * scale + pan.y
                setEditingLabel({ id: pkLabel, kind: 'parking', value: dev.name })
                setEditingPos(getOverlayPosition(cx, cy))
              }
            } else if (!camLabel && !devLabel && !voLabel && !fireLabel && !pkLabel) {
              const camId = hitTestCamera(x, y)
              const devId = camId ? null : hitTestDevice(x, y)
              const voId = (camId || devId) ? null : hitTestVoceo(x, y)
              const fireId = (camId || devId || voId) ? null : hitTestFire(x, y)
              const pkId = (camId || devId || voId || fireId) ? null : hitTestParking(x, y)
              if (camId) {
                const c = cameras.find(v => v.id === camId)
                if (c && c.name === '') setMissingLabel({ id: c.id, kind: 'camera', value: '' })
              } else if (devId) {
                const d = accessDevices.find(v => v.id === devId)
                if (d && d.name === '') setMissingLabel({ id: d.id, kind: 'device', value: '' })
              } else if (voId) {
                const d = voceoDevices.find(v => v.id === voId)
                if (d && d.name === '') setMissingLabel({ id: d.id, kind: 'voceo', value: '' })
              } else if (fireId) {
                const d = fireDevices.find(v => v.id === fireId)
                if (d && d.name === '') setMissingLabel({ id: d.id, kind: 'fire', value: '' })
              } else if (pkId) {
                const d = parkingDevices?.find(v => v.id === pkId)
                if (d && d.name === '') setMissingLabel({ id: d.id, kind: 'parking', value: '' })
              } else {
                if (onCancelSeeding) onCancelSeeding()
              }
            }
          }
        }
      }} />
              </Card>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {selectedAnnotationIds.length > 0 && (
                <ContextMenuItem onSelect={handleCopyAnnotation}>Copiar Anotación (Ctrl+C)</ContextMenuItem>
              )}
              {hasAnnotationClipboard && (
                <ContextMenuItem onSelect={handlePasteAnnotation}>Pegar Anotación (Ctrl+V)</ContextMenuItem>
              )}
              {selectedAnnotationIds.length >= 2 && (
                <ContextMenuItem onSelect={handleGroupAnnotations}>Agrupar Anotaciones (Ctrl+G)</ContextMenuItem>
              )}
              {selectedAnnotationIds.length === 1 && currentAnnotations.find(a => a.id === selectedAnnotationIds[0])?.type === 'group' && (
                <ContextMenuItem onSelect={handleUngroupAnnotation}>Desagrupar Anotaciones (Ctrl+Shift+G)</ContextMenuItem>
              )}
              <ContextMenuItem disabled={!canCopy} onSelect={doCopy}>Copiar Dispositivo</ContextMenuItem>
              <ContextMenuItem disabled={!clipboard || !canPasteHere} onSelect={doPasteAt}>Pegar Dispositivo</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          {inlineTextEditor && (
            <div
              className="absolute z-50 p-1 bg-white/95 border-2 border-primary rounded-xl shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: `${inlineTextEditor.x * scale + pan.x}px`,
                top: `${inlineTextEditor.y * scale + pan.y}px`,
                transform: 'translate(0, -20%)'
              }}
            >
              <input
                type="text"
                autoFocus
                defaultValue={inlineTextEditor.text}
                className="px-3 py-1 text-sm font-semibold border border-primary/30 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    const val = e.currentTarget.value.trim()
                    if (val) {
                      pushAnnotationHistory(currentAnnotations)
                      setAnnotations(prev => prev.map(a => a.id === inlineTextEditor.id ? { ...a, text: val } : a))
                    }
                    setInlineTextEditor(null)
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim()
                  if (val) {
                    pushAnnotationHistory(currentAnnotations)
                    setAnnotations(prev => prev.map(a => a.id === inlineTextEditor.id ? { ...a, text: val } : a))
                  }
                  setInlineTextEditor(null)
                }}
              />
            </div>
          )}
          {editingLabel && editingPos && (
            <input
              value={editingLabel.value}
              onChange={(e) => setEditingLabel({ ...editingLabel, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editingLabel.kind === 'camera') onCameraUpdate(editingLabel.id, { name: editingLabel.value })
                  else if (editingLabel.kind === 'device') onAccessDeviceUpdate(editingLabel.id, { name: editingLabel.value })
                  else if (editingLabel.kind === 'voceo') onVoceoDeviceUpdate(editingLabel.id, { name: editingLabel.value })
                  else if (editingLabel.kind === 'fire') onFireDeviceUpdate(editingLabel.id, { name: editingLabel.value })
                  else if (editingLabel.kind === 'parking' && onParkingDeviceUpdate) onParkingDeviceUpdate(editingLabel.id, { name: editingLabel.value })
                  setEditingLabel(null)
                  setEditingPos(null)
                } else if (e.key === 'Escape') {
                  setEditingLabel(null)
                  setEditingPos(null)
                }
              }}
              onBlur={() => {
                if (editingLabel) {
                  if (editingLabel.kind === 'camera') onCameraUpdate(editingLabel.id, { name: editingLabel.value })
                  else if (editingLabel.kind === 'device') onAccessDeviceUpdate(editingLabel.id, { name: editingLabel.value })
                  else if (editingLabel.kind === 'voceo') onVoceoDeviceUpdate(editingLabel.id, { name: editingLabel.value })
                  else if (editingLabel.kind === 'fire') onFireDeviceUpdate(editingLabel.id, { name: editingLabel.value })
                  else if (editingLabel.kind === 'parking' && onParkingDeviceUpdate) onParkingDeviceUpdate(editingLabel.id, { name: editingLabel.value })
                }
                setEditingLabel(null)
                setEditingPos(null)
              }}
              className="absolute z-50 rounded-lg border bg-card px-2 py-1 text-xs shadow-lg"
              style={{
                left: editingPos.left,
                top: editingPos.top,
                transform: 'translate(-50%, -50%)'
              }}
              autoFocus
            />
          )}
        </div>
      </div>
      <Dialog open={!!missingLabel} onOpenChange={(open) => { if (!open) setMissingLabel(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar leyenda</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input value={missingLabel?.value ?? ''} onChange={(e) => setMissingLabel(missingLabel ? { ...missingLabel, value: e.target.value } : null)} placeholder="Texto de la leyenda" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMissingLabel(null)}>Cancelar</Button>
            <Button size="sm" onClick={() => {
              if (!missingLabel) return
              if (missingLabel.kind === 'camera') onCameraUpdate(missingLabel.id, { name: missingLabel.value })
              else if (missingLabel.kind === 'device') onAccessDeviceUpdate(missingLabel.id, { name: missingLabel.value })
              else if (missingLabel.kind === 'voceo') onVoceoDeviceUpdate(missingLabel.id, { name: missingLabel.value })
              else if (missingLabel.kind === 'fire') onFireDeviceUpdate(missingLabel.id, { name: missingLabel.value })
              else if (missingLabel.kind === 'parking' && onParkingDeviceUpdate) onParkingDeviceUpdate(missingLabel.id, { name: missingLabel.value })
              setMissingLabel(null)
            }}>Aceptar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FloatingDesignToolbar
        toolMode={toolMode}
        setToolMode={setToolMode}
        scale={scale}
        setScale={setScale}
        setPan={setPan}
        setCursor={setCursor}
        floorPlan={floorPlan}
        measureStateRef={measureStateRef}
        setMeasureTempPoint={setMeasureTempPoint}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
        isFitToWindow={isFitToWindow}
        onToggleFitWindow={handleToggleFitWindow}
      />
      
    </div>
  )
}
