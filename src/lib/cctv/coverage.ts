export interface SensorDimensions {
  format: string
  width: number
  height: number
  diagonal: number
}

export const SENSOR_EQUIVALENCES: Record<string, SensorDimensions> = {
  '1/4"': { format: '1/4"', width: 3.20, height: 2.40, diagonal: 4.00 },
  '1/3.6"': { format: '1/3.6"', width: 4.00, height: 3.00, diagonal: 5.00 },
  '1/3"': { format: '1/3"', width: 4.80, height: 3.60, diagonal: 6.00 },
  '1/2.9"': { format: '1/2.9"', width: 4.96, height: 3.72, diagonal: 6.20 },
  '1/2.8"': { format: '1/2.8"', width: 5.14, height: 3.86, diagonal: 6.42 },
  '1/2.7"': { format: '1/2.7"', width: 5.37, height: 4.04, diagonal: 6.72 },
  '1/2"': { format: '1/2"', width: 6.40, height: 4.80, diagonal: 8.00 },
  '1/1.8"': { format: '1/1.8"', width: 7.18, height: 5.32, diagonal: 8.93 },
  '1"': { format: '1"', width: 12.80, height: 9.60, diagonal: 16.00 }
}

export const DRI_PPM = {
  detection: 25,
  observation: 63,
  recognition: 125,
  identification: 250
} as const

export interface DRICalculationResult {
  identificationMeters: number
  recognitionMeters: number
  observationMeters: number
  detectionMeters: number
  rh: number
  focalMm: number
  sensorWidthMm: number
  sensorFormat: string
  warnings: string[]
  recommendation: string
}

/**
 * Convierte una cadena de formato óptico (ej. "1/2.8"") o busca por nombre
 * en la tabla de equivalencias. Retorna la dimensión física del sensor en mm.
 */
export function getSensorDimensions(formatOrName?: string): SensorDimensions {
  if (!formatOrName) return SENSOR_EQUIVALENCES['1/2.8"']
  const cleanKey = formatOrName.trim().replace(/^sensor\s*/i, '')
  if (SENSOR_EQUIVALENCES[cleanKey]) {
    return SENSOR_EQUIVALENCES[cleanKey]
  }
  // Búsqueda aproximada si contiene la subcadena
  for (const [key, val] of Object.entries(SENSOR_EQUIVALENCES)) {
    if (cleanKey.includes(key)) return val
  }
  return SENSOR_EQUIVALENCES['1/2.8"']
}

/**
 * Parsea o deduce la resolución horizontal Rh en píxeles a partir de un string o número.
 */
export function parseHorizontalResolution(resStringOrNum?: string | number): number {
  if (typeof resStringOrNum === 'number' && resStringOrNum > 0) return resStringOrNum
  if (!resStringOrNum) return 1920

  const str = String(resStringOrNum).toUpperCase().trim()

  // Si viene en formato "1920x1080"
  if (str.includes('X')) {
    const parts = str.split('X')
    const w = parseInt(parts[0].trim(), 10)
    if (!isNaN(w) && w > 0) return w
  }

  if (str.includes('20MP')) return 5184
  if (str.includes('12MP')) return 4000
  if (str.includes('8MP') || str.includes('4K')) return 3840
  if (str.includes('6MP')) return 3072
  if (str.includes('5MP')) return 2560
  if (str.includes('4MP')) return 2560
  if (str.includes('3MP')) return 2048
  if (str.includes('2MP') || str.includes('1080P')) return 1920
  if (str.includes('720P') || str.includes('1MP')) return 1280
  if (str.includes('VGA') || str.includes('640')) return 640

  const extracted = parseInt(str.replace(/\D/g, ''), 10)
  if (!isNaN(extracted) && extracted >= 320 && extracted <= 10000) {
    return extracted
  }

  return 1920
}

/**
 * Parsea la distancia focal f en mm desde un valor numérico o texto (ej. "2.8mm" o "2.7-13.5mm").
 */
export function parseFocalLength(focal?: string | number): number {
  if (typeof focal === 'number' && focal > 0) return focal
  if (!focal) return 2.8

  const str = String(focal).toLowerCase().replace('mm', '').trim()
  if (str.includes('-')) {
    const parts = str.split('-')
    const minVal = parseFloat(parts[0])
    if (!isNaN(minVal) && minVal > 0) return minVal
  }

  const parsed = parseFloat(str)
  return (!isNaN(parsed) && parsed > 0) ? parsed : 2.8
}

/**
 * Calcula las 4 distancias de norma DRI (D, O, R, I) en metros y emite diagnósticos.
 * Fórmula: D = (Rh * f) / (W_sensor * PPM)
 */
export function calculateDRI(params: {
  rh?: number | string
  focalMm?: number | string
  sensorWidthMm?: number
  sensorFormat?: string
  cameraType?: string
  customRadiusMeters?: number
  distanceToObject?: number
}): DRICalculationResult {
  const rh = parseHorizontalResolution(params.rh)
  const focalMm = parseFocalLength(params.focalMm)

  let sensorDimensions: SensorDimensions
  if (params.sensorWidthMm && params.sensorWidthMm > 0) {
    sensorDimensions = {
      format: params.sensorFormat || 'Personalizado',
      width: params.sensorWidthMm,
      height: params.sensorWidthMm * 0.75,
      diagonal: params.sensorWidthMm * 1.25
    }
  } else {
    sensorDimensions = getSensorDimensions(params.sensorFormat)
  }

  const wSensor = sensorDimensions.width
  const warnings: string[] = []

  // Validación de advertencias comerciales
  if (focalMm > 25 && params.cameraType === 'dome') {
    warnings.push(`Focal de ${focalMm}mm inusualmente alta para una cámara de tipo domo fijo.`)
  }
  if (rh < 1920 && (String(params.rh).includes('4K') || String(params.rh).includes('8MP'))) {
    warnings.push(`Resolución detectada (${rh}px) es baja para la etiqueta comercial 4K/8MP.`)
  }
  if (wSensor <= 0) {
    warnings.push('El ancho físico del sensor debe ser mayor a 0.')
  }

  const calcDist = (ppm: number) => {
    if (wSensor <= 0 || ppm <= 0) return 0
    const rawMeters = (rh * focalMm) / (wSensor * ppm)
    return Math.round(rawMeters * 10) / 10
  }

  const rawDetectionMeters = calcDist(DRI_PPM.detection)

  const effectiveRadius = params.customRadiusMeters ?? params.distanceToObject
  let detectionMeters = rawDetectionMeters
  if (effectiveRadius && effectiveRadius > 0) {
    detectionMeters = Math.round(effectiveRadius * 10) / 10
  } else if (params.cameraType === 'fisheye' || params.cameraType === 'panoramic') {
    // Si no se ha personalizado la cobertura de un fisheye/panorámica, limitar a un alcance máximo realista en interiores (18m)
    detectionMeters = Math.min(rawDetectionMeters, 18.0)
  }

  const ratio = rawDetectionMeters > 0 ? (detectionMeters / rawDetectionMeters) : 1
  const identificationMeters = Math.round(calcDist(DRI_PPM.identification) * ratio * 10) / 10
  const recognitionMeters = Math.round(calcDist(DRI_PPM.recognition) * ratio * 10) / 10
  const observationMeters = Math.round(calcDist(DRI_PPM.observation) * ratio * 10) / 10

  const recommendation = `Identificación confiable (250 px/m) hasta ${identificationMeters.toFixed(1)} m; después de esa distancia sirve para reconocimiento (hasta ${recognitionMeters.toFixed(1)} m), observación (hasta ${observationMeters.toFixed(1)} m) y detección (hasta ${detectionMeters.toFixed(1)} m).`

  return {
    identificationMeters,
    recognitionMeters,
    observationMeters,
    detectionMeters,
    rh,
    focalMm,
    sensorWidthMm: wSensor,
    sensorFormat: sensorDimensions.format,
    warnings,
    recommendation
  }
}
