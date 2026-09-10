import { describe, expect, it } from 'vitest'
import {
  collectCleanupSnapshot,
  runSafeDatabaseCleanup,
  type SafeCleanupDbClient,
} from './safeCleanup'

type ComponentRow = {
  codigo_componente: string
  sistema: string
  vigente?: boolean
}

type QuoteRow = {
  id_cotizacion: string
  codigo_componente: string
  vigente: boolean
}

function createFakeDb(seed?: {
  components?: ComponentRow[]
  quotes?: QuoteRow[]
  detalles?: Array<{ id: string }>
  proyectos?: Array<{ id: string }>
  audit?: Array<{ id: string }>
}): SafeCleanupDbClient {
  const state = {
    components: [...(seed?.components ?? [])],
    quotes: [...(seed?.quotes ?? [])],
    detalles: [...(seed?.detalles ?? [])],
    proyectos: [...(seed?.proyectos ?? [])],
    audit: [...(seed?.audit ?? [])],
  }

  return {
    cat_componentes: {
      async count(args?: Record<string, unknown>) {
        const sistema = ((args?.where as { sistema?: string } | undefined)?.sistema) ?? null
        return sistema
          ? state.components.filter((row) => row.sistema === sistema).length
          : state.components.length
      },
      async findMany(args?: Record<string, unknown>) {
        const where = (args?.where as { sistema?: string; codigo_componente?: { in?: string[] } } | undefined) ?? {}
        const take = typeof args?.take === 'number' ? args.take : undefined

        let rows = state.components.filter((row) => {
          if (where.sistema && row.sistema !== where.sistema) return false
          if (where.codigo_componente?.in && !where.codigo_componente.in.includes(row.codigo_componente)) return false
          return true
        })

        rows = [...rows].sort((a, b) => a.codigo_componente.localeCompare(b.codigo_componente))
        if (typeof take === 'number') rows = rows.slice(0, take)

        return rows.map((row) => ({
          codigo_componente: row.codigo_componente,
          cotizaciones: state.quotes
            .filter((quote) => quote.codigo_componente === row.codigo_componente && quote.vigente)
            .slice(0, 1)
            .map((quote) => ({ id_cotizacion: quote.id_cotizacion })),
        }))
      },
    },
    cotizaciones_historico: {
      async count(args?: Record<string, unknown>) {
        const sistema = ((args?.where as { componente?: { sistema?: string } } | undefined)?.componente?.sistema) ?? null
        if (!sistema) return state.quotes.length
        const codes = new Set(
          state.components.filter((row) => row.sistema === sistema).map((row) => row.codigo_componente)
        )
        return state.quotes.filter((row) => codes.has(row.codigo_componente)).length
      },
    },
    detalle_calculos: {
      async count() {
        return state.detalles.length
      },
      async deleteMany() {
        const count = state.detalles.length
        state.detalles = []
        return { count }
      },
    },
    proyectos_calculos: {
      async count() {
        return state.proyectos.length
      },
      async deleteMany() {
        const count = state.proyectos.length
        state.proyectos = []
        return { count }
      },
    },
    audit_log: {
      async count() {
        return state.audit.length
      },
      async deleteMany() {
        const count = state.audit.length
        state.audit = []
        return { count }
      },
    },
    async $transaction<T>(fn: (tx: SafeCleanupDbClient) => Promise<T>) {
      return fn(this as SafeCleanupDbClient)
    },
  }
}

describe('safeCleanup', () => {
  it('genera snapshot con alcance protegido y catálogos no persistidos en BD', async () => {
    const db = createFakeDb({
      components: [
        { codigo_componente: 'ACC_CERRADURA', sistema: 'ACCESO' },
        { codigo_componente: 'CCTV_CABLE', sistema: 'CCTV' },
      ],
      quotes: [
        { id_cotizacion: 'q-1', codigo_componente: 'ACC_CERRADURA', vigente: true },
        { id_cotizacion: 'q-2', codigo_componente: 'CCTV_CABLE', vigente: true },
      ],
    })

    const snapshot = await collectCleanupSnapshot(db)

    expect(snapshot.scope.protectedDatabaseCatalogs).toEqual(['CCTV', 'ACCESO', 'VOCEO', 'INCENDIO'])
    expect(snapshot.scope.nonDatabaseProtectedCatalogs).toEqual(['PARKING'])
    expect(snapshot.scope.cleanableTables).toEqual(['detalle_calculos', 'proyectos_calculos', 'audit_log'])
    expect(snapshot.protectedCatalogs.CCTV.components).toBe(1)
    expect(snapshot.protectedCatalogs.ACCESO.quotes).toBe(1)
  })

  it('ejecuta limpieza segura sin tocar catálogos protegidos', async () => {
    const db = createFakeDb({
      components: [
        { codigo_componente: 'CCTV_CABLE', sistema: 'CCTV' },
        { codigo_componente: 'ACC_CERRADURA', sistema: 'ACCESO' },
        { codigo_componente: 'VOC_ALTAVOZ', sistema: 'VOCEO' },
        { codigo_componente: 'FIR_PANEL', sistema: 'INCENDIO' },
      ],
      quotes: [
        { id_cotizacion: 'q-1', codigo_componente: 'CCTV_CABLE', vigente: true },
        { id_cotizacion: 'q-2', codigo_componente: 'ACC_CERRADURA', vigente: true },
        { id_cotizacion: 'q-3', codigo_componente: 'VOC_ALTAVOZ', vigente: true },
        { id_cotizacion: 'q-4', codigo_componente: 'FIR_PANEL', vigente: true },
      ],
      detalles: [{ id: 'd-1' }, { id: 'd-2' }],
      proyectos: [{ id: 'p-1' }],
      audit: [{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }],
    })

    const result = await runSafeDatabaseCleanup(db)

    expect(result.deleted).toEqual({
      detalle_calculos: 2,
      proyectos_calculos: 1,
      audit_log: 3,
    })
    expect(result.post.totals.detalle_calculos).toBe(0)
    expect(result.post.totals.proyectos_calculos).toBe(0)
    expect(result.post.totals.audit_log).toBe(0)
    expect(result.pre.totals.cat_componentes).toBe(result.post.totals.cat_componentes)
    expect(result.pre.totals.cotizaciones_historico).toBe(result.post.totals.cotizaciones_historico)
    expect(result.post.protectedCatalogs.CCTV.accessibleCodes).toContain('CCTV_CABLE')
    expect(result.post.protectedCatalogs.ACCESO.pricedProbeCodes).toContain('ACC_CERRADURA')
    expect(result.validation.ok).toBe(true)
  })

  it('permite simulación en seco sin borrar datos operativos', async () => {
    const db = createFakeDb({
      components: [{ codigo_componente: 'CCTV_CABLE', sistema: 'CCTV' }],
      quotes: [{ id_cotizacion: 'q-1', codigo_componente: 'CCTV_CABLE', vigente: true }],
      detalles: [{ id: 'd-1' }],
      proyectos: [{ id: 'p-1' }],
      audit: [{ id: 'a-1' }],
    })

    const result = await runSafeDatabaseCleanup(db, { dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.deleted).toEqual({
      detalle_calculos: 0,
      proyectos_calculos: 0,
      audit_log: 0,
    })
    expect(result.pre.totals.detalle_calculos).toBe(1)
    expect(result.post.totals.detalle_calculos).toBe(1)
    expect(result.post.protectedCatalogs.CCTV.accessibleCodes).toContain('CCTV_CABLE')
  })
})
