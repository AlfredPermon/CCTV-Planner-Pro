import type { AccessDeviceType } from '@/lib/access/device'
import {
  DEFAULT_ACCESS_LABEL_FONT_COLOR,
  DEFAULT_ACCESS_LABEL_FONT_FAMILY,
  DEFAULT_ACCESS_LABEL_FONT_SIZE,
  DEFAULT_ACCESS_LABEL_OFFSET_X,
  DEFAULT_ACCESS_LABEL_OFFSET_Y,
  resolveAccessLabelFontColor,
  resolveAccessLabelFontFamily,
  resolveAccessLabelFontSize,
} from '@/lib/access/device'

/**
 * Estructura mínima compatible con el `AccessDevice` actual (definido en `src/app/page.tsx`).
 * Se define localmente para evitar dependencias a módulos client-only durante pruebas en Node.
 */
export type AccessDeviceSeed = {
  id: string
  type: AccessDeviceType
  name: string
  modelId?: string
  modelName?: string
  iconKey?: string
  labelVisible: boolean
  labelFontSize: number
  labelFontFamily: string
  labelFontWeight?: 'normal' | 'bold'
  labelFontStyle?: 'normal' | 'italic'
  labelFontColor?: string
  x: number
  y: number
  rotation: number
  labelOffsetX: number
  labelOffsetY: number
}

export function resolveBaseAccessDeviceName(type: AccessDeviceType): string {
  return type === 'terminal'
    ? 'Terminal'
    : type === 'lock'
      ? 'Chapa Magnética'
      : type === 'exit_button'
        ? 'Botón de Salida'
        : 'Botón de Emergencia'
}

function defaultId(): string {
  // Node >= 19 expone crypto.randomUUID, pero dejamos fallback para tests.
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) return globalThis.crypto.randomUUID()
  return `acc-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

/**
 * Fábrica para "siembra" en el canvas.
 * - `withLegend=true` replica el comportamiento de "Agregar"
 * - `withLegend=false` replica "Sin leyenda"
 */
export function createSeededAccessDevice(opts: {
  type: AccessDeviceType
  idx: number
  modelId?: string
  modelName?: string
  iconKey?: string
  withLegend: boolean
  /**
   * Se permiten overrides para test / escenarios futuros.
   */
  id?: string
  x?: number
  y?: number
}): AccessDeviceSeed {
  const baseName = resolveBaseAccessDeviceName(opts.type)
  const seedNameBase = (opts.modelName && opts.modelName.trim()) ? opts.modelName.trim() : baseName
  const id = opts.id ?? defaultId()

  return {
    id,
    type: opts.type,
    name: `${seedNameBase} - ${opts.idx}`,
    modelId: opts.modelId,
    modelName: opts.modelName,
    iconKey: opts.iconKey,
    labelVisible: opts.withLegend,
    labelFontSize: DEFAULT_ACCESS_LABEL_FONT_SIZE,
    labelFontFamily: DEFAULT_ACCESS_LABEL_FONT_FAMILY,
    labelFontWeight: 'normal',
    labelFontStyle: 'normal',
    labelFontColor: DEFAULT_ACCESS_LABEL_FONT_COLOR,
    x: opts.x ?? 520,
    y: opts.y ?? 320,
    rotation: 0,
    labelOffsetX: DEFAULT_ACCESS_LABEL_OFFSET_X,
    labelOffsetY: DEFAULT_ACCESS_LABEL_OFFSET_Y
  }
}

export function normalizeAccessDevice(d: any): any {
  const name = typeof d?.name === 'string' ? d.name : ''
  const labelVisible = typeof d?.labelVisible === 'boolean' ? d.labelVisible : name.trim().length > 0
  const labelFontSize = resolveAccessLabelFontSize(
    typeof d?.labelFontSize === 'number'
      ? d.labelFontSize
      : typeof d?.fontSize === 'number'
        ? d.fontSize
        : DEFAULT_ACCESS_LABEL_FONT_SIZE
  )
  const labelFontFamily = resolveAccessLabelFontFamily(
    typeof d?.labelFontFamily === 'string' && d.labelFontFamily.trim()
      ? d.labelFontFamily
      : typeof d?.fontFamily === 'string' && d.fontFamily.trim()
        ? d.fontFamily
        : DEFAULT_ACCESS_LABEL_FONT_FAMILY
  )
  const labelFontWeight = typeof d?.labelFontWeight === 'string' && (d.labelFontWeight === 'normal' || d.labelFontWeight === 'bold') ? d.labelFontWeight : 'normal'
  const labelFontStyle = typeof d?.labelFontStyle === 'string' && (d.labelFontStyle === 'normal' || d.labelFontStyle === 'italic') ? d.labelFontStyle : 'normal'
  const labelFontColor = resolveAccessLabelFontColor(d?.labelFontColor)

  return {
    ...d,
    name,
    labelVisible,
    labelFontSize,
    labelFontFamily,
    labelFontWeight,
    labelFontStyle,
    labelFontColor
  }
}

export function normalizeAccessDevices(list: any): any[] {
  const arr: any[] = Array.isArray(list) ? list : []
  return arr.map(normalizeAccessDevice)
}

