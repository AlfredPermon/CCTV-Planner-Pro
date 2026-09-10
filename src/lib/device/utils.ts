/**
 * Utilidades comunes para manejo de dispositivos
 * Centraliza funciones repetidas en access/incendio/voceo
 */

/**
 * Verifica si un valor es un número finito válido
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Resuelve el tamaño de fuente con validación y límites
 * @param fontSize - Tamaño de fuente proporcionado
 * @param defaultSize - Tamaño por defecto (12)
 * @param minSize - Tamaño mínimo permitido (10)
 * @returns Tamaño de fuente resuelto
 */
export function resolveFontSize(
  fontSize?: number | null,
  defaultSize = 12,
  minSize = 10
): number {
  if (!isFiniteNumber(fontSize)) return defaultSize
  return Math.max(minSize, fontSize as number)
}

/**
 * Resuelve el color de fuente con validación
 * @param fontColor - Color proporcionado
 * @param defaultColor - Color por defecto ('#0f172a')
 * @returns Color resuelto
 */
export function resolveFontColor(
  fontColor?: string | null,
  defaultColor = '#0f172a'
): string {
  if (typeof fontColor === 'string' && fontColor.trim().length > 0) {
    return fontColor
  }
  return defaultColor
}

/**
 * Resuelve la opacidad con validación
 * @param opacity - Opacidad proporcionada
 * @param defaultOpacity - Opacidad por defecto (1)
 * @returns Opacidad resuelta entre 0 y 1
 */
export function resolveOpacity(
  opacity?: number | null,
  defaultOpacity = 1
): number {
  if (!isFiniteNumber(opacity)) return defaultOpacity
  return Math.max(0, Math.min(1, opacity as number))
}

/**
 * Normaliza un string eliminando espacios extras
 */
export function normalizeString(str: string | undefined | null): string {
  if (!str || typeof str !== 'string') return ''
  return str.trim()
}

/**
 * Valida que un código de componente no esté vacío
 */
export function isValidComponentCode(code: string | undefined | null): boolean {
  return typeof code === 'string' && code.trim().length > 0
}

/**
 * Obtiene un valor por defecto si el proporcionado es inválido
 */
export function withDefault<T>(value: T | undefined | null, defaultValue: T): T {
  return value ?? defaultValue
}
