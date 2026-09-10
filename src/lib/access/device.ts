import type { CatalogModel } from '@/lib/catalog/types'
import type { AccessIconKey } from '@/lib/access/iconRegistry'

export type AccessDeviceType = 'terminal' | 'lock' | 'exit_button' | 'emergency_button'

export const DEFAULT_ACCESS_LABEL_FONT_SIZE = 12
export const DEFAULT_ACCESS_LABEL_MIN_FONT_SIZE = 10
export const DEFAULT_ACCESS_LABEL_FONT_FAMILY = 'sans-serif'
export const DEFAULT_ACCESS_LABEL_FONT_COLOR = '#0f172a'
export const DEFAULT_ACCESS_LABEL_OFFSET_X = 0
export const DEFAULT_ACCESS_LABEL_OFFSET_Y = -18
export const DEFAULT_ACCESS_LABEL_PADDING_X = 6
export const DEFAULT_ACCESS_LABEL_PADDING_Y = 3
export const DEFAULT_ACCESS_LABEL_RADIUS = 4
export const DEFAULT_ACCESS_LABEL_BG_COLOR = 'rgba(255, 255, 255, 0.94)'
export const DEFAULT_ACCESS_LABEL_BORDER_COLOR = 'rgba(15, 23, 42, 0.18)'
export const DEFAULT_ACCESS_LABEL_OUTLINE_COLOR = 'rgba(255, 255, 255, 0.98)'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function resolveAccessLabelFontSize(fontSize?: number) {
  if (!isFiniteNumber(fontSize)) return DEFAULT_ACCESS_LABEL_FONT_SIZE
  return Math.max(DEFAULT_ACCESS_LABEL_MIN_FONT_SIZE, fontSize)
}

export function resolveAccessLabelFontFamily(fontFamily?: string) {
  return typeof fontFamily === 'string' && fontFamily.trim().length > 0
    ? fontFamily
    : DEFAULT_ACCESS_LABEL_FONT_FAMILY
}

export function resolveAccessLabelFontColor(fontColor?: string) {
  return typeof fontColor === 'string' && fontColor.trim().length > 0
    ? fontColor
    : DEFAULT_ACCESS_LABEL_FONT_COLOR
}

export function estimateAccessLabelWidth(text: string | undefined, fontSize: number) {
  const resolvedFontSize = resolveAccessLabelFontSize(fontSize)
  return Math.max(resolvedFontSize * 1.9, (text?.length ?? 0) * resolvedFontSize * 0.66)
}

export function computeAccessExportLabelFontSize(scale: number, deviceFontSize?: number) {
  const safeScale = Math.max(0.001, scale)
  return Math.max(6.2 * safeScale, resolveAccessLabelFontSize(deviceFontSize) * safeScale * 0.58)
}

export function computeAccessExportLabelOffsetY(
  labelOffsetY: number | undefined,
  iconSize: number,
  labelFontSize: number
) {
  const defaultLabelOffsetY = -(iconSize * 0.95 + labelFontSize * 0.9)
  if (!isFiniteNumber(labelOffsetY)) return defaultLabelOffsetY
  return labelOffsetY < 0 ? Math.min(labelOffsetY, defaultLabelOffsetY) : labelOffsetY
}

export function getAccessCanvasLabelLayout(opts: {
  x: number
  y: number
  textWidth: number
  viewportScale: number
  fontSize?: number
  labelOffsetX?: number
  labelOffsetY?: number
}) {
  const safeScale = Math.max(0.001, opts.viewportScale)
  const resolvedFontSize = resolveAccessLabelFontSize(opts.fontSize)
  const renderedFontSize = resolvedFontSize / safeScale
  const paddingX = DEFAULT_ACCESS_LABEL_PADDING_X / safeScale
  const paddingY = DEFAULT_ACCESS_LABEL_PADDING_Y / safeScale
  const centerX = opts.x + (opts.labelOffsetX ?? DEFAULT_ACCESS_LABEL_OFFSET_X)
  const centerY = opts.y + (opts.labelOffsetY ?? DEFAULT_ACCESS_LABEL_OFFSET_Y)
  const width = Math.max(renderedFontSize * 1.9, opts.textWidth + paddingX * 2)
  const height = Math.max(renderedFontSize * 1.15, renderedFontSize + paddingY * 2)
  const radius = DEFAULT_ACCESS_LABEL_RADIUS / safeScale

  return {
    centerX,
    centerY,
    width,
    height,
    paddingX,
    paddingY,
    radius,
    renderedFontSize,
    left: centerX - width / 2,
    right: centerX + width / 2,
    top: centerY - height / 2,
    bottom: centerY + height / 2,
  }
}

export function inferAccessDeviceType(model: Pick<CatalogModel, 'marca' | 'modelo' | 'codigo' | 'descripcion' | 'notas'>): AccessDeviceType {
  const haystack = `${model.marca} ${model.modelo} ${model.codigo} ${model.descripcion ?? ''} ${model.notas ?? ''}`
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (
    haystack.includes('EMERGEN') ||
    haystack.includes('EMERGENCY') ||
    haystack.includes('BREAK GLASS') ||
    haystack.includes('ROMPER') ||
    haystack.includes('CRISTAL')
  ) {
    return 'emergency_button'
  }

  if (
    haystack.includes('SALIDA') ||
    haystack.includes('EXIT') ||
    haystack.includes('PUSH') ||
    haystack.includes('PULSADOR')
  ) {
    return 'exit_button'
  }

  if (
    haystack.includes('CHAPA') ||
    haystack.includes('MAGNET') ||
    haystack.includes('LOCK') ||
    haystack.includes('600LB') ||
    haystack.includes('600 LB') ||
    haystack.includes('ELECTROMAGNET') ||
    haystack.includes('ELECTROIMAN')
  ) {
    return 'lock'
  }

  return 'terminal'
}

export function inferAccessIconKey(
  model: Pick<CatalogModel, 'marca' | 'modelo' | 'codigo' | 'descripcion' | 'notas'>,
  resolvedType?: AccessDeviceType
): AccessIconKey {
  const type = resolvedType ?? inferAccessDeviceType(model)
  const mod = `${model.marca} ${model.modelo} ${model.codigo} ${model.descripcion ?? ''} ${model.notas ?? ''}`
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (mod.includes('AEGIS') || mod.includes('TORNIQUETE') || mod.includes('TRIPODE') || mod.includes('BARRERA PEATONAL')) {
    return 'turnstile'
  }
  if (mod.includes('PROKSC') || mod.includes('KEY SWITCH') || (mod.includes('SWITCH') && mod.includes('LLAVE'))) {
    return 'key_switch'
  }
  if (mod.includes('SENSEFACE') || mod.includes('SPEEDFACE') || mod.includes('FACE') || mod.includes('FACIAL') || mod.includes('RECONOC')) {
    return 'terminal_face'
  }
  if (mod.includes('HUELLA') || mod.includes('FINGER') || mod.includes('BIOMET')) {
    return 'terminal_fingerprint'
  }
  if (mod.includes('SS2422') || mod.includes('EMERGEN') || mod.includes('EMERGENCY') || mod.includes('BREAK GLASS') || mod.includes('CRISTAL') || mod.includes('RUPTURA')) {
    return 'emergency_button'
  }
  if (mod.includes('K11') || mod.includes('SIN TOCAR') || mod.includes('TOUCHLESS') || mod.includes('SALIDA') || mod.includes('EXIT') || mod.includes('PULSADOR')) {
    return 'exit_button'
  }
  if (mod.includes('MAG600') || mod.includes('CHAPA') || mod.includes('MAGNET') || mod.includes('LOCK') || mod.includes('ELECTROIMAN') || mod.includes('ELECTROCERRADURA')) {
    return 'lock'
  }
  if (mod.includes('LECTOR') || mod.includes('LECTORA') || mod.includes('PROXIMIDAD') || mod.includes('RFID') || mod.includes('WIEGAND')) {
    return 'reader_card'
  }
  if (
    mod.includes('FUENTE') ||
    mod.includes('PL12DC') ||
    mod.includes('XP18DC') ||
    mod.includes('PANEL') ||
    mod.includes('SOFTWARE') ||
    mod.includes('LICENCIA') ||
    mod.includes('GATEWAY') ||
    mod.includes('SWITCH') ||
    mod.includes('ROUTER') ||
    mod.includes('UPS') ||
    mod.includes('PANDUIT') ||
    mod.includes('UBIQUITI')
  ) {
    return 'controller_panel'
  }

  if (type === 'lock') return 'lock'
  if (type === 'exit_button') return 'exit_button'
  if (type === 'emergency_button') return 'emergency_button'
  if (type === 'terminal') return 'terminal'
  return 'generic'
}
