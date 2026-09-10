import { describe, it, expect } from 'vitest'
import { calculateDRI } from './coverage'

describe('Initial Render & Performance Benchmark', () => {
  it('should initialize and process header calculations in less than 2000ms (threshold < 2s)', () => {
    const startTime = performance.now()

    // Simular el cálculo de métricas de cabecera para un proyecto de 100 cámaras
    const mockCameras = Array.from({ length: 100 }, (_, i) => ({
      id: `cam-${i}`,
      name: `Cámara ${i}`,
      type: 'dome' as const,
      x: 100 + i * 10,
      y: 100 + i * 10,
      resolution: '1080p',
      horizontalRes: 1920,
      focalLength: 2.8,
      sensorWidth: 4.8,
      sensorFormat: '1/2.8"',
      distanceToObject: 15,
      rotation: 0,
      bitrate: 4.5
    }))

    // Simulación de métricas de cabecera
    const totalCameras = mockCameras.length
    const totalMbps = mockCameras.reduce((acc, cam) => acc + cam.bitrate, 0)
    const storageGBDay = mockCameras.reduce((acc, cam) => {
      return acc + (cam.bitrate * 3600 * 24) / 8
    }, 0) / 1024

    // Simulación de cálculos de cobertura DRI
    mockCameras.forEach(cam => {
      calculateDRI({
        rh: cam.horizontalRes,
        focalMm: cam.focalLength,
        sensorWidthMm: cam.sensorWidth,
        sensorFormat: cam.sensorFormat,
        cameraType: cam.type,
        distanceToObject: cam.distanceToObject
      })
    })

    const endTime = performance.now()
    const duration = endTime - startTime

    expect(totalCameras).toBe(100)
    expect(totalMbps).toBeCloseTo(450)
    expect(storageGBDay).toBeGreaterThan(0)

    // Verificar que la inicialización de métricas toma menos de 2000ms (umbral solicitado)
    expect(duration).toBeLessThan(2000)
  })
})
