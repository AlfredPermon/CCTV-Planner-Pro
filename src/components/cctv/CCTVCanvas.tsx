'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, RotateCcw, ZoomIn, ZoomOut, Maximize2, Target, Eye, Hand, Ruler } from 'lucide-react'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import type { Camera, FloorPlan, AccessDevice } from '@/app/page'

interface CCTVCanvasProps {
  cameras: Camera[]
  accessDevices: AccessDevice[]
  floorPlan: FloorPlan | null
  selectedCamera: string | null
  selectedAccessDevice: string | null
  onCameraSelect: (id: string | null) => void
  onAccessDeviceSelect: (id: string | null) => void
  onCameraUpdate: (id: string, updates: Partial<Camera>) => void
  onAccessDeviceUpdate: (id: string, updates: Partial<AccessDevice>) => void
  onCameraDelete: (id: string) => void
  onAccessDeviceDelete: (id: string) => void
  iconScales: Record<string, number>
  onIconScaleChange: (id: string, value: number) => void
  defineScaleMode?: boolean
  onScalePointsSelected?: (ax: number, ay: number, bx: number, by: number, pixelDistance: number) => void
  onCameraCreate: (cam: Camera) => void
  onAccessDeviceCreate: (dev: AccessDevice) => void
}

export default function CCTVCanvas({
  cameras,
  accessDevices,
  floorPlan,
  selectedCamera,
  selectedAccessDevice,
  onCameraSelect,
  onAccessDeviceSelect,
  onCameraUpdate,
  onAccessDeviceUpdate,
  onCameraDelete,
  onAccessDeviceDelete,
  iconScales,
  onIconScaleChange,
  defineScaleMode,
  onScalePointsSelected,
  onCameraCreate,
  onAccessDeviceCreate
}: CCTVCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const floorPlanImageRef = useRef<HTMLImageElement | null>(null)
  const [, forceUpdate] = useState({})
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hoveredCamera, setHoveredCamera] = useState<string | null>(null)
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null)
  const [interaction, setInteraction] = useState<'idle' | 'move' | 'rotate'>('idle')
  const interactionStateRef = useRef<{ id: string | null; kind: 'camera' | 'device' | 'label_camera' | 'label_device' | null; startX: number; startY: number; initialOffsetX?: number; initialOffsetY?: number }>({ id: null, kind: null, startX: 0, startY: 0 })
  const [rotateAnglePreview, setRotateAnglePreview] = useState<number | null>(null)
  const [cursor, setCursor] = useState<string>('crosshair')
  const [toolMode, setToolMode] = useState<'select' | 'pan' | 'measure'>('select')
  const measureStateRef = useRef<{ ax?: number; ay?: number } | null>(null)
  const [measureTempPoint, setMeasureTempPoint] = useState<{ x: number; y: number } | null>(null)
  const panDragRef = useRef<{ active: boolean; startCx: number; startCy: number; startPanX: number; startPanY: number }>({ active: false, startCx: 0, startCy: 0, startPanX: 0, startPanY: 0 })
  const scalePickRef = useRef<{ ax?: number; ay?: number; bx?: number; by?: number } | null>(null)
  const [tempScalePoint, setTempScalePoint] = useState<{ x: number; y: number } | null>(null)
  const [editingLabel, setEditingLabel] = useState<{ id: string; kind: 'camera' | 'device'; value: string } | null>(null)
  const [editingPos, setEditingPos] = useState<{ left: number; top: number } | null>(null)
  const [clipboard, setClipboard] = useState<{ kind: 'camera' | 'device'; data: Camera | AccessDevice } | null>(null)
  const [copiedFlashId, setCopiedFlashId] = useState<string | null>(null)
  const [lastContext, setLastContext] = useState<{ target: 'camera' | 'device' | 'empty'; id?: string; wx: number; wy: number } | null>(null)

  const getBackgroundBounds = useCallback(() => {
    if (!floorPlan || !floorPlanImageRef.current) return null
    const aspectRatio = floorPlan.width / floorPlan.height
    let drawWidth = Math.min(700, 800)
    let drawHeight = drawWidth / aspectRatio
    if (drawHeight > 500) { drawHeight = 500; drawWidth = drawHeight * aspectRatio }
    return { x: 50, y: 50, w: drawWidth, h: drawHeight }
  }, [floorPlan])

  useEffect(() => {
    if (!floorPlan) { floorPlanImageRef.current = null; return }
    if (!floorPlanImageRef.current || floorPlanImageRef.current.src !== floorPlan.url) {
      const img = new Image()
      img.onload = () => { floorPlanImageRef.current = img; forceUpdate({}) }
      img.onerror = () => { floorPlanImageRef.current = null; forceUpdate({}) }
      img.crossOrigin = 'anonymous'
      img.src = floorPlan.url
    }
  }, [floorPlan?.url])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (toolMode === 'measure') {
          measureStateRef.current = null
          setMeasureTempPoint(null)
          forceUpdate({})
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toolMode])

  useEffect(() => {
    const handleKeyDownCopyPaste = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        if (selectedCamera) {
          const cam = cameras.find(c => c.id === selectedCamera)
          if (cam) {
            setClipboard({ kind: 'camera', data: cam })
            setCopiedFlashId(cam.id)
            setTimeout(() => setCopiedFlashId(null), 800)
            toast({ title: 'Copiado', description: 'Dispositivo copiado al portapapeles' })
          }
        } else if (selectedAccessDevice) {
          const dev = accessDevices.find(d => d.id === selectedAccessDevice)
          if (dev) {
            setClipboard({ kind: 'device', data: dev })
            setCopiedFlashId(dev.id)
            setTimeout(() => setCopiedFlashId(null), 800)
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
    needCam.forEach(c => onIconScaleChange(c.id, 1))
    needDev.forEach(d => onIconScaleChange(d.id, 0.8))
  }, [cameras, accessDevices, iconScales, onIconScaleChange])

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 800, 600)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, 800, 600)
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(scale, scale)

    if (floorPlan && floorPlanImageRef.current && floorPlanImageRef.current.complete) {
      const img = floorPlanImageRef.current
      const bounds = getBackgroundBounds()
      if (!bounds) return
      ctx.drawImage(img, bounds.x, bounds.y, bounds.w, bounds.h)
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 2 / scale
      ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h)
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

    cameras.forEach(camera => {
      const isSelected = camera.id === selectedCamera
      const isCopiedFlash = camera.id === copiedFlashId
      ctx.save()
      ctx.translate(camera.x, camera.y)
      const iconScale = iconScales[camera.id] ?? 1
      ctx.fillStyle = isSelected ? '#3b82f6' : '#1e293b'
      if (isSelected) { ctx.shadowColor = 'rgba(59, 130, 246, 0.6)'; ctx.shadowBlur = 8 }
      ctx.beginPath()
      ctx.arc(0, 0, 12 * iconScale, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#64748b'
      ctx.lineWidth = 2 / scale
      ctx.beginPath()
      const dirAngle = camera.rotation * (Math.PI / 180)
      ctx.moveTo(0, 0)
      ctx.lineTo(12 * iconScale * Math.cos(dirAngle), 12 * iconScale * Math.sin(dirAngle))
      ctx.stroke()
      if (isCopiedFlash) {
        ctx.beginPath()
        ctx.arc(0, 0, 16 * iconScale, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(59,130,246,0.6)'
        ctx.lineWidth = 2 / scale
        ctx.stroke()
      }
      const radius = 120
      const halfFov = (camera.fov / 2) * (Math.PI / 180)
      const startAngle = dirAngle - halfFov
      const endAngle = dirAngle + halfFov
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.15)'
      ctx.fill()
      ctx.strokeStyle = isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(100, 116, 139, 0.35)'
      ctx.stroke()
      if (isSelected && rotateAnglePreview !== null) {
        ctx.fillStyle = '#0f172a'
        ctx.font = `bold ${11 / scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(`${Math.round(rotateAnglePreview)}°`, 0, -20)
      }
      ctx.restore()
      const lx = camera.x + (camera.labelOffsetX ?? 0)
      const ly = camera.y + (camera.labelOffsetY ?? -20)
      ctx.fillStyle = '#1e293b'
      ctx.font = `${11 / scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(camera.name, lx, ly)
    })
    // draw access devices
    accessDevices.forEach(dev => {
      const isSelected = dev.id === selectedAccessDevice
      const isCopiedFlash = dev.id === copiedFlashId
      ctx.save()
      ctx.translate(dev.x, dev.y)
      const iconScale = iconScales[dev.id] ?? 0.8
      const size = 14 * iconScale
      const baseColor =
        dev.type === 'terminal' ? '#7c3aed' :
        dev.type === 'lock' ? '#60a5fa' :
        dev.type === 'exit_button' ? '#10b981' :
        '#ef4444'
      ctx.fillStyle = baseColor
      if (isSelected) { ctx.shadowColor = `${baseColor}99`; ctx.shadowBlur = 8 }
      // shape per type
      if (dev.type === 'terminal') {
        ctx.fillRect(-size / 2, -size / 2, size, size)
      } else if (dev.type === 'lock') {
        ctx.beginPath()
        ctx.roundRect(-size / 2, -size / 4, size, size / 2, 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, size / 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
      // rotation indicator (optional)
      ctx.strokeStyle = baseColor
      ctx.lineWidth = 2 / scale
      ctx.beginPath()
      const dirAngle = dev.rotation * (Math.PI / 180)
      ctx.moveTo(0, 0)
      ctx.lineTo((size / 2) * Math.cos(dirAngle), (size / 2) * Math.sin(dirAngle))
      ctx.stroke()
      if (isCopiedFlash) {
        ctx.beginPath()
        ctx.arc(0, 0, (size / 2) + 4, 0, Math.PI * 2)
        ctx.strokeStyle = `${baseColor}`
        ctx.lineWidth = 2 / scale
        ctx.stroke()
      }
      ctx.restore()
      const lx = dev.x + (dev.labelOffsetX ?? 0)
      const ly = dev.y + (dev.labelOffsetY ?? -18)
      ctx.fillStyle = '#1e293b'
      ctx.font = `${11 / scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(dev.name, lx, ly)
    })
    ctx.restore()
  }, [cameras, accessDevices, floorPlan, scale, pan, selectedCamera, selectedAccessDevice, iconScales, rotateAnglePreview, getBackgroundBounds, defineScaleMode, tempScalePoint, toolMode, measureTempPoint, copiedFlashId])

  useEffect(() => { drawScene() }, [drawScene])

  const selectedCameraData = cameras.find(c => c.id === selectedCamera)
  const selectedDeviceData = accessDevices.find(d => d.id === selectedAccessDevice)

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { cx: 0, cy: 0 }
    const rect = canvas.getBoundingClientRect()
    const cx = (clientX - rect.left) * (canvas.width / rect.width)
    const cy = (clientY - rect.top) * (canvas.height / rect.height)
    return { cx, cy }
  }

  const toWorldCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const { cx, cy } = toCanvasCoords(clientX, clientY)
    return { x: (cx - pan.x) / scale, y: (cy - pan.y) / scale }
  }

  const hitTestCamera = (wx: number, wy: number) => {
    let hitId: string | null = null
    for (let i = cameras.length - 1; i >= 0; i--) {
      const c = cameras[i]
      const r = 12 * (iconScales[c.id] ?? 1)
      const dx = wx - c.x
      const dy = wy - c.y
      if (dx * dx + dy * dy <= r * r) { hitId = c.id; break }
    }
    return hitId
  }
  const hitTestDevice = (wx: number, wy: number) => {
    let hitId: string | null = null
    for (let i = accessDevices.length - 1; i >= 0; i--) {
      const d = accessDevices[i]
      const r = 10 * (iconScales[d.id] ?? 0.8)
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
    ctx.font = `${11 / scale}px sans-serif`
    for (let i = cameras.length - 1; i >= 0; i--) {
      const c = cameras[i]
      const lx = c.x + (c.labelOffsetX ?? 0)
      const ly = c.y + (c.labelOffsetY ?? -20)
      const w = ctx.measureText(c.name).width
      const h = 14 / scale
      const left = lx - w / 2
      const right = lx + w / 2
      const top = ly - h
      const bottom = ly
      if (wx >= left && wx <= right && wy >= top && wy <= bottom) return c.id
    }
    return null
  }
  const hitTestLabelDevice = (wx: number, wy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.font = `${11 / scale}px sans-serif`
    for (let i = accessDevices.length - 1; i >= 0; i--) {
      const d = accessDevices[i]
      const lx = d.x + (d.labelOffsetX ?? 0)
      const ly = d.y + (d.labelOffsetY ?? -18)
      const w = ctx.measureText(d.name).width
      const h = 14 / scale
      const left = lx - w / 2
      const right = lx + w / 2
      const top = ly - h
      const bottom = ly
      if (wx >= left && wx <= right && wy >= top && wy <= bottom) return d.id
    }
    return null
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
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
      setCursor(panDragRef.current.active ? 'grabbing' : 'grab')
    } else {
      const camLabel = hitTestLabelCamera(x, y)
      const devLabel = camLabel ? null : hitTestLabelDevice(x, y)
      if (camLabel || devLabel) {
        setCursor('grab')
        return
      }
      const camId = hitTestCamera(x, y)
      const devId = camId ? null : hitTestDevice(x, y)
      setHoveredCamera(camId)
      setHoveredDevice(devId)
      if (camId || devId) setCursor('pointer')
      else setCursor('crosshair')
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    const camLabel = hitTestLabelCamera(x, y)
    const devLabel = camLabel ? null : hitTestLabelDevice(x, y)
    if (camLabel) {
      const cam = cameras.find(c => c.id === camLabel)
      interactionStateRef.current = { id: camLabel, kind: 'label_camera', startX: x, startY: y, initialOffsetX: cam?.labelOffsetX ?? 0, initialOffsetY: cam?.labelOffsetY ?? -20 }
      setInteraction('move')
      const canvas = canvasRef.current
      if (canvas) canvas.setPointerCapture(e.pointerId)
      setCursor('grabbing')
      return
    }
    if (devLabel) {
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
    const camId = hitTestCamera(x, y)
    const devId = camId ? null : hitTestDevice(x, y)
    if (camId) {
      onCameraSelect(camId)
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
      onAccessDeviceSelect(devId)
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
    } else {
      // Click on empty space: deselect
      onCameraSelect(null)
      onAccessDeviceSelect(null)
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
      setCursor(hoveredCamera || hoveredDevice ? 'pointer' : 'crosshair')
    }
  }

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!selectedCamera && !selectedAccessDevice) return
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    const camId = hitTestCamera(x, y)
    const devId = hitTestDevice(x, y)
    if (selectedCamera && camId === selectedCamera) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      const current = iconScales[selectedCamera] ?? 1
      const updated = Math.min(2, Math.max(0.5, current + delta))
      onIconScaleChange(selectedCamera, updated)
    } else if (selectedAccessDevice && devId === selectedAccessDevice) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      const current = iconScales[selectedAccessDevice] ?? 0.8
      const updated = Math.min(2, Math.max(0.5, current + delta))
      onIconScaleChange(selectedAccessDevice, updated)
    }
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toWorldCoords(e.clientX, e.clientY)
    const camId = hitTestCamera(x, y)
    const devId = camId ? null : hitTestDevice(x, y)
    if (camId) {
      setLastContext({ target: 'camera', id: camId, wx: x, wy: y })
    } else if (devId) {
      setLastContext({ target: 'device', id: devId, wx: x, wy: y })
    } else {
      setLastContext({ target: 'empty', wx: x, wy: y })
    }
  }

  const canCopy = lastContext?.target === 'camera' || lastContext?.target === 'device'
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
    } else {
      const newDev: AccessDevice = { ...src, id: crypto.randomUUID(), name: `${src.name} (Copia)`, x: wx, y: wy }
      onAccessDeviceCreate(newDev)
    }
    toast({ title: 'Pegado', description: 'Dispositivo pegado' })
  }

  return (
    <div className="relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card className="overflow-hidden"><canvas ref={canvasRef} width={800} height={600} className="w-full" style={{ cursor, touchAction: 'none' }} onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel} onContextMenu={handleContextMenu} onDoubleClick={(e) => {
        const { x, y } = toWorldCoords(e.clientX, e.clientY)
        const camLabel = hitTestLabelCamera(x, y)
        const devLabel = camLabel ? null : hitTestLabelDevice(x, y)
        if (camLabel) {
          const cam = cameras.find(c => c.id === camLabel)
          if (cam) {
            const lx = cam.x + (cam.labelOffsetX ?? 0)
            const ly = cam.y + (cam.labelOffsetY ?? -20)
            const rect = canvasRef.current!.getBoundingClientRect()
            const cx = lx * scale + pan.x
            const cy = ly * scale + pan.y
            const left = (cx * (rect.width / (canvasRef.current!.width))) 
            const top = (cy * (rect.height / (canvasRef.current!.height)))
            setEditingLabel({ id: camLabel, kind: 'camera', value: cam.name })
            setEditingPos({ left, top })
          }
        } else if (devLabel) {
          const dev = accessDevices.find(d => d.id === devLabel)
          if (dev) {
            const lx = dev.x + (dev.labelOffsetX ?? 0)
            const ly = dev.y + (dev.labelOffsetY ?? -18)
            const rect = canvasRef.current!.getBoundingClientRect()
            const cx = lx * scale + pan.x
            const cy = ly * scale + pan.y
            const left = (cx * (rect.width / (canvasRef.current!.width))) 
            const top = (cy * (rect.height / (canvasRef.current!.height)))
            setEditingLabel({ id: devLabel, kind: 'device', value: dev.name })
            setEditingPos({ left, top })
          }
        }
      }} /></Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={!canCopy} onSelect={doCopy}>Copiar</ContextMenuItem>
          <ContextMenuItem disabled={!clipboard || !canPasteHere} onSelect={doPasteAt}>Pegar</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {editingLabel && editingPos && (
        <input
          value={editingLabel.value}
          onChange={(e) => setEditingLabel({ ...editingLabel, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (editingLabel.kind === 'camera') onCameraUpdate(editingLabel.id, { name: editingLabel.value })
              else onAccessDeviceUpdate(editingLabel.id, { name: editingLabel.value })
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
              else onAccessDeviceUpdate(editingLabel.id, { name: editingLabel.value })
            }
            setEditingLabel(null)
            setEditingPos(null)
          }}
          className="absolute z-50 px-2 py-1 text-xs border rounded bg-card"
          style={{
            left: editingPos.left,
            top: editingPos.top,
            transform: 'translate(-50%, -50%)'
          }}
          autoFocus
        />
      )}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-card border rounded-lg p-2 shadow-lg">
        <Button
          variant={toolMode === 'pan' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            if (floorPlan?.locked) return
            setToolMode(prev => {
              const next = prev === 'pan' ? 'select' : 'pan'
              setCursor(next === 'pan' ? 'grab' : 'crosshair')
              measureStateRef.current = null
              setMeasureTempPoint(null)
              return next
            })
          }}
        >
          <Hand className="h-4 w-4" />
        </Button>
        <Button
          variant={toolMode === 'measure' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setToolMode(prev => {
              const next = prev === 'measure' ? 'select' : 'measure'
              setCursor(next === 'measure' ? 'crosshair' : 'crosshair')
              measureStateRef.current = null
              setMeasureTempPoint(null)
              return next
            })
          }}
          disabled={!floorPlan?.scaleMetersPerPixel}
          title={!floorPlan?.scaleMetersPerPixel ? "Defina la escala primero" : "Herramienta de Medición"}
        >
          <Ruler className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setScale(prev => Math.min(3, prev * 1.2))}><ZoomIn className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setScale(1)}><Maximize2 className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setScale(prev => Math.max(0.25, prev * 0.8))}><ZoomOut className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => { setPan({ x: 0, y: 0 }); setScale(1); setToolMode('select'); setCursor('crosshair') }}><RotateCcw className="h-4 w-4" /></Button>
        {floorPlan?.scaleMetersPerPixel !== undefined && (
          <div className="ml-2 text-xs text-muted-foreground">
            Escala activa: {floorPlan.scaleMetersPerPixel.toFixed(4)} m/px {floorPlan.locked ? '(fondo bloqueado)' : ''}
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-2 text-xs text-muted-foreground cursor-default">Copiar <kbd>Ctrl</kbd>+<kbd>C</kbd> · Pegar <kbd>Ctrl</kbd>+<kbd>V</kbd> · Clic derecho</span>
          </TooltipTrigger>
          <TooltipContent side="top">Atajos disponibles en el lienzo</TooltipContent>
        </Tooltip>
      </div>
      
    </div>
  )
}
