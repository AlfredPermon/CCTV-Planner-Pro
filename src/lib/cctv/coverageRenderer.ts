import type { Camera } from './types'
import { calculateDRI, type DRICalculationResult } from './coverage'

export interface DrawCoverageOptions {
  ctx: CanvasRenderingContext2D
  camera: Camera
  scaleMetersPerPixel?: number
  isSelected?: boolean
  viewportScale?: number
  animationTime?: number
  /** Cuando es true, oculta las líneas punteadas rojas del FOV y el label de distancia.
   *  No altera los cálculos DRI ni la geometría de cobertura. */
  hideFovLines?: boolean
}

export interface CameraTypeColorConfig {
  icon: string
  selectedIcon: string
  stroke: string
  coverage: {
    identification: string
    recognition: string
    observation: string
    detection: string
  }
}

/**
 * Paletas de colores exclusivas y semi-transparentes diferenciadas por tipo de cámara
 */
export const CAMERA_TYPE_COLORS: Record<Camera['type'], CameraTypeColorConfig> = {
  bullet: {
    icon: '#10b981', // Verde Esmeralda
    selectedIcon: '#059669',
    stroke: '#047857',
    coverage: {
      identification: 'rgba(16, 185, 129, 0.52)',
      recognition: 'rgba(52, 211, 153, 0.42)',
      observation: 'rgba(110, 231, 183, 0.35)',
      detection: 'rgba(167, 243, 208, 0.28)'
    }
  },
  dome: {
    icon: '#2563eb', // Azul Zafiro / Cobalto
    selectedIcon: '#1d4ed8',
    stroke: '#1e40af',
    coverage: {
      identification: 'rgba(37, 99, 235, 0.52)',
      recognition: 'rgba(96, 165, 250, 0.42)',
      observation: 'rgba(147, 197, 253, 0.35)',
      detection: 'rgba(191, 219, 254, 0.28)'
    }
  },
  fisheye: {
    icon: '#0891b2', // Turquesa / Cian
    selectedIcon: '#0e7490',
    stroke: '#155e75',
    coverage: {
      identification: 'rgba(8, 145, 178, 0.52)',
      recognition: 'rgba(34, 211, 238, 0.42)',
      observation: 'rgba(103, 232, 249, 0.35)',
      detection: 'rgba(207, 250, 254, 0.28)'
    }
  },
  panoramic: {
    icon: '#7c3aed', // Púrpura / Violeta
    selectedIcon: '#6d28d9',
    stroke: '#5b21b6',
    coverage: {
      identification: 'rgba(124, 58, 237, 0.52)',
      recognition: 'rgba(167, 139, 250, 0.42)',
      observation: 'rgba(196, 181, 253, 0.35)',
      detection: 'rgba(233, 213, 255, 0.28)'
    }
  },
  ptz: {
    icon: '#f59e0b', // Naranja Ámbar / Fuego
    selectedIcon: '#d97706',
    stroke: '#b45309',
    coverage: {
      identification: 'rgba(245, 158, 11, 0.52)',
      recognition: 'rgba(251, 191, 36, 0.42)',
      observation: 'rgba(253, 224, 71, 0.35)',
      detection: 'rgba(254, 240, 138, 0.28)'
    }
  }
}

/**
 * Presets cromáticos estándar utilizables desde el panel de propiedades
 */
export const COLOR_THEME_PRESETS: Array<{
  id: string
  name: string
  color: string
  colors?: {
    identification: string
    recognition: string
    observation: string
    detection: string
  }
}> = [
  {
    id: 'default',
    name: 'Según Tipo',
    color: '#64748b',
    colors: undefined
  },
  {
    id: 'emerald',
    name: 'Verde Esmeralda',
    color: '#10b981',
    colors: CAMERA_TYPE_COLORS.bullet.coverage
  },
  {
    id: 'cobalt',
    name: 'Azul Zafiro',
    color: '#2563eb',
    colors: CAMERA_TYPE_COLORS.dome.coverage
  },
  {
    id: 'cyan',
    name: 'Turquesa Cian',
    color: '#0891b2',
    colors: CAMERA_TYPE_COLORS.fisheye.coverage
  },
  {
    id: 'violet',
    name: 'Púrpura Violeta',
    color: '#7c3aed',
    colors: CAMERA_TYPE_COLORS.panoramic.coverage
  },
  {
    id: 'amber',
    name: 'Naranja Ámbar',
    color: '#f59e0b',
    colors: CAMERA_TYPE_COLORS.ptz.coverage
  },
  {
    id: 'rose',
    name: 'Rosa Carmesí',
    color: '#e11d48',
    colors: {
      identification: 'rgba(225, 29, 72, 0.52)',
      recognition: 'rgba(251, 113, 133, 0.42)',
      observation: 'rgba(253, 164, 175, 0.35)',
      detection: 'rgba(254, 205, 211, 0.28)'
    }
  }
]

const DEFAULT_COLORS = {
  identification: 'rgba(234, 179, 8, 0.45)',
  recognition: 'rgba(250, 204, 21, 0.35)',
  observation: 'rgba(34, 197, 94, 0.30)',
  detection: 'rgba(56, 189, 248, 0.25)'
}

/**
 * Renderiza la cobertura dinámica de la cámara respetando la escala del plano en m/px.
 * Dibuja los 4 rangos DRI concéntricos (Identificación, Reconocimiento, Observación, Detección)
 * con la geometría adecuada (Abanico/Cuña, Semicírculo 180°, Círculo 360°) matching exacto
 * con las referencias del diseño.
 */
export function drawCameraCoverage(options: DrawCoverageOptions): DRICalculationResult {
  const {
    ctx,
    camera,
    scaleMetersPerPixel = 0.05, // 0.05 m/px predeterminado (20 px/m)
    isSelected = false,
    viewportScale = 1,
    animationTime = 0,
    hideFovLines = false
  } = options

  // 1. Obtener cálculo matemático de distancias reales en metros
  const dri = calculateDRI({
    rh: camera.horizontalRes || camera.resolution,
    focalMm: camera.focalLength,
    sensorWidthMm: camera.sensorWidth,
    sensorFormat: camera.sensorFormat,
    cameraType: camera.type,
    customRadiusMeters: camera.customRadiusMeters,
    distanceToObject: camera.distanceToObject
  })

  // 2. Convertir metros a píxeles en el lienzo según la escala activa
  const effectiveScale = scaleMetersPerPixel > 0 ? scaleMetersPerPixel : 0.05
  const rI = dri.identificationMeters / effectiveScale
  const rR = dri.recognitionMeters / effectiveScale
  const rO = dri.observationMeters / effectiveScale
  const rD = dri.detectionMeters / effectiveScale

  const dirAngle = (camera.rotation * Math.PI) / 180
  const customColors = camera.coverageColors || {}
  const opacityMultiplier = camera.coverageOpacity ?? 0.8

  // Paleta predeterminada basada en el tipo de cámara
  const typeDefaultColors = CAMERA_TYPE_COLORS[camera.type]?.coverage || DEFAULT_COLORS

  const colI = customColors.identification || typeDefaultColors.identification
  const colR = customColors.recognition || typeDefaultColors.recognition
  const colO = customColors.observation || typeDefaultColors.observation
  const colD = customColors.detection || typeDefaultColors.detection

  // 3. Determinar modo de forma (fan | semicircle | circle)
  let shapeMode: 'fan' | 'semicircle' | 'circle' = 'fan'
  if (camera.coverageShape && camera.coverageShape !== 'auto') {
    shapeMode = camera.coverageShape
  } else {
    if (camera.type === 'fisheye') shapeMode = 'circle'
    else if (camera.type === 'panoramic') shapeMode = 'semicircle'
    else shapeMode = 'fan'
  }

  ctx.save()

  // Dibujo según el modo geométrico
  if (shapeMode === 'circle') {
    // ---- FISHEYE 360° ----
    // Anillos concéntricos de afuera hacia adentro
    const drawRing = (outerR: number, innerR: number, fillStyle: string) => {
      ctx.beginPath()
      ctx.arc(0, 0, outerR, 0, Math.PI * 2, false)
      if (innerR > 0) {
        ctx.arc(0, 0, innerR, 0, Math.PI * 2, true)
      }
      ctx.fillStyle = fillStyle
      ctx.globalAlpha = opacityMultiplier
      ctx.fill()
    }

    drawRing(rD, rO, colD)
    drawRing(rO, rR, colO)
    drawRing(rR, rI, colR)
    drawRing(rI, 0, colI)

    if (!hideFovLines) {
      // Borde exterior rojo discontinuo
      ctx.globalAlpha = 1.0
      ctx.beginPath()
      ctx.arc(0, 0, rD, 0, Math.PI * 2)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2 / viewportScale
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([5 / viewportScale, 5 / viewportScale])
      }
      ctx.stroke()
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([])
      }

      // Etiqueta de distancia e ícono de punto en el borde
      const textX = rD * Math.cos(dirAngle)
      const textY = rD * Math.sin(dirAngle)

      // Marcador cuadrado rojo en el borde
      const markerSize = 8 / viewportScale
      ctx.fillStyle = '#ef4444'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1 / viewportScale
      ctx.fillRect(textX - markerSize / 2, textY - markerSize / 2, markerSize, markerSize)
      ctx.strokeRect(textX - markerSize / 2, textY - markerSize / 2, markerSize, markerSize)

      // Texto de distancia
      drawDistanceLabel(ctx, `${dri.detectionMeters.toFixed(1)} m`, textX - 25 / viewportScale, textY, viewportScale)
    }

  } else if (shapeMode === 'semicircle') {
    // ---- PANORÁMICA 180° ----
    const startA = dirAngle - Math.PI / 2
    const endA = dirAngle + Math.PI / 2

    const drawSectorBand = (outerR: number, innerR: number, fillStyle: string) => {
      ctx.beginPath()
      ctx.arc(0, 0, outerR, startA, endA, false)
      if (innerR > 0) {
        ctx.arc(0, 0, innerR, endA, startA, true)
      } else {
        ctx.lineTo(0, 0)
      }
      ctx.closePath()
      ctx.fillStyle = fillStyle
      ctx.globalAlpha = opacityMultiplier
      ctx.fill()
    }

    drawSectorBand(rD, rO, colD)
    drawSectorBand(rO, rR, colO)
    drawSectorBand(rR, rI, colR)
    drawSectorBand(rI, 0, colI)

    if (!hideFovLines) {
      // Borde exterior rojo discontinuo 180°
      ctx.globalAlpha = 1.0
      ctx.beginPath()
      ctx.arc(0, 0, rD, startA, endA)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2 / viewportScale
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([5 / viewportScale, 5 / viewportScale])
      }
      ctx.stroke()
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([])
      }

      // Marcador cuadrado rojo y texto de distancia central
      const midX = rD * Math.cos(dirAngle)
      const midY = rD * Math.sin(dirAngle)
      const markerSize = 8 / viewportScale

      ctx.fillStyle = '#ef4444'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1 / viewportScale
      ctx.fillRect(midX - markerSize / 2, midY - markerSize / 2, markerSize, markerSize)
      ctx.strokeRect(midX - markerSize / 2, midY - markerSize / 2, markerSize, markerSize)

      drawDistanceLabel(ctx, `${dri.detectionMeters.toFixed(1)} m`, midX - 25 / viewportScale, midY, viewportScale)
    }

  } else {
    // ---- CUÑA / ABANICO FOV (BULLET / DOMO / PTZ) ----
    const fovDeg = camera.fov || 90
    const halfFov = ((fovDeg / 2) * Math.PI) / 180
    const startA = dirAngle - halfFov
    const endA = dirAngle + halfFov

    const drawWedgeBand = (outerR: number, innerR: number, fillStyle: string) => {
      ctx.beginPath()
      ctx.arc(0, 0, outerR, startA, endA, false)
      if (innerR > 0) {
        ctx.arc(0, 0, innerR, endA, startA, true)
      } else {
        ctx.lineTo(0, 0)
      }
      ctx.closePath()
      ctx.fillStyle = fillStyle
      ctx.globalAlpha = opacityMultiplier
      ctx.fill()
    }

    drawWedgeBand(rD, rO, colD)
    drawWedgeBand(rO, rR, colO)
    drawWedgeBand(rR, rI, colR)
    drawWedgeBand(rI, 0, colI)

    if (!hideFovLines) {
      // Contorno exterior rojo discontinuo del abanico
      ctx.globalAlpha = 1.0
      ctx.beginPath()
      ctx.arc(0, 0, rD, startA, endA)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2 / viewportScale
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([5 / viewportScale, 5 / viewportScale])
      }
      ctx.stroke()
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([])
      }
    }

    // Líneas límite de abertura angular (siempre visibles para mantener orientación)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(rD * Math.cos(startA), rD * Math.sin(startA))
    ctx.moveTo(0, 0)
    ctx.lineTo(rD * Math.cos(endA), rD * Math.sin(endA))
    ctx.strokeStyle = isSelected ? 'rgba(59, 130, 246, 0.8)' : 'rgba(100, 116, 139, 0.4)'
    ctx.lineWidth = 1.5 / viewportScale
    ctx.stroke()

    if (!hideFovLines) {
      // Eje central con línea punteada roja
      const midX = rD * Math.cos(dirAngle)
      const midY = rD * Math.sin(dirAngle)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(midX, midY)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2 / viewportScale
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([4 / viewportScale, 4 / viewportScale])
      }
      ctx.stroke()
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([])
      }

      // Marcador cuadrado rojo en el centro del borde exterior
      const markerSize = 8 / viewportScale
      ctx.fillStyle = '#ef4444'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1 / viewportScale
      ctx.fillRect(midX - markerSize / 2, midY - markerSize / 2, markerSize, markerSize)
      ctx.strokeRect(midX - markerSize / 2, midY - markerSize / 2, markerSize, markerSize)

      // Texto de distancia real sobre el eje central
      drawDistanceLabel(ctx, `${dri.detectionMeters.toFixed(1)} m`, midX / 2, midY / 2 - 8 / viewportScale, viewportScale)
    }

    // Tiradores amarillos en las esquinas si la cámara está seleccionada
    {
      const corner1X = rD * Math.cos(startA)
      const corner1Y = rD * Math.sin(startA)
      const corner2X = rD * Math.cos(endA)
      const corner2Y = rD * Math.sin(endA)

      if (isSelected) {
        const handleSize = 9 / viewportScale

        // Tiradores amarillos
        ctx.fillStyle = '#eab308'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1.5 / viewportScale

        ctx.fillRect(corner1X - handleSize / 2, corner1Y - handleSize / 2, handleSize, handleSize)
        ctx.strokeRect(corner1X - handleSize / 2, corner1Y - handleSize / 2, handleSize, handleSize)

        ctx.fillRect(corner2X - handleSize / 2, corner2Y - handleSize / 2, handleSize, handleSize)
        ctx.strokeRect(corner2X - handleSize / 2, corner2Y - handleSize / 2, handleSize, handleSize)
      }
    }
  }

  // Animación opcional de radar / barrido
  if (camera.coverageAnimated) {
    const sweepAngle = ((animationTime % 3000) / 3000) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(rD * Math.cos(sweepAngle), rD * Math.sin(sweepAngle))
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'
    ctx.lineWidth = 2 / viewportScale
    ctx.stroke()
  }

  ctx.restore()
  return dri
}

/**
 * Renderiza la etiqueta flotante de texto para indicar distancias de cobertura reales.
 */
function drawDistanceLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  viewportScale: number
) {
  ctx.save()
  ctx.font = `bold ${13 / viewportScale}px sans-serif`
  const textMetrics = ctx.measureText(text)
  const paddingX = 6 / viewportScale
  const paddingY = 3 / viewportScale
  const w = textMetrics.width + paddingX * 2
  const h = 16 / viewportScale + paddingY * 2

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 1 / viewportScale
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 4 / viewportScale)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#1d4ed8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.restore()
}

export interface CoverageHandles {
  shapeMode: 'fan' | 'semicircle' | 'circle'
  radiusPx: number
  radiusMeters: number
  redMarker: { x: number; y: number }
  corner1?: { x: number; y: number }
  corner2?: { x: number; y: number }
}

export function getCoverageHandles(
  camera: Camera,
  scaleMetersPerPixel: number = 0.05
): CoverageHandles {
  const dri = calculateDRI({
    rh: camera.horizontalRes || camera.resolution,
    focalMm: camera.focalLength,
    sensorWidthMm: camera.sensorWidth,
    sensorFormat: camera.sensorFormat,
    cameraType: camera.type,
    customRadiusMeters: camera.customRadiusMeters,
    distanceToObject: camera.distanceToObject
  })

  const effectiveScale = scaleMetersPerPixel > 0 ? scaleMetersPerPixel : 0.05
  const rD = dri.detectionMeters / effectiveScale
  const dirAngle = (camera.rotation * Math.PI) / 180

  let shapeMode: 'fan' | 'semicircle' | 'circle' = 'fan'
  if (camera.coverageShape && camera.coverageShape !== 'auto') {
    shapeMode = camera.coverageShape
  } else {
    if (camera.type === 'fisheye') shapeMode = 'circle'
    else if (camera.type === 'panoramic') shapeMode = 'semicircle'
    else shapeMode = 'fan'
  }

  const redMarker = {
    x: camera.x + rD * Math.cos(dirAngle),
    y: camera.y + rD * Math.sin(dirAngle)
  }

  if (shapeMode === 'fan') {
    const fovDeg = camera.fov || 90
    const halfFov = ((fovDeg / 2) * Math.PI) / 180
    const startA = dirAngle - halfFov
    const endA = dirAngle + halfFov

    return {
      shapeMode,
      radiusPx: rD,
      radiusMeters: dri.detectionMeters,
      redMarker,
      corner1: { x: camera.x + rD * Math.cos(startA), y: camera.y + rD * Math.sin(startA) },
      corner2: { x: camera.x + rD * Math.cos(endA), y: camera.y + rD * Math.sin(endA) }
    }
  }

  return {
    shapeMode,
    radiusPx: rD,
    radiusMeters: dri.detectionMeters,
    redMarker
  }
}
