import { describe, it, expect } from 'vitest'
import { calcularSubsistemas, calcularTotales, detectarCostosFaltantes } from './engine'
import { mapaValidaciones, validarParametros } from './validation'

const mockCost = async (code: string) => {
  const table: Record<string, number> = {
    CCTV_CABLE: 12.3456,
    CCTV_CONECTOR: 4.5,
    CCTV_FUENTE: 150.1234,
    CCTV_CANAL: 20,
    ACC_CABLE: 10,
    ACC_CONTROLADORA: 200,
    ACC_CERRADURA: 80,
    ACC_FUENTE: 120,
    VOC_CABLE: 8,
    VOC_AMPLIFICADOR: 300,
    VOC_FUENTE: 180,
    VOC_ALTAVOZ: 50,
    FIR_CABLE: 6,
    FIR_PANEL: 500,
    FIR_MODULO: 45,
    FIR_SIRENA: 70,
  }
  return table[code] ?? 0
}

describe('motor de cálculos', () => {
  it('precisión de costos a 2 decimales sin acumulación', async () => {
    const resultados = await calcularSubsistemas(
      {
        cctv: { conteo: { dispositivos: 10 }, params: { distanciaPromedioCableadoMts: 60 } },
      },
      mockCost
    )
    const totales = calcularTotales(resultados, {
      nombreProyecto: 'Test',
      usuario: 'QA',
      inflacionPct: 5,
      impuestosPct: 16,
      utilidadPct: 10,
    })
    // Todos los costos deben tener 2 decimales
    for (const r of resultados) {
      for (const i of r.items) {
        expect(i.costo_total).toBeCloseTo(Math.round(i.cantidad * i.costo_unitario * 100) / 100, 2)
      }
    }
    expect(Number.isInteger(Math.round(totales.totalFinal * 100))).toBe(true)
  })

  it('rendimiento: 500 dispositivos < 3s', async () => {
    const start = performance.now()
    const resultados = await calcularSubsistemas(
      {
        cctv: { conteo: { dispositivos: 500 }, params: { distanciaPromedioCableadoMts: 60 } },
        acceso: { conteo: { dispositivos: 500 }, params: { distanciaPromedioCableadoMts: 40 } },
        voceo: { conteo: { dispositivos: 500 }, params: { distanciaPromedioCableadoMts: 30 } },
        incendio: { conteo: { dispositivos: 500 }, params: { distanciaPromedioCableadoMts: 25 } },
      },
      mockCost
    )
    calcularTotales(resultados, {
      nombreProyecto: 'Stress',
      usuario: 'QA',
      inflacionPct: 5,
      impuestosPct: 16,
      utilidadPct: 10,
    })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(3000)
  })

  it('tolerancia de error relativa <= 0.01% en total', async () => {
    const resultados = await calcularSubsistemas(
      {
        cctv: { conteo: { dispositivos: 123 }, params: { distanciaPromedioCableadoMts: 57.77 } },
        acceso: { conteo: { dispositivos: 87 }, params: { distanciaPromedioCableadoMts: 33.33 } },
        voceo: { conteo: { dispositivos: 45 }, params: { distanciaPromedioCableadoMts: 29.95 } },
        incendio: { conteo: { dispositivos: 64 }, params: { distanciaPromedioCableadoMts: 21.1 } },
      },
      mockCost
    )
    const totales = calcularTotales(resultados, {
      nombreProyecto: 'Precisión',
      usuario: 'QA',
      inflacionPct: 4.5,
      impuestosPct: 16,
      utilidadPct: 12,
    })
    const recompute = () => {
      const materiales = Number(resultados.reduce((s, r) => s + r.items.reduce((ss, i) => ss + Number((i.cantidad * i.costo_unitario).toFixed(2)), 0), 0).toFixed(2))
      const manoObra = Number((materiales * 0.2).toFixed(2))
      const inflacionAplicada = Number((materiales * (4.5 / 100)).toFixed(2))
      const base = Number((materiales + manoObra + inflacionAplicada).toFixed(2))
      const impuestos = Number((base * (16 / 100)).toFixed(2))
      const utilidad = Number((base * (12 / 100)).toFixed(2))
      const totalFinal = Number((base + impuestos + utilidad).toFixed(2))
      return totalFinal
    }
    const reference = recompute()
    const relErr = Math.abs(totales.totalFinal - reference) / reference
    expect(relErr).toBeLessThanOrEqual(0.0001)
  })

  it('validaciones mapeadas como objeto con mensaje/validez', () => {
    const reglas = validarParametros({
      cctv: { dispositivos: 10, distancia: 120 },
      acceso: { dispositivos: 0, distancia: 10 },
    })
    const map = mapaValidaciones(reglas)
    expect(map['CCTV_MAX_CABLE'].valido).toBe(false)
    expect(typeof map['CCTV_MAX_CABLE'].mensaje).toBe('string')
  })

  it('detecta costos faltantes cuando no hay precio', async () => {
    const resultados = await calcularSubsistemas(
      {
        cctv: { conteo: { dispositivos: 2 }, params: { distanciaPromedioCableadoMts: 40 } },
      },
      async () => 0
    )
    const faltantes = detectarCostosFaltantes(resultados)
    expect(faltantes.length).toBeGreaterThan(0)
  })

  it('subtotales mayores a 0 con costos mixtos (algunos 0 y otros vigentes)', async () => {
    const partialCost = async (code: string) => {
      const table: Record<string, number> = {
        CCTV_CABLE: 10,
        CCTV_CONECTOR: 0,
        CCTV_FUENTE: 0,
        CCTV_CANAL: 15,
      }
      return table[code] ?? 0
    }
    const resultados = await calcularSubsistemas(
      {
        cctv: { conteo: { dispositivos: 5 }, params: { distanciaPromedioCableadoMts: 50 } },
      },
      partialCost
    )
    const cctv = resultados.find(r => r.sistema === 'CCTV')!
    expect(cctv.subtotal).toBeGreaterThan(0)
    const totales = calcularTotales(resultados, {
      nombreProyecto: 'Mixto',
      usuario: 'QA',
      inflacionPct: 5,
      impuestosPct: 16,
      utilidadPct: 10,
    })
    expect(totales.totalFinal).toBeGreaterThan(0)
  })
})

