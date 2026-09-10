import { describe, it, expect, beforeEach } from 'vitest'
import { calcularSubsistemas, calcularTotales } from '@/lib/costs/engine'

// Mocks para simular BD
const mockDbQuotes = new Map<string, number>()

const mockCostFetcher = async (code: string) => {
  if (!mockDbQuotes.has(code)) {
    console.warn(`[TestFetcher] Missing price for ${code}`)
    return 0
  }
  return mockDbQuotes.get(code) || 0
}

describe('Integración Costos con IA simulada', () => {
  beforeEach(() => {
    mockDbQuotes.clear()
    // Seed de precios básicos
    mockDbQuotes.set('CCTV_CABLE', 10.50)
    mockDbQuotes.set('CCTV_CONECTOR', 2.00)
    mockDbQuotes.set('CCTV_FUENTE', 150.00)
    mockDbQuotes.set('CCTV_CANAL', 50.00)
  })

  it('Calcula costos correctamente con 2 cámaras y precios cargados', async () => {
    // 1. Simular parámetros de entrada (UI)
    const input = {
      cctv: {
        conteo: { dispositivos: 2 },
        params: { distanciaPromedioCableadoMts: 50, factorRedundancia: 1.05 } // Parámetros base
      }
    }

    // 2. Simular optimización de IA (ajuste de parámetros)
    // Supongamos que la IA sugiere aumentar la redundancia a 1.10
    const inputOptimizado = {
      ...input,
      cctv: {
        ...input.cctv,
        params: { ...input.cctv.params, factorRedundancia: 1.10 }
      }
    }

    // 3. Ejecutar cálculo
    const resultados = await calcularSubsistemas(inputOptimizado, mockCostFetcher)
    const totales = calcularTotales(resultados, {
      nombreProyecto: 'Test IA',
      usuario: 'Tester',
      inflacionPct: 0,
      impuestosPct: 0,
      utilidadPct: 0
    })

    // 4. Validaciones
    // Cable: 2 cam * 50m * 1.10 = 110m. Costo: 110 * 10.50 = 1155
    const cable = resultados[0].items.find(i => i.componente === 'CCTV_CABLE')
    expect(cable).toBeDefined()
    expect(cable?.cantidad).toBeCloseTo(110, 2)
    expect(cable?.costo_unitario).toBe(10.50)
    expect(cable?.costo_total).toBeCloseTo(1155, 2)

    // Total final debe ser suma de items
    expect(totales.totalFinal).toBeGreaterThan(0)
  })

  it('Maneja precios faltantes (0) sin romper el cálculo', async () => {
    mockDbQuotes.delete('CCTV_CABLE') // Falta precio de cable

    const input = {
      cctv: {
        conteo: { dispositivos: 2 },
        params: { distanciaPromedioCableadoMts: 50 }
      }
    }

    const resultados = await calcularSubsistemas(input, mockCostFetcher)
    const cable = resultados[0].items.find(i => i.componente === 'CCTV_CABLE')
    
    expect(cable?.costo_unitario).toBe(0)
    expect(cable?.costo_total).toBe(0)
    // El cálculo sigue, solo que este ítem es gratis
  })
})
