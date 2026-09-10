/**
 * Validaciones previas a la generación del PDF.
 *
 * Garantiza que:
 *  1. Todos los dispositivos estén dentro de los límites del lienzo base
 *     (800x600 px en el espacio lógico de exportación). Cualquier coordenada
 *     fuera se reporta como warning, no como error, para no romper la
 *     exportación cuando el usuario ha desplazado intencionalmente un
 *     dispositivo cerca del borde.
 *  2. La escala y proporción entre el plano original y el lienzo destino
 *     no introduzca deformaciones (la transformación `computeUniformTransform`
 *     ya garantiza aspect-ratio uniforme, pero se valida que el factor
 *     de escala sea positivo y finito).
 *  3. Cada tipo de dispositivo cuente con su representación gráfica
 *     (los `iconKey` y `type` que el renderDesignCanvas sabe dibujar).
 *  4. Tras renderizar, las coordenadas resultantes de cada dispositivo
 *     en el canvas del PDF coincidan con su posición original en el
 *     lienzo 2D, con un margen de error máximo del 1%.
 *
 * Las funciones son puras y se usan desde:
 *  - El dialog de exportación (para mostrar advertencias al usuario).
 *  - El proceso de render (para abortar y mostrar un mensaje si la
 *    validación falla).
 *  - Los tests automatizados (para garantizar el contrato espacial).
 */
import type { ExportProjectData } from './export'
import {
  DEFAULT_ACCESS_LABEL_MIN_FONT_SIZE,
  DEFAULT_ACCESS_LABEL_OFFSET_X,
  DEFAULT_ACCESS_LABEL_OFFSET_Y,
  computeAccessExportLabelFontSize,
  computeAccessExportLabelOffsetY,
  estimateAccessLabelWidth,
} from '@/lib/access/device'
import {
  computeFloorPlanBounds,
  EXPORT_BASE_H,
  EXPORT_BASE_W,
  type ExportFloorPlanLike,
} from './exportSpatial'

export const BASE_W = EXPORT_BASE_W
export const BASE_H = EXPORT_BASE_H
/** Margen de error máximo permitido en la conversión de coordenadas. */
export const COORD_TOLERANCE_PCT = 0.01

type FloorPlanField = 'floorPlan' | 'floorPlanAccess' | 'floorPlanVoceo' | 'floorPlanFire' | 'floorPlanParking'

export type DeviceKind = 'cameras' | 'accessDevices' | 'voceoDevices' | 'fireDevices' | 'parkingDevices'

export interface DeviceLike {
  id: string
  type?: string
  iconKey?: string
  x: number
  y: number
}

export interface ValidationIssue {
  level: 'error' | 'warning'
  code: string
  message: string
  deviceId?: string
  kind?: DeviceKind
  field?: string
}

export interface ValidationResult {
  ok: boolean
  issues: ValidationIssue[]
}

export interface ValidationOptions {
  targetW?: number
  targetH?: number
}

/**
 * Tipos de dispositivo que el renderDesignCanvas sabe dibujar. Si el
 * proyecto contiene un tipo desconocido, se reporta como warning.
 */
const KNOWN_TYPES: Record<DeviceKind, Set<string>> = {
  cameras: new Set([
    'dome', 'bullet', 'ptz', 'fisheye', 'turret', 'box', 'generic',
  ]),
  accessDevices: new Set([
    'terminal', 'lock', 'exit_button', 'reader', 'controller', 'door',
  ]),
  voceoDevices: new Set([
    'speaker', 'horn', 'panel', 'microphone', 'callpoint',
  ]),
  fireDevices: new Set([
    'panel', 'smoke_detector', 'smoke_heat_detector', 'heat_detector',
    'manual_station', 'explosion_proof_station', 'horn_strobe',
    'led_indicator', 'module', 'base', 'sprinkler', 'siren',
  ]),
  parkingDevices: new Set([
    'barrier_left', 'barrier_right', 'barrier', 'uhf_reader', 'tag',
    'magnetic_loop', 'parking_meter', 'generic',
  ]),
}

/**
 * Tipos de dispositivo que cuentan con un `iconKey` que el renderDesignCanvas
 * usa como referencia visual. Si falta el iconKey y el tipo tampoco
 * existe en KNOWN_TYPES, se reporta como warning.
 */
function deviceList(project: ExportProjectData, kind: DeviceKind): DeviceLike[] {
  switch (kind) {
    case 'cameras': return (project.cameras ?? []) as DeviceLike[]
    case 'accessDevices': return (project.accessDevices ?? []) as DeviceLike[]
    case 'voceoDevices': return (project.voceoDevices ?? []) as DeviceLike[]
    case 'fireDevices': return (project.fireDevices ?? []) as DeviceLike[]
    case 'parkingDevices': return (project.parkingDevices ?? []) as DeviceLike[]
  }
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function issue(
  level: ValidationIssue['level'],
  code: string,
  message: string,
  extras: Partial<ValidationIssue> = {}
): ValidationIssue {
  return { level, code, message, ...extras }
}

/**
 * Valida coordenadas de un dispositivo individual. Devuelve la lista de
 * issues (puede ser vacía).
 */
function validateDeviceCoords(
  d: DeviceLike,
  kind: DeviceKind
): ValidationIssue[] {
  const out: ValidationIssue[] = []
  if (!isFiniteNumber(d.x) || !isFiniteNumber(d.y)) {
    out.push(issue('error', 'INVALID_COORDS',
      `El dispositivo ${d.id ?? '(sin id)'} tiene coordenadas inválidas (x=${d.x}, y=${d.y}).`,
      { deviceId: d.id, kind, field: 'x|y' }))
    return out
  }
  if (d.x < 0 || d.x > BASE_W) {
    out.push(issue('warning', 'OUT_OF_BOUNDS_X',
      `El dispositivo ${d.id ?? '(sin id)'} está fuera del lienzo (x=${d.x}, fuera de [0, ${BASE_W}]).`,
      { deviceId: d.id, kind, field: 'x' }))
  }
  if (d.y < 0 || d.y > BASE_H) {
    out.push(issue('warning', 'OUT_OF_BOUNDS_Y',
      `El dispositivo ${d.id ?? '(sin id)'} está fuera del lienzo (y=${d.y}, fuera de [0, ${BASE_H}]).`,
      { deviceId: d.id, kind, field: 'y' }))
  }
  return out
}

function validateDeviceRenderability(
  d: DeviceLike,
  kind: DeviceKind
): ValidationIssue[] {
  const out: ValidationIssue[] = []
  const type = d.type
  if (!type) {
    out.push(issue('warning', 'MISSING_TYPE',
      `El dispositivo ${d.id ?? '(sin id)'} no tiene 'type' definido, se usará un ícono genérico.`,
      { deviceId: d.id, kind, field: 'type' }))
    return out
  }
  const known = KNOWN_TYPES[kind]
  if (!known.has(type)) {
    out.push(issue('warning', 'UNKNOWN_TYPE',
      `Tipo de dispositivo desconocido '${type}' en ${d.id ?? '(sin id)'}. Se dibujará con un marcador genérico.`,
      { deviceId: d.id, kind, field: 'type' }))
  }
  return out
}

function listFloorPlans(project: ExportProjectData) {
  const entries: Array<{
    field: FloorPlanField
    floorPlan: ExportFloorPlanLike | null | undefined
    deviceCount: number
  }> = [
    { field: 'floorPlan', floorPlan: project.floorPlan, deviceCount: project.cameras?.length ?? 0 },
    { field: 'floorPlanAccess', floorPlan: project.floorPlanAccess, deviceCount: project.accessDevices?.length ?? 0 },
    { field: 'floorPlanVoceo', floorPlan: project.floorPlanVoceo, deviceCount: project.voceoDevices?.length ?? 0 },
    { field: 'floorPlanFire', floorPlan: project.floorPlanFire, deviceCount: project.fireDevices?.length ?? 0 },
    { field: 'floorPlanParking', floorPlan: project.floorPlanParking, deviceCount: project.parkingDevices?.length ?? 0 },
  ]
  return entries
}

function validateFloorPlanScale(
  floorPlan: ExportFloorPlanLike | null | undefined,
  field: FloorPlanField,
  deviceCount: number
) {
  if (!floorPlan) return [] as ValidationIssue[]

  const issues: ValidationIssue[] = []
  const scale = floorPlan.scaleMetersPerPixel

  if (scale === undefined || scale === null) {
    if (deviceCount > 0) {
      issues.push(issue(
        'warning',
        'MISSING_SCALE_REFERENCE',
        `El plano ${field} no define una escala en metros por píxel. La exportación conservará posición, pero no podrá validar coherencia métrica.`,
        { field }
      ))
    }
    return issues
  }

  if (!isFiniteNumber(scale) || scale <= 0) {
    issues.push(issue(
      'error',
      'INVALID_SCALE_REFERENCE',
      `El plano ${field} tiene una escala inválida (${scale}). Debe ser un número positivo y finito.`,
      { field }
    ))
  }

  return issues
}

function validateFloorPlanRenderability(
  floorPlan: ExportFloorPlanLike | null | undefined,
  field: FloorPlanField,
  targetW: number,
  targetH: number
) {
  if (!floorPlan) return [] as ValidationIssue[]

  const issues: ValidationIssue[] = validateFloorPlanAspect(floorPlan, targetW, targetH).map(current => ({
    ...current,
    field: current.field ?? `${field}.aspect`,
  }))

  const bounds = computeFloorPlanBounds(floorPlan, BASE_W, BASE_H)
  if (!bounds || bounds.w <= 0 || bounds.h <= 0) {
    issues.push(issue(
      'error',
      'FLOOR_PLAN_NOT_RENDERABLE',
      `El plano ${field} no se puede ajustar de forma renderizable al lienzo de exportación.`,
      { field }
    ))
    return issues
  }

  if (bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.w > BASE_W || bounds.y + bounds.h > BASE_H) {
    issues.push(issue(
      'error',
      'FLOOR_PLAN_CLIPPED',
      `El plano ${field} excede los límites del lienzo y podría recortarse durante la exportación.`,
      { field }
    ))
  }

  if (bounds.w < 120 || bounds.h < 120) {
    issues.push(issue(
      'warning',
      'FLOOR_PLAN_TOO_SMALL',
      `El plano ${field} queda demasiado pequeño (${Math.round(bounds.w)}x${Math.round(bounds.h)} px lógicos) y podría perder legibilidad.`,
      { field }
    ))
  }

  return issues
}

function validateScaleConsistency(project: ExportProjectData) {
  const comparable = listFloorPlans(project)
    .filter(entry => entry.floorPlan && isFiniteNumber(entry.floorPlan.scaleMetersPerPixel) && (entry.floorPlan.scaleMetersPerPixel ?? 0) > 0)
    .map(entry => ({ field: entry.field, scale: entry.floorPlan!.scaleMetersPerPixel as number }))

  if (comparable.length < 2) return [] as ValidationIssue[]

  const baseline = comparable[0]
  const issues: ValidationIssue[] = []

  for (const entry of comparable.slice(1)) {
    const delta = Math.abs(entry.scale - baseline.scale) / baseline.scale
    if (delta > 0.05) {
      issues.push(issue(
        'warning',
        'INCONSISTENT_SCALE_REFERENCE',
        `Las escalas ${baseline.field} (${baseline.scale.toFixed(4)} m/px) y ${entry.field} (${entry.scale.toFixed(4)} m/px) difieren más de 5%. Revise la coherencia entre subsistemas antes de exportar.`,
        { field: entry.field }
      ))
    }
  }

  return issues
}

function estimateLabelWidth(text: string | undefined, fontSize: number) {
  return Math.max(fontSize * 1.6, (text?.length ?? 0) * fontSize * 0.62)
}

function validateDeviceVisualBounds(
  d: DeviceLike & Record<string, unknown>,
  kind: DeviceKind
) {
  const issues: ValidationIssue[] = []
  const iconScale = typeof d.iconScale === 'number' && Number.isFinite(d.iconScale) ? d.iconScale : 1

  let halfWidth = 12 * iconScale
  let halfHeight = 12 * iconScale

  if (kind === 'cameras') {
    halfWidth = 120
    halfHeight = 120
  } else if (kind === 'accessDevices') {
    halfWidth = 10 * iconScale
    halfHeight = 10 * iconScale
  } else if (kind === 'voceoDevices') {
    halfWidth = 10 * iconScale
    halfHeight = 10 * iconScale
  } else if (kind === 'fireDevices') {
    halfWidth = 11 * iconScale
    halfHeight = 11 * iconScale
  } else if (kind === 'parkingDevices') {
    halfWidth = 22 * iconScale
    halfHeight = 22 * iconScale
  }

  if (d.x - halfWidth < 0 || d.x + halfWidth > BASE_W || d.y - halfHeight < 0 || d.y + halfHeight > BASE_H) {
    issues.push(issue(
      'error',
      'DEVICE_FOOTPRINT_OUT_OF_BOUNDS',
      `El dispositivo ${d.id ?? '(sin id)'} no cabe completo dentro del área exportable y podría quedar recortado.`,
      { deviceId: d.id, kind }
    ))
  }

  const labelVisible = typeof d.labelVisible === 'boolean' ? d.labelVisible : String(d.name ?? '').trim().length > 0
  if (!labelVisible || String(d.name ?? '').trim().length === 0) {
    return issues
  }

  const rawFontSize = typeof d.labelFontSize === 'number'
    ? d.labelFontSize
    : typeof d.fontSize === 'number'
      ? d.fontSize
      : 10
  const minReadableFont = kind === 'accessDevices' ? DEFAULT_ACCESS_LABEL_MIN_FONT_SIZE : 6
  if (rawFontSize < minReadableFont) {
    issues.push(issue(
      'warning',
      'LABEL_FONT_TOO_SMALL',
      `La etiqueta del dispositivo ${d.id ?? '(sin id)'} usa una fuente muy pequeña (${rawFontSize}px) y puede perder legibilidad.`,
      { deviceId: d.id, kind }
    ))
  }

  const labelOffsetX = typeof d.labelOffsetX === 'number'
    ? d.labelOffsetX
    : kind === 'accessDevices'
      ? DEFAULT_ACCESS_LABEL_OFFSET_X
      : 0
  const labelFontSizeForBounds = kind === 'accessDevices'
    ? computeAccessExportLabelFontSize(1, rawFontSize)
    : rawFontSize
  const labelHalfWidth = (kind === 'accessDevices'
    ? estimateAccessLabelWidth(String(d.name ?? ''), labelFontSizeForBounds)
    : estimateLabelWidth(String(d.name ?? ''), labelFontSizeForBounds)) / 2
  const labelHalfHeight = Math.max(8, labelFontSizeForBounds * 0.8) / 2
  const labelX = d.x + labelOffsetX
  const labelY = d.y + (
    kind === 'accessDevices'
      ? computeAccessExportLabelOffsetY(
          typeof d.labelOffsetY === 'number' ? d.labelOffsetY : DEFAULT_ACCESS_LABEL_OFFSET_Y,
          16 * iconScale,
          labelFontSizeForBounds
        )
      : (typeof d.labelOffsetY === 'number' ? d.labelOffsetY : -18)
  )

  if (
    labelX - labelHalfWidth < 0 ||
    labelX + labelHalfWidth > BASE_W ||
    labelY - labelHalfHeight < 0 ||
    labelY + labelHalfHeight > BASE_H
  ) {
    issues.push(issue(
      'warning',
      'DEVICE_LABEL_CLIPPED',
      `La etiqueta del dispositivo ${d.id ?? '(sin id)'} podría quedar fuera del área visible del PDF.`,
      { deviceId: d.id, kind }
    ))
  }

  return issues
}

/**
 * Valida el proyecto antes de generar el PDF. Devuelve una lista de
 * issues clasificados por severidad.
 *
 * Esta función NO aborta: la UI la usa para mostrar advertencias y los
 * tests para confirmar el comportamiento esperado.
 */
export function validateExportProject(project: ExportProjectData, options: ValidationOptions = {}): ValidationResult {
  const issues: ValidationIssue[] = []
  const targetW = options.targetW ?? BASE_W
  const targetH = options.targetH ?? BASE_H
  const kinds: DeviceKind[] = [
    'cameras', 'accessDevices', 'voceoDevices', 'fireDevices', 'parkingDevices',
  ]

  for (const entry of listFloorPlans(project)) {
    issues.push(...validateFloorPlanScale(entry.floorPlan, entry.field, entry.deviceCount))
    issues.push(...validateFloorPlanRenderability(entry.floorPlan, entry.field, targetW, targetH))
  }
  issues.push(...validateScaleConsistency(project))

  for (const kind of kinds) {
    const list = deviceList(project, kind)
    for (const d of list) {
      issues.push(...validateDeviceCoords(d, kind))
      issues.push(...validateDeviceRenderability(d, kind))
      issues.push(...validateDeviceVisualBounds(d as DeviceLike & Record<string, unknown>, kind))
    }
  }
  const hasError = issues.some(i => i.level === 'error')
  return { ok: !hasError, issues }
}

/**
 * Calcula la transformación uniforme que `renderDesignCanvas` aplica al
 * lienzo lógico 800x600 al renderizar al lienzo destino. Es la misma
 * fórmula que `computeUniformTransform` en export.ts pero expuesta aquí
 * para que la UI pueda mostrar el factor de escala resultante y para
 * que los tests puedan verificar la precisión espacial.
 */
export function computeTargetTransform(targetW: number, targetH: number) {
  const s = Math.min(targetW / BASE_W, targetH / BASE_H)
  const offsetX = Math.round((targetW - BASE_W * s) / 2)
  const offsetY = Math.round((targetH - BASE_H * s) / 2)
  return { scale: s, offsetX, offsetY, baseW: BASE_W, baseH: BASE_H }
}

/**
 * Verifica que un dispositivo (con coordenadas lógicas 0..800 / 0..600)
 * quede dentro del lienzo destino (targetW, targetH) tras aplicar la
 * transformación uniforme. Devuelve las coordenadas destino.
 */
export function projectDeviceToCanvas(
  x: number,
  y: number,
  targetW: number,
  targetH: number
) {
  const t = computeTargetTransform(targetW, targetH)
  return {
    x: Math.round(t.offsetX + x * t.scale),
    y: Math.round(t.offsetY + y * t.scale),
    scale: t.scale,
    offsetX: t.offsetX,
    offsetY: t.offsetY,
  }
}

/**
 * Compara dos puntos y devuelve el error relativo (en %) respecto al
 * tamaño del lienzo destino. El error debe estar dentro del
 * COORD_TOLERANCE_PCT (1%) para que la exportación se considere fiel.
 */
export function coordErrorPct(
  expected: { x: number; y: number },
  actual: { x: number; y: number },
  targetW: number,
  targetH: number
) {
  const dx = Math.abs(expected.x - actual.x)
  const dy = Math.abs(expected.y - actual.y)
  return {
    x: dx / targetW,
    y: dy / targetH,
    max: Math.max(dx / targetW, dy / targetH),
  }
}

/**
 * Verifica que el aspect-ratio del plano original se preserva cuando
 * se incrusta en el lienzo destino.
 */
export function validateFloorPlanAspect(
  floorPlan: { width: number; height: number } | null | undefined,
  targetW: number,
  targetH: number
): ValidationIssue[] {
  if (!floorPlan) return []
  const out: ValidationIssue[] = []
  if (floorPlan.width <= 0 || floorPlan.height <= 0) {
    out.push(issue('error', 'INVALID_PLANE_DIMS',
      `El plano tiene dimensiones inválidas (${floorPlan.width}x${floorPlan.height}).`))
    return out
  }
  const planAspect = floorPlan.width / floorPlan.height
  const targetAspect = targetW / targetH
  // El lienzo destino es uniforme (800x600 base), por lo que una diferencia
  // mayor al 5% respecto al plano original se reporta como warning: el
  // usuario podría esperar ver el plano con su aspect-ratio real.
  if (Math.abs(planAspect - targetAspect) / targetAspect > 0.05) {
    out.push(issue('warning', 'ASPECT_RATIO_DRIFT',
      `El aspect-ratio del plano (${planAspect.toFixed(3)}) difiere del lienzo destino (${targetAspect.toFixed(3)}). El plano podría aparecer con bandas laterales.`,
      { field: 'floorPlan.aspect' }))
  }
  return out
}
