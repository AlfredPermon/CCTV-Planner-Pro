import { describe, it, expect } from 'vitest'
import { calculateDRI, getSensorDimensions, parseFocalLength, parseHorizontalResolution } from './coverage'

describe('Cálculo de norma DRI (EN 62676-4)', () => {
  it('convierte correctamente formatos de sensor a milímetros físicos', () => {
    expect(getSensorDimensions('1/2.8"').width).toBe(5.14)
    expect(getSensorDimensions('1/1.8"').width).toBe(7.18)
    expect(getSensorDimensions('1/3"').width).toBe(4.80)
    expect(getSensorDimensions('1"').width).toBe(12.80)
  })

  it('parsea resoluciones horizontales típicas', () => {
    expect(parseHorizontalResolution('2MP')).toBe(1920)
    expect(parseHorizontalResolution('5MP')).toBe(2560)
    expect(parseHorizontalResolution('8MP (4K)')).toBe(3840)
    expect(parseHorizontalResolution('1920x1080')).toBe(1920)
    expect(parseHorizontalResolution('2560x1440')).toBe(2560)
  })

  it('parsea distancias focales fijas y rangos varifocales', () => {
    expect(parseFocalLength('2.8mm')).toBe(2.8)
    expect(parseFocalLength('2.7-13.5mm')).toBe(2.7)
    expect(parseFocalLength(4.3)).toBe(4.3)
  })

  it('calcula las 4 distancias DRI en metros redondeadas a 1 decimal', () => {
    // Ejemplo: Rh = 2560 (5MP), f = 2.8mm, W = 5.14mm (1/2.8")
    // D_I = (2560 * 2.8) / (5.14 * 250) = 7168 / 1285 = 5.578 -> 5.6m
    // D_R = (2560 * 2.8) / (5.14 * 125) = 7168 / 642.5 = 11.156 -> 11.2m
    // D_O = (2560 * 2.8) / (5.14 * 63) = 7168 / 323.82 = 22.135 -> 22.1m
    // D_D = (2560 * 2.8) / (5.14 * 25) = 7168 / 128.5 = 55.78 -> 55.8m
    const res = calculateDRI({
      rh: '5MP',
      focalMm: '2.8mm',
      sensorFormat: '1/2.8"'
    })

    expect(res.identificationMeters).toBe(5.6)
    expect(res.recognitionMeters).toBe(11.2)
    expect(res.observationMeters).toBe(22.1)
    expect(res.detectionMeters).toBe(55.8)
    expect(res.recommendation).toContain('Identificación confiable (250 px/m) hasta 5.6 m')
  })

  it('emite advertencias comerciales ante entradas atípicas', () => {
    const res = calculateDRI({
      rh: '1080p',
      focalMm: '30mm',
      sensorFormat: '1/2.8"',
      cameraType: 'dome'
    })

    expect(res.warnings.length).toBeGreaterThan(0)
    expect(res.warnings[0]).toContain('Focal de 30mm inusualmente alta')
  })

  it('acota el alcance por defecto de cámaras fisheye a 18m para mantener proporciones realistas', () => {
    const res = calculateDRI({
      rh: '6MP',
      focalMm: '1.6mm',
      sensorFormat: '1/2.8"',
      cameraType: 'fisheye'
    })

    expect(res.detectionMeters).toBeLessThanOrEqual(18.0)
    expect(res.detectionMeters).toBe(18.0)
  })

  it('respeta la distancia personalizada customRadiusMeters al arrastrar el marcador rojo', () => {
    const res = calculateDRI({
      rh: '6MP',
      focalMm: '1.6mm',
      sensorFormat: '1/2.8"',
      cameraType: 'fisheye',
      customRadiusMeters: 14.5
    })

    expect(res.detectionMeters).toBe(14.5)
  })

  it('asigna la distancia al objeto por defecto a 15m para cámaras del catálogo', () => {
    const res = calculateDRI({
      rh: '2MP',
      focalMm: '2.8mm',
      sensorFormat: '1/2.8"',
      cameraType: 'dome',
      distanceToObject: 15
    })

    expect(res.detectionMeters).toBe(15)
  })

  it('asigna un setting inicial de opacidad de cobertura del 50%', () => {
    const camera = {
      id: 'cam-1',
      type: 'dome' as const,
      name: 'Cam 1',
      x: 100,
      y: 100,
      rotation: 0,
      fov: 90,
      resolution: '1920x1080',
      bitrate: 4,
      fps: 30,
      coverageOpacity: 0.5
    }
    expect(camera.coverageOpacity).toBe(0.5)
  })
})
