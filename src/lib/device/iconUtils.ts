/**
 * Utilidades comunes para renderizado de íconos en Canvas
 * Centraliza lógica repetida en access/incendio/voceo iconRegistry
 */

export type IconState = 'normal' | 'hover' | 'selected' | 'disabled'

export interface ColorDef {
  primary: string
  secondary: string
  accent: string
  stroke: string
  glow: string
}

export interface IconStyleOptions {
  state: IconState
  viewportScale: number
  size: number
}

export interface IconStyleResult {
  isSelected: boolean
  isHover: boolean
  isDisabled: boolean
  lineWidth: number
  shadowColor: string
  shadowBlur: number
  mainColor: string
  strokeColor: string
}

/**
 * Resuelve el estilo del ícono basado en el estado
 */
export function resolveIconStyle(
  colors: ColorDef,
  options: IconStyleOptions,
  disabledColor = '#94a3b8',
  disabledStrokeColor = '#64748b',
  selectedStrokeColor = '#1e40af'
): IconStyleResult {
  const { state, viewportScale } = options
  const isSelected = state === 'selected'
  const isHover = state === 'hover'
  const isDisabled = state === 'disabled'

  const lineWidth = Math.max(1, 1.5 / viewportScale)
  
  // Sombra y resplandor
  let shadowColor = 'transparent'
  let shadowBlur = 0
  
  if (isSelected) {
    shadowColor = colors.glow
    shadowBlur = 10 / viewportScale
  } else if (isHover) {
    shadowColor = 'rgba(15, 23, 42, 0.25)'
    shadowBlur = 6 / viewportScale
  }

  const mainColor = isDisabled ? disabledColor : colors.primary
  const strokeColor = isDisabled 
    ? disabledStrokeColor 
    : isSelected 
      ? selectedStrokeColor 
      : colors.stroke

  return {
    isSelected,
    isHover,
    isDisabled,
    lineWidth,
    shadowColor,
    shadowBlur,
    mainColor,
    strokeColor,
  }
}

/**
 * Aplica sombra y resplandor al contexto canvas
 */
export function applyIconShadow(
  ctx: CanvasRenderingContext2D,
  shadowColor: string,
  shadowBlur: number
) {
  if (shadowColor && shadowColor !== 'transparent' && shadowBlur > 0) {
    ctx.shadowColor = shadowColor
    ctx.shadowBlur = shadowBlur
  }
}

/**
 * Dibuja el anillo de selección punteado
 */
export function drawSelectionRing(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number
    y: number
    radius: number
    color: string
    viewportScale: number
    lineWidth?: number
  }
) {
  const { x, y, radius, color, viewportScale, lineWidth } = opts
  const dashSize = 3 / viewportScale
  const gapSize = 3 / viewportScale
  const ringRadius = radius + (4 / viewportScale)
  
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth ?? (2 / viewportScale)
  ctx.setLineDash([dashSize, gapSize])
  ctx.beginPath()
  ctx.arc(x, y, ringRadius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
}

/**
 * Dibuja la línea de dirección/orientación
 */
export function drawDirectionLine(
  ctx: CanvasRenderingContext2D,
  opts: {
    rotationDeg: number
    size: number
    strokeColor: string
    viewportScale: number
  }
) {
  const { rotationDeg, size, strokeColor, viewportScale } = opts
  const dirAngle = rotationDeg * (Math.PI / 180)
  const lineLength = size / 2
  
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = Math.max(1, 2 / viewportScale)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(lineLength * Math.cos(dirAngle), lineLength * Math.sin(dirAngle))
  ctx.stroke()
}

/**
 * Configura el contexto con colores básicos
 */
export function setupIconContext(
  ctx: CanvasRenderingContext2D,
  mainColor: string,
  strokeColor: string,
  lineWidth: number
) {
  ctx.fillStyle = mainColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = lineWidth
}

/**
 * Helper para dibujar rectángulos con bordes redondeados (fallback para navegadores antiguos)
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | [number, number, number, number]
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius)
  } else {
    ctx.rect(x, y, width, height)
  }
}

/**
 * Verifica si una clave de ícono es conocida
 */
export function isKnownIconKey<T extends Record<string, unknown>>(
  key: string | undefined | null,
  registry: T
): key is Extract<keyof T, string> {
  if (!key) return false
  return Object.prototype.hasOwnProperty.call(registry, key)
}

/**
 * Dibuja círculos concéntricos (para señales RF/audio)
 */
export function drawConcentricArcs(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  startRadius: number,
  count: number,
  spacing: number,
  startAngle: number,
  endAngle: number,
  strokeStyle: string,
  lineWidth: number
): void {
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  for (let i = 0; i < count; i++) {
    ctx.beginPath()
    ctx.arc(centerX, centerY, startRadius + (spacing * i), startAngle, endAngle)
    ctx.stroke()
  }
}
